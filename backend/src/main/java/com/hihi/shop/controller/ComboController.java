package com.hihi.shop.controller;

import com.hihi.shop.service.ComboService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Hihi AI tạo combo (ai cũng xem được, không cần đăng nhập). */
@RestController
@RequestMapping("/api/combos")
public class ComboController {

    private final ComboService combos;

    public ComboController(ComboService combos) {
        this.combos = combos;
    }

    /** Combo chứa sản phẩm đang xem: /api/combos?productId=10 */
    @GetMapping
    public List<Map<String, Object>> forProduct(@RequestParam long productId) {
        return combos.forProduct(productId);
    }

    /** Vài combo tiêu biểu cho trang chủ. */
    @GetMapping("/featured")
    public List<Map<String, Object>> featured() {
        return combos.featured(6);
    }
}
