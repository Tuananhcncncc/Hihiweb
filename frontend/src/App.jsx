import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api.js';
import { useApp } from './context/AppContext.jsx';
import Header from './components/Header.jsx';
import Banner from './components/Banner.jsx';
import CategoryBar from './components/CategoryBar.jsx';
import ProductGrid from './components/ProductGrid.jsx';
import FeaturedCombos from './components/FeaturedCombos.jsx';
import ProductModal from './components/ProductModal.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import CheckoutModal from './components/CheckoutModal.jsx';
import AuthModal from './components/AuthModal.jsx';
import AdminPage from './admin/AdminPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import WalletPage from './pages/WalletPage.jsx';
import { TopupPage, TopupQrPage, PayConfirmPage } from './pages/TopupFlow.jsx';

/**
 * Định tuyến đơn giản bằng phần "#" của địa chỉ:
 *   (trống) cửa hàng | #admin | #orders | #hihipay | #hihipay/topup | #hihipay/qr/MÃ | #hihipay/pay/MÃ
 */
function parseHash() {
  const [a, b, c] = window.location.hash.replace(/^#\/?/, '').split('/');
  if (a === 'admin') return { name: 'admin' };
  if (a === 'orders') return { name: 'orders' };
  if (a === 'hihipay') {
    if (b === 'topup') return { name: 'topup' };
    if (b === 'qr' && c) return { name: 'qr', code: c };
    if (b === 'pay' && c) return { name: 'pay', code: c };
    return { name: 'wallet' };
  }
  return { name: 'shop' };
}
const USER_PAGES = ['orders', 'wallet', 'topup', 'qr', 'pay'];

export default function App() {
  const { setCartOpen, isAdmin, user, logout, setAuthMode } = useApp();
  const [route, setRoute] = useState(parseHash);
  const [categories, setCategories] = useState([]);
  const [catId, setCatId] = useState(null);   // danh mục đang chọn
  const [query, setQuery] = useState('');     // từ khóa tìm kiếm
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null); // sản phẩm đang xem chi tiết
  const [checkout, setCheckout] = useState(null); // null | {mode:'cart'} | {mode:'now', product, quantity}
  const listRef = useRef(null);

  // Chuyển trang: go('orders'), go('hihipay/topup'), go('') = về cửa hàng
  const go = useCallback((path = '') => {
    if (path) window.location.hash = path;
    else if (window.location.hash) history.pushState(null, '', window.location.pathname + window.location.search);
    setRoute(parseHash());
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Các trang Đơn hàng / HihiPay chỉ dành cho khách đã đăng nhập (admin không dùng)
  const isUserPage = USER_PAGES.includes(route.name);
  useEffect(() => {
    if (!isUserPage) return;
    if (!user) { go(''); setAuthMode('login'); }
    else if (isAdmin) go('');
  }, [isUserPage, user, isAdmin, go, setAuthMode]);

  useEffect(() => {
    api.categories().then(setCategories).catch((e) => setError(e.message));
  }, []);

  // Chọn danh mục hoặc tìm kiếm -> tải sản phẩm và hiển thị ngay bên dưới (không chuyển trang)
  useEffect(() => {
    if (catId == null && !query) { setProducts([]); return undefined; }
    let cancelled = false;
    setLoading(true);
    api.products({ categoryId: catId, q: query })
      .then((d) => !cancelled && setProducts(d))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [catId, query]);

  const scrollToList = () => setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  const selectCategory = (id) => { setQuery(''); setCatId((cur) => (cur === id ? null : id)); scrollToList(); };
  const search = (q) => {
    if (route.name !== 'shop') go('');
    setCatId(null); setQuery(q);
    if (q) scrollToList();
  };
  const goHome = () => { setCatId(null); setQuery(''); go(''); };
  const onNav = (name) => go(name === 'admin' ? 'admin' : name);
  const onLogout = () => { logout(); go(''); };

  // Trang quản trị chỉ dành cho tài khoản ADMIN
  if (route.name === 'admin' && isAdmin) return <AdminPage onExit={() => go('')} />;

  const page = isUserPage && user && !isAdmin ? route.name : 'shop';
  const showList = catId != null || query;
  const title = query ? `Kết quả cho "${query}"` : categories.find((c) => c.id === catId)?.name;

  return (
    <>
      <Header onSearch={search} onHome={goHome} onNav={onNav} onLogout={onLogout} />

      <main className="container">
        {error && <div className="alert">{error}</div>}

        {page === 'orders' && <OrdersPage />}
        {page === 'wallet' && <WalletPage go={go} />}
        {page === 'topup' && <TopupPage go={go} />}
        {page === 'qr' && <TopupQrPage code={route.code} go={go} />}
        {page === 'pay' && <PayConfirmPage code={route.code} go={go} />}

        {page === 'shop' && (
          <>
            <Banner />
            <CategoryBar categories={categories} activeId={catId} onSelect={selectCategory} />

            <div ref={listRef} className="list-anchor">
              {showList && (
                <ProductGrid title={title} products={products} loading={loading} onOpen={setOpenId} />
              )}
            </div>

            <FeaturedCombos onOpen={setOpenId} />
          </>
        )}
      </main>

      

      {openId && (
        <ProductModal
          productId={openId}
          onClose={() => setOpenId(null)}
          onSwitch={setOpenId}
          onBuyNow={(product, quantity) => { setOpenId(null); setCheckout({ mode: 'now', product, quantity }); }}
        />
      )}
      <CartDrawer onCheckout={() => { setCartOpen(false); setCheckout({ mode: 'cart' }); }} />
      {checkout && (
        <CheckoutModal
          {...checkout}
          onClose={() => setCheckout(null)}
          onTopup={() => { setCheckout(null); go('hihipay/topup'); }}
          onViewOrders={() => { setCheckout(null); go('orders'); }}
        />
      )}
      <AuthModal />
    </>
  );
}
