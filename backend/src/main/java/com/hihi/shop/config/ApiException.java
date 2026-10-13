package com.hihi.shop.config;

import java.util.Map;

/** Lỗi có mã HTTP riêng (403, 402...) và có thể kèm dữ liệu phụ để React xử lý. */
public class ApiException extends RuntimeException {
    private final int status;
    private final Map<String, Object> extra;

    public ApiException(int status, String message) {
        this(status, message, Map.of());
    }

    public ApiException(int status, String message, Map<String, Object> extra) {
        super(message);
        this.status = status;
        this.extra = extra;
    }

    public int getStatus() { return status; }
    public Map<String, Object> getExtra() { return extra; }
}
