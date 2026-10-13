import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { vnd } from '../utils.js';
import Modal from '../components/Modal.jsx';
import SmartImage from '../components/SmartImage.jsx';
import { STATUS_LABELS, STATUS_HINTS, PAYMENT_LABELS, fmtDate } from '../admin/labels.js';

/** Đơn hàng của tôi: trạng thái do admin cập nhật, tự làm mới mỗi 15 giây và khi quay lại tab. */
export default function OrdersPage() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => (
    api.myOrders().then((d) => { setOrders(d); setError(''); }).catch((e) => setError(e.message))
  ), []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    window.addEventListener('focus', load);
    return () => { clearInterval(timer); window.removeEventListener('focus', load); };
  }, [load]);

  const list = (orders || []).filter((o) => !filter || o.status === filter);
  const count = (s) => (orders || []).filter((o) => o.status === s).length;
  // Giữ cửa sổ chi tiết luôn khớp dữ liệu mới nhất
  const current = detail && (orders || []).find((o) => o.id === detail);

  return (
    <section className="page">
      <div className="page-head">
        <h2>Đơn hàng của tôi</h2>
        <button className="btn btn-outline btn-sm" onClick={load}>Tải lại</button>
      </div>

      <div className="chips">
        <button className={`chip ${filter === '' ? 'on' : ''}`} onClick={() => setFilter('')}>Tất cả ({(orders || []).length})</button>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <button key={k} className={`chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{v} ({count(k)})</button>
        ))}
      </div>

      {error && <div className="alert">{error}</div>}
      {!orders && !error && <div className="empty">Đang tải đơn hàng...</div>}
      {orders && list.length === 0 && <div className="empty">Chưa có đơn hàng nào{filter ? ' ở trạng thái này' : ''}.</div>}

      <div className="order-list">
        {list.map((o) => (
          <article className="order-card" key={o.id}>
            <div className="order-card-head">
              <div><b>Đơn hàng #{o.id}</b><small className="sub">Đặt lúc {fmtDate(o.createdAt)}</small></div>
              <span className={`tag st-${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span>
            </div>
            <p className="order-hint">{STATUS_HINTS[o.status]}</p>
            <ul className="order-items">
              {o.items.map((i) => (
                <li key={i.productId}>
                  <span className="order-thumb"><SmartImage file={i.imageUrl} alt={i.name} /></span>
                  <span className="order-iname">{i.name}<small className="sub">× {i.quantity}</small></span>
                  <b>{vnd(i.unitPrice * i.quantity)}</b>
                </li>
              ))}
            </ul>
            <div className="order-card-foot">
              <span className="muted">{PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod}</span>
              <span>Tổng: <b className="money">{vnd(o.total)}</b></span>
              <button className="btn btn-outline btn-sm" onClick={() => setDetail(o.id)}>Chi tiết</button>
            </div>
          </article>
        ))}
      </div>

      {current && (
        <Modal title={`Đơn hàng #${current.id}`} onClose={() => setDetail(null)}>
          <div className="kv"><span>Trạng thái</span><span className={`tag st-${current.status}`}>{STATUS_LABELS[current.status]}</span></div>
          <p className="order-hint">
            {STATUS_HINTS[current.status]}
            {current.status === 'CANCELLED' && current.paymentMethod === 'HIHIPAY' && ' Tiền đã được hoàn vào ví HihiPay.'}
          </p>
          <div className="kv"><span>Ngày đặt</span><b>{fmtDate(current.createdAt)}</b></div>
          <div className="kv"><span>Người nhận</span><b>{current.receiverName}</b></div>
          <div className="kv"><span>Điện thoại</span><b>{current.phone}</b></div>
          <div className="kv"><span>Địa chỉ</span><b className="right">{current.address}</b></div>
          <div className="kv"><span>Thanh toán</span><b>{PAYMENT_LABELS[current.paymentMethod] || current.paymentMethod}</b></div>
          {current.paymentCode && <div className="kv"><span>Mã giao dịch</span><b>{current.paymentCode}</b></div>}
          <ul className="items detail-items">
            {current.items.map((i) => (
              <li key={i.productId}><span>{i.name} × {i.quantity}</span><b>{vnd(i.unitPrice * i.quantity)}</b></li>
            ))}
          </ul>
          <div className="total-row"><span>Tổng cộng</span><b>{vnd(current.total)}</b></div>
        </Modal>
      )}
    </section>
  );
}
