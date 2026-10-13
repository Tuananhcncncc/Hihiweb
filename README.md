# Hihi - Website bán hàng (Spring Boot + React + SQL Server)

Slogan: **"Bạn cần, chúng tôi có. Bạn khó, chúng tôi lo"**

Dự án học tập theo kiến trúc **client - server**: giao diện React gọi API REST của Spring Boot, dữ liệu lưu trong SQL Server. Thanh toán và ví **HihiPay** chỉ là **mô phỏng** (không có tiền thật).

## 1. Kiến trúc

```
┌──────────────────────┐    HTTP / JSON     ┌───────────────────────┐    JDBC    ┌──────────────┐
│  FRONTEND (Client)   │ ─────────────────► │  BACKEND (Server)     │ ─────────► │  SQL Server  │
│  React + Vite        │ ◄───────────────── │  Spring Boot (Java)   │ ◄───────── │  Database    │
│  http://localhost:5173│   /api/...        │  http://localhost:8080│            │  HihiDB      │
└──────────────────────┘                    └───────────────────────┘            └──────────────┘
```

Thứ tự xây dựng: **Database → Backend → Frontend → AI tạo combo**. Database làm trước vì cấu trúc bảng quyết định API, và giao diện chỉ việc gọi API.

## 2. Cấu trúc thư mục

```
hihi-shop/
├── README.md                    <- giải thích chương trình
├── HUONG_DAN_CAI_DAT.md         <- hướng dẫn cài đặt và chạy
├── database/
│   ├── hihi_db.sql                  <- tạo DB HihiDB: bảng, dữ liệu mẫu, admin + khách mẫu, ví HihiPay mẫu, quan hệ combo  
├── backend/                     <- SERVER (Spring Boot, Java 17+)
│   ├── pom.xml                  <- khai báo thư viện (Maven)
│   └── src/main/
│       ├── resources/application.properties   <- cấu hình kết nối SQL Server, cổng 8080
│       └── java/com/hihi/shop/
│           ├── HihiApplication.java       <- điểm khởi động
│           ├── security/
│           │   ├── TokenStore.java            <- cấp và tra cứu token đăng nhập
│           │   ├── AuthInterceptor.java       <- kiểm tra token; chặn người không phải admin vào /api/admin
│           │   └── CustomerGuard.java         <- chặn tài khoản admin mua hàng (403)
│           ├── config/
│           │   ├── WebConfig.java                 <- CORS (cho React gọi API) + mã hóa mật khẩu BCrypt
│           │   ├── ApiException.java              <- lỗi có mã HTTP riêng (403, 402...) kèm dữ liệu phụ
│           │   └── GlobalExceptionHandler.java    <- đổi lỗi thành JSON {"message": "..."}
│           ├── controller/
│           │   ├── AuthController.java        <- đăng ký, đăng nhập
│           │   ├── CatalogController.java     <- danh mục, sản phẩm, tìm kiếm, gợi ý khi gõ, chi tiết
│           │   ├── CartController.java        <- giỏ hàng (admin không thêm được)
│           │   ├── OrderController.java       <- đặt hàng (COD / HihiPay / thẻ) + danh sách đơn của khách
│           │   ├── WalletController.java      <- ví HihiPay: số dư, nạp tiền, lịch sử giao dịch
│           │   ├── ComboController.java       <- Hihi AI tạo combo
│           │   ├── AdminProductController.java    <- admin: thêm / sửa / xóa(ẩn) sản phẩm
│           │   ├── AdminCategoryController.java   <- admin: thêm / sửa / xóa danh mục
│           │   └── AdminOrderController.java      <- admin: thống kê, xem và đổi trạng thái đơn (hủy đơn HihiPay thì hoàn tiền)
│           └── service/
│               ├── WalletService.java     <- logic ví: nạp, trừ tiền, hoàn tiền, mã giao dịch
│               ├── ComboGraph.java        <- thuật toán ghép combo từ quan hệ sản phẩm (Java thuần)
│               └── ComboService.java      <- đọc dữ liệu quan hệ, dựng combo + lời giải thích
└── frontend/                    <- CLIENT (React + Vite)
    ├── package.json             <- thư viện (có qrcode.react để vẽ mã QR) và lệnh chạy
    ├── vite.config.js           <- cấu hình Vite (cổng 5173)
    ├── index.html               <- trang HTML gốc, nạp font Be Vietnam Pro
    ├── public/
    │   ├── banner.svg           <- banner
    │   └── images/products/     <- Ảnh
    └── src/
        ├── admin/               <- TRANG QUẢN TRỊ
        │   ├── AdminPage.jsx        <- khung trang admin: số liệu + 3 tab
        │   ├── AdminProducts.jsx    <- tab Sản phẩm
        │   ├── AdminCategories.jsx  <- tab Danh mục
        │   ├── AdminOrders.jsx      <- tab Đơn hàng
        │   └── labels.js            <- tên tiếng Việt của trạng thái đơn / giao dịch / phương thức thanh toán
        ├── pages/               <- CÁC TRANG CỦA KHÁCH
        │   ├── OrdersPage.jsx       <- Đơn hàng của tôi + trạng thái
        │   ├── WalletPage.jsx       <- ví HihiPay: số dư, giao dịch gần đây / lịch sử, chi tiết giao dịch
        │   └── TopupFlow.jsx        <- nạp tiền: chọn số tiền → mã QR (PENDING) → xác nhận → cộng tiền
        ├── main.jsx             <- khởi động React
        ├── App.jsx              <- ghép các thành phần, định tuyến theo "#", chọn danh mục / tìm kiếm
        ├── api.js               <- mọi lời gọi tới backend
        ├── utils.js             <- định dạng tiền VND, ngày giờ
        ├── styles.css           <- toàn bộ giao diện (màu tím hồng)
        ├── context/AppContext.jsx   <- trạng thái dùng chung: người dùng, giỏ hàng, thông báo
        └── components/
            ├── Header.jsx          <- thanh trên: Đăng ký / Đăng nhập, Đơn hàng, HihiPay, giỏ hàng
            ├── SearchBox.jsx       <- ô tìm kiếm có gợi ý khi gõ
            ├── Banner.jsx          <- ảnh banner
            ├── CategoryBar.jsx     <- 7 danh mục
            ├── ProductGrid.jsx     <- lưới sản phẩm
            ├── ProductCard.jsx     <- 1 thẻ sản phẩm (ảnh, tên, giá)
            ├── ComboCard.jsx       <- 1 combo do Hihi AI tạo (sản phẩm, tổng tiền, lời giải thích)
            ├── FeaturedCombos.jsx  <- khu vực combo ở trang chủ
            ├── ProductModal.jsx    <- chi tiết: ảnh, mô tả, thêm giỏ, mua ngay, combo AI
            ├── CartDrawer.jsx      <- giỏ hàng (trượt từ bên phải)
            ├── CheckoutModal.jsx   <- thanh toán (COD / HihiPay / thẻ)
            ├── AuthModal.jsx       <- form đăng ký / đăng nhập
            ├── Modal.jsx           <- khung cửa sổ nổi dùng chung
            └── SmartImage.jsx      <- hiện ảnh, tự dùng khung tạm nếu thiếu ảnh
```

