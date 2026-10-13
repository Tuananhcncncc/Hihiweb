package com.hihi.shop.controller;

import com.hihi.shop.security.CustomerGuard;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/** Giỏ hàng lưu trong DB theo từng người dùng. Người dùng được xác định qua token đăng nhập (header Authorization). */
@RestController
@RequestMapping("/api/cart")
public class CartController {

    public record CartReq(long productId, int quantity) {}
    public record QtyReq(int quantity) {}

    private final JdbcTemplate jdbc;
    private final CustomerGuard guard;

    public CartController(JdbcTemplate jdbc, CustomerGuard guard) {
        this.jdbc = jdbc;
        this.guard = guard;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestAttribute("userId") long userId) {
        return jdbc.queryForList(
                "SELECT c.product_id AS productId, c.quantity, p.name, p.price, p.image_url AS imageUrl " +
                "FROM CartItems c JOIN Products p ON p.id = c.product_id WHERE c.user_id = ? AND p.is_active = 1 ORDER BY c.id", userId);
    }

    @PostMapping
    public Map<String, String> add(@RequestAttribute("userId") long userId, @RequestBody CartReq r) {
        guard.requireCustomer(userId);   // admin không được thêm vào giỏ
        if (r.quantity() < 1) {
            throw new IllegalArgumentException("Số lượng không hợp lệ");
        }
        Integer active = jdbc.queryForObject(
                "SELECT COUNT(*) FROM Products WHERE id = ? AND is_active = 1", Integer.class, r.productId());
        if (active == null || active == 0) {
            throw new NoSuchElementException("Sản phẩm không còn được bán");
        }
        int updated = jdbc.update(
                "UPDATE CartItems SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?",
                r.quantity(), userId, r.productId());
        if (updated == 0) {
            jdbc.update("INSERT INTO CartItems(user_id, product_id, quantity) VALUES (?, ?, ?)",
                    userId, r.productId(), r.quantity());
        }
        return Map.of("status", "ok");
    }

    @PutMapping("/{productId}")
    public Map<String, String> setQuantity(@RequestAttribute("userId") long userId,
                                           @PathVariable long productId, @RequestBody QtyReq r) {
        if (r.quantity() <= 0) {
            jdbc.update("DELETE FROM CartItems WHERE user_id = ? AND product_id = ?", userId, productId);
        } else {
            jdbc.update("UPDATE CartItems SET quantity = ? WHERE user_id = ? AND product_id = ?",
                    r.quantity(), userId, productId);
        }
        return Map.of("status", "ok");
    }

    @DeleteMapping("/{productId}")
    public Map<String, String> remove(@RequestAttribute("userId") long userId, @PathVariable long productId) {
        jdbc.update("DELETE FROM CartItems WHERE user_id = ? AND product_id = ?", userId, productId);
        return Map.of("status", "ok");
    }
}
