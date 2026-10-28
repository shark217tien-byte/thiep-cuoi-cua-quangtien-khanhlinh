# Thiệp cưới riêng v2 — mã nguồn khởi tạo

Phiên bản này bổ sung album ảnh, RSVP, lời chúc cần duyệt, link theo tên khách, nhạc nền, mã QR mừng cưới và đăng nhập trang quản trị.

> Đây là starter project cần cấu hình và kiểm thử trước khi công khai. Không điền dữ liệu thật hoặc thông tin ngân hàng trước khi bạn kiểm tra kỹ quyền truy cập và mã QR.

## Công nghệ

- Next.js 14 + React + TypeScript
- Supabase Auth, Postgres, Storage với Row Level Security (RLS)
- Vercel + tên miền riêng
- VietQR URL cho mã QR ngân hàng (tùy chọn)

## 1. Chạy thử local

Cần Node.js 20+.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Trên Windows PowerShell, có thể sao chép thủ công `.env.example` thành `.env.local`.
Mở `http://localhost:3000` và trang quản trị tại `http://localhost:3000/admin`.

Không có Supabase thì giao diện vẫn mở, nhưng gửi RSVP/lời chúc, tải ảnh và lưu nội dung sẽ không hoạt động.

## 2. Tạo Supabase an toàn

1. Tạo project ở https://supabase.com.
2. Vào Authentication > Users, tạo tài khoản admin bằng email của bạn.
3. Sao chép UUID của tài khoản admin.
4. Mở `supabase/schema.sql`; thay `REPLACE_WITH_ADMIN_USER_UUID` bằng UUID thật (giữ dấu nháy đơn quanh UUID).
5. Chạy toàn bộ SQL trong Supabase SQL Editor.
6. Sau khi tạo tài khoản admin, tắt public signups trong Authentication settings để khách lạ không tự tạo tài khoản.
7. Vào Project Settings > API, lấy Project URL và anon/public key, điền vào `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL=https://www.tenmiencuaban.vn
```

Chỉ dùng `anon/public` key ở trình duyệt. Không bao giờ đưa `service_role` key vào mã nguồn client hoặc biến bắt đầu bằng `NEXT_PUBLIC_`.

## 3. Đăng nhập và chỉnh sửa

- Mở `/admin`, đăng nhập bằng tài khoản đã tạo trong Supabase Auth.
- Sửa tên, ngày giờ, địa điểm, lời mời, màu nhấn, nhạc URL, thông tin mừng cưới.
- Tải ảnh album. Mỗi ảnh tối đa 8 MB, loại JPG/PNG/WebP/AVIF.
- Chọn “Công khai thiệp” và lưu sau khi đã kiểm tra nội dung.
- RSVP có thể xuất CSV từ trang quản trị.

Lưu ý: phiên bản starter hiện đọc dữ liệu công khai đã xuất bản theo slug cố định `minh-quan-ngoc-uyen`. Đổi slug cần cập nhật đồng bộ trong `src/lib/types.ts`, `src/components/WeddingPage.tsx` và bản ghi SQL.

## 4. Link cá nhân hóa theo khách mời

Sau khi deploy, chia sẻ link dạng:

`https://www.tenmiencuaban.vn/?guest=Em%20Linh`

Tên sau `guest=` sẽ xuất hiện trong lời chào. Dùng URL encoding cho dấu cách và ký tự tiếng Việt. Không đưa số điện thoại, địa chỉ nhà hoặc thông tin nhạy cảm vào query string vì URL có thể được lưu trong lịch sử trình duyệt/log.

## 5. Album ảnh và nhạc

- Tải ảnh lên từ trang quản trị. Bucket `wedding-gallery` là public để khách xem được ảnh.
- Nhạc phải là URL HTTPS tới tệp âm thanh bạn có quyền sử dụng. Trình duyệt thường chặn tự phát âm thanh; khách cần bấm nút bật nhạc.
- Chỉ dùng ảnh, nhạc mà bạn có quyền chia sẻ. Không tải ảnh khách mời lên nếu chưa có sự đồng ý phù hợp.

