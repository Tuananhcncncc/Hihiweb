import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { vnd } from '../utils.js';
import Modal from '../components/Modal.jsx';
import { STATUS_LABELS, PAYMENT_LABELS, fmtDate } from './labels.js';

export default function AdminOrders({ onChanged }) {
  const { notify } = useApp();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.admin.orders(status).then(setOrders).catch((e) => notify(e.message));
  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = async (id) => {
    try { const d = await api.admin.order(id); setDetail(d); setNewStatus(d.status); }
    catch (e) { notify(e.message); }
  };

  const update = async () => {
    setBusy(true);
    try {
      await api.admin.setOrderStatus(detail.id, newStatus);
      notify('Đã cập nhật trạng thái đơn hàng');
      await open(detail.id); load(); onChanged();
    } catch (e) { notify(e.message); } finally { setBusy(false); }
  };

  const finished = detail && (detail.status === 'COMPLETED' || detail.status === 'CANCELLED');

  return (
    <section>
      <div className="toolbar">
        <label className="inline">Lọc theo trạng thái
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <button className="btn btn-outline btn-sm" onClick={load}>Tải lại</button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Mã</th><th>Khách hàng</th><th>Người nhận</th><th>Tổng tiền</th><th>Thanh toán</th><th>Trạng thái</th><th>Ngày đặt</th><th></th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>{o.customerName}<small className="sub">{o.customerEmail}</small></td>
                <td>{o.receiverName}<small className="sub">{o.phone}</small></td>
                <td>{vnd(o.total)}</td>
                <td>{PAYMENT_LABELS[o.paymentMethod] || o.paymentMethod}</td>
                <td><span className={`tag st-${o.status}`}>{STATUS_LABELS[o.status] || o.status}</span></td>
                <td>{fmtDate(o.createdAt)}</td>
                <td className="row-actions"><button className="btn btn-outline btn-sm" onClick={() => open(o.id)}>Chi tiết</button></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={8} className="empty">Chưa có đơn hàng nào.</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <Modal title={`Đơn hàng #${detail.id}`} onClose={() => setDetail(null)} wide>
          <div className="order-detail">
            <div>
              <h4>Thông tin giao hàng</h4>
              <p><b>{detail.receiverName}</b> - {detail.phone}</p>
              <p>{detail.address}</p>
              <p className="muted">Khách đặt: {detail.customerName} ({detail.customerEmail})<br />Ngày đặt: {fmtDate(detail.createdAt)}</p>
              <p>Thanh toán: <b>{PAYMENT_LABELS[detail.paymentMethod] || detail.paymentMethod}</b></p>
            </div>
            <div>
              <h4>Sản phẩm</h4>
              <ul className="items">
                {detail.items.map((i) => (
                  <li key={i.productId}><span>{i.name} × {i.quantity}</span><b>{vnd(i.unitPrice * i.quantity)}</b></li>
                ))}
              </ul>
              <div className="total-row"><span>Tổng cộng</span><b>{vnd(detail.total)}</b></div>
            </div>
          </div>

          <div className="status-box">
            <span>Trạng thái hiện tại: <span className={`tag st-${detail.status}`}>{STATUS_LABELS[detail.status]}</span></span>
            {finished ? (
              <span className="muted">Đơn đã kết thúc, không thể đổi trạng thái.</span>
            ) : (
              <>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" disabled={busy || newStatus === detail.status} onClick={update}>
                  Cập nhật trạng thái
                </button>
              </>
            )}
          </div>
          {!finished && <p className="hint">Chọn "Đã hủy" sẽ hoàn lại tồn kho cho các sản phẩm trong đơn.</p>}
        </Modal>
      )}
    </section>
  );
}
