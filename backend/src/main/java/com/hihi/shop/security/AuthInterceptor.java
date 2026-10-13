package com.hihi.shop.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.List;

/**
 * Chạy trước mọi API:
 *  - Đọc header "Authorization: Bearer <token>", nếu hợp lệ thì gắn userId vào request.
 *  - /api/cart, /api/orders, /api/wallet yêu cầu đã đăng nhập (401 nếu chưa).
 *  - /api/admin/** yêu cầu tài khoản có role = ADMIN (403 nếu không phải).
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final TokenStore tokens;
    private final JdbcTemplate jdbc;

    public AuthInterceptor(TokenStore tokens, JdbcTemplate jdbc) {
        this.tokens = tokens;
        this.jdbc = jdbc;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws IOException {
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) return true; // yêu cầu kiểm tra CORS

        Long userId = null;
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            userId = tokens.userId(header.substring(7));
        }
        if (userId != null) req.setAttribute("userId", userId);

        String path = req.getRequestURI();
        boolean admin = path.startsWith("/api/admin");
        boolean needLogin = admin || path.startsWith("/api/cart")
                || path.startsWith("/api/orders") || path.startsWith("/api/wallet");

        if (needLogin && userId == null) {
            return deny(res, 401, "Vui lòng đăng nhập để tiếp tục");
        }
        if (admin) {
            List<String> roles = jdbc.queryForList("SELECT role FROM Users WHERE id = ?", String.class, userId);
            if (roles.isEmpty() || !"ADMIN".equals(roles.get(0))) {
                return deny(res, 403, "Bạn không có quyền truy cập khu vực quản trị");
            }
        }
        return true;
    }

    private boolean deny(HttpServletResponse res, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json");
        res.setCharacterEncoding("UTF-8");
        res.getWriter().write("{\"message\":\"" + message + "\"}");
        return false;
    }
}
