# KIẾN TRÚC HỆ THỐNG — PERSONAL WEB OS (PERSONAL CMS & PRIVATE WORKSPACE)

## 1. TỔNG QUAN HỆ THỐNG
Personal Web OS là hệ điều hành web cá nhân, kết hợp:
- **Private Workspace (Owner Mode)**: Không gian làm việc cá nhân độc quyền của chủ sở hữu.
- **Personal CMS & Page Builder**: Trình biên tập nội dung dạng khối (block-based canvas), quản lý trạng thái Draft / Published.
- **Public Website (Guest Mode)**: Trang web cá nhân chính thức, tốc độ cao, giao diện chuẩn báo chí / editorial cao cấp.
- **Resource / Knowledge Hub**: Bộ sưu tập tài nguyên link-first (Google Drive, GitHub, Mega, Web links...).
- **Personal Credential Vault**: Két mật mã bảo mật mã hóa AES-GCM phía client (client-side encryption).

---

## 2. NGUYÊN TẮC BẢO MẬT CỐT LÕI (SECURITY BOUNDARY)

```
                            [ TRÌNH DUYỆT KHÁCH / OWNER ]
                                          │
                                          ▼
                      [ CLOUDFLARE EDGE WORKER / GATEWAY ]
                      - Chống tấn công brute-force / DDoS
                      - Rate limiting theo IP & Endpoint
                      - Security Headers (CSP, HSTS, X-Content-Type...)
                                          │
                                          ▼
                         [ NEXT.JS APP ROUTER CORE ]
                                          │
                ┌─────────────────────────┴─────────────────────────┐
                ▼                                                   ▼
       [ PUBLIC API & ROUTES ]                             [ PRIVATE API & ROUTES ]
       - /api/public/*                                     - /api/admin/*, /api/auth/*
       - Chỉ query: status = 'PUBLISHED'                   - Xác thực cookie HttpOnly
         AND visibility = 'PUBLIC'                         - Kiểm tra Session token hash
       - Tuyệt đối không filter ở frontend!                - RLS & Server-side Authorization
       - Không cache private records                       - Ghi Security Audit Log
                │                                                   │
                └─────────────────────────┬─────────────────────────┘
                                          ▼
                          [ POSTGRESQL (DATABASE LAYER) ]
                          - Local PGLite / Neon / Supabase
                          - Parameterized Queries (Drizzle ORM)
                          - No plaintext passwords (Bcrypt salt 12)
```

### Điểm mấu chốt chống rò rỉ dữ liệu (Anti-Leakage Guarantee):
1. **Public API tuyệt đối không trả dữ liệu Private & Public Serializer**:
   - Mọi câu query public ở DB đều có điều kiện cố định:
     `WHERE status = 'PUBLISHED' AND visibility = 'PUBLIC' AND deleted_at IS NULL`.
   - Toàn bộ kết quả public đều đi qua lớp **Public Serializer** (`src/lib/api/public-serializer.ts`), chủ động thanh lọc và loại bỏ: `internalNotes`, `adminOnlyData`, `visibility`, `status`, draft flags trước khi phản hồi JSON.
   - Dữ liệu `DRAFT`, `PRIVATE`, `UNLISTED` (không có token), hoặc đã đưa vào thùng rác (`deleted_at !== null`) không bao giờ lọt vào response payload, SSR HTML, hay search index công khai.
2. **Khởi tạo An toàn & Không mật khẩu mặc định (Zero Default Production Credentials)**:
   - Trong môi trường Production, hệ thống **tuyệt đối không tự động seed** tài khoản mặc định `admin`/`Admin@123456`.
   - Khởi tạo lần đầu thông qua quy trình **First-Run Bootstrap** (`/admin/bootstrap`). Chủ nhân tự thiết lập tên đăng nhập và mật khẩu an toàn.
   - Sau khi khởi tạo hoàn tất, cổng bootstrap bị vô hiệu hóa vĩnh viễn (HTTP 403 Forbidden).
