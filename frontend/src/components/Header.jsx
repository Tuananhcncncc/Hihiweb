import { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import SearchBox from './SearchBox.jsx';

/** onNav('orders' | 'hihipay' | 'admin') chuyển trang; admin không có giỏ hàng, Đơn hàng, HihiPay. */
export default function Header({ onSearch, onHome, onNav, onLogout }) {
  const { user, isAdmin, cartCount, setAuthMode, setCartOpen, requireLogin } = useApp();
  const [clearKey, setClearKey] = useState(0);

  return (
    <header className="header">
      <div className="container top-links">
        {user ? (
          <>
            <span>Xin chào, <b>{user.fullName}</b></span>
            <span className="sep" />
            {isAdmin ? (
              <>
                <button className="link" onClick={() => onNav('admin')}>Quản trị</button>
                <span className="sep" />
              </>
            ) : (
              <>
                <button className="link" onClick={() => onNav('orders')}>Đơn hàng</button>
                <span className="sep" />
                <button className="link" onClick={() => onNav('hihipay')}>HihiPay</button>
                <span className="sep" />
              </>
            )}
            <button className="link" onClick={onLogout}>Đăng xuất</button>
          </>
        ) : (
          <>
            <button className="link" onClick={() => setAuthMode('register')}>Đăng Ký</button>
            <span className="sep" />
            <button className="link" onClick={() => setAuthMode('login')}>Đăng Nhập</button>
          </>
        )}
      </div>

      <div className="container main-bar">
        <a className="logo" href="/" onClick={(e) => { e.preventDefault(); setClearKey((k) => k + 1); onHome(); }}>
          <span className="logo-mark">H</span>
          <span className="logo-text">Hihi</span>
        </a>

        <SearchBox onSearch={onSearch} clearSignal={clearKey} />

        {!isAdmin && (
          <button className="cart-btn" aria-label="Giỏ hàng" onClick={() => requireLogin() && setCartOpen(true)}>
            🛒{cartCount > 0 && <span className="badge">{cartCount}</span>}
          </button>
        )}
      </div>
    </header>
  );
}
