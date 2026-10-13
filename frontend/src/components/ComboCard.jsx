import { Fragment, useState } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { vnd } from '../utils.js';
import SmartImage from './SmartImage.jsx';

/** Một combo do Hihi AI tạo: các sản phẩm đi cùng nhau, tổng tiền và lời giải thích. */
export default function ComboCard({ combo, onOpen }) {
  const { isAdmin, addManyToCart } = useApp();
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    await addManyToCart(combo.items.map((i) => i.id));
    setBusy(false);
  };

  return (
    <article className="combo">
      <div className="combo-head">
        <span className="combo-bot" aria-hidden="true"></span>
        <b>Hihi AI đề xuất {combo.title}</b>
      </div>

      <div className="combo-items">
        {combo.items.map((it, idx) => (
          <Fragment key={it.id}>
            {idx > 0 && <span className="combo-plus">+</span>}
            <button type="button" className="combo-item" title={it.name} onClick={() => onOpen && onOpen(it.id)}>
              <span className="combo-thumb"><SmartImage file={it.imageUrl} alt={it.name} /></span>
              <span className="combo-iprice">{vnd(it.price)}</span>
            </button>
          </Fragment>
        ))}
      </div>

      <div className="combo-names">{combo.items.map((i) => i.name).join(' + ')}</div>
      <div className="total-row"><span>Tổng:</span><b>{vnd(combo.total)}</b></div>
      <p className="combo-quote">“{combo.explanation}”</p>

      {!isAdmin && (
        <button className="btn btn-primary full" disabled={busy} onClick={add}>
          {busy ? 'Đang thêm...' : 'Thêm cả combo vào giỏ hàng'}
        </button>
      )}
    </article>
  );
}
