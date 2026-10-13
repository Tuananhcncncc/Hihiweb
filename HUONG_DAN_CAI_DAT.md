# Hướng dẫn cài đặt và chạy Hihi (Windows + VS Code + SSMS 22)


## A. Cài công cụ

| Công cụ | Dùng để | Cài nhanh (PowerShell) |
|---|---|---|
| JDK 21 | Chạy Spring Boot (JDK 17 trở lên đều được) | `winget install EclipseAdoptium.Temurin.21.JDK` |
| Apache Maven | Build backend | `winget install Apache.Maven` |
| Node.js LTS | Chạy React | `winget install OpenJS.NodeJS.LTS` |
| VS Code | Soạn code | `winget install Microsoft.VisualStudioCode` |
| SQL Server (Developer hoặc Express) | Máy chủ database | Tải từ trang Microsoft SQL Server Downloads |


Sau khi cài, **đóng và mở lại VS Code / terminal**, rồi kiểm tra:

```
java -version
mvn -version
node -v
npm -v
```

Lần đầu `npm install` sẽ tải thêm thư viện **qrcode.react** (vẽ mã QR nạp tiền), cần có mạng.

Cài extension trong VS Code: **Extension Pack for Java**, **Spring Boot Extension Pack**, **ES7+ React/Redux/React-Native snippets** , **SQL Server (mssql)** .

## B. Thiết lập SQL Server và tạo database

1. Mở **SSMS 22**, kết nối vào server của bạn (ví dụ `localhost`).
2. **Bật đăng nhập bằng tài khoản sa**: chuột phải tên server → Properties → Security → chọn **SQL Server and Windows Authentication mode** → OK.
3. Mở rộng Security → Logins → chuột phải **sa** → Properties:
   - Tab General: đặt mật khẩu (nhớ mật khẩu này).
   - Tab Status: chọn **Enabled**.
4. **Bật TCP/IP cổng 1433**: mở **SQL Server Configuration Manager** → SQL Server Network Configuration → Protocols for ... → bật **TCP/IP**. Chuột phải TCP/IP → Properties → tab IP Addresses → kéo xuống **IPAll**: để trống *TCP Dynamic Ports*, ghi **1433** vào *TCP Port*.
5. Khởi động lại dịch vụ: SQL Server Configuration Manager → SQL Server Services → chuột phải SQL Server → **Restart**.
6. Trong SSMS: **File → Open → File** chọn `database/hihi_db.sql` → bấm **Execute (F5)**.
7. Kiểm tra: chạy `SELECT * FROM HihiDB.dbo.Products;` phải ra 21 sản phẩm, `SELECT * FROM HihiDB.dbo.ProductRelations;` ra 13 dòng quan hệ combo. Nếu chữ tiếng Việt bị lỗi, mở lại file bằng File → Open → nút mũi tên cạnh Open → **Open With Encoding → Unicode (UTF-8)**.

## C. Chạy Backend (Spring Boot)

1. Mở thư mục `hihi-shop` bằng VS Code (File → Open Folder).
2. Mở `backend/src/main/resources/application.properties`, sửa dòng mật khẩu:
   ```
   spring.datasource.password=MAT_KHAU_SA_CUA_BAN
   ```
