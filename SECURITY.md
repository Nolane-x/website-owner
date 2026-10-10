# Chính Sách Bảo Mật (SECURITY.md) — Personal Web OS

Hệ thống **Personal Web OS** được thiết kế theo nguyên tắc **Single-Owner Defense-in-Depth** (Phòng thủ đa lớp dành cho chủ sở hữu duy nhất). Hệ thống không thỏa hiệp giữa sự tiện dụng cho chủ nhân (đăng nhập nhanh chỉ bằng Tên đăng nhập + Mật khẩu trên mọi thiết bị mà không cần điện thoại/OTP) và tính an toàn bảo mật cấp cao ở tầng Backend.

---

## 1. Nguyên Tắc Phân Tách Tuyệt Đối Giữa Private và Public

- **Không bao giờ lọc dữ liệu ở Client:** 
  Mọi API công khai (`/api/public/*`) thực thi truy vấn cơ sở dữ liệu với điều kiện cứng:
  ```sql
  WHERE visibility = 'PUBLIC' AND status = 'PUBLISHED'
  ```
- **Nội dung Nháp (Draft) hoặc Riêng Tư (Private):**
  Không bao giờ xuất hiện trong HTTP response, cache, SSR payload, public search index, hoặc client JavaScript bundle.
- **Bảo vệ Slug (404 Tránh Suy Đoán):**
  Khi một khách truy cập vào URL bài viết ở chế độ Private hoặc Draft, API trả về HTTP `404 Not Found` tương tự như một trang hoàn toàn không tồn tại, ngăn chặn việc thăm dò suy đoán ID/Slug.

---

## 2. Xác Thực & Quản Lý Phiên Làm Việc (Authentication & Sessions)

- **Mật khẩu:**
  - Băm bằng thuật toán `Bcrypt` với hệ số muối (salt rounds) = 12.
  - Tuyệt đối không lưu mật khẩu ở dạng plaintext hoặc SHA-256 thuần túy.
  - Không bao giờ ghi log mật khẩu hoặc request body đăng nhập ra console/server logs.
- **Session Tokens:**
  - Token ngẫu nhiên 256-bit tạo bởi hàm sinh số ngẫu nhiên mật mã (`crypto.randomBytes(32)`).
  - Token trong database được băm bằng SHA-256 để bảo vệ cơ sở dữ liệu nếu bị rò rỉ.
  - Token lưu trữ trên trình duyệt trong **HttpOnly, Secure, SameSite=Lax** Cookie, ngăn chặn triệt để tấn công XSS đánh cắp phiên.
- **Thu hồi phiên (Session Revocation):**
  - Thu hồi tức thì từng phiên riêng lẻ hoặc toàn bộ các phiên khác chỉ với 1 cú click.
  - Tự động hủy toàn bộ các phiên hoạt động khi chủ sở hữu đổi mật khẩu.

---

## 3. Phòng Thủ Chống Brute-Force & Lạm Dụng

- **Sliding-Window Rate Limiter:**
  - Giới hạn tối đa 5 lần thử đăng nhập thất bại trong vòng 1 phút từ cùng một địa chỉ IP.
  - Khi vượt ngưỡng, IP bị khóa tạm thời kèm mã lỗi HTTP `429 Too Many Requests`.
- **Nhật ký Kiểm Toán (Audit Logging):**
  - Mọi sự kiện đăng nhập, đăng xuất, đổi mật khẩu, kích hoạt Panic Lock, truy cập két sắt đều được ghi nhận IP, User-Agent và thời gian thực.

---

## 4. Két Sắt Bảo Mật Zero-Knowledge (Vault & Secret Notes)

