import { useEffect, useState } from 'react';

/** Hiện ảnh trong public/images/products/. Chưa có ảnh thì hiện khung tạm. */
export default function SmartImage({ file, alt }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [file]);
  if (!file || failed) return <div className="img-ph" role="img" aria-label={alt}>M</div>;
  return <img src={`/images/products/${file}`} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
