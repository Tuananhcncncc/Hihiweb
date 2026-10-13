import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { vnd } from '../utils.js';
import Modal from '../components/Modal.jsx';
import SmartImage from '../components/SmartImage.jsx';

const EMPTY = { categoryId: '', name: '', price: '', stock: 100, imageUrl: '', description: '', active: true };

export default function AdminProducts({ onChanged }) {
  const { notify } = useApp();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState(null); // null = đóng; object = đang thêm/sửa
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.admin.products().then(setProducts).catch((e) => notify(e.message));
    api.admin.categories().then(setCategories).catch((e) => notify(e.message));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = products.filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()));
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const openAdd = () => { setErr(''); setForm({ ...EMPTY, categoryId: categories[0]?.id ?? '' }); };
  const openEdit = (p) => {
    setErr('');
    setForm({ id: p.id, categoryId: p.categoryId, name: p.name, price: p.price, stock: p.stock,
      imageUrl: p.imageUrl || '', description: p.description || '', active: p.active });
  };

  const save = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    const body = {
      categoryId: Number(form.categoryId), name: form.name, price: Number(form.price),
      stock: Number(form.stock), imageUrl: form.imageUrl, description: form.description, active: form.active,
    };
    try {
      if (form.id) await api.admin.updateProduct(form.id, body);
      else await api.admin.createProduct(body);
      notify(form.id ? 'Đã lưu sản phẩm' : 'Đã thêm sản phẩm');
      setForm(null); load(); onChanged();
    } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Xóa "${p.name}"?\nSản phẩm sẽ bị ẩn khỏi cửa hàng, đơn hàng cũ vẫn được giữ nguyên.`)) return;
    try { await api.admin.deleteProduct(p.id); notify('Đã xóa sản phẩm'); load(); onChanged(); }
    catch (ex) { notify(ex.message); }
  };

  return (
    <section>
      <div className="toolbar">
        <input className="search-box" placeholder="Lọc theo tên sản phẩm..." value={filter} onChange={(e) => setFilter(e.target.value)} />
        <button className="btn btn-primary btn-sm" onClick={openAdd} disabled={categories.length === 0}>+ Thêm sản phẩm</button>
      </div>
      {categories.length === 0 && <div className="alert">Hãy tạo ít nhất 1 danh mục trước khi thêm sản phẩm.</div>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Ảnh</th><th>Tên sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th>Trạng thái</th><th></th></tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} className={p.active ? '' : 'dim'}>
                <td><div className="thumb-sm"><SmartImage file={p.imageUrl} alt={p.name} /></div></td>
                <td>{p.name}</td>
                <td>{p.categoryName}</td>
                <td>{vnd(p.price)}</td>
                <td>{p.stock}</td>
                <td><span className={`tag ${p.active ? 'ok' : 'off'}`}>{p.active ? 'Đang bán' : 'Đã ẩn'}</span></td>
                <td className="row-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(p)}>Sửa</button>
                  {p.active && <button className="btn btn-danger btn-sm" onClick={() => remove(p)}>Xóa</button>}
                </td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={7} className="empty">Không có sản phẩm nào.</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal title={form.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={() => setForm(null)} wide>
          <form className="form" onSubmit={save}>
            <div className="grid-2">
              <label>Danh mục
                <select required value={form.categoryId} onChange={set('categoryId')}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label>Tên sản phẩm
                <input required value={form.name} onChange={set('name')} />
              </label>
              <label>Giá (VND)
                <input required type="number" min="0" step="1000" value={form.price} onChange={set('price')} />
              </label>
              <label>Tồn kho
                <input required type="number" min="0" value={form.stock} onChange={set('stock')} />
              </label>
            </div>

            <div className="img-field">
              <label>Tên file ảnh
                <input value={form.imageUrl} onChange={set('imageUrl')} placeholder="vd: ao-thun-trang.jpg" />
                <small>Chép ảnh vào <code>frontend/public/images/products/</code> rồi nhập đúng tên file vào đây.</small>
              </label>
              <div className="thumb-lg"><SmartImage file={form.imageUrl} alt="Xem trước" /></div>
            </div>

            <label>Mô tả
              <textarea rows={4} value={form.description} onChange={set('description')} />
            </label>
            <label className="check">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Đang bán (bỏ tích để ẩn khỏi cửa hàng)
            </label>

            {err && <div className="error">{err}</div>}
            <button className="btn btn-primary full" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu sản phẩm'}</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