## 3. Cơ sở dữ liệu (HihiDB)

| Bảng | Vai trò |
|---|---|
| Users | Tài khoản, cột `role` = USER hoặc ADMIN (mật khẩu lưu dạng băm BCrypt) |
| Categories | 7 danh mục |
| Products | Sản phẩm: tên, giá, mô tả, `image_url` (tên file ảnh), tồn kho, `is_active` (0 = đã bị admin ẩn) |
| CartItems | Giỏ hàng của từng người dùng |
| Orders / OrderItems | Đơn hàng và chi tiết đơn |
| Wallets | Ví HihiPay: mỗi khách 1 dòng, cột `balance` (không bao giờ âm) |
| WalletTransactions | Mọi giao dịch ví: `TOPUP` (nạp), `PAYMENT` (trả đơn), `REFUND` (hoàn tiền); trạng thái `PENDING` / `SUCCESS` / `CANCELLED`, `balance_after`, `order_id` |
| ComboThemes | Chủ đề combo (vd Combo Làm Việc) + câu giải thích chung của Hihi AI |
| ProductRelations | Quan hệ giữa sản phẩm: "A đi cùng B" theo một chủ đề, kèm lý do ghép |

## 4. Danh sách API

| Phương thức | Đường dẫn | Chức năng | Cần đăng nhập |
|---|---|---|---|
| POST | /api/auth/register | Đăng ký | Không |
| POST | /api/auth/login | Đăng nhập | Không |
| GET | /api/categories | Danh sách danh mục | Không |
| GET | /api/products?categoryId=&q= | Sản phẩm theo danh mục / từ khóa | Không |
| GET | /api/products/suggest?q= | Gợi ý tên sản phẩm khi gõ (tối đa 8) | Không |
| GET | /api/products/{id} | Chi tiết sản phẩm | Không |
| GET | /api/combos?productId= | Combo do Hihi AI tạo cho sản phẩm | Không |
| GET | /api/combos/featured | Vài combo tiêu biểu cho trang chủ | Không |
| GET | /api/cart | Xem giỏ hàng | Có |
| POST | /api/cart | Thêm vào giỏ (admin bị từ chối) | Có |
| PUT | /api/cart/{productId} | Đổi số lượng (0 = xóa) | Có |
| DELETE | /api/cart/{productId} | Xóa khỏi giỏ | Có |
| POST | /api/orders/checkout | Đặt hàng (giỏ hàng hoặc mua ngay). Admin bị từ chối (403). HihiPay thiếu tiền: 402 | Có |
| GET | /api/orders | Đơn hàng của tôi + trạng thái | Có |
| GET | /api/wallet | Số dư ví HihiPay | Có |
| GET | /api/wallet/transactions?limit= | Giao dịch gần đây / lịch sử | Có |
| GET | /api/wallet/transactions/{mã} | Chi tiết 1 giao dịch | Có |
| POST | /api/wallet/topups | Tạo giao dịch nạp tiền `PENDING` (chưa cộng tiền) | Có |
| POST | /api/wallet/topups/{mã}/confirm | Xác nhận: lúc này mới cộng tiền | Có |
| POST | /api/wallet/topups/{mã}/cancel | Hủy giao dịch đang chờ | Có |
| GET | /api/admin/stats | Số liệu tổng quan | Admin |
| GET / POST | /api/admin/products | Danh sách (cả sản phẩm ẩn) / thêm sản phẩm | Admin |
| PUT / DELETE | /api/admin/products/{id} | Sửa / xóa (ẩn) sản phẩm | Admin |
| GET / POST | /api/admin/categories | Danh sách / thêm danh mục | Admin |
| PUT / DELETE | /api/admin/categories/{id} | Sửa / xóa danh mục | Admin |
| GET | /api/admin/orders?status= | Danh sách đơn hàng | Admin |
| GET | /api/admin/orders/{id} | Chi tiết đơn hàng | Admin |
| PUT | /api/admin/orders/{id}/status | Đổi trạng thái đơn | Admin |

