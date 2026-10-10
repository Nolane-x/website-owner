# Personal Web OS — Hệ Điều Hành Web Cá Nhân & Không Gian Số Độc Quyền

> **Personal Web OS** là một nền tảng web cá nhân hoàn chỉnh kết hợp **Personal CMS + Private Workspace + Public Website + Knowledge/Resource Organizer** dành cho một chủ sở hữu duy nhất (`Single-Owner`).
> Được thiết kế theo ngôn ngữ mỹ học **Nolane UI (NUI) "Bàn Giấy"** (Editorial Studio & Archival Craft), chú trọng sự tĩnh lặng, phông chữ thanh lịch, tốc độ cao và kiến trúc bảo mật đa lớp nghiêm ngặt.

---

## 🌟 Tính Năng Cốt Lõi

### 1. Phân Tách Hai Chế Độ Độc Lập (Dual-Mode Separation)
- **Private Mode (Không gian riêng):** Chỉ chủ nhân truy cập được qua xác thực bảo mật. Quản lý toàn bộ ghi chú, bài viết, dự án, tài nguyên đám mây, các trang dựng Canvas, bộ sưu tập, két sắt bảo mật và nhật ký hệ thống.
- **Public Mode (Website công khai):** Khách chỉ có thể đọc và tương tác với các nội dung mà chủ nhân đã chủ động bật **Publish** (`visibility = 'PUBLIC' AND status = 'PUBLISHED'`).
- **Bảo vệ bằng Mật mã Khách (Guest Password):** Tùy chọn đặt mật mã khách cho toàn bộ website công khai, hoàn toàn độc lập với mật khẩu chủ sở hữu.

### 2. Kiến Trúc Bảo Mật Phòng Thủ Đa Lớp (Defense-in-Depth)
- **Phân tách tuyệt đối tại Backend:** Dữ liệu riêng tư/nháp không bao giờ xuất hiện trong public API, SSR payload, cache hay client JavaScript bundle.
- **Xác thực tối giản cho người dùng nhưng tối tân ở Backend:** Đăng nhập chỉ bằng **Tên đăng nhập + Mật khẩu** trên bất kỳ thiết bị nào (không ép OTP/MFA/điện thoại).
- **Mật khẩu an toàn:** Băm bằng thuật toán `Bcrypt` (salt rounds 12).
- **Phiên làm việc bảo mật:** Token ngẫu nhiên 256-bit được băm SHA-256 trong database và truyền qua Cookie **HttpOnly, Secure, SameSite=Lax**.
- **Sliding-Window Rate Limiter:** Chống brute-force tự động tại API đăng nhập và các endpoint quan trọng.
- **Khóa khẩn cấp (Panic Lock):** Phím tắt `Ctrl + Shift + L` che phủ tức thì màn hình tài liệu giả định.
- **Két Sắt Bí Mật Zero-Knowledge (Vault):** Mã hóa phía trình duyệt bằng **AES-256-GCM + PBKDF2-HMAC-SHA-256 (600.000 vòng cho dữ liệu mới; vẫn hỗ trợ giải mã dữ liệu legacy 100.000 vòng)**. Máy chủ không bao giờ biết mật mã két hay dữ liệu gốc.

### 3. Trình Dựng Trang Dạng Khối (Canvas Block Page Builder)
- Trình dựng trang trực quan hỗ trợ đa khối: **Heading, Text/Markdown, Code, Quote, Image, Button, Spacer, Divider, Card...**
- Xem trước thích ứng tức thì theo các khung nhìn: **Desktop, Tablet, Mobile**.
- Sắp xếp thứ tự khối, nhân bản, xóa khối và chỉnh sửa thuộc tính trực quan.

### 4. Triết Lý Lưu Trữ Liên Kết Trước (Link-First Storage)
- Quản lý tài nguyên số không làm nặng máy chủ cá nhân thông qua việc lưu trữ metadata và liên kết tới **Google Drive, GitHub, Mega, Notion, Figma...**

