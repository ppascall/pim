"use client";
import React, { useState, useEffect } from "react";

function _safeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

export default function SearchProducts() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/products');
        const json = await res.json();
        const list = (json.products || json || []).map(p => {
          const prod = {};
          Object.keys(p || {}).forEach(k => { prod[k] = _safeStr(p[k]); });
          prod.title = prod.title || prod['Product Name'] || prod['product_name'] || prod.handle || prod['Product number'] || 'Untitled Product';
          prod.category = prod.category || prod['Product Group'] || prod.Category || 'Uncategorized';
          return prod;
        });
        if (mounted) {
          setAll(list);
          setResults(list);
        }
      } catch (e) {
        console.error('fetch products failed', e);
        if (mounted) setAll([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return setResults(all);
    const filtered = all.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.handle || '').toLowerCase().includes(q) ||
      (p['Product number'] || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
    setResults(filtered);
  };

  useEffect(() => { handleSearch(); }, [query]); // live search

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Search products..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ flex: 1, padding: 10, minWidth: 120, maxWidth: '100%' }}
        />
        <button onClick={handleSearch} style={{ padding: '10px 14px' }}>Search</button>
      </div>

      {loading ? <div>Loading…</div> : (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, padding: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>Title</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Handle / SKU</th>
                <th style={{ textAlign: 'left', padding: 8 }}>Category</th>
              </tr>
            </thead>
            <tbody>
              {results.map((p, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 8, maxWidth: 420, wordBreak: 'break-word' }}>{p.title}</td>
                  <td style={{ padding: 8, color: '#666' }}>{p.handle || p['Product number'] || '-'}</td>
                  <td style={{ padding: 8, color: '#666' }}>{p.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {results.length === 0 && <div style={{ marginTop: 8, color: '#666' }}>No products found</div>}
        </div>
      )}
    </div>
  );
}