- Sử dụng chuẩn mã hóa cấp quân sự **AES-256-GCM** thông qua tiêu chuẩn **Web Crypto API**.
- Khóa mã hóa được dẫn xuất trực tiếp từ Master Passkey của chủ sở hữu qua thuật toán **PBKDF2-HMAC-SHA-256** (600.000 vòng cho dữ liệu mã hóa mới, với salt ngẫu nhiên; hỗ trợ giải mã dữ liệu legacy dùng 100.000 vòng).
- Dữ liệu mật khẩu và ghi chú tối mật được mã hóa hoàn toàn tại trình duyệt của người dùng trước khi gửi lên máy chủ. Máy chủ chỉ lưu trữ Ciphertext dạng Base64 và không bao giờ biết được nội dung thật hay Master Passkey.

---

## 5. Mật Mã Khách (Public Access Protection)

- Chế độ công khai hỗ trợ tùy chọn thiết lập **Mật mã Khách (Guest Password)** hoàn toàn độc lập với mật khẩu chủ sở hữu.
- Mật mã khách chỉ cấp quyền đọc các nội dung đã công khai (`visibility = 'PUBLIC'`), tuyệt đối không cấp quyền truy cập Bảng điều khiển riêng hay các API quản trị (`/api/admin/*`).

---

## 6. Khóa Khẩn Cấp (Panic Lock) & Màn Hình Bảo Vệ Riêng Tư

- Phím tắt toàn cục **`Ctrl + Shift + L`** kích hoạt ngay lập tức màn hình tài liệu giả định che phủ toàn bộ giao diện làm việc riêng tư.
- Chế độ làm mờ riêng tư (Privacy Blur) tự động che mờ các số liệu thống kê nhạy cảm trên dashboard khi chưa rê chuột vào.

---

## 7. Cloudflare Worker Security Gateway

- Đặt tại biên mạng (Edge Network) của Cloudflare:
  - Tự động chặn các yêu cầu quét lỗ hổng phổ biến (`.env`, `.git`, `wp-login`, path traversal `../`).
  - Tiêm các tiêu đề bảo mật chuẩn hiện đại: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - Rate limiting tại biên mạng trước khi gói tin chạm đến máy chủ ứng dụng.


## 8. HTTP API Tester — Ranh Giới Request Ra Ngoài

- Endpoint /api/admin/http-proxy chỉ hoạt động sau khi xác thực owner và kiểm tra Origin.
- Chỉ chấp nhận URL dùng giao thức HTTP hoặc HTTPS; không chấp nhận username/password nhúng trong URL, hostname nội bộ hoặc địa chỉ IP không công khai. Bộ lọc bao gồm các dải private, loopback, link-local/metadata, carrier-grade NAT, benchmarking, documentation, multicast và địa chỉ reserved của IPv4; IPv6 chỉ chấp nhận global-unicast sau khi loại các dải đặc biệt/transition.
- Với hostname, máy chủ phân giải cả tập bản ghi A/AAAA và từ chối toàn bộ yêu cầu nếu bất kỳ địa chỉ trả về nào không công khai. Kết nối TCP/TLS được mở tới chính IP đã kiểm tra, không dùng lại hostname để tra DNS lần hai; với HTTPS, hostname ban đầu vẫn được dùng cho TLS SNI/certificate verification và HTTP Host header.
- Proxy không tự động theo redirect. Mỗi redirect sẽ cần một request mới và một quyết định chính sách đích mới; response redirect chỉ được trả về cho người vận hành.
- Có giới hạn body JSON đầu vào 1MB, tối đa 100 headers và 32KB tổng headers, body outbound 1MB, response 5MB và timeout tối đa 30 giây. Header hop-by-hop, Host, Content-Length, Transfer-Encoding, Proxy-Authorization và các header quản lý kết nối/encoding bị loại bỏ hoặc đặt lại.
- Lỗi DNS/network được trả về thông báo tổng quát; không trả raw exception nội bộ cho client.
- Đây là công cụ kiểm thử dịch vụ công cộng, không phải sandbox để thăm dò mạng riêng. Chỉ gọi API mà chủ sở hữu có quyền kiểm thử; lớp chặn địa chỉ không thay thế các chính sách egress ở hạ tầng.
