"use client";
  import React, { useState, useEffect, useMemo } from "react";

  function _safeStr(v) { if (v === null || v === undefined) return ''; return String(v); }

  // split options by pipe(s) or commas, trim and remove empties
  // robust options parser: accepts arrays, JSON arrays, pipes, commas, semicolons, newlines,
  // handles quoted values, percent-encoding and common malformed forms
  function parseOptions(raw = '') {
    if (raw === null || raw === undefined) return [];
    if (Array.isArray(raw)) {
      if (raw.length === 0) return [];
      if (raw.length === 1) {
        const single = raw[0] == null ? '' : String(raw[0]).trim();
        if (!/[|,;\r\n]/.test(single)) return single ? [single] : [];
        raw = single;
      } else {
        return raw.map(x => (x == null ? '' : String(x).trim())).filter(Boolean);
      }
    }
    let s = String(raw).trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1,-1).trim();
    if (/^\[.*\]$/.test(s)) {
      try { const parsed = JSON.parse(s.replace(/'/g,'"')); if (Array.isArray(parsed)) return parsed.map(x=>String(x).trim()).filter(Boolean); } catch(_) {}
    }
    try { s = decodeURIComponent(s); } catch(_) {}
    s = s.replace(/\\\|/g, '|').replace(/\\,/g, ',').replace(/"\s*,\s*"/g, '|');
    s = s.replace(/[\uFF5C\u2502\u2016]/g, '|');
    let parts = s.split(/\|/).map(p=>p.trim()).filter(Boolean);
    if (parts.length <= 1) parts = s.split(/\r?\n|;|,/).map(p=>p.trim()).filter(Boolean);
    const final = [];
    parts.forEach(p => {
      if (/[|,;]/.test(p)) {
        p.split(/\r?\n|;|,|\|/).forEach(x => { const t = x.trim(); if (t) final.push(t); });
      } else {
        if (p) final.push(p);
      }
    });
    return final;
  }

  // helper to coerce fields list to flat array
  function flattenFields(grouped) {
    const out = [];
    Object.entries(grouped || {}).forEach(([grp, list]) => {
      list.forEach(f => out.push({ ...f, group: grp }));
    });
    return out;
  }

  export default function SearchProducts() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [all, setAll] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editData, setEditData] = useState({});
    const [groupedFields, setGroupedFields] = useState({});
    const [productsCount, setProductsCount] = useState(0);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const res = await fetch('/products');
          const json = await res.json();
          const raw = Array.isArray(json) ? json : (json.products || json || []);
          const list = raw.map(p => {
            const prod = {};
            Object.keys(p || {}).forEach(k => { prod[k] = _safeStr(p[k]); });
            // canonicalize title: prefer backend "title" then explicit fields, never use category
            const explicit = (prod.title && String(prod.title).trim()) || prod['Product Name'] || prod['Product name'] || '';
            const fallback = prod['Product number'] || prod.handle || 'Unnamed Product';
            const canonical = explicit || fallback;
            prod.title = canonical;
            prod['Product Name'] = canonical;
            prod.category = prod['Product Group'] || prod['category'] || prod['Category'] || 'Uncategorized';
            return prod;
          });
          if (mounted) { setAll(list); setResults(list); setProductsCount(list.length); }
        } catch (e) {
          if (mounted) setAll([]);
        } finally { if (mounted) setLoading(false); }
      })();
      return () => { mounted = false; };
    }, []);

    useEffect(() => {
      let mounted = true;
      (async () => {
        try {
          const res = await fetch('/fields');
          const json = await res.json();
          const fieldsRaw = (json.fields || []);
          const fields = fieldsRaw.map(f => ({
            ...f,
            field_name: _safeStr(f.field_name),
            options: _safeStr(f.options),
            group: _safeStr(f.group) || 'Other'
          }));
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

    // flat fields and counts for stats
    const flatFields = useMemo(() => flattenFields(groupedFields), [groupedFields]);
    const totalFieldCount = flatFields.length;

    // compute per-product completeness and group stats
    const enhancedResults = useMemo(() => {
      if (!all || all.length === 0 || totalFieldCount === 0) return results.map(p => ({ product: p, filled: 0, pct: 0 }));
      return results.map(p => {
        let filled = 0;
        flatFields.forEach(f => {
          const v = p[f.field_name];
          if (v !== undefined && v !== null && String(v).trim() !== '') filled += 1;
        });
        const pct = totalFieldCount > 0 ? Math.round((filled / totalFieldCount) * 100) : 0;
        return { product: p, filled, pct };
      });
    }, [results, all, flatFields, totalFieldCount]);

    // aggregate group-level fill rates across all products
    const groupStats = useMemo(() => {
      const groups = {};
      if (!flatFields.length || !all.length) return groups;
      Object.keys(groupedFields).forEach(grp => {
        const fields = (groupedFields[grp] || []).map(f => f.field_name);
        let totalCells = fields.length * all.length;
        if (totalCells === 0) { groups[grp] = { pct: 0, filled: 0, total: 0 }; return; }
        let filled = 0;
        all.forEach(prod => {
          fields.forEach(fn => {
            const v = prod[fn];
            if (v !== undefined && v !== null && String(v).trim() !== '') filled += 1;
          });
        });
        groups[grp] = { filled, total: totalCells, pct: Math.round((filled/totalCells)*100) };
      });
      return groups;
    }, [groupedFields, all]);

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

    // open inline editor for a product
    function openEditor(product) {
      const id = product['Product number'] || product.handle || product.title;
      setEditingId(id);
      // initialize form with known fields (shallow copy)
      setEditForm({
        title: product.title || '',
        'Product number': product['Product number'] || product['sku_primary'] || '',
        handle: product.handle || '',
        category: product.category || '',
        description: product.description || '',
        image_src: product.image_src || '',
      });
    }

    function cancelEdit() {
      setEditingId(null);
      setEditForm({});
    }

    async function saveEdit(product) {
      const identifier_field = product['Product number'] ? 'Product number' : (product.handle ? 'handle' : 'title');
      const identifier_value = product[identifier_field];
      const updates = {};
      // only send fields that changed
      Object.keys(editForm).forEach(k => {
        if (String(editForm[k] || '').trim() !== String(product[k] || '').trim()) updates[k] = editForm[k];
      });
      if (!Object.keys(updates).length) {
        cancelEdit();
        return;
      }
      try {
        const resp = await fetch('/update_product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier_field, id: identifier_value, updates })
        });
        const json = await resp.json();
        if (json.success) {
          // refresh product list simply by re-fetching products
          const r = await fetch('/products');
          const j = await r.json();
          const list = Array.isArray(j) ? j : (j.products || []);
          setAll(list);
          setResults(list);
        } else {
          console.warn('save failed', json);
        }
      } catch (e) {
        console.warn('save error', e);
      } finally {
        cancelEdit();
      }
    }

    const handleEditFormChange = (e) => {
      const { name, value } = e.target;
      setEditForm(prev => ({ ...prev, [name]: value }));
    };

    // simple nicer styles
    const styles = {
      page: { maxWidth: 1100, margin: '18px auto', padding: 18, fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" },
      header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 },
      summaryCard: { display: 'flex', gap: 12, alignItems: 'center', background: '#fff', padding: 12, borderRadius: 10, boxShadow: '0 6px 18px rgba(15,23,42,0.06)' },
      statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 12 },
      statItem: { background: '#fff', padding: 12, borderRadius: 10, boxShadow: '0 6px 18px rgba(15,23,42,0.04)' },
      tableCard: { marginTop: 16, background: '#fff', padding: 12, borderRadius: 10, boxShadow: '0 6px 18px rgba(15,23,42,0.04)' },
      progressBarWrap: { height: 12, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' },
      progressBar: pct => ({ height: '100%', width: `${pct}%`, background: pct > 66 ? '#10b981' : pct > 33 ? '#f59e0b' : '#ef4444' }),
    };

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <div>
            <h2 style={{ margin: 0 }}>Products</h2>
            <div style={{ color: '#6b7280', marginTop: 6 }}>Total products: <strong>{productsCount}</strong> · Fields: <strong>{totalFieldCount}</strong></div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Search products..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', minWidth: 260 }}
            />
            <button onClick={handleSearch} style={{ padding: '10px 14px', borderRadius: 8, background: '#111827', color: '#fff', border: 'none' }}>Search</button>
          </div>
        </div>

        {/* Summary / completion overview */}
        <div style={styles.summaryCard}>
          <div style={{ minWidth: 200 }}>
            <div style={{ color: '#374151', fontWeight: 700 }}>Overview</div>
            <div style={{ marginTop: 8, color: '#6b7280' }}>Average completion across products</div>
            <div style={{ marginTop: 10, fontSize: 18 }}>
              {all.length ? Math.round(enhancedResults.reduce((s, r) => s + r.pct, 0) / enhancedResults.length) : 0}% complete
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ color: '#374151', fontWeight: 700, marginBottom: 8 }}>Group completion</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(groupStats).map(([grp, stat]) => (
                <div key={grp} style={{ minWidth: 160 }}>
                  <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{grp}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.progressBarWrap}><div style={styles.progressBar(stat.pct)} /></div>
                    </div>
                    <div style={{ minWidth: 44, textAlign: 'right', color: '#6b7280' }}>{stat.pct}%</div>
                  </div>
                </div>
              ))}
              {Object.keys(groupStats).length === 0 && <div style={{ color: '#6b7280' }}>No fields defined</div>}
            </div>
          </div>
        </div>

        {/* Table of products with per-product completion */}
        <div style={styles.tableCard}>
          {loading ? <div>Loading…</div> : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 12 }}>Title</th>
                    <th style={{ textAlign: 'left', padding: 12 }}>Handle / SKU</th>
                    <th style={{ textAlign: 'left', padding: 12 }}>Category</th>
                    <th style={{ textAlign: 'left', padding: 12 }}>Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {enhancedResults.map((r, idx) => {
                    const product = r.product || {};
                    const rowId = product['Product number'] || product.handle || product.title || `p-${idx}`;
                    const isEditing = Boolean(editingId && editingId === rowId);

                    // use the productName logic — prefer backend `title` first
                    const productName =
                      product.title ||
                      product["title"] ||
                      product["Product Name"] ||
                      product["Product name"] ||
                      product.product_name ||
                      product["Product number"] ||
                      product.handle ||
                      "Unnamed Product";

                    // keep canonical fields in sync (so editors/readers use the same value)
                    product.title = productName;
                    product["Product Name"] = productName;

                    // debug: log the resolved title so you can verify what's displayed
                    // (opens in browser console)
                    console.log('render product title:', productName);
                    
                    return (
                      <tr key={rowId} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: 12, maxWidth: 420, wordBreak: 'break-word' }}>
                          {isEditing ? (
                            <input
                              name="title"
                              value={editForm.title || ''}
                              onChange={handleEditFormChange}
                              style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}
                            />
                          ) : (
                            <span
                              style={{ color: '#0b5fff', fontWeight: 700, cursor: 'pointer' }}
                              onClick={() => openEditor(product)}
                              title="Click to edit product name"
                            >
                              {productName}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: 12, color: '#6b7280' }}>
                          {isEditing ? (
                            <input name="handle" value={editForm.handle || ''} onChange={handleEditFormChange}
                              style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', width: 220 }} />
                          ) : (
                            product.handle || product['Product number'] || '-'
                          )}
                        </td>
                        <td style={{ padding: 12, color: '#6b7280' }}>
                          {isEditing ? (
                            <input name="category" value={editForm.category || ''} onChange={handleEditFormChange}
                              style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', width: 180 }} />
                          ) : (
                            product.category
                          )}
                        </td>
                        <td style={{ padding: 12, width: 260 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={styles.progressBarWrap}><div style={styles.progressBar(r.pct)} /></div>
                            </div>
                            <div style={{ width: 48, textAlign: 'right', color: '#374151', fontWeight: 700 }}>{r.pct}%</div>
                          </div>
                        </td>
                        <td style={{ padding: 12 }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => saveEdit(product)} style={{ padding: '8px 12px', background: '#0b5fff', color: '#fff', borderRadius: 6 }}>Save</button>
                              <button onClick={cancelEdit} style={{ padding: '8px 12px', background: '#ef4444', color: '#fff', borderRadius: 6 }}>Cancel</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <button onClick={() => openEditor(product)} style={{ background: '#1976d2', color: '#fff', borderRadius: 6, padding: '7px 14px', fontWeight: 600 }}>Edit</button>
                              <button onClick={async () => {
                                if (!confirm('Delete this product?')) return;
                                try {
                                  await fetch('/delete_product', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ identifier_field: 'Product number', id: product['Product number'] })});
                                  const r = await fetch('/products'); const j = await r.json();
                                  const list = Array.isArray(j) ? j : (j.products || []);
                                  setAll(list); setResults(list);
                                } catch (e) { console.warn('delete failed', e); }
                            }} style={{ background: '#d32f2f', color: '#fff', borderRadius: 6, padding: '7px 10px' }}>Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {results.length === 0 && <div style={{ marginTop: 12, color: '#6b7280' }}>No products found</div>}
            </>
          )}
        </div>

        {/* Fields editor (unchanged behavior, but nicer layout) */}
        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 16, margin: "8px 0" }}>Fields</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
            {Object.entries(groupedFields).map(([group, groupFields]) => (
              <div key={group} style={{ background: '#fff', padding: 12, borderRadius: 10, boxShadow: '0 6px 18px rgba(15,23,42,0.04)' }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>{group}</div>
                {groupFields.map(field => (
                  <div key={field.field_name} style={{ marginBottom: 8 }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>{field.field_name}</label>
                    {field.options && String(field.options).trim() ? (
                      <select
                        name={field.field_name}
                        value={editData[field.field_name] || ""}
                        onChange={handleEditChange}
                        style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', width: '100%', background: '#f8fafc' }}
                      >
                        <option value="">Select...</option>
                        {parseOptions(field.options).map((opt, i) => (
                          <option key={`${field.field_name}--${i}`} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name={field.field_name}
                        value={editData[field.field_name] || ""}
                        onChange={handleEditChange}
                        style={{ padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', width: '100%' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }