# 💸 Theo dõi chi tiêu

App ghi chép thu/chi cho gia đình: React + Vite + Tailwind, dữ liệu trên **Supabase**, deploy lên **Render** (Static Site).

## Tính năng

- **Ghi giao dịch**: chọn Nhóm → Khoản → Badge (nhiều), số tiền (gợi ý ×1.000), ngày, ghi chú; tuỳ chọn hình thức thanh toán và ảnh hoá đơn.
- **Lịch sử**: gom theo ngày, lọc theo khoảng ngày / nhóm / khoản / badge / vào-ra / thanh toán / người nhập, tìm kiếm, sửa/xoá, **xuất Excel**.
- **Thống kê** theo Ngày / Tuần / Tháng / Năm:
  - Tổng tiền vào, ra, chênh lệch, so với kỳ liền trước
  - Biểu đồ so sánh các kỳ gần nhất (14 ngày / 12 tuần / 12 tháng / 5 năm), có thể xem dạng bảng
  - Cơ cấu theo nhóm; chi tiết từng nhóm → khoản → badge, kèm % thay đổi
  - Top 10 giao dịch lớn (ra/vào)
- **Danh mục** khai báo động: `categories` → `category_items` (mỗi khoản là *tiền vào* hoặc *tiền ra*) → `badges`.
- **Nhiều thành viên**: đăng nhập email/mật khẩu, dùng chung một sổ; ai cũng xem được, chỉ người nhập (hoặc admin) được sửa/xoá.

## Cấu trúc dữ liệu

```
categories (code)  ──<  category_items (category_code, direction in|out)  ──<  badges
                                   │                                            │
                              transactions  ───────<  transaction_badges  >─────┘
members (email, role, user_id)  — danh sách người được phép truy cập
```

## Bảo mật

- Tắt tự đăng ký; chỉ người được **mời** mới có tài khoản.
- Ngoài ra còn kiểm tra bảng `members`: tài khoản không có trong danh sách sẽ không đọc/ghi được gì (RLS trên mọi bảng).
- `category_code`, `direction` và `created_by` của giao dịch do trigger trong DB tự điền, client không sửa được.
- Ảnh hoá đơn nằm trong bucket **private**, chỉ xem qua signed URL có hạn 10 phút.
- Frontend chỉ dùng **anon key** (đây là key được phép công khai, vì quyền đã khoá bằng RLS). **Tuyệt đối không** đưa `service_role` key vào app.
- Render gửi kèm các security header (CSP, HSTS, X-Frame-Options…) theo `render.yaml`.

---

## Cài đặt

### 1. Supabase

1. **SQL Editor** → dán và chạy toàn bộ [supabase/001_schema.sql](supabase/001_schema.sql).
2. Mở [supabase/002_seed.sql](supabase/002_seed.sql), **sửa `ban@example.com` thành email của bạn**, rồi chạy. File này tạo admin đầu tiên và một số danh mục mẫu; phần danh mục mẫu có thể xoá trước khi chạy.
3. **Authentication → Sign In / Providers**:
   - Bật **Email**.
   - **Tắt** "Allow new users to sign up".
4. **Authentication → URL Configuration**:
   - *Site URL*: URL Render của bạn, ví dụ `https://theo-doi-chi-tieu.onrender.com`.
   - *Redirect URLs*: thêm URL đó và `http://localhost:5173`.
5. **Authentication → Users → Invite user** → nhập email của bạn. Mở email, bấm link, đặt mật khẩu là xong.
6. **Project Settings → API**: lấy *Project URL* và *anon / publishable key*.

### 2. Chạy ở máy

```bash
cp .env.example .env      # điền VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev               # http://localhost:5173
```

### 3. Deploy lên Render

1. Đẩy code lên GitHub.
2. Render → **New → Blueprint** → chọn repo; Render sẽ đọc `render.yaml`. Hoặc tạo **Static Site** thủ công với:
   - Build command: `npm ci && npm run build`
   - Publish directory: `dist`
   - Redirect/Rewrite: `/*` → `/index.html` (**Rewrite**)
3. Khai báo Environment: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Đổi biến xong phải **build lại** thì mới có hiệu lực.

### 4. Thêm thành viên gia đình

1. Admin vào app → **Tài khoản → + Thêm**, nhập email và tên hiển thị.
2. Supabase → **Authentication → Users → Invite user** với email đó.
3. Người được mời bấm link trong email → đặt mật khẩu → dùng được ngay.

> Mẹo: trên điện thoại, mở app bằng trình duyệt → "Thêm vào màn hình chính" để dùng như một app.