### 5. Sao Lưu & Khôi Phục JSON (JSON Backup & Restore)
- Export dữ liệu ứng dụng thành JSON kèm manifest SHA-256 cho payload `data` và số lượng bản ghi của từng nhóm; bao gồm workflow cùng lịch sử chạy đã lưu, trình duyệt kiểm tra checksum trước khi tải.
- Import hỗ trợ bước preview không ghi database: xác minh checksum, hiển thị số lượng theo module và cảnh báo trước khi người dùng xác nhận restore.
- Restore là thao tác thêm dữ liệu theo transaction, không thay thế hoặc đồng bộ database hiện có; chạy lại cùng backup có thể tạo bản sao trùng lặp. Workflow run history được phục hồi chỉ khi workflow nguồn được import và các ID quan hệ được ánh xạ lại. Backup legacy thiếu manifest được đánh dấu chưa xác minh. Checksum không phải chữ ký chống giả mạo và vẫn cần giữ bản sao ngoại tuyến an toàn.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend & Backend Framework:** [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/) + NUI "Bàn Giấy" Color & Typography Tokens
- **Database & ORM:** [Drizzle ORM](https://orm.drizzle.team/)
  - Chế độ tự động: Cơ sở dữ liệu nhúng **PGlite WASM** (lưu tại `./data/webos_pglite`, zero-config)
  - Chế độ Production: Kết nối **PostgreSQL / Supabase** thông qua biến môi trường `DATABASE_URL`
- **Mã Hóa & Bảo Mật:** `bcryptjs`, `isomorphic-dompurify`, `Web Crypto API (AES-GCM, PBKDF2)`
- **Edge Security Gateway:** Cloudflare Worker (tại thư mục `worker/`)

---

## 🚀 Khởi Động Nhanh

### 1. Cài đặt phụ thuộc
```bash
npm install
```

### 2. Khởi chạy môi trường phát triển
```bash
npm run dev
```

Truy cập:
- **Trang chủ công khai:** [http://localhost:3000](http://localhost:3000)
- **Cổng đăng nhập chủ sở hữu:** [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

### 3. Khởi tạo tài khoản Chủ sở hữu (First-Run Secure Bootstrap)
- **Môi trường Phát triển (Local Dev):** Có thể bật `ENABLE_DEV_SEED=true` trong `.env` để tạo dữ liệu mẫu kiểm thử ban đầu, hoặc truy cập giao diện khởi tạo `/admin/bootstrap`.
- **Môi trường Production:** Hệ thống **TUYỆT ĐỐI KHÔNG CÓ mật khẩu mặc định**.
- Khi triển khai lần đầu, truy cập đường dẫn an toàn:
  `https://your-domain.com/admin/bootstrap`
- Chủ sở hữu tự tay thiết lập **Tên đăng nhập** và **Mật khẩu cá nhân**.
- Sau khi khởi tạo xong, cổng bootstrap (`/api/auth/bootstrap` và `/admin/bootstrap`) sẽ tự động **khóa vĩnh viễn** (HTTP 403 Forbidden).

---

## ⌨️ Phím Tắt Tiện Ích

| Phím tắt | Tác vụ |
| :--- | :--- |
| **`Ctrl + K`** hoặc **`Cmd + K`** | Mở bảng lệnh điều hướng nhanh (Command Palette) / Tìm kiếm công khai |
| **`Ctrl + Shift + L`** | Kích hoạt ngay lập tức chế độ Khóa khẩn cấp (Panic Lock) |
| **`Ctrl + Shift + N`** | Mở nhanh cửa sổ thêm nội dung mới (Quick Add Modal) |

---

## 📁 Cấu Trúc Thư Mục

```
├── src/
│   ├── app/
│   │   ├── (public)/              # Các trang công khai cho khách
│   │   │   ├── about/             # Giới thiệu & Triết lý
│   │   │   ├── articles/          # Danh sách & Trình đọc bài viết
│   │   │   ├── collections/       # Tuyển tập chủ đề
│   │   │   ├── p/[slug]/          # Trình kết xuất trang Canvas Blocks
│   │   │   ├── projects/          # Danh sách & Chi tiết dự án
│   │   │   ├── resources/         # Thư viện tài nguyên Link-First
│   │   │   ├── share/[token]/     # Xem nội dung chia sẻ Unlisted bí mật
│   │   │   ├── layout.tsx         # Layout công khai (Header, Footer, Khóa khách)
│   │   │   └── page.tsx           # Trang chủ công khai (Hero, Dự án, Tài nguyên)
│   │   ├── admin/                 # Không gian riêng tư (Private Workspace)
│   │   │   ├── collections/       # Quản lý bộ sưu tập
│   │   │   ├── content/           # Quản lý ghi chú & bài viết
│   │   │   ├── login/             # Trang đăng nhập chủ nhân
│   │   │   ├── pages/             # Trình quản lý & dựng Canvas Page
│   │   │   ├── projects/          # Quản lý dự án kỹ thuật
│   │   │   ├── resources/         # Quản lý tài nguyên liên kết
│   │   │   ├── security/          # Trung tâm bảo mật, phiên làm việc & audit logs
│   │   │   ├── settings/          # Cài đặt Theme, Hồ sơ, Mật mã khách, Sao lưu
│   │   │   ├── vault/             # Két sắt mã hóa AES-256-GCM
│   │   │   ├── layout.tsx         # Layout riêng tư (Sidebar, Header, Panic Screen)
│   │   │   └── page.tsx           # Bảng điều khiển riêng (Dashboard)
│   │   ├── api/                   # Hệ thống API phân tách nghiêm ngặt
│   │   │   ├── admin/             # API riêng tư (Yêu cầu phiên chủ nhân)
│   │   │   ├── auth/              # API xác thực, đăng nhập, phiên
│   │   │   └── public/            # API công khai (Chỉ query dữ liệu PUBLISHED)
│   │   ├── globals.css            # NUI CSS variables & typography tokens
│   │   └── layout.tsx             # Root Layout
│   ├── components/
│   │   ├── layout/                # Sidebar, Admin Header, Public Header, Footer
│   │   └── ui/                    # Button, Input, Modal, Badge, Dropdown, Panic Lock...
│   └── lib/
│       ├── auth/                  # Password hashing, Session engine, Auth guards
│       ├── db/                    # Drizzle schema, PGlite/Postgres dual-engine, Seed
│       ├── security/              # Rate limiting, Audit logger, Vault AES-GCM crypto
│       └── types/                 # TypeScript interfaces
├── tests/                         # Bộ kiểm thử tự động (Vitest)
├── worker/                        # Cloudflare Worker Edge Security Gateway
├── DEPLOYMENT.md                  # Hướng dẫn triển khai Vercel, Docker, VPS, Cloudflare
├── SECURITY.md                    # Tài liệu chính sách phòng thủ đa lớp
└── project-manifest.json          # Đặc tả kiến trúc kỹ thuật hệ thống
```

---

## 🧭 Trạng thái triển khai Web OS 5.0

Bảng dưới đây phân biệt tính năng đang có mã thực thi với các mục tiêu dài hạn trong master specification. Không coi một màn hình hoặc nút bấm là bằng chứng tính năng đã hoàn tất.

| Khu vực | Trạng thái hiện tại |
| :--- | :--- |
| Desktop ảo / Window Manager | Có thao tác cửa sổ và lưu bố cục trong trình duyệt; đây không phải cửa sổ hệ điều hành thật. |
| Inbox, Tasks, Notes, Projects, Research và các module dữ liệu | Nhiều luồng CRUD đã nối API và database; mức độ hoàn chỉnh khác nhau theo từng module. |
| AI Copilot | Có lời gọi thật tới OpenAI-compatible API/Groq/Ollama và tìm kiếm từ khóa trong các API dữ liệu. Context riêng tư mặc định tắt. Chưa phải full RAG, multi-agent Mission Control hoặc agent tự chạy vô hạn. |
| Workflow | Có executor cho Inbox → Task và báo cáo task quá hạn chỉ đọc; mọi kết quả được lưu trong lịch sử bền vững. Scheduler Vercel hằng ngày cho báo cáo quá hạn dùng claim DB chống chạy trùng theo ngày Việt Nam. Preflight compiler xác minh DAG/tuyến tính, phát hiện chu trình, cạnh lỗi, node mồ côi và tính thứ tự ổn định trước khi lưu/chạy. Cần `CRON_SECRET` trong Production. Chưa có executor tổng quát cho node AI/action/approval hoặc scheduler cho hành động tùy ý. |
| Creator Studio | Nội dung được lưu qua API; có thể gọi model thật để tạo dàn ý. Trạng thái “published” trong pipeline không tự đăng nội dung ra mạng xã hội. |
| Calendar & Habits | Sự kiện lịch nội bộ và ngày hoàn thành thói quen được lưu trong database. Chưa có đồng bộ Google Calendar/Apple Calendar hoặc nhắc lịch khi ứng dụng đóng. |
| Virtual Explorer / Backup | Hiển thị số bản ghi API; JSON export có manifest SHA-256 phạm vi `data` và per-module counts. Import có preview không ghi DB, xác minh checksum và yêu cầu xác nhận trước khi thêm dữ liệu trong transaction. Chưa phải trình duyệt file của ổ đĩa máy; checksum không chứng minh nguồn gốc tệp. |
| Local-first, offline, sync, plugin sandbox, native companion | Là các mục tiêu trong đặc tả. Chưa được phép coi là hoàn chỉnh chỉ vì có tên module hoặc giao diện. Production hiện dùng PostgreSQL qua `DATABASE_URL`; dữ liệu không được mặc định chỉ nằm trên thiết bị. |
| Privacy / Panic Lock | Có audit viewer và overlay khóa giao diện; không xóa sạch RAM trình duyệt và không thay thế khóa màn hình hệ điều hành. |

### Quy trình sử dụng AI

- Chọn provider/model và tự cung cấp API key nếu cần. Khóa được giữ trong state của cửa sổ khi đang mở; không được ghi vào database hoặc `localStorage` bởi các module AI vừa sửa.
- Các request tới Groq/OpenAI/Ollama được gửi trực tiếp từ trình duyệt tới endpoint đã chọn; nhà cung cấp có thể xử lý prompt theo chính sách riêng và CORS có thể chặn request.
- Chỉ bật tùy chọn context khi chủ động muốn đưa dữ liệu cá nhân đã truy xuất vào prompt; luôn kiểm tra nội dung trước khi gửi.

## 🧪 Kiểm Thử Hệ Thống (Testing)

Chạy bộ kiểm thử tự động xác minh tính toàn vẹn của mã hóa, băm mật khẩu, chống rò rỉ dữ liệu Private/Public:

```bash
npm run test
```

Tất cả các kiểm thử đều thực hiện với môi trường in-memory độc lập, đảm bảo 100% tỷ lệ vượt qua.
