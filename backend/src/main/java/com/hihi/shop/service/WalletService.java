package com.hihi.shop.service;

import com.hihi.shop.config.ApiException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.function.Supplier;

/**
 * Ví HihiPay MÔ PHỎNG (không kết nối ngân hàng thật).
 *  - Số dư nằm trong bảng Wallets, mỗi lần tiền vào / ra ghi 1 dòng ở WalletTransactions.
 *  - Nạp tiền: tạo giao dịch PENDING (chưa cộng tiền) -> người dùng XÁC NHẬN -> SUCCESS và mới cộng tiền.
 *  - Thanh toán đơn hàng: trừ tiền bằng 1 câu UPDATE có điều kiện (balance >= số tiền) nên không thể âm, kể cả khi bấm 2 lần cùng lúc.
 */
@Service
public class WalletService {

    public static final BigDecimal MIN_TOPUP = BigDecimal.valueOf(10_000);
    public static final BigDecimal MAX_TOPUP = BigDecimal.valueOf(50_000_000);

    private static final String TX_COLS =
            "t.code, t.type, t.amount, t.status, t.order_id AS orderId, t.balance_after AS balanceAfter, " +
            "t.note, t.created_at AS createdAt, t.completed_at AS completedAt, t.user_id AS userId";

    private final JdbcTemplate jdbc;
    private final SecureRandom random = new SecureRandom();

    public WalletService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public static String userCode(long userId) {
        return String.format("USER%03d", userId);
    }

    /** Mỗi người dùng có 1 ví, tự tạo (số dư 0) khi cần. */
    public void ensureWallet(long userId) {
        try {
            jdbc.update("IF NOT EXISTS (SELECT 1 FROM Wallets WHERE user_id = ?) " +
                    "INSERT INTO Wallets(user_id, balance) VALUES (?, 0)", userId, userId);
        } catch (DuplicateKeyException ignored) {
            // hai yêu cầu cùng lúc tạo ví: bỏ qua, ví đã có
        }
    }

    public BigDecimal balance(long userId) {
        ensureWallet(userId);
        return jdbc.queryForObject("SELECT balance FROM Wallets WHERE user_id = ?", BigDecimal.class, userId);
    }

    public ApiException insufficient(BigDecimal required, BigDecimal balance) {
        return new ApiException(402, "Số dư HihiPay không đủ",
                Map.of("code", "INSUFFICIENT_BALANCE", "required", required, "balance", balance));
    }

    /** Kiểm tra sớm trước khi tạo đơn (việc trừ tiền thật sự vẫn kiểm tra lại ở pay()). */
    public void assertEnough(long userId, BigDecimal amount) {
        BigDecimal bal = balance(userId);
        if (bal.compareTo(amount) < 0) throw insufficient(amount, bal);
    }

    // ---------------------------------------------------------------- nạp tiền

    public Map<String, Object> createTopup(long userId, BigDecimal amount) {
        if (amount == null || amount.compareTo(MIN_TOPUP) < 0) {
            throw new IllegalArgumentException("Số tiền nạp tối thiểu là 10.000đ");
        }
        if (amount.compareTo(MAX_TOPUP) > 0) {
            throw new IllegalArgumentException("Số tiền nạp tối đa mỗi lần là 50.000.000đ");
        }
        ensureWallet(userId);
        String code = uniqueCode(() -> "MP" + hex(3));   // vd MP8F29A1
        jdbc.update("INSERT INTO WalletTransactions(code, user_id, type, amount, status, note) " +
                "VALUES (?, ?, 'TOPUP', ?, 'PENDING', ?)", code, userId, amount.setScale(0, RoundingMode.HALF_UP), "Nạp tiền");
        return transaction(userId, code);
    }

    @Transactional
    public Map<String, Object> confirmTopup(long userId, String code) {
        ensureWallet(userId);
        // Chỉ giao dịch đang PENDING mới được xác nhận -> không bao giờ cộng tiền 2 lần
        int n = jdbc.update("UPDATE WalletTransactions SET status = 'SUCCESS', completed_at = SYSDATETIME() " +
                "WHERE code = ? AND user_id = ? AND type = 'TOPUP' AND status = 'PENDING'", code, userId);
        Map<String, Object> tx = transaction(userId, code);
        if (n == 0) {
            if ("CANCELLED".equals(tx.get("status"))) throw new IllegalArgumentException("Giao dịch này đã bị hủy");
            return withBalance(tx, balance(userId));   // đã thanh toán trước đó
        }
        BigDecimal amount = (BigDecimal) tx.get("amount");
        jdbc.update("UPDATE Wallets SET balance = balance + ?, updated_at = SYSDATETIME() WHERE user_id = ?", amount, userId);
        BigDecimal newBalance = balance(userId);
        jdbc.update("UPDATE WalletTransactions SET balance_after = ? WHERE code = ?", newBalance, code);
        return withBalance(transaction(userId, code), newBalance);
    }

    @Transactional
    public Map<String, Object> cancelTopup(long userId, String code) {
        int n = jdbc.update("UPDATE WalletTransactions SET status = 'CANCELLED', completed_at = SYSDATETIME() " +
                "WHERE code = ? AND user_id = ? AND type = 'TOPUP' AND status = 'PENDING'", code, userId);
        Map<String, Object> tx = transaction(userId, code);
        if (n == 0 && "SUCCESS".equals(tx.get("status"))) {
            throw new IllegalArgumentException("Giao dịch đã thanh toán thành công, không thể hủy");
        }
        return tx;
    }

