import SmartImage from './SmartImage.jsx';
import { vnd } from '../utils.js';

export default function ProductCard({ product, onOpen }) {
  return (
    <article
      className="card"
      tabIndex={0}
      onClick={() => onOpen(product.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(product.id)}
    >
      <div className="card-img"><SmartImage file={product.imageUrl} alt={product.name} /></div>
      <div className="card-body">
        <h4 className="card-name">{product.name}</h4>
        <div className="card-price">{vnd(product.price)}</div>
      </div>
    </article>
  );
}
