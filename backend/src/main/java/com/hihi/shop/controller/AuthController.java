package com.hihi.shop.controller;

import com.hihi.shop.security.TokenStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Đăng ký / đăng nhập. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record RegisterReq(String fullName, String email, String password) {}
    public record LoginReq(String email, String password) {}

    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    private final TokenStore tokens;

    public AuthController(JdbcTemplate jdbc, PasswordEncoder encoder, TokenStore tokens) {
        this.jdbc = jdbc;
        this.encoder = encoder;
        this.tokens = tokens;
    }

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody RegisterReq r) {
        if (blank(r.fullName()) || blank(r.email()) || r.password() == null || r.password().length() < 6) {
            throw new IllegalArgumentException("Vui lòng nhập đủ thông tin, mật khẩu tối thiểu 6 ký tự");
        }
        String email = r.email().trim().toLowerCase();
        Integer exists = jdbc.queryForObject("SELECT COUNT(*) FROM Users WHERE email = ?", Integer.class, email);
        if (exists != null && exists > 0) {
            throw new IllegalArgumentException("Email này đã được đăng ký");
        }
        jdbc.update("INSERT INTO Users(full_name, email, password_hash) VALUES (?, ?, ?)",
                r.fullName().trim(), email, encoder.encode(r.password()));
        Map<String, Object> user = new HashMap<>(jdbc.queryForMap(
                "SELECT id, full_name AS fullName, email, role FROM Users WHERE email = ?", email));
        user.put("token", tokens.issue(((Number) user.get("id")).longValue()));
        return user;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginReq r) {
        if (blank(r.email()) || r.password() == null) {
            throw new IllegalArgumentException("Vui lòng nhập email và mật khẩu");
        }
        List<Map<String, Object>> rows = jdbc.queryForList(
                "SELECT id, full_name AS fullName, email, role, password_hash AS hash FROM Users WHERE email = ?",
                r.email().trim().toLowerCase());
        if (rows.isEmpty() || !encoder.matches(r.password(), (String) rows.get(0).get("hash"))) {
            throw new IllegalArgumentException("Email hoặc mật khẩu không đúng");
        }
        Map<String, Object> user = new HashMap<>(rows.get(0));
        user.remove("hash");
        user.put("token", tokens.issue(((Number) user.get("id")).longValue()));
        return user;
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }
}
