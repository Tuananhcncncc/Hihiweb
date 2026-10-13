import { useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Modal from './Modal.jsx';

export default function AuthModal() {
  const { authMode, setAuthMode, login, notify } = useApp();
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!authMode) return null;

  const isLogin = authMode === 'login';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const switchTo = (m) => { setErr(''); setAuthMode(m); };

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const u = isLogin
        ? await api.login({ email: form.email, password: form.password })
        : await api.register(form);
      login(u);
      setAuthMode(null);
      setForm({ fullName: '', email: '', password: '' });
      notify(`Chào mừng ${u.fullName} đến với Hihi`);
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={isLogin ? 'Đăng nhập' : 'Tạo tài khoản'} onClose={() => setAuthMode(null)}>
      <form className="form" onSubmit={submit}>
        {!isLogin && (
          <label>Họ và tên
            <input required value={form.fullName} onChange={set('fullName')} autoComplete="name" />
          </label>
        )}
        <label>Email
          <input required type="email" value={form.email} onChange={set('email')} autoComplete="email" />
        </label>
        <label>Mật khẩu
          <input required type="password" minLength={6} value={form.password} onChange={set('password')}
            autoComplete={isLogin ? 'current-password' : 'new-password'} />
        </label>
        {err && <div className="error">{err}</div>}
        <button className="btn btn-primary full" disabled={busy}>
          {busy ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
        </button>
        <p className="switch">
          {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
          <button type="button" className="link-purple" onClick={() => switchTo(isLogin ? 'register' : 'login')}>
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </p>
      </form>
    </Modal>
  );
}
