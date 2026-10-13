import ProductCard from './ProductCard.jsx';

export default function ProductGrid({ title, subtitle, products, loading, onOpen }) {
  return (
    <section className="section">
      <div className="section-head">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {loading ? (
        <div className="empty">Đang tải sản phẩm...</div>
      ) : products.length === 0 ? (
        <div className="empty">Chưa có sản phẩm phù hợp. Thử chọn danh mục khác hoặc đổi từ khóa tìm kiếm nhé.</div>
      ) : (
        <div className="grid">
          {products.map((p) => <ProductCard key={p.id} product={p} onOpen={onOpen} />)}
        </div>
      )}
    </section>
  );
}