"Cần đăng nhập" nghĩa là frontend gửi header `Authorization: Bearer <token>`. Token do backend cấp khi đăng ký / đăng nhập.

## 5. Luồng hoạt động chính

1. **Trang chủ**: React tải danh mục từ `/api/categories`. Phần dưới hiện các **combo do Hihi AI tạo** (xem mục 6).
2. **Chọn danh mục**: React gọi `/api/products?categoryId=...` và hiện sản phẩm ngay bên dưới, **không chuyển trang**. Bấm lại danh mục đó để bỏ chọn.
3. **Tìm kiếm có gợi ý**: gõ vào ô tìm kiếm, sau 0,18 giây React gọi `/api/products/suggest?q=...` và hiện danh sách tên sản phẩm có chứa từ khóa (gõ "áo" ra Áo thun, Áo sơ mi, Áo kiểu...). Không phân biệt hoa/thường và dấu. Dùng phím ↑ ↓ Enter hoặc bấm chuột để chọn; Enter khi không chọn gợi ý nào sẽ tìm theo chữ đã gõ.
4. **Bấm vào sản phẩm**: mở cửa sổ chi tiết gồm ảnh, mô tả, số lượng, **Thêm vào giỏ hàng**, **Mua ngay** và các **combo AI** chứa sản phẩm đó. Nếu chưa đăng nhập, web mở form đăng nhập. **Admin không có nút mua** (và backend cũng chặn bằng lỗi 403).
5. **Giỏ hàng**: bấm biểu tượng giỏ, đổi số lượng, xóa, rồi **Thanh toán** cả giỏ.
6. **Thanh toán**: nhập thông tin giao hàng, chọn phương thức rồi bấm **Đặt hàng**:
   - **Thanh toán khi nhận hàng (COD)**: tạo đơn `PENDING`.
   - **HihiPay**: dòng này hiện số dư ví. Nếu đủ tiền, backend trừ ví, tạo giao dịch `PAYMENT` có mã dạng `MP202610081234`, đơn ở trạng thái `PAID`, màn hình báo "Đã trừ ... từ ví HihiPay". Nếu không đủ, hiện "Số dư không đủ" (cần thanh toán / số dư hiện tại) và nút **Nạp thêm tiền**; **không có đơn nào được tạo**.
   - **Thẻ**: giả lập thành công, đơn `PAID`.

   Backend tự tính tiền từ giá trong DB, kiểm tra tồn kho, trừ kho, trừ ví, xóa giỏ hàng trong **một giao dịch** (`@Transactional`): lỗi ở bước nào thì mọi thứ được hoàn lại.
