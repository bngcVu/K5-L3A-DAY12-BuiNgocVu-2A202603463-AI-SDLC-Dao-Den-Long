// Bảng xếp hạng cục bộ (Ticket-04 §3): logic thuần, dùng chung cho server, client và test.
export const NAME_RE = /^[A-Za-z0-9_]{3,12}$/;
export const TOP_N = 10;

export function validateName(name) {
  return typeof name === 'string' && NAME_RE.test(name);
}

// ISO 8601 có múi giờ (Z hoặc ±hh:mm)
function iso(d) { return d.toISOString(); }

export function makeEntry({ name, score, nights_won, seed }, now = new Date()) {
  if (!validateName(name)) throw new Error('Tên phải gồm 3–12 ký tự [A-Za-z0-9_]');
  if (!Number.isInteger(score) || score < 0) throw new Error('score phải là số nguyên ≥ 0');
  if (!Number.isInteger(nights_won) || nights_won < 0 || nights_won > 3) throw new Error('nights_won phải trong 0–3');
  if (!Number.isInteger(seed)) throw new Error('seed phải là số nguyên');
  return { name, score, nights_won, achieved_at: iso(now), seed };
}

// Điểm giảm dần; bằng điểm thì ai đạt trước đứng trên
export function sortEntries(list) {
  return [...list].sort((a, b) => b.score - a.score || Date.parse(a.achieved_at) - Date.parse(b.achieved_at));
}

export function addEntry(list, entry) {
  return sortEntries([...list, entry]).slice(0, TOP_N);
}
