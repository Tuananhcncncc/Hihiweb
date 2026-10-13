import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { vnd } from '../utils.js';
import AdminProducts from './AdminProducts.jsx';
import AdminCategories from './AdminCategories.jsx';
import AdminOrders from './AdminOrders.jsx';

const TABS = [
  { id: 'products', label: 'Sản phẩm' },
  { id: 'categories', label: 'Danh mục' },
  { id: 'orders', label: 'Đơn hàng' },
];

/** Trang quản trị: thanh số liệu + 3 tab (Sản phẩm, Danh mục, Đơn hàng). */
export default function AdminPage({ onExit }) {
  const { user, logout } = useApp();
  const [tab, setTab] = useState('products');
  const [stats, setStats] = useState(null);
  const [tick, setTick] = useState(0);
  const changed = () => setTick((t) => t + 1); // gọi khi dữ liệu đổi để tải lại số liệu

  useEffect(() => { api.admin.stats().then(setStats).catch(() => {}); }, [tab, tick]);

  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="container admin-bar-inner">
          <div className="admin-brand"><span className="logo-mark">M</span> Hihi Quản trị</div>
          <div className="admin-user">
            <span>{user.fullName}</span>
            <button className="link" onClick={onExit}>Về cửa hàng</button>
            <button className="link" onClick={() => { onExit(); logout(); }}>Đăng xuất</button>
          </div>
        </div>
      </header>

      <main className="container admin-main">
        {stats && (
          <section className="stats">
            <div className="stat"><b>{stats.products}</b><span>Sản phẩm đang bán</span></div>
            <div className="stat"><b>{stats.categories}</b><span>Danh mục</span></div>
            <div className="stat"><b>{stats.orders}</b><span>Đơn hàng ({stats.pendingOrders} chờ xử lý)</span></div>
            <div className="stat"><b>{stats.customers}</b><span>Khách hàng</span></div>
            <div className="stat"><b>{vnd(stats.revenue)}</b><span>Doanh thu tạm tính</span></div>
          </section>
        )}

        <nav className="admin-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`admin-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === 'products' && <AdminProducts onChanged={changed} />}
        {tab === 'categories' && <AdminCategories onChanged={changed} />}
        {tab === 'orders' && <AdminOrders onChanged={changed} />}
      </main>
    </div>
  );
}
