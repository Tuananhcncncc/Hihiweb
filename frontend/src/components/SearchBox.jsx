import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { vnd } from '../utils.js';

/** Ô tìm kiếm có gợi ý: gõ "áo" -> hiện các sản phẩm có chữ "áo"  */
export default function SearchBox({ onSearch, clearSignal }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);

  useEffect(() => { setText(''); setItems([]); }, [clearSignal]);

  // Chờ 180ms sau lần gõ cuối rồi mới hỏi backend (tránh gọi liên tục)
  useEffect(() => {
    const q = text.trim();
    if (!q) { setItems([]); return undefined; }
    let cancelled = false;
    const timer = setTimeout(() => {
      api.suggest(q)
        .then((d) => { if (!cancelled) { setItems(d); setActive(-1); } })
        .catch(() => { if (!cancelled) setItems([]); });
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [text]);

  // Bấm ra ngoài thì đóng danh sách
  useEffect(() => {
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const run = (q) => { setText(q); setOpen(false); setActive(-1); onSearch(q.trim()); };
  const submit = (e) => {
    e.preventDefault();
    run(active >= 0 && items[active] ? items[active].name : text);
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
    else if (e.key === 'Escape') setOpen(false);
  };

  const showList = open && text.trim() && items.length > 0;

  return (
    <form className="search" onSubmit={submit} role="search" ref={boxRef}>
      <input
        value={text}
        onChange={(e) => { setText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Tìm sản phẩm trên Hihi..."
        autoComplete="off"
        role="combobox"
        aria-expanded={!!showList}
        aria-autocomplete="list"
      />
      <button type="submit" aria-label="Tìm kiếm">🔍</button>
      {showList && (
        <ul className="suggest" role="listbox">
          {items.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'on' : ''}
              onMouseDown={(e) => { e.preventDefault(); run(s.name); }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="s-ico">🔍</span>
              <span className="s-name">{s.name}</span>
              <span className="s-price">{vnd(s.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
