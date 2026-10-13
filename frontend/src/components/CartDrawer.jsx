import { useApp } from '../context/AppContext.jsx';
import { vnd } from '../utils.js';
import SmartImage from './SmartImage.jsx';

export default function CartDrawer({ onCheckout }) {
  const { cart, cartOpen, setCartOpen, cartTotal, setQty, removeItem } = useApp();
  if (!cartOpen) return null;

  return (
    <div className="overlay drawer-overlay" onMouseDown={(e) => e.target === e.currentTarget && setCartOpen(false)}>
      <aside className="drawer" aria-label="Giỏ hàng">
        <div className="drawer-head">
          <h2>Giỏ hàng của bạn</h2>
          <button className="close-inline" onClick={() => setCartOpen(false)} aria-label="Đóng">×</button>
        </div>

        {cart.length === 0 ? (
          <div className="empty">Giỏ hàng đang trống.<br />Chọn vài sản phẩm bạn thích nhé.</div>
        ) : (
          <div className="cart-list">
            {cart.map((i) => (
              <div className="cart-item" key={i.productId}>
                <div className="cart-thumb"><SmartImage file={i.imageUrl} alt={i.name} /></div>
                <div className="cart-info">
                  <div className="cart-name">{i.name}</div>
                  <div className="card-price">{vnd(i.price)}</div>
                  <div className="qty">
                    <button onClick={() => setQty(i.productId, i.quantity - 1)} aria-label="Giảm">−</button>
                    <span>{i.quantity}</span>
                    <button onClick={() => setQty(i.productId, i.quantity + 1)} aria-label="Tăng">+</button>
                  </div>
                </div>
                <button className="remove" onClick={() => removeItem(i.productId)} aria-label="Xóa khỏi giỏ">🗑</button>
              </div>
            ))}
          </div>
        )}

        {cart.length > 0 && (
          <div className="cart-foot">
            <div className="total-row"><span>Tổng cộng</span><b>{vnd(cartTotal)}</b></div>
            <button className="btn btn-primary full" onClick={onCheckout}>Thanh toán</button>
          </div>
        )}
      </aside>
    </div>
  );
}
