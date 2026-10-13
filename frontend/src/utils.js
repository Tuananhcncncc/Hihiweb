// 189000 -> "189.000 ₫"
export const vnd = (n) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

// 299000 -> "299.000đ"
export const vndShort = (n) => `${new Intl.NumberFormat('vi-VN').format(n)}đ`;
// 500000 -> "500.000" (dùng cho ô nhập tiền)
export const fmtNum = (n) => new Intl.NumberFormat('vi-VN').format(n);
// +500.000 ₫ / -299.000 ₫
export const signedVnd = (n) => (n > 0 ? '+' : n < 0 ? '-' : '') + vnd(Math.abs(n));
export const fmtDateTime = (s) => (s ? new Date(s).toLocaleString('vi-VN') : '');
// "Hôm nay" / "Hôm qua" / 08/10/2026
export function relDay(s) {
  if (!s) return '';
  const d = new Date(s);
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date()) - start(d)) / 86400000);
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN');
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
