package com.hihi.shop.controller;

import com.hihi.shop.service.WalletService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;

/** Admin: thống kê nhanh, xem và cập nhật trạng thái đơn hàng. */
@RestController
@RequestMapping("/api/admin")
public class AdminOrderController {

    public record StatusReq(String status) {}

    // PENDING chờ xử lý -> PAID đã thanh toán -> SHIPPING đang giao -> COMPLETED hoàn thành | CANCELLED đã hủy
    private static final Set<String> STATUSES = Set.of("PENDING", "PAID", "SHIPPING", "COMPLETED", "CANCELLED");

    private static final String ORDER_COLS =
            "o.id, o.total, o.payment_method AS paymentMethod, o.status, o.receiver_name AS receiverName, " +
            "o.phone, o.address, o.created_at AS createdAt, u.full_name AS customerName, u.email AS customerEmail " +
            "FROM Orders o JOIN Users u ON u.id = o.user_id";

    private final JdbcTemplate jdbc;
    private final WalletService wallet;

    public AdminOrderController(JdbcTemplate jdbc, WalletService wallet) {
        this.jdbc = jdbc;
        this.wallet = wallet;
    }

    @GetMapping("/stats")
    public Map<String, Object> stats() {
        return jdbc.queryForMap(
                "SELECT (SELECT COUNT(*) FROM Products WHERE is_active = 1) AS products, " +
                "(SELECT COUNT(*) FROM Categories) AS categories, " +
                "(SELECT COUNT(*) FROM Orders) AS orders, " +
                "(SELECT COUNT(*) FROM Orders WHERE status = 'PENDING') AS pendingOrders, " +
                "(SELECT COUNT(*) FROM Users WHERE role = 'USER') AS customers, " +
                // Doanh thu tạm tính: không tính đơn chờ xử lý và đơn đã hủy
                "(SELECT ISNULL(SUM(total), 0) FROM Orders WHERE status IN ('PAID','SHIPPING','COMPLETED')) AS revenue");
    }

    @GetMapping("/orders")
    public List<Map<String, Object>> orders(@RequestParam(required = false) String status) {
        if (status == null || status.isBlank()) {
            return jdbc.queryForList("SELECT " + ORDER_COLS + " ORDER BY o.id DESC");
        }
        return jdbc.queryForList("SELECT " + ORDER_COLS + " WHERE o.status = ? ORDER BY o.id DESC", status);
    }

    @GetMapping("/orders/{id}")
    public Map<String, Object> order(@PathVariable long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT " + ORDER_COLS + " WHERE o.id = ?", id);
        if (rows.isEmpty()) throw new NoSuchElementException("Không tìm thấy đơn hàng");
        Map<String, Object> order = new HashMap<>(rows.get(0));
        order.put("items", new ArrayList<>(jdbc.queryForList(
                "SELECT oi.product_id AS productId, p.name, oi.quantity, oi.unit_price AS unitPrice " +
                "FROM OrderItems oi JOIN Products p ON p.id = oi.product_id WHERE oi.order_id = ?", id)));
        return order;
    }

    @PutMapping("/orders/{id}/status")
    @Transactional
    public Map<String, String> updateStatus(@PathVariable long id, @RequestBody StatusReq r) {
        if (r.status() == null || !STATUSES.contains(r.status())) {
            throw new IllegalArgumentException("Trạng thái không hợp lệ");
        }
        List<String> current = jdbc.queryForList("SELECT status FROM Orders WHERE id = ?", String.class, id);
        if (current.isEmpty()) throw new NoSuchElementException("Không tìm thấy đơn hàng");
        String old = current.get(0);
        if (old.equals(r.status())) return Map.of("status", "ok");
        if ("CANCELLED".equals(old) || "COMPLETED".equals(old)) {
            throw new IllegalArgumentException("Đơn hàng đã kết thúc, không thể đổi trạng thái");
        }
        if ("CANCELLED".equals(r.status())) {
            // Hủy đơn -> hoàn lại tồn kho, và hoàn tiền vào ví nếu khách đã trả bằng HihiPay
            wallet.refundOrder(id);
            jdbc.update("UPDATE p SET p.stock = p.stock + oi.quantity FROM Products p " +
                    "JOIN OrderItems oi ON oi.product_id = p.id WHERE oi.order_id = ?", id);
        }
        jdbc.update("UPDATE Orders SET status = ? WHERE id = ?", r.status(), id);
        return Map.of("status", "ok");
    }
}
