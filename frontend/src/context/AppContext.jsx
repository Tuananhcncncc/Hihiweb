import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

/** Giữ trạng thái dùng chung: người dùng, giỏ hàng, thông báo, cửa sổ đăng nhập / giỏ hàng. */
export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('hihi_user'));
      return u?.token ? u : null; // bản cũ chưa có token thì bắt đăng nhập lại
    } catch { return null; }
  });
  const [cart, setCart] = useState([]);
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'register'
  const [cartOpen, setCartOpen] = useState(false);
  const [toast, setToast] = useState('');

  const notify = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const refreshCart = useCallback(async () => {
    if (!user) { setCart([]); return; }
    try { setCart(await api.cart()); } catch { setCart([]); }
  }, [user]);
  useEffect(() => { refreshCart(); }, [refreshCart]);

  // Token hết hạn (vd: backend khởi động lại) -> tự đăng xuất và mở form đăng nhập
  useEffect(() => {
    const onExpired = () => {
      setUser(null); setCart([]); setCartOpen(false);
      localStorage.removeItem('hihi_user');
      setAuthMode('login');
      notify('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    };
    window.addEventListener('hihi-session-expired', onExpired);
    return () => window.removeEventListener('hihi-session-expired', onExpired);
  }, [notify]);

  const login = (u) => { setUser(u); localStorage.setItem('hihi_user', JSON.stringify(u)); };
  const logout = () => {
    setUser(null); setCart([]); setCartOpen(false);
    localStorage.removeItem('hihi_user');
  };
  const isAdmin = user?.role === 'ADMIN';
  const requireLogin = () => {
    if (user) return true;
    setAuthMode('login');
    notify('Vui lòng đăng nhập để tiếp tục');
    return false;
  };

  // Admin chỉ quản trị, không được mua hàng
  const requireCustomer = () => {
    if (!requireLogin()) return false;
    if (isAdmin) { notify('Tài khoản quản trị không thể mua hàng'); return false; }
    return true;
  };

  const addToCart = async (productId, qty = 1) => {
    if (!requireCustomer()) return false;
    try {
      await api.addToCart(productId, qty);
      await refreshCart();
      notify('Đã thêm vào giỏ hàng');
      return true;
    } catch (e) { notify(e.message); return false; }
  };
  // Thêm cả combo (mỗi món 1 cái)
  const addManyToCart = async (productIds) => {
    if (!requireCustomer()) return false;
    try {
      for (const id of productIds) await api.addToCart(id, 1);
      await refreshCart();
      notify('Đã thêm cả combo vào giỏ hàng');
      return true;
    } catch (e) { await refreshCart(); notify(e.message); return false; }
  };
  const setQty = async (productId, qty) => {
    try { await api.setQty(productId, qty); await refreshCart(); } catch (e) { notify(e.message); }
  };
  const removeItem = async (productId) => {
    try { await api.removeFromCart(productId); await refreshCart(); } catch (e) { notify(e.message); }
  };

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartTotal = cart.reduce((s, i) => s + i.quantity * i.price, 0);

  return (
    <Ctx.Provider value={{
      user, isAdmin, login, logout, requireLogin, requireCustomer,
      cart, cartCount, cartTotal, refreshCart, addToCart, addManyToCart, setQty, removeItem,
      authMode, setAuthMode, cartOpen, setCartOpen,
      notify,
    }}>
      {children}
      {toast && <div className="toast" role="status">{toast}</div>}
    </Ctx.Provider>
  );
}
