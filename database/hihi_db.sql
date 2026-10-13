/* =====================================================================
   Mở file trong ssms -> exceute 
   chạy lại được nhiều lần 
   ===================================================================== */
IF DB_ID(N'HihiDB') IS NULL CREATE DATABASE HihiDB;
GO
USE HihiDB;
GO

DROP TABLE IF EXISTS WalletTransactions, Wallets, ProductRelations, ComboThemes, Interactions,
                     OrderItems, Orders, CartItems, Products, Categories, Users;
GO

CREATE TABLE Users (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    full_name     NVARCHAR(100) NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(100)  NOT NULL,
    role          VARCHAR(10)   NOT NULL DEFAULT 'USER',   -- USER | ADMIN
    created_at    DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE Categories (
    id   INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    slug VARCHAR(50)   NOT NULL UNIQUE,
    icon NVARCHAR(10)  NULL
);

CREATE TABLE Products (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    category_id INT           NOT NULL REFERENCES Categories(id),
    name        NVARCHAR(200) NOT NULL,
    price       DECIMAL(18,0) NOT NULL CHECK (price >= 0),
    description NVARCHAR(MAX) NULL,
    image_url   VARCHAR(255)  NULL,          -- tên file ảnh, đặt trong frontend/public/images/products/
    stock       INT           NOT NULL DEFAULT 100 CHECK (stock >= 0),
    is_active   BIT           NOT NULL DEFAULT 1,   -- 0 = đã ẩn (admin xóa)
    created_at  DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_Products_Category ON Products(category_id);

CREATE TABLE CartItems (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    user_id    INT NOT NULL REFERENCES Users(id),
    product_id INT NOT NULL REFERENCES Products(id),
    quantity   INT NOT NULL CHECK (quantity > 0),
    CONSTRAINT UQ_Cart UNIQUE (user_id, product_id)
);

CREATE TABLE Orders (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    user_id        INT           NOT NULL REFERENCES Users(id),
    total          DECIMAL(18,0) NOT NULL,
    payment_method VARCHAR(20)   NOT NULL,   -- COD | HIHIPAY | CARD (đều là giả lập)
    status         VARCHAR(20)   NOT NULL,   -- PENDING | PAID
    receiver_name  NVARCHAR(100) NOT NULL,
    phone          VARCHAR(20)   NOT NULL,
    address        NVARCHAR(255) NOT NULL,
    created_at     DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);

CREATE TABLE OrderItems (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    order_id   INT           NOT NULL REFERENCES Orders(id),
    product_id INT           NOT NULL REFERENCES Products(id),
    quantity   INT           NOT NULL,
    unit_price DECIMAL(18,0) NOT NULL
);

-- ===== HihiPay: ví điện tử mô phỏng =====
CREATE TABLE Wallets (
    user_id    INT           NOT NULL PRIMARY KEY REFERENCES Users(id),
    balance    DECIMAL(18,0) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at DATETIME2     NOT NULL DEFAULT SYSDATETIME()
);

-- amount luôn dương; dấu +/- do type quyết định (TOPUP, REFUND: cộng; PAYMENT: trừ)
CREATE TABLE WalletTransactions (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    code          VARCHAR(30)   NOT NULL UNIQUE,      -- vd MP8F29A1 (nạp tiền) hoặc MP202610081234 (thanh toán đơn)
    user_id       INT           NOT NULL REFERENCES Users(id),
    type          VARCHAR(10)   NOT NULL CHECK (type IN ('TOPUP','PAYMENT','REFUND')),
    amount        DECIMAL(18,0) NOT NULL CHECK (amount > 0),
    status        VARCHAR(10)   NOT NULL CHECK (status IN ('PENDING','SUCCESS','CANCELLED')),
    order_id      INT           NULL REFERENCES Orders(id),
    balance_after DECIMAL(18,0) NULL,                 -- số dư sau giao dịch (chỉ có khi SUCCESS)
    note          NVARCHAR(200) NULL,
    created_at    DATETIME2     NOT NULL DEFAULT SYSDATETIME(),
    completed_at  DATETIME2     NULL
);
CREATE INDEX IX_WalletTx_User ON WalletTransactions(user_id, id DESC);

-- ===== AI tạo combo: chủ đề combo + quan hệ giữa các sản phẩm =====
CREATE TABLE ComboThemes (
    code        VARCHAR(30)   NOT NULL PRIMARY KEY,
    name        NVARCHAR(100) NOT NULL,               -- vd: Combo Làm Việc
    icon        NVARCHAR(10)  NULL,
    explanation NVARCHAR(300) NOT NULL,               -- câu giải thích chung của Hihi AI
    sort_order  INT           NOT NULL DEFAULT 0
);

-- "product_id đi cùng related_product_id". Vd: Laptop -> Chuột, Laptop -> Bàn phím, Áo sơ mi -> Quần -> Giày
CREATE TABLE ProductRelations (
    id                 INT IDENTITY(1,1) PRIMARY KEY,
    product_id         INT           NOT NULL REFERENCES Products(id),
    related_product_id INT           NOT NULL REFERENCES Products(id),
    theme              VARCHAR(30)   NOT NULL REFERENCES ComboThemes(code),
    sort_order         INT           NOT NULL DEFAULT 0,
    reason             NVARCHAR(300) NULL,            -- lý do ghép cặp, AI ghép vào phần giải thích
    CONSTRAINT UQ_Relation UNIQUE (product_id, related_product_id, theme),
    CONSTRAINT CK_Relation_Diff CHECK (product_id <> related_product_id)
);
GO

/* ------------------------- DỮ LIỆU MẪU ------------------------- */
INSERT INTO Categories(name, slug, icon) VALUES
(N'Thời Trang Nam',         'thoi-trang-nam',   N'👔'),
(N'Thời Trang Nữ',          'thoi-trang-nu',    N'👗'),
(N'Điện Thoại & Phụ Kiện',  'dien-thoai',       N'📱'),
(N'Máy Tính & Laptop',      'may-tinh-laptop',  N'💻'),
(N'Máy Ảnh & Máy Quay Phim','may-anh',          N'📷'),
(N'Giày Dép Nam',           'giay-dep-nam',     N'👞'),
(N'Giày Dép Nữ',            'giay-dep-nu',      N'👠');

-- Cột cuối (image_url) = tên file ảnh bạn cần đặt vào frontend/public/images/products/
INSERT INTO Products(category_id, name, price, description, image_url) VALUES
(1, N'Áo thun streetwear bape', 189000, N'Áo thun BAPE (A Bathing Ape) là biểu tượng bất diệt của văn hóa đường phố (streetwear) Nhật Bản, mang đậm tinh thần nổi loạn, cá tính và độc bản', 'nam-ao-thun.jpg'),
(1, N'Áo sơ mi nam Dior tay dài', 329000, N'Áo sơ mi Dior là biểu tượng đỉnh cao của sự lịch lãm, tinh tế và thời trang xa xỉ Pháp.', 'nam-ao-so-mi.jpg'),
(1, N'Quần jeans nam slim fit', 459000, N'Denim co giãn nhẹ, ôm vừa vặn, màu xanh đậm dễ phối đồ. Bền màu sau nhiều lần giặt.', 'nam-quan-jeans.jpg'),
(2, N'Váy dạ hội BVLGARI đen', 359000, N'Chiếc váy dạ hội BVLGARI là biểu tượng tuyệt mỹ của sự huyền bí, sang trọng và quyền lực thượng lưu.', 'vay-da-hoi.jpg'),
(2, N'Tee nữ douyin', 249000, N'Áo kiểu tay phồng phong cách douyin, chất liệu mềm mát, dễ phối cùng chân váy hoặc quần jeans.', 'nu-ao-tay-phong.jpg'),
(2, N'Chân váy Lsoul', 219000, N'Chân váy Lsoul vải dày dặn đứng form, có khóa kéo phía sau.', 'nu-chan-vay-chu-a.jpg'),
(3, N'Ốp lưng iPhone chống sốc', 99000, N'Ốp trong suốt viền silicone chống sốc, bảo vệ camera, không ố vàng, ôm sát máy.', 'dt-op-lung.jpg'),
(3, N'Củ sạc nhanh 20W Type-C', 179000, N'Sạc nhanh 20W an toàn, tự ngắt khi đầy pin, tương thích iPhone và Android hỗ trợ PD.', 'dt-cu-sac-20w.jpg'),
(3, N'Tai nghe AirPods Pro 3', 459000, N'Tai nghe không dây Bluetooth 5.3, chống ồn cơ bản, pin dùng 6 giờ, hộp sạc thêm 24 giờ.', 'airpod3.jpg'),
(4, N'Laptop văn phòng 14 inch Core i5', 12990000, N'Laptop mỏng nhẹ, Core i5, RAM 16GB, SSD 512GB, màn hình Full HD 14 inch. Phù hợp học tập và làm việc.', 'lt-laptop-i5.jpg'),
(4, N'Chuột không dây yên tĩnh', 159000, N'Chuột không dây 2.4GHz, nút bấm êm, độ nhạy tùy chỉnh, dùng pin AA bền đến 12 tháng.', 'lt-chuot-khong-day.jpg'),
(4, N'Bàn phím cơ không dây', 790000, N'Bàn phím cơ kết nối Bluetooth và 2.4GHz, switch êm, đèn nền LED, pin sạc dùng nhiều tuần.', 'lt-ban-phim-co.jpg'),
(5, N'Máy ảnh Mirrorless kèm lens kit', 14990000, N'Máy ảnh mirrorless cảm biến APS-C 24MP, quay video 4K, lấy nét nhanh, kèm lens kit 16-50mm.', 'mc-may-anh-mirrorless.jpg'),
(5, N'Action camera 4K chống nước', 2490000, N'Camera hành trình 4K 60fps, chống rung điện tử, chống nước 10m, kèm nhiều phụ kiện gắn.', 'mc-action-camera.jpg'),
(5, N'Chân máy tripod nhôm 1.6m', 349000, N'Tripod nhôm gọn nhẹ, cao tối đa 1.6m, đầu xoay 360 độ, kèm túi đựng. Dùng cho máy ảnh và điện thoại.', 'mc-tripod.jpg'),
(6, N'Giày sneaker nam Puma White', 690000, N'Sneaker trắng basic dễ phối đồ, đế cao su êm, chống trơn, thân giày thoáng khí.', 'gn-sneaker-trang.jpg'),
(6, N'Giày da cao cấp Penny Loafer', 890000, N'Giày da bò thật, đế khâu chắc chắn, thiết kế lịch lãm cho môi trường công sở.', 'gn-giay-da.jpg'),
(6, N'Dép Dép Adidas Adilette nam trắng xanh', 259000, N'Dép Adidas là một trong những món phụ kiện thời trang dạo phố và đi biển kinh điển nhất thế giới, nổi tiếng với sự kết hợp hài hòa giữa sự tiện lợi và phong cách thể thao vượt thời gian.', 'gn-sandal.jpg'),
(7, N'Giày cao gót Christian Louboutin đế đỏ', 459000, N'Giày cao gót Christian Louboutin là biểu tượng xa xỉ quyền lực, sự quyến rũ và là niềm khao khát tối thượng của phái đẹp trên toàn thế giới.', 'gnu-cao-got.jpg'),
(7, N'Giày sneaker nữ Puma Speedcat Ballet', 590000, N'Puma Speedcat Balletlà sự giao thoa đột phá giữa nét mềm mại của giày búp bê (ballet flats) và DNA tốc độ mạnh mẽ từ dòng giày đua xe huyền thoại PUMA Speedcat.', 'gnu-sneaker.jpg'),
(7, N'Dép cao gót Christian Dior Canvas ', 329000, N'Dép cao gót Christian Dior Dway 35mm Heeled Slide Sandals Quartz Grey là tuyệt tác giày hè đầy kiêu kỳ nằm trong bộ sưu tập danh tiếng của nhà mốt xa xỉ Dior.', 'gnu-sandal.jpg');
-- Tài khoản mẫu (mật khẩu đã được băm BCrypt, xem bảng mật khẩu trong HUONG_DAN_CAI_DAT.md)
--   3 khách mẫu: demo1@hihi.local, demo2@hihi.local, demo3@hihi.local   mật khẩu: 123456
--   Quản trị viên: admin@hihi.vn                                        mật khẩu: Admin@123
-- LƯU Ý: 3 khách mẫu phải chèn trước (id 1-3) vì ví mẫu bên dưới dùng id này.
INSERT INTO Users(full_name, email, password_hash, role) VALUES
(N'Khách mẫu 1', 'demo1@hihi.local', '$2b$10$BFW3WiWnKjm.nPnAu4mY8OGivSGeJngN9aj02O1M4OSu6TwPTjnZS', 'USER'),
(N'Khách mẫu 2', 'demo2@hihi.local', '$2b$10$BFW3WiWnKjm.nPnAu4mY8OGivSGeJngN9aj02O1M4OSu6TwPTjnZS', 'USER'),
(N'Khách mẫu 3', 'demo3@hihi.local', '$2b$10$BFW3WiWnKjm.nPnAu4mY8OGivSGeJngN9aj02O1M4OSu6TwPTjnZS', 'USER'),
(N'Quản trị viên', 'admin@hihi.vn', '$2b$10$Mw1I/zW13b8uxw//zFPWlOp1NG0Jvwpcm1TIf3YFeGbsk0XaXuh46', 'ADMIN');

-- Ví HihiPay mẫu: demo1 có 1.250.000 đ, demo2 có 500.000 đ (thử trường hợp "không đủ số dư"), demo3 chưa có tiền
INSERT INTO Wallets(user_id, balance) VALUES (1, 1250000), (2, 500000), (3, 0);
INSERT INTO WalletTransactions(code, user_id, type, amount, status, balance_after, note, completed_at) VALUES
('MPA1B2C3', 1, 'TOPUP', 1250000, 'SUCCESS', 1250000, N'Nạp tiền', SYSDATETIME()),
('MPD4E5F6', 2, 'TOPUP',  500000, 'SUCCESS',  500000, N'Nạp tiền', SYSDATETIME());

INSERT INTO ComboThemes(code, name, icon, explanation, sort_order) VALUES
('WORK',        N'Combo Làm Việc',      N'💻', N'Combo này phù hợp cho học tập và làm việc văn phòng.', 1),
('PHOTO',       N'Combo Quay Chụp',     N'📷', N'Combo này giúp bạn chụp ảnh, quay video ổn định và chuyên nghiệp hơn.', 2),
('OFFICE_MEN',  N'Combo Công Sở Nam',   N'👔', N'Combo này giúp bạn có bộ trang phục lịch sự, gọn gàng khi đi làm.', 3),
('CASUAL_MEN',  N'Combo Dạo Phố Nam',   N'👟', N'Combo này năng động, dễ phối và thoải mái cho những ngày đi chơi.', 4),
('CASUAL_WOMEN',N'Combo Thời Trang Nữ', N'👗', N'Combo này nhẹ nhàng, nữ tính và dễ mặc cho cả đi làm lẫn đi chơi.', 5),
('PHONE',       N'Combo Điện Thoại',    N'📱', N'Combo này giúp bảo vệ máy và dùng điện thoại tiện lợi hơn mỗi ngày.', 6);

-- Quan hệ giữa các sản phẩm (ghép theo TÊN sản phẩm nên không phụ thuộc id).
-- Muốn thêm combo mới: thêm 1 dòng (tên SP A, tên SP B, chủ đề, thứ tự, lý do).
INSERT INTO ProductRelations(product_id, related_product_id, theme, sort_order, reason)
SELECT a.id, b.id, v.theme, v.sort_order, v.reason
FROM (VALUES
 (N'Laptop văn phòng 14 inch Core i5', N'Chuột không dây yên tĩnh',  'WORK', 1, N'Chuột không dây giúp thao tác trên laptop thoải mái và êm hơn.'),
 (N'Laptop văn phòng 14 inch Core i5', N'Bàn phím cơ không dây',     'WORK', 2, N'Bàn phím cơ cho cảm giác gõ tốt, làm việc lâu không mỏi tay.'),
 (N'Máy ảnh Mirrorless kèm lens kit',  N'Chân máy tripod nhôm 1.6m', 'PHOTO', 1, N'Tripod giữ máy ổn định khi chụp thiếu sáng, quay video hoặc chụp nhóm.'),
 (N'Action camera 4K chống nước',      N'Chân máy tripod nhôm 1.6m', 'PHOTO', 2, N'Tripod giúp quay góc cố định, hình ảnh không bị rung.'),
 (N'Áo sơ mi nam Dior tay dài',      N'Quần jeans nam slim fit',   'OFFICE_MEN', 1, N'Quần jeans slim fit phối cùng sơ mi cho vẻ ngoài lịch sự mà vẫn thoải mái.'),
 (N'Quần jeans nam slim fit',          N'Giày da cao cấp Penny Loafer',       'OFFICE_MEN', 2, N'Giày da hoàn thiện bộ đồ công sở gọn gàng, chỉn chu.'),
 (N'Áo thun streetwear bape',         N'Quần jeans nam slim fit',   'CASUAL_MEN', 1, N'Áo thun và quần jeans là cặp phối kinh điển, dễ mặc mỗi ngày.'),
 (N'Quần jeans nam slim fit',          N'Giày sneaker nam Puma White',    'CASUAL_MEN', 2, N'Sneaker trắng dễ phối, đi êm và hợp với hầu hết trang phục.'),
 (N'Tee nữ douyin',             N'Chân váy Lsoul',   'CASUAL_WOMEN', 1, N'Chân váy chữ A lưng cao tôn dáng, hợp với áo tay phồng.'),
 (N'Chân váy Lsoul',          N'Giày sneaker nữ Puma Speedcat Ballet',    'CASUAL_WOMEN', 2, N'Sneaker đế dày giúp tăng chiều cao mà vẫn năng động.'),
 (N'Váy dạ hội BVLGARI đen',             N'Dép cao gót Christian Dior Canvas',       'CASUAL_WOMEN', 3, N'Sandal quai mảnh thanh lịch, hợp với váy hoa khi đi chơi, du lịch.'),
 (N'Ốp lưng iPhone chống sốc',         N'Củ sạc nhanh 20W Type-C',   'PHONE', 1, N'Củ sạc nhanh giúp điện thoại đầy pin trong thời gian ngắn.'),
 (N'Củ sạc nhanh 20W Type-C',          N'Tai nghe Bluetooth TWS',    'PHONE', 2, N'Tai nghe không dây giúp nghe nhạc, gọi điện rảnh tay.')
) AS v(a_name, b_name, theme, sort_order, reason)
JOIN Products a ON a.name = v.a_name
JOIN Products b ON b.name = v.b_name;
GO

SELECT c.name AS DanhMuc, COUNT(p.id) AS SoSanPham
FROM Categories c LEFT JOIN Products p ON p.category_id = c.id GROUP BY c.name;
