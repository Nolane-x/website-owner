# Hướng Dẫn Triển Khai Thực Tế (DEPLOYMENT.md) — Personal Web OS

Hệ thống **Personal Web OS** được thiết kế để triển khai thực tế dễ dàng trên các nền tảng đám mây hiện đại hoặc máy chủ riêng (VPS).

---

## 1. Yêu Cầu Hệ Thống

- **Node.js**: **24.x** (được ghim trong `package.json` và CI để đồng nhất với dependency sanitizer hiện tại). Next.js 16 yêu cầu tối thiểu 20.9, nhưng `isomorphic-dompurify@4.5.0` cần Node.js 22.22.2+ hoặc 24.15+; production dùng 24.x để tránh lệch môi trường.
- **Cơ sở dữ liệu**:
  - **Tùy chọn A (Mặc định Zero-Config)**: Tự động sử dụng cơ sở dữ liệu nhúng **PGlite WASM** (lưu trữ cục bộ tại thư mục `./data/webos_pglite`). Không cần cài đặt PostgreSQL máy chủ ngoài.
  - **Tùy chọn B (Production quy mô lớn)**: PostgreSQL 14+ hoặc dịch vụ cơ sở dữ liệu đám mây như **Supabase**, **Neon**, **Aiven**, **Railway**.

---

## 2. Khởi tạo & Trải nghiệm Cục Bộ (Local Development)

```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Thiết lập biến môi trường (tùy chọn)
# Mặc định hệ thống dùng PGlite WASM nhúng tại ./data/webos_pglite
# Có thể đặt ENABLE_DEV_SEED=true nếu muốn nạp dữ liệu mẫu ban đầu.

# 3. Khởi chạy máy chủ phát triển
npm run dev
```

Mở trình duyệt:
- Website Công Khai: `http://localhost:3000`
- Cổng khởi tạo lần đầu: `http://localhost:3000/admin/bootstrap` (hoặc `/admin/login` sẽ tự chuyển hướng)

---

## 3. Triển Khai Lên Vercel (Production)

1. Đẩy mã nguồn lên kho chứa GitHub cá nhân.
2. Đăng nhập vào [Vercel Dashboard](https://vercel.com/) và bấm **Add New Project**.
3. Chọn kho chứa GitHub `website-owner`.
4. Cấu hình biến môi trường (Environment Variables) trong Vercel:
   - `DATABASE_URL`: Đường dẫn kết nối PostgreSQL (ví dụ Supabase connection string dạng `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require`). **Bắt buộc trong Production**.
   - `NODE_ENV`: `production`
5. Bấm **Deploy**. Vercel sẽ tự động build và cung cấp tên miền HTTPS bảo mật.
6. **Khởi tạo tài khoản Chủ sở hữu lần đầu:**
   Truy cập `https://your-domain.com/admin/bootstrap`.
   Nhập Tên đăng nhập và Mật khẩu bạn mong muốn.
   Sau khi hoàn tất, hệ thống sẽ tự động vô hiệu hóa vĩnh viễn giao diện và API bootstrap. Production **hoàn toàn không có tài khoản hoặc mật khẩu mặc định**.

---

## 4. Triển Khai Bằng Docker / VPS Tự Quản Trị

Tạo tập tin `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/data ./data

EXPOSE 3000
CMD ["npm", "start"]
```

Chạy container:
```bash
docker build -t personal-webos .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name webos personal-webos
```

---

## 5. Triển Khai Cloudflare Worker Edge Gateway (Tùy chọn tăng cường bảo mật)

Cloudflare Worker đóng vai trò là lá chắn phòng thủ tại biên mạng (Edge Shield) trước máy chủ chính:

```bash
# Di chuyển vào thư mục worker
cd worker

# Đăng nhập vào Cloudflare
npx wrangler login

# Cập nhật địa chỉ ORIGIN_URL trong wrangler.jsonc thành tên miền Vercel / VPS của bạn
# Ví dụ: "ORIGIN_URL": "https://my-personal-webos.vercel.app"

# Triển khai lên mạng biên Cloudflare
npx wrangler deploy
```

Sau khi triển khai, tên miền Cloudflare Worker (ví dụ: `https://webos-gateway.your-subdomain.workers.dev`) sẽ tự động bảo vệ hệ thống của bạn chống lại quét bot, brute force và ép buộc tiêu đề bảo mật.
