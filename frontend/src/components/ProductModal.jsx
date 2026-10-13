import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { vnd } from '../utils.js';
import Modal from './Modal.jsx';
import SmartImage from './SmartImage.jsx';
import ComboCard from './ComboCard.jsx';

export default function ProductModal({ productId, onClose, onBuyNow, onSwitch }) {
  const { isAdmin, addToCart, requireCustomer } = useApp();
  const [p, setP] = useState(null);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState('');
  const [combos, setCombos] = useState([]);

  useEffect(() => {
    setP(null); setQty(1); setErr(''); setCombos([]);
    api.product(productId).then(setP).catch((e) => setErr(e.message));
    // Hihi AI tạo combo từ sản phẩm đang xem
    api.combos(productId).then(setCombos).catch(() => setCombos([]));
  }, [productId]);

  return (
    <Modal onClose={onClose} wide>
      {err && <div className="alert">{err}</div>}
      {!p && !err && <div className="empty">Đang tải...</div>}
      {p && (
        <>
          <div className="detail">
            <div className="detail-img"><SmartImage file={p.imageUrl} alt={p.name} /></div>
            <div className="detail-info">
              <h2>{p.name}</h2>
              <div className="price-big">{vnd(p.price)}</div>
              <div className="stock">{p.stock > 0 ? `Còn ${p.stock} sản phẩm` : 'Tạm hết hàng'}</div>

              <h4 className="desc-title">Mô tả sản phẩm</h4>
              <p className="desc">{p.description}</p>

              {isAdmin ? (
                <p className="hint">Tài khoản quản trị chỉ dùng để quản lý cửa hàng, không thể mua hàng.</p>
              ) : (
                <>
                  <div className="qty-row">
                    <span>Số lượng</span>
                    <div className="qty">
                      <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Giảm">−</button>
                      <span>{qty}</span>
                      <button onClick={() => setQty(Math.min(p.stock, qty + 1))} aria-label="Tăng">+</button>
                    </div>
                  </div>

                  <div className="actions">
                    <button className="btn btn-outline" disabled={p.stock < 1} onClick={() => addToCart(p.id, qty)}>
                      Thêm vào giỏ hàng
                    </button>
                    <button className="btn btn-primary" disabled={p.stock < 1}
                      onClick={() => requireCustomer() && onBuyNow(p, qty)}>
                      Mua ngay
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {combos.length > 0 && (
            <div className="combo-wrap">
              {combos.map((c) => <ComboCard key={c.theme + c.items[0].id} combo={c} onOpen={onSwitch} />)}
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
