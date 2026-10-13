package com.hihi.shop.controller;

import com.hihi.shop.security.CustomerGuard;
import com.hihi.shop.service.WalletService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;

/**
 * Đặt hàng + xem đơn hàng của khách. Thanh toán MÔ PHỎNG (không có cổng thanh toán thật).
 * - COD: đơn ở trạng thái PENDING (trả tiền khi nhận hàng)
 * - HIHIPAY: trừ tiền trong ví HihiPay (không đủ số dư -> lỗi 402), đơn ở trạng thái PAID
 * - CARD: giả lập thành công -> PAID
 * Tài khoản ADMIN không được đặt hàng.
 * Thanh toán từ giỏ hàng (productId = null) hoặc "Mua ngay" 1 sản phẩm (có productId).
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    public record CheckoutReq(String receiverName, String phone, String address,
                              String paymentMethod, Long productId, Integer quantity) {}

    private record Line(long productId, int qty, BigDecimal price, int stock, String name) {}

    private static final Set<String> METHODS = Set.of("COD", "HIHIPAY", "CARD");

    private final JdbcTemplate jdbc;
    private final WalletService wallet;
    private final CustomerGuard guard;

    public OrderController(JdbcTemplate jdbc, WalletService wallet, CustomerGuard guard) {
        this.jdbc = jdbc;
        this.wallet = wallet;
        this.guard = guard;
    }

    /** Danh sách đơn của chính khách này (mới nhất trước), kèm sản phẩm trong từng đơn. */
    @GetMapping
    public List<Map<String, Object>> myOrders(@RequestAttribute("userId") long userId) {
        List<Map<String, Object>> orders = jdbc.queryForList(
                "SELECT o.id, o.total, o.payment_method AS paymentMethod, o.status, o.receiver_name AS receiverName, " +
                "o.phone, o.address, o.created_at AS createdAt, " +
                "(SELECT TOP 1 w.code FROM WalletTransactions w WHERE w.order_id = o.id AND w.type = 'PAYMENT') AS paymentCode " +
                "FROM Orders o WHERE o.user_id = ? ORDER BY o.id DESC", userId);
        Map<Long, List<Map<String, Object>>> byOrder = new HashMap<>();
        for (Map<String, Object> row : jdbc.queryForList(
                "SELECT oi.order_id AS orderId, oi.product_id AS productId, p.name, p.image_url AS imageUrl, " +
                "oi.quantity, oi.unit_price AS unitPrice FROM OrderItems oi " +
                "JOIN Products p ON p.id = oi.product_id JOIN Orders o ON o.id = oi.order_id " +
                "WHERE o.user_id = ? ORDER BY oi.id", userId)) {
            byOrder.computeIfAbsent(((Number) row.get("orderId")).longValue(), k -> new ArrayList<>()).add(row);
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> o : orders) {
            Map<String, Object> m = new HashMap<>(o);
            m.put("items", byOrder.getOrDefault(((Number) o.get("id")).longValue(), List.of()));
            result.add(m);
        }
        return result;
    }

    @PostMapping("/checkout")
    @Transactional
    public Map<String, Object> checkout(@RequestAttribute("userId") long userId, @RequestBody CheckoutReq r) {
        guard.requireCustomer(userId);
        if (blank(r.receiverName()) || blank(r.phone()) || blank(r.address())) {
            throw new IllegalArgumentException("Vui lòng nhập đầy đủ thông tin giao hàng");
        }
        if (r.paymentMethod() == null || !METHODS.contains(r.paymentMethod())) {
            throw new IllegalArgumentException("Phương thức thanh toán không hợp lệ");
        }

        // 1. Lấy danh sách hàng cần mua. Giá luôn lấy từ DB, không tin dữ liệu từ trình duyệt.
        boolean buyNow = r.productId() != null;
        List<Line> lines = new ArrayList<>();
        if (buyNow) {
            int qty = r.quantity() == null ? 1 : r.quantity();
            if (qty < 1) throw new IllegalArgumentException("Số lượng không hợp lệ");
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT id, price, stock, name FROM Products WHERE id = ? AND is_active = 1", r.productId());
            if (rows.isEmpty()) throw new NoSuchElementException("Không tìm thấy sản phẩm");
            lines.add(toLine(rows.get(0), qty));
        } else {
            List<Map<String, Object>> rows = jdbc.queryForList(
                    "SELECT p.id, p.price, p.stock, p.name, c.quantity FROM CartItems c " +
                    "JOIN Products p ON p.id = c.product_id WHERE c.user_id = ? AND p.is_active = 1", userId);
            for (Map<String, Object> row : rows) {
                lines.add(toLine(row, ((Number) row.get("quantity")).intValue()));
            }
        }
        if (lines.isEmpty()) throw new IllegalArgumentException("Giỏ hàng đang trống");

        // 2. Kiểm tra tồn kho và tính tổng tiền
        for (Line l : lines) {
            if (l.qty() > l.stock()) {
                throw new IllegalArgumentException("\"" + l.name() + "\" chỉ còn " + l.stock() + " sản phẩm");
            }
        }
        BigDecimal total = lines.stream()
                .map(l -> l.price().multiply(BigDecimal.valueOf(l.qty())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        String status = "COD".equals(r.paymentMethod()) ? "PENDING" : "PAID";
        boolean hihiPay = "HIHIPAY".equals(r.paymentMethod());
        if (hihiPay) wallet.assertEnough(userId, total);   // thiếu tiền -> báo lỗi 402 ngay, chưa tạo đơn

        // 3. Tạo đơn hàng
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement(
                    "INSERT INTO Orders(user_id, total, payment_method, status, receiver_name, phone, address) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setBigDecimal(2, total);
            ps.setString(3, r.paymentMethod());
            ps.setString(4, status);
            ps.setString(5, r.receiverName().trim());
            ps.setString(6, r.phone().trim());
            ps.setString(7, r.address().trim());
            return ps;
        }, keys);
        long orderId = keys.getKey().longValue();

        // 4. Ghi chi tiết đơn, trừ kho, ghi tương tác "purchase" cho AI
        for (Line l : lines) {
            jdbc.update("INSERT INTO OrderItems(order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
                    orderId, l.productId(), l.qty(), l.price());
            jdbc.update("UPDATE Products SET stock = stock - ? WHERE id = ?", l.qty(), l.productId());
        }
        if (!buyNow) {
            jdbc.update("DELETE FROM CartItems WHERE user_id = ?", userId);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("orderId", orderId);
        result.put("total", total);
        result.put("status", status);
        result.put("paymentMethod", r.paymentMethod());
        if (hihiPay) {
            // Trừ tiền ví + ghi giao dịch. Nếu lỗi thì cả đơn hàng cũng bị hủy (@Transactional).
            result.putAll(wallet.pay(userId, orderId, total));
        }
        return result;
    }

    private static Line toLine(Map<String, Object> row, int qty) {
        return new Line(((Number) row.get("id")).longValue(), qty, (BigDecimal) row.get("price"),
                ((Number) row.get("stock")).intValue(), (String) row.get("name"));
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
