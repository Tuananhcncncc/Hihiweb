package com.hihi.shop.security;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Lưu token đăng nhập trong bộ nhớ (token -> userId).
 * Khởi động lại backend thì token mất, người dùng chỉ cần đăng nhập lại.
 */
@Component
public class TokenStore {

    private final Map<String, Long> tokens = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public String issue(long userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.put(token, userId);
        return token;
    }

    public Long userId(String token) {
        return token == null ? null : tokens.get(token);
    }
}
