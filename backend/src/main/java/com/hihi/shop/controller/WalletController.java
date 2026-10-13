package com.hihi.shop.controller;

import com.hihi.shop.service.WalletService;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Ví HihiPay của người dùng đang đăng nhập (mô phỏng). */
@RestController
@RequestMapping("/api/wallet")
public class WalletController {

    public record TopupReq(BigDecimal amount) {}

    private final WalletService wallet;

    public WalletController(WalletService wallet) {
        this.wallet = wallet;
    }

    @GetMapping
    public Map<String, Object> info(@RequestAttribute("userId") long userId) {
        Map<String, Object> m = new HashMap<>();
        m.put("balance", wallet.balance(userId));
        m.put("userCode", WalletService.userCode(userId));
        return m;
    }

    /** ?limit=5 cho "Giao dịch gần đây", mặc định 50 cho "Lịch sử". */
    @GetMapping("/transactions")
    public List<Map<String, Object>> transactions(@RequestAttribute("userId") long userId,
                                                  @RequestParam(defaultValue = "50") int limit) {
        return wallet.transactions(userId, limit);
    }

    @GetMapping("/transactions/{code}")
    public Map<String, Object> transaction(@RequestAttribute("userId") long userId, @PathVariable String code) {
        return wallet.transaction(userId, code);
    }

    /** Bấm "Tạo mã QR": tạo giao dịch PENDING, CHƯA cộng tiền. */
    @PostMapping("/topups")
    public Map<String, Object> createTopup(@RequestAttribute("userId") long userId, @RequestBody TopupReq r) {
        return wallet.createTopup(userId, r.amount());
    }

    /** Bấm XÁC NHẬN trên màn hình thanh toán: lúc này mới cộng tiền. */
    @PostMapping("/topups/{code}/confirm")
    public Map<String, Object> confirm(@RequestAttribute("userId") long userId, @PathVariable String code) {
        return wallet.confirmTopup(userId, code);
    }

    @PostMapping("/topups/{code}/cancel")
    public Map<String, Object> cancel(@RequestAttribute("userId") long userId, @PathVariable String code) {
        return wallet.cancelTopup(userId, code);
    }
}