    // ------------------------------------------------- thanh toán / hoàn tiền đơn

    /** Trừ tiền ví để trả đơn hàng. Gọi trong cùng giao dịch DB với việc tạo đơn. */
    @Transactional
    public Map<String, Object> pay(long userId, long orderId, BigDecimal amount) {
        ensureWallet(userId);
        int n = jdbc.update("UPDATE Wallets SET balance = balance - ?, updated_at = SYSDATETIME() " +
                "WHERE user_id = ? AND balance >= ?", amount, userId, amount);
        if (n == 0) throw insufficient(amount, balance(userId));
        BigDecimal newBalance = balance(userId);
        String code = uniqueCode(() -> "MP" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE)
                + String.format("%04d", random.nextInt(10_000)));   // vd MP202610081234
        jdbc.update("INSERT INTO WalletTransactions(code, user_id, type, amount, status, order_id, balance_after, note, completed_at) " +
                "VALUES (?, ?, 'PAYMENT', ?, 'SUCCESS', ?, ?, ?, SYSDATETIME())",
                code, userId, amount, orderId, newBalance, "Thanh toán đơn #" + orderId);
        Map<String, Object> res = new HashMap<>();
        res.put("transactionCode", code);
        res.put("balance", newBalance);
        return res;
    }

    /** Admin hủy đơn đã trả bằng HihiPay -> hoàn tiền vào ví (chỉ hoàn 1 lần cho mỗi đơn). */
    @Transactional
    public void refundOrder(long orderId) {
        List<Map<String, Object>> pays = jdbc.queryForList(
                "SELECT user_id AS userId, amount FROM WalletTransactions " +
                "WHERE order_id = ? AND type = 'PAYMENT' AND status = 'SUCCESS'", orderId);
        if (pays.isEmpty()) return;
        Integer refunded = jdbc.queryForObject(
                "SELECT COUNT(*) FROM WalletTransactions WHERE order_id = ? AND type = 'REFUND'", Integer.class, orderId);
        if (refunded != null && refunded > 0) return;
        long userId = ((Number) pays.get(0).get("userId")).longValue();
        BigDecimal amount = (BigDecimal) pays.get(0).get("amount");
        ensureWallet(userId);
        jdbc.update("UPDATE Wallets SET balance = balance + ?, updated_at = SYSDATETIME() WHERE user_id = ?", amount, userId);
        BigDecimal newBalance = balance(userId);
        String code = uniqueCode(() -> "MP" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE)
                + String.format("%04d", random.nextInt(10_000)));
        jdbc.update("INSERT INTO WalletTransactions(code, user_id, type, amount, status, order_id, balance_after, note, completed_at) " +
                "VALUES (?, ?, 'REFUND', ?, 'SUCCESS', ?, ?, ?, SYSDATETIME())",
                code, userId, amount, orderId, newBalance, "Hoàn tiền đơn #" + orderId);
    }

    // --------------------------------------------------------------- tra cứu

    public List<Map<String, Object>> transactions(long userId, int limit) {
        int lim = Math.max(1, Math.min(limit, 200));
        return jdbc.queryForList("SELECT TOP (?) " + TX_COLS + " FROM WalletTransactions t " +
                "WHERE t.user_id = ? ORDER BY t.id DESC", lim, userId).stream().map(this::decorate).toList();
    }

    public Map<String, Object> transaction(long userId, String code) {
        List<Map<String, Object>> rows = jdbc.queryForList("SELECT " + TX_COLS +
                " FROM WalletTransactions t WHERE t.code = ? AND t.user_id = ?", code, userId);
        if (rows.isEmpty()) throw new NoSuchElementException("Không tìm thấy giao dịch");
        return decorate(rows.get(0));
    }

    /** Thêm số tiền có dấu (+/-), tiêu đề và nội dung mã QR; bỏ userId khỏi kết quả trả về. */
    private Map<String, Object> decorate(Map<String, Object> row) {
        Map<String, Object> m = new HashMap<>(row);
        long userId = ((Number) m.remove("userId")).longValue();
        BigDecimal amount = (BigDecimal) m.get("amount");
        String type = (String) m.get("type");
        m.put("signedAmount", "PAYMENT".equals(type) ? amount.negate() : amount);
        m.put("title", m.get("note"));
        if ("TOPUP".equals(type)) {
            m.put("qrContent", "HIHIPAY\nTransaction: " + m.get("code") + "\nUser: " + userCode(userId)
                    + "\nAmount: " + amount.toPlainString());
        }
        return m;
    }

    private static Map<String, Object> withBalance(Map<String, Object> tx, BigDecimal balance) {
        Map<String, Object> m = new HashMap<>(tx);
        m.put("balance", balance);
        return m;
    }

    private String hex(int bytes) {
        byte[] b = new byte[bytes];
        random.nextBytes(b);
        StringBuilder sb = new StringBuilder();
        for (byte x : b) sb.append(String.format("%02X", x));
        return sb.toString();
    }

    private String uniqueCode(Supplier<String> gen) {
        for (int i = 0; i < 30; i++) {
            String c = gen.get();
            Integer used = jdbc.queryForObject("SELECT COUNT(*) FROM WalletTransactions WHERE code = ?", Integer.class, c);
            if (used != null && used == 0) return c;
        }
        throw new IllegalStateException("Không tạo được mã giao dịch, hãy thử lại");
    }
}
