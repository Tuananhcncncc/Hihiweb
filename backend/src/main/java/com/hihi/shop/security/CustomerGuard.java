package com.hihi.shop.security;

import com.hihi.shop.config.ApiException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;

/** Tài khoản ADMIN chỉ để quản trị, không được mua hàng. */
@Component
public class CustomerGuard {

    private final JdbcTemplate jdbc;

    public CustomerGuard(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void requireCustomer(long userId) {
        List<String> roles = jdbc.queryForList("SELECT role FROM Users WHERE id = ?", String.class, userId);
        if (!roles.isEmpty() && "ADMIN".equals(roles.get(0))) {
            throw new ApiException(403, "Tài khoản quản trị không thể mua hàng");
        }
    }
}