7. **Đơn hàng của tôi** (menu **Đơn hàng** ở góc trên): liệt kê mọi đơn đã đặt kèm trạng thái, lọc theo trạng thái, xem chi tiết. Admin đổi trạng thái (Chờ xử lý → Đã thanh toán → Đang giao → Hoàn thành / Đã hủy) thì trang này tự cập nhật sau tối đa 15 giây (hoặc ngay khi bấm Tải lại / quay lại tab). Admin hủy đơn đã trả bằng HihiPay thì **tiền được hoàn vào ví** (giao dịch `REFUND`).
8. **Ví HihiPay** (menu **HihiPay**): hiện số dư, nút **+ Nạp tiền**, **Lịch sử**, danh sách giao dịch gần đây. Bấm một giao dịch để xem chi tiết (loại, số tiền, trạng thái, mã, thời gian, số dư sau giao dịch, đơn hàng liên quan).
9. **Nạp tiền bằng QR (mô phỏng)**:
   1. Chọn số tiền (50.000 / 100.000 / 200.000 / 500.000 / 1.000.000 hoặc tự nhập, từ 10.000 đến 50.000.000) rồi bấm **Tạo mã QR**. Lúc này backend chỉ tạo giao dịch `PENDING` (mã dạng `MP8F29A1`); **số dư chưa đổi**.
   2. Màn hình QR hiện số tiền, mã QR, mã giao dịch và "⏳ Đang chờ thanh toán...". Mã QR chứa nội dung `HIHIPAY / Transaction / User / Amount`. Vì là mô phỏng nên QR không kết nối ngân hàng: bấm **Mở màn hình xác nhận** để mở màn hình "HIHIPAY PAYMENT" (như khi quét bằng điện thoại, mở ở tab mới). Có thể **Hủy giao dịch**.
   3. Bấm **XÁC NHẬN** → "⏳ Đang xử lý giao dịch..." → "Thanh toán thành công, +500.000 ₫, số dư mới ...". **Lúc này mới cộng tiền**, và chỉ cộng đúng 1 lần dù bấm nhiều lần. Tab QR đang mở tự chuyển sang thành công (kiểm tra mỗi 2 giây).
   4. Bấm **Về HihiPay**: số dư đã cộng, giao dịch mới nằm ở "Giao dịch gần đây". Giao dịch còn `PENDING` vẫn nằm trong lịch sử, bấm vào để **Tiếp tục thanh toán** hoặc **Hủy**.

## 6. AI tạo combo hoạt động thế nào

Thay cho "AI gợi ý sản phẩm" trước đây. Ý tưởng: chỉ cần xây dựng **quan hệ giữa các sản phẩm**, ví dụ

```
Laptop   → Chuột,  Laptop → Bàn phím          (chủ đề Làm Việc)
Camera   → Tripod                             (chủ đề Quay Chụp)
Áo sơ mi → Quần → Giày                        (chủ đề Công Sở Nam)
```

Dữ liệu nằm ở 2 bảng: `ComboThemes` (tên chủ đề + câu giải thích chung) và `ProductRelations` (cạnh "A đi cùng B", có thứ tự và `reason` là lý do ghép).

Khi người dùng chọn một sản phẩm (ví dụ Laptop), `ComboGraph` làm 3 bước:

```
Laptop
   ↓  1. đi NGƯỢC theo quan hệ để tìm sản phẩm "gốc" (chọn Giày → Quần → Áo sơ mi thì gốc là Áo sơ mi)
   ↓  2. từ gốc đi XUÔI để gom sản phẩm đi cùng (còn hàng, tối đa 3 món)
Chuột + Bàn phím
   ↓  3. ghép lời giải thích = câu của chủ đề + lý do của từng quan hệ đã dùng
 Hihi AI đề xuất Combo Làm Việc: Laptop + Chuột + Bàn phím, Tổng: ... đ
"Combo này phù hợp cho học tập và làm việc văn phòng. ..."
```

