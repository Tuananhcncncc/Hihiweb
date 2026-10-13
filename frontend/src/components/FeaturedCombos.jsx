import { useEffect, useState } from 'react';
import { api } from '../api.js';
import ComboCard from './ComboCard.jsx';

/** Trang chủ: vài combo tiêu biểu do Hihi AI tạo (thay cho khu "Gợi ý sản phẩm" trước đây). */
export default function FeaturedCombos({ onOpen }) {
  const [combos, setCombos] = useState([]);

  useEffect(() => {
    api.featuredCombos().then(setCombos).catch(() => setCombos([]));
  }, []);

  if (combos.length === 0) return null;
  return (
    <section className="section">
      <div className="section-head">
        <h2>Hihi AI tạo combo cho bạn</h2>
        <p>Hihi AI ghép những sản phẩm hay dùng cùng nhau thành combo. Bấm vào sản phẩm để xem chi tiết.</p>
      </div>
      <div className="combo-grid">
        {combos.map((c) => <ComboCard key={c.theme} combo={c} onOpen={onOpen} />)}
      </div>
    </section>
  );
}
