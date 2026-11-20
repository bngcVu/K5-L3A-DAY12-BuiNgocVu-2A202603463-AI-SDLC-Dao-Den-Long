# Phát hành v1.0.0 — các bước còn lại (cần tài khoản GitHub của bạn)

Mã đã sẵn sàng; việc dưới đây cần quyền của chủ repo nên chưa được làm tự động.

## 1. Gắn tag và đẩy lên

```bash
./scripts/check.sh --label phase-4           # chạy lại, đảm bảo bằng chứng khớp mã
git add -A && git commit -m "release: v1.0.0"
git tag phase-4 && git push origin main phase-4
```

## 2. Dựng bản chạy được

```bash
npm install && npm run build:web              # → dist/web/ (web tĩnh, không cần Node để chơi)
# Windows PowerShell:  Compress-Archive -Path dist/web/* -DestinationPath dao-den-long-web-v1.0.0.zip -Force
# macOS/Linux:         (cd dist/web && zip -r ../../dao-den-long-web-v1.0.0.zip .)
docker build -t dao-den-long:1.0.0 .          # tùy chọn: kiểm bản Docker
docker run --rm -p 8080:8080 dao-den-long:1.0.0
```

Kiểm bản web tĩnh: `python3 -m http.server -d dist/web 8080` rồi mở http://localhost:8080 — chơi được một Đêm, lưu một điểm lên bảng xếp hạng (lưu trong trình duyệt).

## 3. Quay video demo (< 5 phút, `.mp4`)

Gợi ý kịch bản (≈ 4 phút): (1) 60 s chơi trực tiếp Đêm 1: nhặt đom đóm, thắp đèn, châm dầu, Tỏa Sáng đuổi Bóng Mực đang hút dầu; (2) 45 s mở Cài đặt: đổi một phím, bật "Bảng màu dễ phân biệt", "Giảm chuyển động", "Chữ lớn"; (3) 60 s terminal: `./scripts/check.sh` (xanh), `node bench/bench.js --seed 42 --duration 30 --out bench.json`, `node src/soak.js --seed 7 --nights 10 --out soak.json`; (4) 30 s `git log --oneline`, các thư mục `.claude/`, `adr/`, `spec/`, `evidence/`.

```bash
ffmpeg -i input.mov -t 290 -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k demo.mp4
```

## 4. Tạo Release

```bash
gh release create v1.0.0 demo.mp4 dao-den-long-web-v1.0.0.zip --title "v1.0.0 — Bình minh" \
  --notes-file release/NOTES.md
```

Sau đó dán link video vào đầu `README.md` (dòng "Video demo"), commit **trước hạn** của phase rồi đẩy lại tag nếu cần (xem SUBMISSION.md mục 5).

## 5. Kiểm lần cuối trên máy sạch

```bash
git clone <link-repo> kiem-tra && cd kiem-tra
npm install && npm start      # chơi được trong 3 lệnh
```

Mở repo, Release và video bằng cửa sổ ẩn danh để chắc mọi thứ xem được khi chưa đăng nhập.