- Tổng tiền tính từ giá hiện tại trong DB. Sản phẩm hết hàng hoặc đã ẩn không được đưa vào combo.
- Một sản phẩm có thể thuộc 2 combo (vd Tripod đi với Mirrorless hoặc với Action camera; Quần jeans đi với Áo sơ mi hoặc Áo thun).
- Nút **Thêm cả combo vào giỏ hàng** thêm mỗi món 1 cái (admin không thấy nút này).
- **Thêm combo mới**: chỉ cần thêm dòng vào `ProductRelations` (và `ComboThemes` nếu là chủ đề mới), xem ví dụ trong `hihi_db.sql`. Không cần sửa code.
- Đây là AI theo luật / đồ thị quan hệ, **không** gọi mô hình ngôn ngữ bên ngoài, nên chạy offline và kết quả luôn dự đoán được.

## 7. Phân quyền và trang quản trị

- Mỗi tài khoản có `role`: **USER** (khách) hoặc **ADMIN**. Đăng ký trên web luôn tạo USER. Admin chỉ tạo bằng SQL (đã có sẵn `admin@hihi.vn`).
- Khi đăng nhập, backend trả về một **token**. Mọi yêu cầu cần đăng nhập đều gửi token đó. `AuthInterceptor` kiểm tra: không có token → lỗi 401, đường dẫn `/api/admin/**` mà không phải ADMIN → lỗi 403. Vì vậy dù ai đó gõ thẳng đường dẫn admin vào trình duyệt cũng không vào được.
- **Admin không mua hàng được**: giao diện ẩn nút Mua ngay, Thêm vào giỏ, giỏ hàng, Đơn hàng, HihiPay; backend trả 403 nếu admin vẫn cố gọi `/api/cart` (thêm) hoặc `/api/orders/checkout`.
- Admin đăng nhập xong sẽ thấy nút **Quản trị** ở góc trên (hoặc vào http://localhost:5173/#admin). Trang quản trị có 3 tab:
  - **Sản phẩm**: thêm, sửa, xóa. "Xóa" là **ẩn** sản phẩm (cột `is_active = 0`) để đơn hàng cũ không bị hỏng. Muốn bán lại, bấm Sửa và tích "Đang bán".
  - **Danh mục**: thêm, sửa, xóa. Chỉ xóa được danh mục không còn sản phẩm nào (kể cả sản phẩm đã ẩn).
  - **Đơn hàng**: xem danh sách, lọc theo trạng thái, xem chi tiết, đổi trạng thái: Chờ xử lý → Đã thanh toán → Đang giao → Hoàn thành, hoặc Đã hủy. Hủy đơn sẽ hoàn lại tồn kho (và hoàn tiền vào ví nếu đơn đã trả bằng HihiPay). Đơn đã Hoàn thành hoặc Đã hủy thì không đổi được nữa.
- Ảnh sản phẩm: form admin chỉ nhập **tên file**, bạn chép ảnh vào `frontend/public/images/products/` như trước.

## 8. Những điểm đã đơn giản hóa (cần nâng cấp)

- **Xác thực**: token ngẫu nhiên lưu trong bộ nhớ backend (khởi động lại backend thì mọi người phải đăng nhập lại), không có hạn sử dụng. Bản thật nên dùng JWT hoặc Spring Security.
- **Thanh toán và HihiPay**: hoàn toàn giả lập, chưa tích hợp VNPay, MoMo, ngân hàng. Ai cũng tự xác nhận nạp tiền được (đúng mục đích mô phỏng). Mã QR chỉ chứa văn bản mô tả giao dịch.
- **Combo AI** dựa trên quan hệ do người quản trị nhập vào bảng `ProductRelations`; chưa có trang admin để sửa quan hệ (hiện sửa bằng SQL).
- Bảng `Interactions` của AI gợi ý cũ không còn dùng (bản nâng cấp giữ nguyên, không xóa dữ liệu).
- **Controller truy vấn DB trực tiếp bằng `JdbcTemplate`** cho gọn. Dự án lớn nên tách thêm tầng service và repository (hoặc dùng Spring Data JPA).
- Mỗi sản phẩm có 1 ảnh. Muốn nhiều ảnh, thêm bảng `ProductImages`.
