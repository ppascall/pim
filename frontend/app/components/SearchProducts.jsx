"use client";
import React, { useState, useEffect } from "react";

function _safeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

// split options by pipe(s) or commas, trim and remove empties
// robust options parser: accepts arrays, JSON arrays, pipes, commas, semicolons, newlines,
// handles quoted values, percent-encoding and common malformed forms
function parseOptions(raw = '') {
  if (!raw && raw !== 0) return [];
  if (Array.isArray(raw)) return raw.map(x => String(x).trim()).filter(Boolean);

  let s = String(raw).trim();

  // Remove surrounding quotes if present
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }

  // Try JSON parse if it looks like an array
  if (/^\[.*\]$/.test(s)) {
    try {
      const parsed = JSON.parse(s.replace(/'/g, '"'));
      if (Array.isArray(parsed)) return parsed.map(x => String(x).trim()).filter(Boolean);
    } catch (_) { /* fallthrough */ }
  }

  // decode percent-encoding if present
  try { s = decodeURIComponent(s); } catch (_) {}

  // normalize escaped separators and odd patterns
  s = s.replace(/\\\|/g, '|').replace(/\\,/g, ',').replace(/"\s*,\s*"/g, '|');

  // Split on pipe, comma, semicolon or newline and trim entries
  const parts = s.split(/\r?\n|;|,|\|/);
  return parts.map(p => p.trim()).filter(Boolean);
}

export default function SearchProducts() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editData, setEditData] = useState({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/products');
        const json = await res.json();
        const list = (json.products || json || []).map(p => {
          const prod = {};
          Object.keys(p || {}).forEach(k => { prod[k] = _safeStr(p[k]); });
          prod.title = prod['Product Name'] || prod['Product name'] || prod.title || prod.handle || prod['Product number'] || 'Untitled Product';
          prod.category = prod['Product Group'] || prod['Category'] || prod.category || 'Uncategorized';
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

  useEffect(() => { handleSearch(); }, [query, all]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  // groupedFields should come from /fields endpoint; safe fallback empty
  const [groupedFields, setGroupedFields] = useState({});
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/fields');
        const json = await res.json();
        const fields = (json.fields || []).map(f => ({
          ...f,
          field_name: _safeStr(f.field_name),
          options: _safeStr(f.options),
          group: _safeStr(f.group) || 'Other'
        }));
        // group them
        const g = {};
        fields.forEach(f => {
          const grp = f.group || 'Other';
          if (!g[grp]) g[grp] = [];
          g[grp].push(f);
        });
        if (mounted) setGroupedFields(g);
      } catch (e) {
        if (mounted) setGroupedFields({});
      }
    })();
    return () => { mounted = false; };
  }, []);

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

      {/* Render grouped fields with proper option parsing */}
      {Object.entries(groupedFields).map(([group, groupFields]) => (
        <div key={group} style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 16, margin: "8px 0" }}>{group}</div>
          {groupFields.map(field => (
            <div key={field.field_name} style={{ marginBottom: 8, wordBreak: 'break-word', whiteSpace: 'normal' }}>
              <label>
                {field.field_name}:
                {field.options && String(field.options).trim() ? (
                  <select
                    name={field.field_name}
                    value={editData[field.field_name] || ""}
                    onChange={handleEditChange}
                    style={{ marginLeft: 8 }}
                  >
                    <option value="">Select...</option>
                    {parseOptions(field.options).map((opt, i) => (
                      <option key={`${field.field_name}--${i}`} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.field_name}
                    value={editData[field.field_name] || ""}
                    onChange={handleEditChange}
                    style={{ marginLeft: 8, width: '60%' }}
                  />
                )}
              </label>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}