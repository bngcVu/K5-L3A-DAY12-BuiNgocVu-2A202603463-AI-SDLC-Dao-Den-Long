#!/usr/bin/env python3
"""Chạy scenario headless theo Test Contract, kiểm định dạng JSONL, tính tất định và lưu bằng chứng.

Mỗi scenario là một thư mục tests/scenarios/<tên>/ gồm:
  case.json      (bắt buộc)  seed, night, ticks, snapshot_every, requirement, expect, ...
  scenario.json  (tùy chọn)  truyền qua --scenario
  inputs.json    (tùy chọn)  truyền qua --inputs

Dùng:
  python3 tools/run_scenarios.py                  # chạy tất cả
  python3 tools/run_scenarios.py -k pulse         # chỉ case có "pulse" trong tên
  python3 tools/run_scenarios.py --label phase-2  # lưu bằng chứng vào evidence/phase-2/
Chỉ dùng thư viện chuẩn Python 3.8+.
"""
import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import time
from pathlib import Path

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding="utf-8", errors="replace")
ROOT = Path(__file__).resolve().parent.parent
SCEN_DIR = ROOT / "tests" / "scenarios"

EVENT_KEYS = {
    # v1.0
    "mote_picked": ["carried"],
    "deposit": ["lantern_id", "amount", "deposited"],
    "lantern_lit": ["lantern_id"],
    "pulse": ["stunned_ids"],
    "player_hit": ["by", "flames", "dropped"],
    "shade_spawned": ["id"],
    "game_over": ["result", "reason"],
    # v1.1
    "dash": [],
    "charm_picked": ["charm_id", "charm_ticks"],
    "drifter_steal": ["drifter_id", "amount", "carried"],
    "drifter_drop": ["drifter_id", "amount"],
    "night_start": ["night"],
    "paused": [],
    "resumed": [],
    # v1.2
    "refuel": ["lantern_id", "amount", "fuel"],
    "lantern_out": ["lantern_id"],
    "fuel_drain": ["lantern_id", "shade_id", "fuel"],
}
V12_EVENTS = {"refuel", "lantern_out", "fuel_drain"}
V10_EVENTS = {"mote_picked", "deposit", "lantern_lit", "pulse", "player_hit", "shade_spawned", "game_over"}
SHADE_STATES_V11 = {"spawning", "wander", "chase", "recoil", "stunned"}
SHADE_STATES_V12 = SHADE_STATES_V11 | {"drain"}


def vtuple(v):
    return tuple(int(x) for x in str(v).split("."))


# ---------------------------------------------------------------- định dạng
def check_pos(p, where, errs):
    if not (isinstance(p, list) and len(p) == 3 and all(isinstance(x, (int, float)) for x in p)):
        errs.append(f"{where}: pos phải là [x,y,z] số, nhận {p!r}")
        return
    for x in p:
        if abs(round(x, 3) - x) > 1e-9:
            errs.append(f"{where}: tọa độ {x} chưa làm tròn 3 chữ số")
            return


