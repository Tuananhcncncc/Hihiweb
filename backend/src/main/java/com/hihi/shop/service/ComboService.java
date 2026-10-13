package com.hihi.shop.service;

import com.hihi.shop.service.ComboGraph.Draft;
import com.hihi.shop.service.ComboGraph.Edge;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

/**
 * "Hihi AI tạo combo": dựa trên bảng ProductRelations (quan hệ giữa các sản phẩm) và ComboThemes (chủ đề).
 * Đây là AI theo luật / đồ thị tri thức, không gọi mô hình ngôn ngữ bên ngoài.
 * Phần "giải thích" = câu mô tả của chủ đề + lý do ghép cặp của từng quan hệ được dùng.
 * Cửa hàng nhỏ nên mỗi lần gọi đọc cả bảng quan hệ vào bộ nhớ là đủ nhanh.
 */
@Service
public class ComboService {

    private static final int MAX_COMPANIONS = 3;   // combo tối đa 4 món (1 gốc + 3 món đi kèm)

    private final JdbcTemplate jdbc;

    public ComboService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private record Data(Map<Long, Map<String, Object>> products, Set<Long> usable,
                        List<Edge> edges, LinkedHashMap<String, Map<String, Object>> themes) {}

    private Data load() {
        Map<Long, Map<String, Object>> products = new HashMap<>();
        Set<Long> usable = new HashSet<>();
        for (Map<String, Object> p : jdbc.queryForList(
                "SELECT id, name, price, image_url AS imageUrl, stock FROM Products WHERE is_active = 1")) {
            long id = ((Number) p.get("id")).longValue();
            products.put(id, p);
            if (((Number) p.get("stock")).intValue() > 0) usable.add(id);
        }
        List<Edge> edges = new ArrayList<>();
        for (Map<String, Object> r : jdbc.queryForList(
                "SELECT product_id, related_product_id, theme, sort_order, reason FROM ProductRelations ORDER BY sort_order, id")) {
            edges.add(new Edge(((Number) r.get("product_id")).longValue(), ((Number) r.get("related_product_id")).longValue(),
                    (String) r.get("theme"), ((Number) r.get("sort_order")).intValue(), (String) r.get("reason")));
        }
        LinkedHashMap<String, Map<String, Object>> themes = new LinkedHashMap<>();
        for (Map<String, Object> t : jdbc.queryForList(
                "SELECT code, name, icon, explanation FROM ComboThemes ORDER BY sort_order, code")) {
            themes.put((String) t.get("code"), t);
        }
        return new Data(products, usable, edges, themes);
    }

    /** Các combo chứa sản phẩm này (tối đa 2). Rỗng nếu sản phẩm chưa có quan hệ nào. */
    public List<Map<String, Object>> forProduct(long productId) {
        Data d = load();
        if (!d.products().containsKey(productId)) return List.of();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Draft draft : ComboGraph.build(productId, d.edges(), d.usable(), MAX_COMPANIONS, 2)) {
            out.add(toCombo(draft, d));
        }
        return out;
    }

    /** Mỗi chủ đề lấy 1 combo tiêu biểu để hiện ở trang chủ. */
    public List<Map<String, Object>> featured(int limit) {
        Data d = load();
        List<Map<String, Object>> out = new ArrayList<>();
        for (String theme : d.themes().keySet()) {
            for (Edge e : d.edges()) {
                if (!e.theme().equals(theme) || !d.products().containsKey(e.from()) || !d.usable().contains(e.from())) continue;
                Optional<Draft> first = ComboGraph.build(e.from(), d.edges(), d.usable(), MAX_COMPANIONS, 4).stream()
                        .filter(x -> x.theme().equals(theme)).findFirst();
                if (first.isPresent()) {
                    out.add(toCombo(first.get(), d));
                    break;
                }
            }
            if (out.size() >= limit) break;
        }
        return out;
    }

    private Map<String, Object> toCombo(Draft draft, Data d) {
        List<Map<String, Object>> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (long id : draft.productIds()) {
            Map<String, Object> p = d.products().get(id);
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", id);
            item.put("name", p.get("name"));
            item.put("price", p.get("price"));
            item.put("imageUrl", p.get("imageUrl"));
            items.add(item);
            total = total.add((BigDecimal) p.get("price"));
        }
        Map<String, Object> theme = d.themes().get(draft.theme());
        String title = theme != null ? (String) theme.get("name") : "Combo Hihi";
        String intro = theme != null ? (String) theme.get("explanation") : "Các sản phẩm này thường được dùng cùng nhau.";
        Map<String, Object> combo = new LinkedHashMap<>();
        combo.put("theme", draft.theme());
        combo.put("title", title);
        combo.put("icon", theme != null ? theme.get("icon") : null);
        combo.put("items", items);
        combo.put("total", total);
        combo.put("explanation", (intro + " " + String.join(" ", draft.reasons())).trim());
        return combo;
    }
}
