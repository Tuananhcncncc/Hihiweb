package com.hihi.shop.service;

import java.util.*;

/**
 * Thuật toán ghép combo (Java thuần, không phụ thuộc Spring nên dễ kiểm thử).
 *
 * Dữ liệu là một ĐỒ THỊ quan hệ giữa các sản phẩm: mỗi cạnh "A -> B" nghĩa là "B đi cùng A" trong một chủ đề.
 * Ví dụ: Laptop -> Chuột, Laptop -> Bàn phím, Camera -> Tripod, Áo sơ mi -> Quần -> Giày.
 *
 * Với sản phẩm người dùng chọn (P), với mỗi chủ đề mà P tham gia:
 *   1. Đi NGƯỢC theo các cạnh để tìm sản phẩm "gốc" (vd chọn Giày -> Quần -> Áo sơ mi, gốc là Áo sơ mi).
 *   2. Từ gốc đi XUÔI (duyệt theo chiều rộng) để gom các sản phẩm đi cùng, tối đa maxCompanions món.
 *   3. Gốc + các món đi cùng = một combo (luôn chứa P).
 */
public final class ComboGraph {

    public record Edge(long from, long to, String theme, int sort, String reason) {}

    public record Draft(String theme, List<Long> productIds, List<String> reasons) {}

    private ComboGraph() {}

    /**
     * @param usable ids sản phẩm được phép làm món đi kèm (đang bán và còn hàng). Sản phẩm P luôn được phép.
     */
    public static List<Draft> build(long productId, List<Edge> allEdges, Set<Long> usable,
                                    int maxCompanions, int maxCombos) {
        List<Edge> edges = new ArrayList<>();
        for (Edge e : allEdges) {
            boolean fromOk = e.from() == productId || usable.contains(e.from());
            boolean toOk = e.to() == productId || usable.contains(e.to());
            if (fromOk && toOk) edges.add(e);
        }
        edges.sort(Comparator.comparingInt(Edge::sort));   // sort ổn định: cùng thứ tự thì giữ nguyên thứ tự gốc

        LinkedHashSet<String> themes = new LinkedHashSet<>();
        for (Edge e : edges) {
            if (e.from() == productId || e.to() == productId) themes.add(e.theme());
        }

        List<Draft> result = new ArrayList<>();
        Set<Set<Long>> seen = new HashSet<>();
        for (String theme : themes) {
            List<Edge> themeEdges = new ArrayList<>();
            for (Edge e : edges) if (e.theme().equals(theme)) themeEdges.add(e);

            for (long root : roots(productId, themeEdges)) {
                Draft d = grow(root, productId, theme, themeEdges, maxCompanions);
                if (d == null || !seen.add(new HashSet<>(d.productIds()))) continue;
                result.add(d);
                if (result.size() >= maxCombos) return result;
            }
        }
        return result;
    }

    /** Các sản phẩm "gốc" (không có sản phẩm nào đứng trước) mà P thuộc về. */
    private static List<Long> roots(long start, List<Edge> edges) {
        LinkedHashSet<Long> roots = new LinkedHashSet<>();
        climb(start, edges, new HashSet<>(), roots);
        if (roots.isEmpty()) roots.add(start);   // phòng trường hợp đồ thị có vòng
        return new ArrayList<>(roots);
    }

    private static void climb(long node, List<Edge> edges, Set<Long> visited, Set<Long> roots) {
        if (!visited.add(node)) return;
        boolean hasParent = false;
        for (Edge e : edges) {
            if (e.to() == node) {
                hasParent = true;
                climb(e.from(), edges, visited, roots);
            }
        }
        if (!hasParent) roots.add(node);
    }

    private static Draft grow(long root, long wanted, String theme, List<Edge> edges, int maxCompanions) {
        List<Long> order = new ArrayList<>();
        List<Edge> used = new ArrayList<>();
        Set<Long> visited = new HashSet<>();
        visited.add(root);
        Deque<Long> queue = new ArrayDeque<>();
        queue.add(root);
        while (!queue.isEmpty()) {
            long cur = queue.poll();
            for (Edge e : edges) {
                if (e.from() == cur && visited.add(e.to())) {
                    order.add(e.to());
                    used.add(e);
                    queue.add(e.to());
                }
            }
        }
        List<Long> companions = new ArrayList<>(order.subList(0, Math.min(order.size(), maxCompanions)));
        if (companions.isEmpty()) return null;
        // Đảm bảo sản phẩm người dùng đang xem nằm trong combo dù bị cắt bớt
        if (wanted != root && order.contains(wanted) && !companions.contains(wanted)) {
            companions.set(companions.size() - 1, wanted);
        }
        List<Long> ids = new ArrayList<>();
        ids.add(root);
        ids.addAll(companions);
        Set<Long> inCombo = new HashSet<>(ids);
        List<String> reasons = new ArrayList<>();
        for (Edge e : used) {
            String r = e.reason();
            if (inCombo.contains(e.from()) && inCombo.contains(e.to()) && r != null && !r.isBlank() && !reasons.contains(r)) {
                reasons.add(r);
            }
        }
        return new Draft(theme, ids, reasons);
    }
}