3. Mở terminal trong VS Code (Ctrl + `) và chạy:
   ```
   cd backend
   mvn spring-boot:run
   ```
   
4. Kiểm tra: mở trình duyệt vào http://localhost:8080/api/categories, phải thấy danh sách 7 danh mục dạng JSON.

## D. Chạy Frontend (React)

Mở một terminal **thứ hai** (giữ nguyên terminal backend đang chạy):

```
cd frontend
npm install
npm run dev
```

Mở http://localhost:5173 để xem web.



## F. Tài khoản để test

Tất cả đã có sẵn sau khi chạy `hihi_db.sql`:

| Vai trò | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| **Admin** | `admin@hihi.vn` | `Admin@123` | Vào được trang Quản trị |
| Khách mẫu 1 | `demo1@hihi.local` | `123456` | Ví HihiPay có **1.250.000 ₫** (đủ mua nhiều món) |
| Khách mẫu 2 | `demo2@hihi.local` | `123456` | Ví HihiPay có **500.000 ₫** (thử trường hợp "Số dư không đủ") |
| Khách mẫu 3 | `demo3@hihi.local` | `123456` | Ví HihiPay **0 ₫** (thử nạp tiền từ đầu) |

Bạn cũng có thể tự đăng ký tài khoản mới ngay trên web (luôn là khách thường, ví HihiPay bắt đầu từ 0 ₫).

Muốn đổi mật khẩu hoặc tạo admin khác: đăng ký một tài khoản trên web, rồi trong SSMS chạy
`UPDATE Users SET role = 'ADMIN' WHERE email = 'email-cua-ban@gmail.com';` và đăng nhập lại.


## G. Dùng trang quản trị

1. Đăng nhập bằng `admin@hihi.vn`. Ở góc trên bên phải xuất hiện nút **Quản trị** (hoặc mở http://localhost:5173/#admin).
2. Tab **Sản phẩm**: bấm "+ Thêm sản phẩm", chọn danh mục, nhập tên, giá, tồn kho, mô tả. Ô "Tên file ảnh": chép ảnh vào `frontend/public/images/products/` trước, rồi nhập đúng tên file, ảnh xem trước hiện ngay bên cạnh.
3. Tab **Danh mục**: thêm danh mục mới (kèm 1 emoji), sau đó danh mục tự xuất hiện ở trang chủ.
4. Tab **Đơn hàng**: bấm "Chi tiết" ở một đơn để xem sản phẩm, địa chỉ và đổi trạng thái.
5. Bấm "Về cửa hàng" để quay lại trang bán hàng.

## H. Kiểm tra toàn bộ chức năng

**Mua hàng cơ bản**

1. Bấm **Đăng Ký**, tạo tài khoản, web tự đăng nhập.
2. Bấm từng danh mục: sản phẩm hiện ngay bên dưới, trang không chuyển.
3. Gõ chữ **áo** vào ô tìm kiếm: bên dưới hiện danh sách Áo thun, Áo sơ mi, Áo kiểu... Chọn một dòng (hoặc nhấn Enter) để xem kết quả.
4. Bấm một sản phẩm: xem ảnh, mô tả → **Thêm vào giỏ hàng** hoặc **Mua ngay**.

**Admin không mua được**

5. Đăng nhập `admin@hihi.vn`: trên cùng chỉ có **Quản trị** và **Đăng xuất** (không có giỏ hàng, Đơn hàng, HihiPay). Mở một sản phẩm: không có nút Thêm vào giỏ / Mua ngay.

**Ví HihiPay**

6. Đăng nhập `demo2@hihi.local` (ví 500.000 ₫). Mở **Laptop văn phòng 14 inch Core i5** → **Mua ngay** → nhập thông tin giao hàng → chọn **HihiPay** (thấy "Số dư: 500.000 ₫") → **Đặt hàng**: hiện "Số dư không đủ", cần 12.990.000 ₫, bấm **Nạp thêm tiền**.
7. Ở trang nạp tiền: chọn 500.000 → **Tạo mã QR**. Lúc này số dư vẫn là 500.000 ₫ (giao dịch đang chờ, chưa cộng tiền).
8. Trên trang QR bấm **Mở màn hình xác nhận** (mở tab mới) → **XÁC NHẬN** → "Thanh toán thành công, +500.000 ₫". Quay lại tab QR cũ: tự chuyển sang thành công. Bấm **Về HihiPay**: số dư 1.000.000 ₫, bấm vào giao dịch để xem chi tiết.
9. Mua một sản phẩm rẻ (ví dụ Ốp lưng 99.000 ₫) bằng **HihiPay**: báo "Đã trừ 99.000 ₫ từ ví HihiPay" và mã giao dịch dạng `MP2026...`.

**Đơn hàng**

10. Bấm **Đơn hàng** ở góc trên: thấy đơn vừa đặt với trạng thái **Đã thanh toán**.
11. Mở thêm một cửa sổ ẩn danh, đăng nhập admin → tab **Đơn hàng** → đổi đơn đó sang **Đang giao**. Quay lại trang Đơn hàng của khách (bấm **Tải lại** hoặc đợi tối đa 15 giây): trạng thái đã là **Đang giao**. Đổi tiếp sang **Hoàn thành**, hoặc **Đã hủy** (tiền được hoàn vào ví, xem trong lịch sử HihiPay).

**AI tạo combo**

12. Ở trang chủ, kéo xuống dưới thấy " Hihi AI tạo combo cho bạn" với các combo.
13. Mở **Laptop văn phòng 14 inch Core i5**: cuối cửa sổ có "Hihi AI đề xuất Combo Làm Việc: Laptop + Chuột + Bàn phím", tổng tiền và lời giải thích. Bấm **Thêm cả combo vào giỏ hàng**.
14. Mở **Chân máy tripod nhôm 1.6m**: có 2 combo (với Mirrorless và với Action camera). Mở **Quần jeans nam slim fit**: có 2 combo (công sở và dạo phố).

**Quản trị**

15. Admin → tab Sản phẩm: xóa (ẩn) một sản phẩm, quay lại cửa hàng: sản phẩm đó đã biến mất.