def validate(lines, version, every, ticks_req):
    """Trả về (errs, parsed). Kiểm theo Test Contract v1.0 / v1.1."""
    errs, objs = [], []
    v11 = vtuple(version) >= (1, 1)
    v12 = vtuple(version) >= (1, 2)
    for i, raw in enumerate(lines, 1):
        try:
            objs.append(json.loads(raw))
        except json.JSONDecodeError as e:
            errs.append(f"dòng {i}: không phải JSON ({e})")
            return errs, []
    if not objs:
        return ["output rỗng"], objs
    if objs[-1].get("type") != "end":
        errs.append("dòng cuối phải là {\"type\":\"end\",...}")
    if sum(1 for o in objs if o.get("type") == "end") != 1:
        errs.append("phải có đúng 1 dòng end")

    last_tick, snaps = -1, []
    for i, o in enumerate(objs, 1):
        t = o.get("type")
        where = f"dòng {i} ({t})"
        if t not in ("snapshot", "event", "end"):
            errs.append(f"{where}: type lạ")
            continue
        tick = o.get("tick", o.get("ticks"))
        if not isinstance(tick, int):
            errs.append(f"{where}: thiếu tick nguyên")
            continue
        if tick < last_tick:
            errs.append(f"{where}: tick {tick} giảm so với {last_tick}")
        last_tick = max(last_tick, tick)

        if t == "snapshot":
            snaps.append(o)
            need = ["tick", "sim_tick", "state", "time_left_s", "score", "player", "lanterns", "shades", "motes_active"]
            if v11:
                need += ["night", "wind", "motes", "drifters", "charms"]
            miss = [k for k in need if k not in o]
            if miss:
                errs.append(f"{where}: thiếu {miss}")
                continue
            if tick % every:
                errs.append(f"{where}: tick {tick} không chia hết cho snapshot-every {every}")
            ok_states = {"playing", "won", "lost"} | ({"paused"} if v11 else set())
            if o["state"] not in ok_states:
                errs.append(f"{where}: state '{o['state']}' không hợp lệ")
            pl = o["player"]
            pneed = ["pos", "flames", "carried"] + (["vel", "grounded", "invuln", "dash_cd_s", "pulse_cd_s", "charm_s"] if v11 else []) + (["capacity"] if v12 else [])
            pm = [k for k in pneed if k not in pl]
            if pm:
                errs.append(f"{where}: player thiếu {pm}")
            if "pos" in pl:
                check_pos(pl["pos"], f"{where} player", errs)
            for L in o["lanterns"]:
                lm = [k for k in ("id", "pos", "lit", "deposited") + (("fuel", "ever_lit", "relit_count") if v12 else ()) if k not in L]
                if lm:
                    errs.append(f"{where}: lantern thiếu {lm}")
                else:
                    check_pos(L["pos"], f"{where} lantern {L['id']}", errs)
            for s in o["shades"]:
                sm = [k for k in ("id", "pos", "state") if k not in s]
                if sm:
                    errs.append(f"{where}: shade thiếu {sm}")
                    continue
                check_pos(s["pos"], f"{where} shade {s['id']}", errs)
                states = SHADE_STATES_V12 if v12 else SHADE_STATES_V11
                if v11 and s["state"] not in states:
                    errs.append(f"{where}: shade {s['id']} state '{s['state']}' không thuộc {sorted(states)}")
            if v11:
                for m in o["motes"]:
                    mm = [k for k in ("id", "pos", "kind", "ttl_s") if k not in m]
                    if mm:
                        errs.append(f"{where}: mote thiếu {mm}")
                    elif m["kind"] not in ("random", "dropped"):
                        errs.append(f"{where}: mote kind '{m['kind']}' sai")
                for d in o["drifters"]:
                    dm = [k for k in ("id", "pos", "state", "stolen") if k not in d]
                    if dm:
                        errs.append(f"{where}: drifter thiếu {dm}")
                for c in o["charms"]:
                    cm = [k for k in ("id", "available", "respawn_s") if k not in c]
                    if cm:
                        errs.append(f"{where}: charm thiếu {cm}")
                w = o["wind"]
                if not (isinstance(w, dict) and "active" in w and "dir_deg" in w):
                    errs.append(f"{where}: wind phải có active, dir_deg")

        elif t == "event":
            name = o.get("name")
            allowed = {k: v for k, v in EVENT_KEYS.items() if k in V10_EVENTS or (v11 and k not in V12_EVENTS) or v12}
            if v12:
                allowed = dict(allowed, lantern_lit=["lantern_id", "relight"])
            if name not in allowed:
                errs.append(f"{where}: event '{name}' không có trong contract v{version}")
                continue
            data = o.get("data")
            if not isinstance(data, dict):
                errs.append(f"{where}: event thiếu data object")
                continue
            dm = [k for k in allowed[name] if k not in data]
            if dm:
                errs.append(f"{where}: event {name} thiếu {dm}")
            if name == "game_over":
                reasons = ("dawn_survived", "dawn", "no_flames") if v12 else ("all_lit", "dawn", "no_flames")
                if data.get("result") not in ("won", "lost") or data.get("reason") not in reasons:
                    errs.append(f"{where}: game_over result/reason sai: {data}")
            if name == "player_hit" and data.get("by") not in ("shade", "fall"):
                errs.append(f"{where}: player_hit.by sai: {data.get('by')}")

        else:  # end
            for k in ("ticks", "state", "score"):
                if k not in o:
                    errs.append(f"{where}: end thiếu {k}")
            if o.get("state") not in ("playing", "won", "lost"):
                errs.append(f"{where}: end.state sai")
            if isinstance(o.get("ticks"), int) and o["ticks"] > ticks_req:
                errs.append(f"{where}: end.ticks {o['ticks']} > --ticks {ticks_req}")

    if snaps and snaps[0]["tick"] != 0:
        errs.append("snapshot đầu tiên phải ở tick 0")
    if not snaps:
        errs.append("không có snapshot nào")
    return errs, objs


