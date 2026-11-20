# Credits

## Mã nguồn bên thứ ba

| Thành phần | Phiên bản | Giấy phép | Nguồn |
|---|---|---|---|
| [three.js](https://threejs.org) | 0.160.0 | MIT | cài qua `npm install`, phục vụ từ `node_modules/three/build/three.module.js` (không sao chép vào repo) |

Không có thư viện nào khác lúc chạy. Công cụ kiểm thử chỉ dùng Node.js (`node:test`) và Python 3 thư viện chuẩn (`tools/run_scenarios.py`).

## Hình ảnh, mô hình, phông chữ

Không dùng asset ngoài. Toàn bộ hình khối 3D (đảo, đèn lồng, Mây, Bóng Mực, Gió Lạc, bùa) được dựng bằng hình học cơ bản của three.js ngay trong mã (`web/main.js`); quầng sáng đom đóm là gradient vẽ bằng canvas; giao diện dùng phông hệ thống (`system-ui`). Không có ảnh, texture hay mô hình tải từ bên ngoài.

## Âm thanh

Không dùng file âm thanh. Nhạc nền và hiệu ứng được **tổng hợp bằng WebAudio** trong mã (`web/audio.js`): dao động sin/tam giác/vuông, nhiễu lọc thông thấp. Không lấy mẫu từ nguồn nào.

## Nhân vật, bối cảnh, tên gọi

Mây, Ông Đăng, Bóng Mực, Gió Lạc, Đảo Bến / Đảo Cau / Đảo Chuông và tên "Đảo Đèn Lồng" là nhân vật và bối cảnh **gốc của lab** (đề bài Day 12), không lấy từ game hay phim có sẵn.

## Công cụ AI tạo nội dung

- **Claude Code** (Anthropic, mô hình Claude Sonnet 5.5) viết phần lớn mã nguồn, scenario kiểm thử, tài liệu và nhật ký trong repo này, dưới sự hướng dẫn và rà soát của tác giả. Cách dùng, các lần AI sai và cách phát hiện: [docs/ai-log.md](docs/ai-log.md) và [retro/retro.md](retro/retro.md).
- Không dùng công cụ AI nào để tạo hình ảnh hoặc âm thanh.
