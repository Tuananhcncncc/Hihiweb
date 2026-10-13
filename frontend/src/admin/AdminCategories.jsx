import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Modal from '../components/Modal.jsx';

export default function AdminCategories({ onChanged }) {
  const { notify } = useApp();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(null); // {id?, name, icon}
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => api.admin.categories().then(setCategories).catch((e) => notify(e.message));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const body = { name: form.name, icon: form.icon };
      if (form.id) await api.admin.updateCategory(form.id, body);
      else await api.admin.createCategory(body);
      notify(form.id ? 'Đã lưu danh mục' : 'Đã thêm danh mục');
      setForm(null); load(); onChanged();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Xóa danh mục "${c.name}"?`)) return;
    try { await api.admin.deleteCategory(c.id); notify('Đã xóa danh mục'); load(); onChanged(); }
    catch (ex) { notify(ex.message); }
  };

  return (
    <section>
      <div className="toolbar">
        <span className="muted">Chỉ xóa được danh mục không còn sản phẩm nào.</span>
        <button className="btn btn-primary btn-sm" onClick={() => { setErr(''); setForm({ name: '', icon: '' }); }}>
          + Thêm danh mục
        </button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Biểu tượng</th><th>Tên danh mục</th><th>Số sản phẩm</th><th></th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="big-icon">{c.icon}</td>
                <td>{c.name}</td>
                <td>{c.productCount}</td>
                <td className="row-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => { setErr(''); setForm({ id: c.id, name: c.name, icon: c.icon || '' }); }}>Sửa</button>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(c)}>Xóa</button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan={4} className="empty">Chưa có danh mục nào.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal title={form.id ? 'Sửa danh mục' : 'Thêm danh mục'} onClose={() => setForm(null)}>
          <form className="form" onSubmit={save}>
            <label>Tên danh mục
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>Biểu tượng (1 emoji)
              <input value={form.icon} maxLength={10} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="vd: 🎧" />
            </label>
            {err && <div className="error">{err}</div>}
            <button className="btn btn-primary full" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu danh mục'}</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