# ---------------------------------------------------------------- expect
def get_path(obj, path):
    """'player.carried', 'lanterns[id=L1].lit', 'shades[0].state'"""
    cur = obj
    for seg in path.split("."):
        m = re.fullmatch(r"(\w+)(?:\[(?:(\w+)=([^\]]+)|(\d+))\])?", seg)
        if not m:
            raise KeyError(seg)
        name, k, v, idx = m.groups()
        cur = cur[name]
        if k:
            cur = next(x for x in cur if str(x.get(k)) == v)
        elif idx is not None:
            cur = cur[int(idx)]
    return cur


def match(actual, want, tol=1e-6):
    if isinstance(want, dict):
        return isinstance(actual, dict) and all(k in actual and match(actual[k], v, tol) for k, v in want.items())
    if isinstance(want, list):
        return isinstance(actual, list) and len(actual) == len(want) and all(match(a, w, tol) for a, w in zip(actual, want))
    if isinstance(want, (int, float)) and not isinstance(want, bool) and isinstance(actual, (int, float)):
        return abs(actual - want) <= tol
    return actual == want


def check_expect(objs, exp):
    errs = []
    events = [o for o in objs if o.get("type") == "event"]
    snaps = {o["tick"]: o for o in objs if o.get("type") == "snapshot"}
    end = objs[-1] if objs else {}
    for e in exp.get("events", []):
        cands = [x for x in events if x["name"] == e["name"] and match(x.get("data", {}), e.get("data", {}))]
        if "tick" in e:
            cands = [x for x in cands if x["tick"] == e["tick"]]
        cands = [x for x in cands if e.get("tick_min", -1) <= x["tick"] <= e.get("tick_max", 10**12)]
        n = e.get("count")
        if n is not None and len(cands) != n:
            errs.append(f"cần {n} event khớp {e}, có {len(cands)}")
        elif n is None and not cands:
            errs.append(f"không thấy event khớp {e}")
    for name in exp.get("no_events", []):
        hit = [x for x in events if x["name"] == name]
        if hit:
            errs.append(f"không được có event '{name}' nhưng có ở tick {hit[0]['tick']}")
    if "end" in exp and not match(end, exp["end"]):
        errs.append(f"end {end} không khớp {exp['end']}")
    for s in exp.get("snapshots", []):
        snap = snaps.get(s["tick"])
        if snap is None:
            errs.append(f"không có snapshot tick {s['tick']}")
            continue
        try:
            val = get_path(snap, s["path"])
        except (KeyError, IndexError, StopIteration, TypeError):
            errs.append(f"tick {s['tick']}: không tìm thấy {s['path']}")
            continue
        tol = s.get("tol", 1e-6)
        if "equals" in s and not match(val, s["equals"], tol):
            errs.append(f"tick {s['tick']}: {s['path']} = {val!r}, mong đợi {s['equals']!r} (±{tol})")
        if "min" in s and not val >= s["min"]:
            errs.append(f"tick {s['tick']}: {s['path']} = {val} < {s['min']}")
        if "max" in s and not val <= s["max"]:
            errs.append(f"tick {s['tick']}: {s['path']} = {val} > {s['max']}")
    return errs


