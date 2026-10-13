import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { vnd, signedVnd, relDay, fmtDateTime } from '../utils.js';
import Modal from '../components/Modal.jsx';
import { TX_STATUS_LABELS, TX_TYPE_LABELS } from '../admin/labels.js';

/** Ví HihiPay: số dư, nạp tiền, lịch sử; bấm 1 giao dịch để xem chi tiết. */
export default function WalletPage({ go }) {
  const { notify } = useApp();
  const [wallet, setWallet] = useState(null);
  const [txs, setTxs] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [w, t] = await Promise.all([api.wallet(), api.walletTx(showAll ? 200 : 5)]);
      setWallet(w); setTxs(t); setError('');
    } catch (e) { setError(e.message); }
  }, [showAll]);
  useEffect(() => { load(); }, [load]);

  const cancel = async (code) => {
    try { await api.cancelTopup(code); notify('Đã hủy giao dịch'); setDetail(null); load(); }
    catch (e) { notify(e.message); }
  };

  return (
    <section className="page narrow">
      {error && <div className="alert">{error}</div>}

      <div className="wallet-card">
        <div className="wallet-title">💳 VÍ HIHIPAY</div>
        <div className="wallet-label">Số dư hiện tại</div>
        <div className="wallet-balance">{wallet ? vnd(wallet.balance) : '...'}</div>
        <div className="wallet-actions">
          <button className="btn btn-light" onClick={() => go('hihipay/topup')}>+ Nạp tiền</button>
          <button className="btn btn-ghost" onClick={() => setShowAll((v) => !v)}>{showAll ? 'Gần đây' : 'Lịch sử'}</button>
        </div>
      </div>

      <div className="panel">
        <h3 className="panel-title">{showAll ? 'Lịch sử giao dịch' : 'Giao dịch gần đây'}</h3>
        {!txs && !error && <div className="empty">Đang tải...</div>}
        {txs && txs.length === 0 && <div className="empty">Chưa có giao dịch nào.</div>}
        <ul className="tx-list">
          {(txs || []).map((t) => (
            <li key={t.code}>
              <button className="tx-row" onClick={() => setDetail(t)}>
                <b className={`tx-amount ${t.status !== 'SUCCESS' ? 'dim' : t.signedAmount > 0 ? 'plus' : 'minus'}`}>
                  {signedVnd(t.signedAmount)}
                </b>
                <span className="tx-title">
                  {t.title}
                  {t.status !== 'SUCCESS' && <span className={`tag tx-${t.status}`}>{TX_STATUS_LABELS[t.status]}</span>}
                </span>
                <span className="tx-day">{relDay(t.createdAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {detail && (
        <Modal title="Chi tiết giao dịch" onClose={() => setDetail(null)}>
          <div className={`tx-big ${detail.status !== 'SUCCESS' ? 'dim' : detail.signedAmount > 0 ? 'plus' : 'minus'}`}>
            {signedVnd(detail.signedAmount)}
          </div>
          <div className="kv"><span>Loại giao dịch</span><b>{TX_TYPE_LABELS[detail.type] || detail.type}</b></div>
          <div className="kv"><span>Nội dung</span><b>{detail.title}</b></div>
          <div className="kv"><span>Trạng thái</span><span className={`tag tx-${detail.status}`}>{TX_STATUS_LABELS[detail.status]}</span></div>
          <div className="kv"><span>Mã giao dịch</span><b>{detail.code}</b></div>
          <div className="kv"><span>Thời gian tạo</span><b>{fmtDateTime(detail.createdAt)}</b></div>
          {detail.completedAt && <div className="kv"><span>Hoàn tất lúc</span><b>{fmtDateTime(detail.completedAt)}</b></div>}
          {detail.balanceAfter != null && <div className="kv"><span>Số dư sau giao dịch</span><b>{vnd(detail.balanceAfter)}</b></div>}
          {detail.orderId && <div className="kv"><span>Đơn hàng</span><b>#{detail.orderId}</b></div>}

          <div className="modal-actions">
            {detail.orderId && <button className="btn btn-outline" onClick={() => go('orders')}>Xem đơn hàng</button>}
            {detail.type === 'TOPUP' && detail.status === 'PENDING' && (
              <>
                <button className="btn btn-primary" onClick={() => go(`hihipay/qr/${detail.code}`)}>Tiếp tục thanh toán</button>
                <button className="btn btn-danger" onClick={() => cancel(detail.code)}>Hủy giao dịch</button>
              </>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}
