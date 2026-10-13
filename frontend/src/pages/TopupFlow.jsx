import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { vnd, fmtNum, sleep } from '../utils.js';

const PRESETS = [50000, 100000, 200000, 500000, 1000000];

/** Màn hình "thành công" dùng chung cho cả trang QR và trang xác nhận. */
function Success({ tx, balance, go }) {
  return (
    <div className="pay-card success">
      <div className="success-icon">✓</div>
      <h2>Thanh toán thành công</h2>
      <div className="pay-amount plus">+{vnd(tx.amount)}</div>
      <p>Mã giao dịch: <b>{tx.code}</b></p>
      <p>Số dư mới: <b>{vnd(balance)}</b></p>
      <button className="btn btn-primary full" onClick={() => go('hihipay')}>Về HihiPay</button>
    </div>
  );
}

/** Bước 1: chọn số tiền nạp rồi bấm "Tạo mã QR" (lúc này CHƯA cộng tiền). */
export function TopupPage({ go }) {
  const { notify } = useApp();
  const [amount, setAmount] = useState(500000);
  const [text, setText] = useState(fmtNum(500000));
  const [busy, setBusy] = useState(false);

  const pick = (v) => { setAmount(v); setText(fmtNum(v)); };
  const onType = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
    const n = digits ? Number(digits) : 0;
    setAmount(n);
    setText(digits ? fmtNum(n) : '');
  };

  const create = async () => {
    if (amount < 10000) return notify('Số tiền nạp tối thiểu là 10.000 ₫');
    if (amount > 50000000) return notify('Số tiền nạp tối đa mỗi lần là 50.000.000 ₫');
    setBusy(true);
    try {
      const tx = await api.createTopup(amount);
      go(`hihipay/qr/${tx.code}`);
    } catch (e) { notify(e.message); } finally { setBusy(false); }
  };

  return (
    <section className="page narrow">
      <div className="pay-card">
        <h2>NẠP TIỀN HIHIPAY</h2>
        <p className="muted center">Chọn số tiền muốn nạp</p>
        <div className="preset-grid">
          {PRESETS.map((v) => (
            <button key={v} className={`preset ${amount === v ? 'on' : ''}`} onClick={() => pick(v)}>{fmtNum(v)}</button>
          ))}
        </div>
        <p className="muted center">Hoặc nhập số tiền</p>
        <div className="amount-input">
          <input value={text} onChange={onType} inputMode="numeric" placeholder="0" aria-label="Số tiền nạp" />
          <span>₫</span>
        </div>
        <button className="btn btn-primary full" disabled={busy || amount <= 0} onClick={create}>
          {busy ? 'Đang tạo...' : 'Tạo mã QR'}
        </button>
        <button className="btn btn-outline full" onClick={() => go('hihipay')}>Quay lại</button>
      </div>
    </section>
  );
}

