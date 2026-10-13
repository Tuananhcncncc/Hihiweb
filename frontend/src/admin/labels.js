export const STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  PAID: 'Đã thanh toán',
  SHIPPING: 'Đang giao',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};
export const PAYMENT_LABELS = { COD: 'Thanh toán khi nhận hàng', HIHIPAY: 'Ví HihiPay', CARD: 'Thẻ' };
export const fmtDate = (s) => (s ? new Date(s).toLocaleString('vi-VN') : '');

// Câu giải thích trạng thái đơn hàng cho khách
export const STATUS_HINTS = {
  PENDING: 'Cửa hàng đang chờ xử lý đơn của bạn.',
  PAID: 'Đã thanh toán, cửa hàng đang chuẩn bị hàng.',
  SHIPPING: 'Đơn hàng đang trên đường giao đến bạn.',
  COMPLETED: 'Giao hàng thành công. Cảm ơn bạn đã mua sắm!',
  CANCELLED: 'Đơn hàng đã bị hủy.',
};
// Trạng thái giao dịch ví HihiPay
export const TX_STATUS_LABELS = { PENDING: 'Đang chờ', SUCCESS: 'Thành công', CANCELLED: 'Đã hủy' };
export const TX_TYPE_LABELS = { TOPUP: 'Nạp tiền', PAYMENT: 'Thanh toán đơn hàng', REFUND: 'Hoàn tiền' };
