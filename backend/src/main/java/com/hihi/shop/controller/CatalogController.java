package com.hihi.shop.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/** Danh mục và sản phẩm (ai cũng xem được, không cần đăng nhập). */
@RestController
@RequestMapping("/api")
public class CatalogController {

    private static final String COLS =
            "id, category_id AS categoryId, name, price, description, image_url AS imageUrl, stock";

    private final JdbcTemplate jdbc;

    public CatalogController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/categories")
    public List<Map<String, Object>> categories() {
        return jdbc.queryForList("SELECT id, name, slug, icon FROM Categories ORDER BY id");
    }

    /** /api/products?categoryId=3  hoặc  /api/products?q=áo  (có thể kết hợp). */
    @GetMapping("/products")
    public List<Map<String, Object>> products(@RequestParam(required = false) Integer categoryId,
                                              @RequestParam(required = false) String q) {
        StringBuilder sql = new StringBuilder("SELECT " + COLS + " FROM Products WHERE is_active = 1");
        List<Object> args = new ArrayList<>();
        if (categoryId != null) {
            sql.append(" AND category_id = ?");
            args.add(categoryId);
        }
        if (q != null && !q.isBlank()) {
            // Không phân biệt hoa/thường và dấu: gõ "ao thun" vẫn ra "Áo thun"
            sql.append(" AND name COLLATE Latin1_General_100_CI_AI LIKE ? ESCAPE '\\'");
            args.add("%" + escapeLike(q.trim()) + "%");
        }
        sql.append(" ORDER BY id");
        return jdbc.queryForList(sql.toString(), args.toArray());
    }

    /**
     * Gợi ý khi gõ vào ô tìm kiếm: /api/products/suggest?q=áo  -> tối đa 8 sản phẩm có chữ "áo" trong tên.
     * Không phân biệt hoa/thường và dấu; tên bắt đầu bằng từ khóa được xếp lên trước.
     */
    @GetMapping("/products/suggest")
    public List<Map<String, Object>> suggest(@RequestParam String q) {
        String key = q == null ? "" : q.trim();
        if (key.isEmpty()) return List.of();
        String safe = escapeLike(key);
        return jdbc.queryForList(
                "SELECT TOP 8 id, name, price, image_url AS imageUrl FROM Products " +
                "WHERE is_active = 1 AND name COLLATE Latin1_General_100_CI_AI LIKE ? ESCAPE '\\' " +
                "ORDER BY CASE WHEN name COLLATE Latin1_General_100_CI_AI LIKE ? ESCAPE '\\' THEN 0 ELSE 1 END, name",
                "%" + safe + "%", safe + "%");
    }

    /** Thoát các ký tự đặc biệt của LIKE (% _ [) để người dùng gõ gì cũng tìm đúng chữ đó. */
    private static String escapeLike(String s) {
        return s.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_").replace("[", "\\[");
    }

    @GetMapping("/products/{id}")
    public Map<String, Object> product(@PathVariable long id) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT " + COLS + " FROM Products WHERE id = ? AND is_active = 1", id);
        if (rows.isEmpty()) {
            throw new NoSuchElementException("Không tìm thấy sản phẩm");
        }
        return rows.get(0);
    }
}