/** Bước 2: hiện mã QR, giao dịch ở trạng thái PENDING. Tự kiểm tra mỗi 2 giây xem đã được xác nhận chưa. */
export function TopupQrPage({ code, go }) {
  const { notify } = useApp();
  const [tx, setTx] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let stopped = false;
    let timer;
    const tick = async () => {
      try {
        const t = await api.walletTxDetail(code);
        if (stopped) return;
        setTx(t);
        if (t.status !== 'PENDING') clearInterval(timer);
      } catch (e) { if (!stopped) { setErr(e.message); clearInterval(timer); } }
    };
    timer = setInterval(tick, 2000);
    tick();
    return () => { stopped = true; clearInterval(timer); };
  }, [code]);

  const cancel = async () => {
    try { await api.cancelTopup(code); notify('Đã hủy giao dịch'); go('hihipay'); }
    catch (e) { notify(e.message); }
  };

  if (err) return <section className="page narrow"><div className="alert">{err}</div><button className="btn btn-outline" onClick={() => go('hihipay')}>Về HihiPay</button></section>;
  if (!tx) return <section className="page narrow"><div className="empty">Đang tải giao dịch...</div></section>;

  return (
    <section className="page narrow">
      {tx.status === 'SUCCESS' && <Success tx={tx} balance={tx.balanceAfter} go={go} />}

      {tx.status === 'CANCELLED' && (
        <div className="pay-card success">
          <div className="success-icon warn-icon">×</div>
          <h2>Giao dịch đã hủy</h2>
          <p>Mã giao dịch: <b>{tx.code}</b></p>
          <button className="btn btn-primary full" onClick={() => go('hihipay')}>Về HihiPay</button>
        </div>
      )}

      {tx.status === 'PENDING' && (
        <div className="pay-card">
          <h2>NẠP TIỀN HIHIPAY</h2>
          <p className="muted center">Số tiền</p>
          <div className="pay-amount">{vnd(tx.amount)}</div>
          <div className="qr-box"><QRCodeSVG value={tx.qrContent} size={200} level="M" /></div>
          <p className="center"><b>Quét mã QR để thanh toán</b></p>
          <p className="center muted">Mã giao dịch: <b>{tx.code}</b></p>
          <p className="center waiting">⏳ Đang chờ thanh toán...</p>
          <p className="hint center">
            Đây là hệ thống mô phỏng, mã QR không kết nối ngân hàng thật. Bấm nút bên dưới để mở màn hình xác nhận
            như khi bạn quét mã bằng điện thoại.
          </p>
          <a className="btn btn-primary full center-link" href={`#hihipay/pay/${tx.code}`} target="_blank" rel="noopener noreferrer">
            📱 Mở màn hình xác nhận (giả lập quét QR)
          </a>
          <button className="btn btn-danger full" onClick={cancel}>Hủy giao dịch</button>
        </div>
      )}
    </section>
  );
}

/** Bước 3: màn hình "HIHIPAY PAYMENT" (như trên điện thoại). Bấm XÁC NHẬN thì mới cộng tiền. */
export function PayConfirmPage({ code, go }) {
  const [tx, setTx] = useState(null);
  const [err, setErr] = useState('');
  const [stage, setStage] = useState('ready');   // ready | processing | done
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    api.walletTxDetail(code).then(setTx).catch((e) => setErr(e.message));
  }, [code]);

  const confirm = async () => {
    setErr(''); setStage('processing');
    try {
      const [res] = await Promise.all([api.confirmTopup(code), sleep(1500)]);
      setTx(res); setBalance(res.balance); setStage('done');
    } catch (e) { setErr(e.message); setStage('ready'); }
  };

  if (!tx) {
    return <section className="page narrow">{err ? <div className="alert">{err}</div> : <div className="empty">Đang tải...</div>}</section>;
  }
  if (stage === 'done' || (tx.status === 'SUCCESS' && stage === 'ready')) {
    return <section className="page narrow"><Success tx={tx} balance={balance ?? tx.balanceAfter} go={go} /></section>;
  }
  if (tx.status === 'CANCELLED') {
    return (
      <section className="page narrow">
        <div className="pay-card success">
          <div className="success-icon warn-icon">×</div>
          <h2>Giao dịch đã hủy</h2>
          <button className="btn btn-primary full" onClick={() => go('hihipay')}>Về HihiPay</button>
        </div>
      </section>
    );
  }
  if (stage === 'processing') {
    return <section className="page narrow"><div className="pay-card success"><p className="waiting big">⏳ Đang xử lý giao dịch...</p></div></section>;
  }

  return (
    <section className="page narrow">
      <div className="pay-card">
        <h2 className="center">HIHIPAY PAYMENT</h2>
        <p className="center"><b>Thanh toán</b></p>
        <div className="kv"><span>Người nhận</span><b>Hihi Shop</b></div>
        <p className="muted center">Số tiền</p>
        <div className="pay-amount">{vnd(tx.amount)}</div>
        <p className="muted center">Mã giao dịch</p>
        <p className="center"><b>{tx.code}</b></p>
        {err && <div className="error">{err}</div>}
        <button className="btn btn-primary full" onClick={confirm}>XÁC NHẬN</button>
      </div>
    </section>
  );
}