## 6. RSVP và lời chúc

- Khách gửi RSVP; dữ liệu không công khai đọc được.
- Lời chúc mới được lưu với `approved=false`, nên không hiển thị công khai cho đến khi admin duyệt.
- Starter đã có chức năng xuất RSVP CSV. Chức năng duyệt lời chúc bằng giao diện admin cần được bổ sung trước khi sử dụng thực tế; có thể duyệt qua Supabase Table Editor sau khi đăng nhập quyền chủ project.
- Trước khi mở công khai, cân nhắc CAPTCHA, rate limit và chính sách lưu/xóa dữ liệu khách mời.

## 7. QR mừng cưới — kiểm tra kỹ

Bạn có thể nhập mã ngân hàng VietQR, số tài khoản và tên chủ tài khoản. Trang tạo URL ảnh QR từ dịch vụ VietQR bên ngoài. Kiểm tra mã QR trên điện thoại và xác nhận đúng ngân hàng, người nhận, số tài khoản trước khi công khai. Nếu muốn tránh chia sẻ dữ liệu với dịch vụ ngoài, tự tạo ảnh QR rồi tải lên nơi bạn tin cậy và điền URL QR riêng. Không đặt số tiền mặc định nếu không mong muốn.

## 8. Deploy lên Vercel và nối tên miền riêng

1. Tạo repository GitHub riêng, commit mã nguồn (không commit `.env.local`).
2. Import repo ở https://vercel.com.
3. Vercel > Project Settings > Environment Variables: thêm ba biến ở trên cho Production, Preview và Development theo nhu cầu.
4. Deploy và kiểm tra URL `*.vercel.app` trước.
5. Trong Vercel > Settings > Domains, thêm tên miền mua từ nhà đăng ký. Làm theo đúng bản ghi DNS Vercel cung cấp (thường A/ALIAS cho apex và CNAME cho `www`; không sao chép bản ghi từ hướng dẫn cũ nếu dashboard đưa giá trị khác).
6. Đợi DNS/SSL hoàn tất, cập nhật `NEXT_PUBLIC_SITE_URL` thành URL HTTPS chính thức rồi redeploy.
7. Kiểm thử cả trên điện thoại và máy tính: trang chưa xuất bản, đăng nhập sai, lưu nội dung, ảnh, RSVP, lời chúc, link khách mời, QR và nhạc.

## 9. Những việc cần hoàn thiện trước khi production

- Thêm UI duyệt / ẩn / xóa lời chúc.
- Thêm CAPTCHA/rate limiting chống spam cho RSVP và lời chúc.
- Xóa ảnh khỏi Storage khi gỡ khỏi album (hiện tại gỡ chỉ bỏ URL khỏi danh sách).
- Bổ sung trang chính sách riêng tư và cách liên hệ để yêu cầu xóa dữ liệu.
- Kiểm tra RLS bằng tài khoản anon và tài khoản khách, không chỉ bằng tài khoản admin.
- Bảo vệ email admin bằng mật khẩu mạnh và MFA nếu có.
- Sao lưu dữ liệu và kiểm tra quyền sở hữu tên miền/tài khoản triển khai.

## Cấu trúc thư mục

```text
src/
  app/
    page.tsx
    admin/page.tsx
    layout.tsx
    globals.css
  components/
    WeddingPage.tsx
  lib/
    supabase.ts
    types.ts
supabase/
  schema.sql
```

## Chi phí

Vercel, Supabase và nhà cung cấp tên miền có chính sách giá/giới hạn thay đổi theo thời gian. Có thể thử trên gói miễn phí trước, nhưng tên miền riêng thường phải trả phí đăng ký và gia hạn hằng năm. Kiểm tra giá và hạn mức hiện hành trước khi chọn gói.
