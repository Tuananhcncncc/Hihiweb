// Toàn bộ lời gọi tới backend Spring Boot nằm ở đây.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

function getToken() {
  try { return JSON.parse(localStorage.getItem('hihi_user'))?.token || null; } catch { return null; }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy ở cổng 8080 chưa.');
  }
  const data = await res.json().catch(() => null);
  // Token hết hạn (ví dụ backend vừa khởi động lại) -> báo cho app đăng xuất
  if (res.status === 401 && token) window.dispatchEvent(new Event('hihi-session-expired'));
  if (!res.ok) {
    const err = new Error(data?.message || 'Có lỗi xảy ra, vui lòng thử lại');
    err.status = res.status;
    err.data = data; // dữ liệu phụ từ backend, vd {code:'INSUFFICIENT_BALANCE', required, balance}
    throw err;
  }
  return data;
}

export const api = {
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),

  categories: () => request('/categories'),
  products: (params = {}) => {
    const clean = Object.entries(params).filter(([, v]) => v !== '' && v != null);
    return request('/products?' + new URLSearchParams(clean));
  },
  product: (id) => request(`/products/${id}`),
  suggest: (q) => request('/products/suggest?' + new URLSearchParams({ q })),

  // Hihi AI tạo combo
  combos: (productId) => request(`/combos?productId=${productId}`),
  featuredCombos: () => request('/combos/featured'),

  cart: () => request('/cart'),
  addToCart: (productId, quantity = 1) => request('/cart', { method: 'POST', body: { productId, quantity } }),
  setQty: (productId, quantity) => request(`/cart/${productId}`, { method: 'PUT', body: { quantity } }),
  removeFromCart: (productId) => request(`/cart/${productId}`, { method: 'DELETE' }),

  checkout: (body) => request('/orders/checkout', { method: 'POST', body }),

  myOrders: () => request('/orders'),

  // Ví HihiPay
  wallet: () => request('/wallet'),
  walletTx: (limit) => request('/wallet/transactions' + (limit ? `?limit=${limit}` : '')),
  walletTxDetail: (code) => request(`/wallet/transactions/${code}`),
  createTopup: (amount) => request('/wallet/topups', { method: 'POST', body: { amount } }),
  confirmTopup: (code) => request(`/wallet/topups/${code}/confirm`, { method: 'POST' }),
  cancelTopup: (code) => request(`/wallet/topups/${code}/cancel`, { method: 'POST' }),

  // ----- Khu vực quản trị (chỉ tài khoản ADMIN) -----
  admin: {
    stats: () => request('/admin/stats'),

    products: () => request('/admin/products'),
    createProduct: (body) => request('/admin/products', { method: 'POST', body }),
    updateProduct: (id, body) => request(`/admin/products/${id}`, { method: 'PUT', body }),
    deleteProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),

    categories: () => request('/admin/categories'),
    createCategory: (body) => request('/admin/categories', { method: 'POST', body }),
    updateCategory: (id, body) => request(`/admin/categories/${id}`, { method: 'PUT', body }),
    deleteCategory: (id) => request(`/admin/categories/${id}`, { method: 'DELETE' }),

    orders: (status = '') => request('/admin/orders' + (status ? `?status=${status}` : '')),
    order: (id) => request(`/admin/orders/${id}`),
    setOrderStatus: (id, status) => request(`/admin/orders/${id}/status`, { method: 'PUT', body: { status } }),
  },
};