# ---------------------------------------------------------------- chạy
def run_once(cmd, case, cdir, out):
    args = ["--seed", str(case.get("seed", 1)), "--night", str(case.get("night", 1)),
            "--ticks", str(case["ticks"]), "--out", str(out),
            "--snapshot-every", str(case.get("snapshot_every", 10))]
    for f, flag in (("scenario.json", "--scenario"), ("inputs.json", "--inputs")):
        if (cdir / f).exists():
            args += [flag, str(cdir / f)]
    full = cmd + " " + " ".join((subprocess.list2cmdline([a]) if os.name == "nt" else shlex.quote(a)) for a in args)
    if out.exists():
        out.unlink()
    t0 = time.perf_counter()
    try:
        p = subprocess.run(full, shell=True, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace",
                           timeout=case.get("timeout_s", 120))
    except subprocess.TimeoutExpired:
        return None, time.perf_counter() - t0, "timeout"
    return p, time.perf_counter() - t0, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-k", default="", help="chỉ chạy case có chuỗi này trong tên")
    ap.add_argument("--label", default="latest", help="thư mục con trong evidence/")
    ap.add_argument("--no-determinism", action="store_true", help="bỏ chạy lần 2")
    a = ap.parse_args()

    contract_f = ROOT / "game.contract.json"
    if not contract_f.exists():
        sys.exit("Thiếu game.contract.json ở gốc repo")
    contract = json.loads(contract_f.read_text(encoding="utf-8"))
    cmd, version = contract["headless_cmd"], contract.get("contract_version", "1.0")

    ev_dir = ROOT / "evidence" / a.label
    ev_dir.mkdir(parents=True, exist_ok=True)
    cases = sorted(d for d in SCEN_DIR.glob("*/") if (d / "case.json").exists() and a.k in d.name)
    if not cases:
        sys.exit(f"Không có scenario nào trong {SCEN_DIR}")

    rows, n_fail = [], 0
    for cdir in cases:
        case = json.loads((cdir / "case.json").read_text(encoding="utf-8"))
        if vtuple(case.get("min_version", "1.0")) > vtuple(version):
            rows.append((cdir.name, case.get("requirement", ""), "SKIP", f"cần contract ≥ {case['min_version']}", "-"))
            continue
        out1 = ev_dir / f"{cdir.name}.jsonl"
        p, dt, err = run_once(cmd, case, cdir, out1)
        errs = []
        want_rc = case.get("exit_code", 0)
        if err:
            errs.append(err)
        elif p.returncode != want_rc:
            errs.append(f"exit {p.returncode}, mong đợi {want_rc}. stderr: {p.stderr.strip()[-300:]}")
        elif want_rc != 0 and not p.stderr.strip():
            errs.append("lỗi phải có thông báo ở stderr")
        det = "-"
        if not errs and want_rc == 0:
            if not out1.exists():
                errs.append("không tạo file --out")
            else:
                lines = [l for l in out1.read_text(encoding="utf-8").splitlines() if l.strip()]
                verrs, objs = validate(lines, version, case.get("snapshot_every", 10), case["ticks"])
                errs += verrs
                if objs and not verrs:
                    errs += check_expect(objs, case.get("expect", {}))
                if "max_seconds" in case and dt > case["max_seconds"]:
                    errs.append(f"chạy {dt:.1f}s > giới hạn {case['max_seconds']}s")
                if not a.no_determinism and case.get("determinism", True):
                    out2 = ev_dir / f"{cdir.name}.run2.jsonl"
                    p2, _, err2 = run_once(cmd, case, cdir, out2)
                    same = (not err2 and p2.returncode == 0 and out2.exists()
                            and out2.read_bytes() == out1.read_bytes())
                    det = "giống hệt" if same else "KHÁC"
                    if not same:
                        errs.append("không tất định: 2 lần chạy cùng đầu vào cho output khác nhau")
                    elif out2.exists():
                        out2.unlink()
        ok = not errs
        n_fail += not ok
        rows.append((cdir.name, case.get("requirement", ""), "PASS" if ok else "FAIL",
                     "; ".join(errs)[:500] or case.get("desc", ""), f"{dt:.2f}s / {det}"))
        print(f"[{'PASS' if ok else 'FAIL'}] {cdir.name} ({dt:.2f}s)")
        for e in errs:
            print(f"    - {e}")

    commit = subprocess.run("git rev-parse --short HEAD", shell=True, cwd=ROOT,
                            capture_output=True, text=True).stdout.strip() or "?"
    md = [f"# Bằng chứng scenario — {a.label}", "",
          f"- Commit: `{commit}` · Contract: v{version} · Lúc chạy: {time.strftime('%Y-%m-%d %H:%M:%S')}",
          f"- Lệnh: `python3 tools/run_scenarios.py --label {a.label}`",
          f"- Kết quả: {len(rows) - n_fail} đạt / {n_fail} trượt (tính cả SKIP là đạt)", "",
          "| Scenario | Yêu cầu | Kết quả | Ghi chú | Thời gian / tất định |", "|---|---|---|---|---|"]
    md += [f"| {r[0]} | {r[1]} | {r[2]} | {r[3].replace('|', '/')} | {r[4]} |" for r in rows]
    (ev_dir / "report.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print(f"\n{len(rows) - n_fail}/{len(rows)} đạt. Báo cáo: {ev_dir / 'report.md'}")
    sys.exit(1 if n_fail else 0)


if __name__ == "__main__":
    main()
