## Đảo Đèn Lồng v1.0.0 — "Bình minh"

Game 3D (Three.js) 3 Đêm: giữ các Đèn Lồng Lớn sáng tới bình minh, châm dầu, tránh Bóng Mực hút dầu và Gió Lạc.

**Chạy:** `npm install && npm start` (mở http://localhost:8080), hoặc Docker (`docker build -t dao-den-long . && docker run --rm -p 8080:8080 dao-den-long`), hoặc giải nén `dao-den-long-web-v1.0.0.zip` và phục vụ bằng máy chủ tĩnh bất kỳ.

**Điểm mới ở Phase 4:** chế độ benchmark và soak test (Contract v1.3), bảng xếp hạng cục bộ top 10 + `--export-leaderboard`, đổi phím, phụ đề / chỉ báo hình ảnh, giảm chuyển động, chữ lớn, đóng gói.

**Số đo tự chạy (máy dev, iGPU Intel UHD):** benchmark 282 FPS trung bình, 74.6 FPS 1% thấp nhất; soak 10 Đêm không crash, RSS ×1.07.

Chi tiết và giới hạn đã biết: README.md, CHANGELOG.md, spec/phase-4.md.
