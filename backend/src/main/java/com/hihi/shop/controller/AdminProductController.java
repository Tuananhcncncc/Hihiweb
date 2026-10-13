package com.hihi.shop.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Admin: quản lý sản phẩm (thêm / sửa / xóa).
 * "Xóa" thực chất là ẨN sản phẩm (is_active = 0) để không làm hỏng đơn hàng cũ.
 * Muốn bán lại, sửa sản phẩm và tích "Đang bán".
 */
@RestController
@RequestMapping("/api/admin/products")
public class AdminProductController {

    public record ProductReq(Integer categoryId, String name, BigDecimal price, String description,
                             String imageUrl, Integer stock, Boolean active) {}

    private final JdbcTemplate jdbc;

    public AdminProductController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Trả về cả sản phẩm đã ẩn. */
    @GetMapping
    public List<Map<String, Object>> list() {
        return jdbc.queryForList(
                "SELECT p.id, p.category_id AS categoryId, c.name AS categoryName, p.name, p.price, " +
                "p.description, p.image_url AS imageUrl, p.stock, p.is_active AS active " +
                "FROM Products p JOIN Categories c ON c.id = p.category_id ORDER BY p.id DESC");
    }

    @PostMapping
    public Map<String, String> create(@RequestBody ProductReq r) {
        validate(r);
        jdbc.update("INSERT INTO Products(category_id, name, price, description, image_url, stock, is_active) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                r.categoryId(), r.name().trim(), price(r), emptyToNull(r.description()),
                image(r), stock(r), r.active() == null || r.active());
        return Map.of("status", "ok");
    }

    @PutMapping("/{id}")
    public Map<String, String> update(@PathVariable long id, @RequestBody ProductReq r) {
        validate(r);
        int n = jdbc.update("UPDATE Products SET category_id = ?, name = ?, price = ?, description = ?, " +
                        "image_url = ?, stock = ?, is_active = ? WHERE id = ?",
                r.categoryId(), r.name().trim(), price(r), emptyToNull(r.description()),
                image(r), stock(r), r.active() == null || r.active(), id);
        if (n == 0) throw new NoSuchElementException("Không tìm thấy sản phẩm");
        return Map.of("status", "ok");
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable long id) {
        int n = jdbc.update("UPDATE Products SET is_active = 0 WHERE id = ?", id);
        if (n == 0) throw new NoSuchElementException("Không tìm thấy sản phẩm");
        jdbc.update("DELETE FROM CartItems WHERE product_id = ?", id); // gỡ khỏi giỏ hàng của mọi người
        return Map.of("status", "ok");
    }

    // ---------- kiểm tra dữ liệu ----------
    private void validate(ProductReq r) {
        if (r.name() == null || r.name().isBlank()) throw new IllegalArgumentException("Vui lòng nhập tên sản phẩm");
        if (r.name().trim().length() > 200) throw new IllegalArgumentException("Tên sản phẩm tối đa 200 ký tự");
        if (r.price() == null || r.price().signum() < 0) throw new IllegalArgumentException("Giá phải là số không âm");
        if (r.price().compareTo(new BigDecimal("999999999999")) > 0) throw new IllegalArgumentException("Giá quá lớn");
        if (r.stock() != null && r.stock() < 0) throw new IllegalArgumentException("Tồn kho phải là số không âm");
        if (r.categoryId() == null) throw new IllegalArgumentException("Vui lòng chọn danh mục");
        Integer c = jdbc.queryForObject("SELECT COUNT(*) FROM Categories WHERE id = ?", Integer.class, r.categoryId());
        if (c == null || c == 0) throw new IllegalArgumentException("Danh mục không tồn tại");
        image(r); // kiểm tra tên file ảnh
    }

    private static BigDecimal price(ProductReq r) {
        return r.price().setScale(0, RoundingMode.HALF_UP);
    }

    private static int stock(ProductReq r) {
        return r.stock() == null ? 100 : r.stock();
    }

    /** Chỉ nhận TÊN FILE (vd: ao-thun.jpg), không nhận đường dẫn. */
    private static String image(ProductReq r) {
        if (r.imageUrl() == null || r.imageUrl().isBlank()) return null;
        String f = r.imageUrl().trim();
        if (f.contains("/") || f.contains("\\") || f.contains("..") || f.length() > 255) {
            throw new IllegalArgumentException("Ảnh chỉ nhập tên file, ví dụ: ao-thun.jpg");
        }
        return f;
    }

    private static String emptyToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