3. **Xác thực Owner không cần OTP/MFA nhưng Phòng thủ Đa tầng**:
   - Đăng nhập chỉ bằng **Tên đăng nhập** và **Mật khẩu**.
   - Phù hợp khi đăng nhập trên máy tính lạ, cơ quan mà không mang điện thoại.
   - Bù đắp bảo mật bằng:
     * Rate limit nghiêm ngặt chống dò mật khẩu (brute-force defense).
     * Token ngẫu nhiên 256-bit được băm SHA-256 trong database.
     * Cookie HttpOnly, Secure (production), SameSite=Lax.
     * Quản lý phiên (Session Management): xem IP, trình duyệt, thời gian hoạt động, nút **Đăng xuất tất cả thiết bị**.
     * Tự động thu hồi toàn bộ các phiên khác khi đổi mật khẩu (`revokeOtherSessions`).
     * Nút **Khóa khẩn cấp (Panic Lock - Ctrl+Shift+L)**: khóa ngay lập tức giao diện và hủy phiên nếu cần.
4. **Mật mã khách truy cập & Zero-Knowledge Guest Session**:
   - Tùy chọn độc lập với mật khẩu Owner.
   - Khi xác thực mật khẩu khách thành công, hệ thống cấp một token ngẫu nhiên 256-bit độc lập (`guest_sessions`), chỉ lưu băm SHA-256 trên cơ sở dữ liệu.
   - Tuyệt đối không lưu bcrypt password hash của mật khẩu khách vào client cookie.
   - Khách chỉ có quyền đọc các nội dung đã công khai, không cấp quyền quản trị và không gọi được bất kỳ private API nào.
5. **Thùng Rác Phục Hồi (Soft-Delete) & Lịch Sử Phiên Bản (Content Revisions)**:
   - Xóa bài viết/trang mặc định là **Soft Delete** (`deleted_at` timestamp). Có thể khôi phục từ Thùng rác (`?trash=true`) hoặc xóa vĩnh viễn (`?permanent=true`).
   - Mọi lần cập nhật nội dung quan trọng đều tự động lưu vết snapshot vào bảng `content_revisions` cho phép phục hồi hoặc so sánh thay đổi.

---

## 3. CƠ CHẾ DỮ LIỆU & STORAGE (LINK-FIRST PHILOSOPHY)
- Không bắt buộc tải file trực tiếp lên server hoặc tích hợp OAuth Google Drive nặng nề.
- Mọi tài nguyên lưu dạng **Link-First**:
  * Title, Description, Provider (Google Drive, GitHub, Mega, Web...), Tags, Download Allowed, Open in New Tab.
  * Server chỉ lưu metadata và đường dẫn an toàn, hỗ trợ preview thông minh.

---

## 4. BỘ DỰNG TRANG DẠNG KHỐI (BLOCK-BASED CANVAS ENGINE)
- Cùng một cấu trúc khối được tái sử dụng cho cả Private Editor và Public Page Renderer:
  * Khối: `heading`, `text`, `markdown`, `image`, `gallery`, `video`, `button`, `link`, `card`, `project_card`, `resource_card`, `quote`, `code`, `divider`, `spacer`, `grid`, `columns`, `table`, `timeline`, `list`, `embed`, `collection`.
- Cho phép: Thêm, Xóa, Nhân bản, Kéo thả đổi vị trí (Drag & Drop), Thay đổi thuộc tính, Xem trước (Live Preview).
- Toàn bộ nội dung Markdown / HTML đều được lọc qua bộ lọc bảo mật (`DOMPurify`) chống XSS.

---

## 5. THIẾT KẾ GIAO DIỆN & NUI (NOLANE UI STANDARDS)
- Sử dụng triết lý thiết kế **"Bàn giấy" (Editorial Paper Desk)** cao cấp:
  * Nền giấy ấm, chữ mực sắc nét, tương phản tối ưu WCAG AAA.
  * Phông chữ hiển thị thanh lịch kết hợp phông giao diện tiếng Việt chuẩn mực (`Be Vietnam Pro`).
  * Hệ thống biểu tượng trạng thái hiển thị rõ ràng: `● Công khai`, `◐ Không liệt kê`, `○ Riêng tư`.
  * Hỗ trợ đầy đủ phím tắt: `Ctrl + K` (Command Palette), `Ctrl + Shift + L` (Khóa ngay).
  * 100% ngôn ngữ giao diện bằng **Tiếng Việt**.
