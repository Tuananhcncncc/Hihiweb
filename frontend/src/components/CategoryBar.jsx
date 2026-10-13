export default function CategoryBar({ categories, activeId, onSelect }) {
  return (
    <section className="panel">
      <h3 className="panel-title">Danh mục</h3>
      <div className="cat-grid">
        {categories.map((c) => (
          <button key={c.id} className={`cat ${activeId === c.id ? 'active' : ''}`} onClick={() => onSelect(c.id)}>
            <span className="cat-icon">{c.icon}</span>
            <span className="cat-name">{c.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
