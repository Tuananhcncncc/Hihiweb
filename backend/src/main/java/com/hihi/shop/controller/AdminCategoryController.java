package com.hihi.shop.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.text.Normalizer;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/** Admin: quản lý danh mục (thêm / sửa / xóa). */
@RestController
@RequestMapping("/api/admin/categories")
public class AdminCategoryController {

    public record CategoryReq(String name, String icon) {}

    private final JdbcTemplate jdbc;

    public AdminCategoryController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public List<Map<String, Object>> list() {
        return jdbc.queryForList(
                "SELECT c.id, c.name, c.slug, c.icon, COUNT(p.id) AS productCount " +
                "FROM Categories c LEFT JOIN Products p ON p.category_id = c.id " +
                "GROUP BY c.id, c.name, c.slug, c.icon ORDER BY c.id");
    }

    @PostMapping
    public Map<String, String> create(@RequestBody CategoryReq r) {
        String name = validName(r);
        String icon = validIcon(r);
        String base = slugify(name);
        if (base.isEmpty()) base = "danh-muc";
        String slug = base;
        int i = 2;
        while (exists(slug)) slug = base + "-" + i++;
        jdbc.update("INSERT INTO Categories(name, slug, icon) VALUES (?, ?, ?)", name, slug, icon);
        return Map.of("status", "ok");
    }

    @PutMapping("/{id}")
    public Map<String, String> update(@PathVariable int id, @RequestBody CategoryReq r) {
        int n = jdbc.update("UPDATE Categories SET name = ?, icon = ? WHERE id = ?", validName(r), validIcon(r), id);
        if (n == 0) throw new NoSuchElementException("Không tìm thấy danh mục");
        return Map.of("status", "ok");
    }

    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable int id) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM Products WHERE category_id = ?", Integer.class, id);
        if (count != null && count > 0) {
            throw new IllegalArgumentException("Danh mục còn " + count + " sản phẩm (kể cả sản phẩm đã ẩn). "
                    + "Hãy chuyển các sản phẩm sang danh mục khác trước khi xóa");
        }
        int n = jdbc.update("DELETE FROM Categories WHERE id = ?", id);
        if (n == 0) throw new NoSuchElementException("Không tìm thấy danh mục");
        return Map.of("status", "ok");
    }

    private boolean exists(String slug) {
        Integer c = jdbc.queryForObject("SELECT COUNT(*) FROM Categories WHERE slug = ?", Integer.class, slug);
        return c != null && c > 0;
    }

    private static String validName(CategoryReq r) {
        if (r.name() == null || r.name().isBlank()) throw new IllegalArgumentException("Vui lòng nhập tên danh mục");
        String name = r.name().trim();
        if (name.length() > 100) throw new IllegalArgumentException("Tên danh mục tối đa 100 ký tự");
        return name;
    }

    private static String validIcon(CategoryReq r) {
        if (r.icon() == null || r.icon().isBlank()) return null;
        String icon = r.icon().trim();
        if (icon.length() > 10) throw new IllegalArgumentException("Biểu tượng tối đa 10 ký tự (nên dùng 1 emoji)");
        return icon;
    }

    /** "Thời Trang Nam" -> "thoi-trang-nam" */
    private static String slugify(String s) {
        String t = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        t = t.replace('đ', 'd').replace('Đ', 'D').toLowerCase();
        return t.replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
    }
}
