import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { vnd, sleep } from '../utils.js';
import Modal from './Modal.jsx';

/**
 * mode = 'cart'  -> thanh toán toàn bộ giỏ hàng
 * mode = 'now'   -> "Mua ngay" 1 sản phẩm (product + quantity)
 * onTopup: chuyển sang trang nạp tiền HihiPay. onViewOrders: chuyển sang trang Đơn hàng.
 */
export default function CheckoutModal({ mode, product, quantity, onClose, onTopup, onViewOrders }) {
  const { user, cart, refreshCart } = useApp();
  const items = mode === 'now'
    ? [{ productId: product.id, name: product.name, price: product.price, quantity }]
    : cart;
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const [form, setForm] = useState({ receiverName: user?.fullName || '', phone: '', address: '', paymentMethod: 'COD' });
  const [balance, setBalance] = useState(null);   // số dư ví HihiPay
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [short, setShort] = useState(null);       // {required, balance} khi không đủ số dư
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => {
    api.wallet().then((w) => setBalance(w.balance)).catch(() => setBalance(null));
  }, []);

  const methods = [
    { id: 'COD', label: 'Thanh toán khi nhận hàng', note: 'Trả tiền mặt cho người giao hàng' },
    { id: 'HIHIPAY', label: 'HihiPay', note: balance == null ? 'Thanh toán bằng ví HihiPay' : `Số dư: ${vnd(balance)}` },
    { id: 'CARD', label: 'Thẻ ATM / Visa / Mastercard', note: 'Mô phỏng: không cần nhập số thẻ thật' },
  ];

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!/^0\d{9}$/.test(form.phone)) return setErr('Số điện thoại gồm 10 chữ số và bắt đầu bằng 0');
    // HihiPay mà số dư không đủ -> báo ngay, không tạo đơn
    if (form.paymentMethod === 'HIHIPAY' && balance != null && balance < total) {
      setShort({ required: total, balance });
      return;
    }
    setBusy(true);
    try {
      if (form.paymentMethod !== 'COD') await sleep(1200); // mô phỏng thời gian xử lý thanh toán
      const res = await api.checkout({
        ...form,
        productId: mode === 'now' ? product.id : null,
        quantity: mode === 'now' ? quantity : null,
      });
      setDone(res);
      await refreshCart();
    } catch (ex) {
      if (ex.data?.code === 'INSUFFICIENT_BALANCE') setShort({ required: ex.data.required, balance: ex.data.balance });
      else setErr(ex.message);
    } finally { setBusy(false); }
  };

  // ----- Không đủ số dư -----
  if (short) {
    return (
      <Modal onClose={onClose}>
        <div className="success warn">
          <div className="success-icon warn-icon">!</div>
          <h2>Số dư không đủ</h2>
          <div className="kv"><span>Cần thanh toán:</span><b>{vnd(short.required)}</b></div>
          <div className="kv"><span>Số dư hiện tại:</span><b>{vnd(short.balance)}</b></div>
          <button className="btn btn-primary full" onClick={onTopup}>Nạp thêm tiền</button>
          <button className="btn btn-outline full" onClick={() => setShort(null)}>Chọn phương thức khác</button>
        </div>
      </Modal>
    );
  }

  // ----- Đặt hàng thành công -----
  if (done) {
    const isHihi = done.paymentMethod === 'HIHIPAY';
    return (
      <Modal onClose={onClose}>
        <div className="success">
          <div className="success-icon">✓</div>
          <h2>{done.status === 'PAID' ? 'Thanh toán thành công' : 'Đặt hàng thành công'}</h2>
          {isHihi && <p>Đã trừ <b>{vnd(done.total)}</b> từ ví HihiPay</p>}
          {isHihi && <p>Mã giao dịch: <b>{done.transactionCode}</b></p>}
          <p>Mã đơn hàng <b>#{done.orderId}</b></p>
          {!isHihi && <p>Tổng thanh toán <b>{vnd(done.total)}</b></p>}
          {isHihi && <p>Số dư còn lại: <b>{vnd(done.balance)}</b></p>}
          <p className="hint">
            {isHihi
              ? 'HihiPay là ví mô phỏng, không có khoản tiền thật nào bị trừ.'
              : done.status === 'PAID'
                ? 'Đây là thanh toán mô phỏng, không có khoản tiền thật nào bị trừ.'
                : 'Bạn sẽ thanh toán khi nhận hàng. Đây là đơn hàng mô phỏng.'}
          </p>
          <button className="btn btn-primary full" onClick={onViewOrders}>Xem đơn hàng</button>
          <button className="btn btn-outline full" onClick={onClose}>Tiếp tục mua sắm</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Thanh toán" onClose={onClose} wide>
      <form className="checkout" onSubmit={submit}>
        <div className="form">
          <label>Người nhận
            <input required value={form.receiverName} onChange={set('receiverName')} />
          </label>
          <label>Số điện thoại
            <input required inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} placeholder="0901234567" />
          </label>
          <label>Địa chỉ giao hàng
            <textarea required rows={2} value={form.address} onChange={set('address')} />
          </label>

          <fieldset className="pay">
            <legend>Phương thức thanh toán</legend>
            {methods.map((m) => (
              <label key={m.id} className={`pay-opt ${form.paymentMethod === m.id ? 'on' : ''}`}>
                <input type="radio" name="pay" checked={form.paymentMethod === m.id}
                  onChange={() => setForm({ ...form, paymentMethod: m.id })} />
                <span><b>{m.label}</b><small>{m.note}</small></span>
              </label>
            ))}
          </fieldset>
        </div>

        <div className="summary">
          <h4>Đơn hàng ({items.length} sản phẩm)</h4>
          <ul>
            {items.map((i) => (
              <li key={i.productId}>
                <span>{i.name} × {i.quantity}</span>
                <b>{vnd(i.price * i.quantity)}</b>
              </li>
            ))}
          </ul>
          <div className="total-row"><span>Tổng cộng</span><b>{vnd(total)}</b></div>
          {err && <div className="error">{err}</div>}
          <button className="btn btn-primary full" disabled={busy || items.length === 0}>
            {busy ? 'Đang xử lý thanh toán...' : 'Đặt hàng'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
