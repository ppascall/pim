'use client';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import BackButton from './BackButton';

const PAGE_SIZE = 5;
const CATEGORY_PAGE_SIZE = 4;

function _safeStr(v) {
  if (v === null || v === undefined) return '';
  return String(v);
}

const styles = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
    background: "#f8fafc",
    borderRadius: 16,
    boxShadow: "0 6px 32px rgba(0,0,0,0.09)",
    padding: 28,                 // slightly smaller padding
    marginTop: 24,
    marginBottom: 24,
    boxSizing: 'border-box'
  },
  heading: {
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: 800,
    fontSize: '2.2rem',
    letterSpacing: '-1px',
    color: "#1a2233"
  },
  form: {
    marginBottom: 32,
    display: 'flex',
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    justifyContent: 'center',
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    padding: 18,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 180,
    fontWeight: 600,
  },
  label: {
    marginBottom: 6,
    fontWeight: 600,
    color: "#222",
    fontSize: 15,
  },
  input: {
    padding: "10px 14px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 16,
    background: "#f9fafd",
    transition: "border 0.2s",
  },
  select: {
    padding: "10px 14px",
    borderRadius: 6,
    border: "1px solid #d1d5db",
    fontSize: 16,
    background: "#f9fafd",
    outline: "none",
    transition: "border 0.2s",
  },
  button: {
    background: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 5,
    padding: '7px 18px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    margin: '0 4px',
    minWidth: 70,
    transition: 'background 0.2s,opacity 0.2s',
    boxShadow: 'none',
    height: 36,
    lineHeight: '20px',
    letterSpacing: 0
  },
  buttonDanger: {
    background: '#d32f2f',
    color: '#fff',
    minWidth: 60,
    maxWidth: 90,
    padding: '7px 10px',
    textAlign: 'center',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  },
  buttonSecondary: {
    background: '#616161',
    color: '#fff',
    border: 'none',
    borderRadius: 5,
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
    height: 36,
    minWidth: 80,
    margin: '32px auto 0 auto',
    display: 'block'
  },
  tableWrap: {
    overflowX: "auto",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    marginBottom: 18,
    marginTop: 18,
    maxWidth: '100%',
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 15,               // slightly smaller
    minWidth: 420,
  },
  th: {
    background: "#f3f4f6",
    color: "#333",
    fontWeight: 800,
    padding: "12px 10px",
    borderBottom: "2px solid #e5e9f2",
    textAlign: "left",
    fontSize: 14,
    letterSpacing: "0.2px",
    wordBreak: 'keep-all'
  },
  td: {
    padding: "10px 10px",
    borderBottom: "1px solid #f0f0f0",
    background: "#fff",
    maxWidth: 360,             // prevent one cell from expanding whole table
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "normal",      // allow wrap
    wordBreak: "break-word",
    fontSize: 14,
    verticalAlign: "top"
  },
  trExpanded: {
    background: "#f6fafd"
  },
  status: {
    marginTop: 8,
    textAlign: "center",
    fontWeight: 600,
    fontSize: 15,
  }
};

const SearchProducts = ({
  fetchFieldsEndpoint = '/api/fields',
  fetchProductsEndpoint = '/api/products',
  searchEndpoint = '/api/search_products',
  deleteProductEndpoint = '/api/delete_product'
}) => {
  const [fields, setFields] = useState([]);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [pageIndices, setPageIndices] = useState({});
  const [status, setStatus] = useState({ message: '', color: '' });

  // Modal state for editing all fields
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editStatus, setEditStatus] = useState({ message: '', color: '' });

  // Remove old modal paging state
  // const [editFieldPage, setEditFieldPage] = useState(0);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [groupPages, setGroupPages] = useState({}); // { groupName: pageNumber }

  const searchParams = useSearchParams();
  const highlightProductId = searchParams.get('edit');
  const highlightField = searchParams.get('field');

  // Group fields by group property, default to 'Ungrouped' (declare early so effects can depend on it safely)
  const groupedFields = React.useMemo(() => {
    const groups = {};
    (fields || []).forEach((field) => {
      const group = field && field.group && field.group.trim() ? field.group.trim() : "Ungrouped";
      if (!groups[group]) groups[group] = [];
      groups[group].push(field);
    });
    const ordered = {};
    Object.keys(groups)
      .sort((a, b) => {
        if (a === "Ungrouped") return 1;
        if (b === "Ungrouped") return -1;
        return a.localeCompare(b);
      })
      .forEach((g) => (ordered[g] = groups[g]));
    return ordered;
  }, [fields]);

  // Expose field and product fetchers so we can re-use when opening modal
  const fetchFields = async () => {
    try {
      const res = await fetch(fetchFieldsEndpoint);
      const data = await res.json();
      const arr = Array.isArray(data.fields) ? data.fields : [];
      setFields(arr);
      return arr;
    } catch {
      setStatus({ message: 'Failed to fetch fields.', color: 'red' });
      return [];
    }
  };
  const fetchProductsInitial = async () => {
    try {
      const res = await fetch(fetchProductsEndpoint);
      const data = await res.json();
      setProducts(
        (data.products || []).map((p, idx) => ({
          index: idx,
          data: p
        }))
      );
    } catch {
      setStatus({ message: 'Failed to fetch products.', color: 'red' });
    }
  };

  // Fetch fields and products on mount
  useEffect(() => {
    fetchFields();
    fetchProductsInitial();
  }, [fetchFieldsEndpoint, fetchProductsEndpoint]);

  // Build modal groups: include a Standard group derived from product keys, then the configured groups
  const modalGroups = React.useMemo(() => {
    const result = {};
    try {
      const src = editProduct && (editProduct.data || editProduct) ? (editProduct.data || editProduct) : null;
      if (src) {
        const whitelist = [
          'title', 'Product Name', 'handle', 'vendor', 'product_type', 'tags', 'status',
          'sku_primary', 'sku', 'id'
        ];
        const std = whitelist
          .filter((k) => Object.prototype.hasOwnProperty.call(src, k))
          .map((k) => ({ field_name: k, options: '' }));
        if (std.length) {
          result['Standard'] = std;
        }
      }
    } catch {}
    // append configured groups from categories
    Object.entries(groupedFields || {}).forEach(([g, arr]) => {
      result[g] = arr;
    });
    return result;
  }, [groupedFields, editProduct]);

  // If the modal is open and fields arrive later, auto-expand the first modal group
  useEffect(() => {
    if (!editModalOpen) return;
    const groupKeys = Object.keys(modalGroups || {});
    if (groupKeys.length && Object.keys(expandedGroups || {}).length === 0) {
      // Prefer expanding Standard if present
      const first = groupKeys.includes('Standard') ? 'Standard' : groupKeys[0];
      setExpandedGroups({ [first]: true });
    }
  }, [editModalOpen, modalGroups, fields]);

  // Add after products are loaded
  useEffect(() => {
    if (!products.length || !highlightProductId) return;
    const found = products.find(
      p =>
        String(p.data.id) === String(highlightProductId) ||
        String(p.data.shopify_id) === String(highlightProductId)
    );
    if (found) {
      openEditModal(found);
    }
  }, [products, highlightProductId]);

  const toggleDetails = (index) => {
    setExpandedIndex(prev => (prev === index ? null : index));
    setPageIndices(prev => ({ ...prev, [index]: 0 }));
  };

  const nextPage = (pid) => {
    const product = products.find(p => p.index === pid);
    const keys = Object.keys(product?.data || {});
    const maxPage = Math.floor((keys.length - 1) / PAGE_SIZE);
    setPageIndices(prev => {
      const current = prev[pid] || 0;
      if (current < maxPage) {
        return { ...prev, [pid]: current + 1 };
      }
      return prev;
    });
  };

  const prevPage = (pid) => {
    setPageIndices(prev => {
      const current = prev[pid] || 0;
      if (current > 0) {
        return { ...prev, [pid]: current - 1 };
      }
      return prev;
    });
  };

  const renderPage = (product) => {
    const data = product.data || {};
    const keys = Object.keys(data);
    const pageIndex = pageIndices[product.index] || 0;
    const start = pageIndex * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, keys.length);
    return (
      <tbody>
        {keys.slice(start, end).map(key => (
          <tr key={key}>
            <th style={{ ...styles.td, background: "#f3f4f6", width: 180 }}>{key}</th>
            <td style={styles.td}>{data[key]}</td>
          </tr>
        ))}
      </tbody>
    );
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    setExpandedIndex(null);
    setStatus({ message: '', color: '' });
    try {
      const res = await fetch(searchEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          fieldKey,
          fieldValue
        })
      });
      const data = await res.json();
      setProducts(
        (data.products || []).map((p, idx) => ({
          index: idx,
          data: p
        }))
      );
      if ((data.products || []).length === 0) {
        setStatus({ message: 'No results found.', color: 'orange' });
      }
    } catch {
      setStatus({ message: 'Search failed.', color: 'red' });
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(fetchProductsEndpoint);
      const data = await res.json();
      setProducts(
        (data.products || []).map((p, idx) => ({
          index: idx,
          data: p,
          originalIndex: idx // store original index
        }))
      );
    } catch {
      setStatus({ message: 'Failed to fetch products.', color: 'red' });
    }
  };

  const handleDelete = async (productIdx) => {
    if (!window.confirm('Are you sure?')) return;
    try {
      const res = await fetch(deleteProductEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: productIdx })
      });
      const data = await res.json();
      if (data.success) {
        await fetchProducts(); // Refetch after delete
        setStatus({ message: 'Product deleted!', color: 'green' });
      } else {
        setStatus({ message: data.message || 'Delete failed.', color: 'red' });
      }
    } catch {
      setStatus({ message: 'Error deleting product.', color: 'red' });
    }
  };

  // Open modal to edit all fields of a product
  const openEditModal = async (product) => {
    const src = (product && (product.data || product)) ? (product.data || product) : {};

    // If fields haven't loaded yet (user clicked super fast), load them first then reopen.
    if (!fields.length) {
      await fetchFields();
    }

    // copy preview data exactly (preserves the keys shown in renderPage)
    const mapped = {};
    Object.keys(src || {}).forEach(k => {
      mapped[k] = _safeStr(src[k]);
    });

    // ensure each configured field exists in mapped; try case-insensitive / underscore fallbacks
    (fields || []).forEach(f => {
      const fname = f.field_name;
      if (Object.prototype.hasOwnProperty.call(mapped, fname)) return;
      // try case-insensitive exact
      const ci = Object.keys(src || {}).find(k => k.toLowerCase() === fname.toLowerCase());
      if (ci) { mapped[fname] = _safeStr(src[ci]); return; }
      // try underscore / kebab / compact variants
      const unders = fname.replace(/\s+/g, "_").toLowerCase();
      const dash = fname.replace(/\s+/g, "-").toLowerCase();
      const compact = fname.replace(/[_\-\s]+/g, "").toLowerCase();
      const keys = Object.keys(src || {});
      const match = keys.find(k => {
        const nk = String(k).toLowerCase();
        return nk === unders || nk === dash || nk === compact;
      });
      mapped[fname] = match ? _safeStr(src[match]) : '';
    });

    // canonical title: match preview resolution (do not copy title into every other field)
    mapped.title = mapped.title || mapped['title'] || mapped['Product Description EN'] || mapped.product_name || mapped['Product Name'] || 'Unnamed Product';
    mapped['Product Name'] = mapped.title;

    // open modal with mapped values
    setEditProduct(product);
    setEditFields(mapped);
    setEditStatus({ message: "", color: "" });
    const firstGroup = Object.keys(groupedFields || {})[0];
    setExpandedGroups(firstGroup ? { [firstGroup]: true } : {});
    setGroupPages({});
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditProduct(null);
    setEditFields({});
    setEditStatus({ message: '', color: '' });
    setExpandedGroups({});
    setGroupPages({});
  };

  // helper: pick the best identifier field from a product data object
  const getPrimaryIdentifier = (src = {}) => {
    if (!src) return { field: null, id: null };
    if (src.handle) return { field: "handle", id: src.handle };
    if (src.sku_primary) return { field: "sku_primary", id: src.sku_primary };
    if (src.sku) return { field: "sku", id: src.sku };
    if (src.id) return { field: "id", id: src.id };
    if (src["Product number"]) return { field: "Product number", id: src["Product number"] };
    return { field: null, id: null };
  };

  // update a single edit field (ensure modal inputs remain controlled)
  const handleEditFieldChange = (key, value) => {
    setEditFields(prev => ({ ...(prev || {}), [key]: value }));
  };

  // Save handler for the edit modal form: build minimal updates payload and call backend
  const saveEditProduct = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!editProduct) {
      setEditStatus({ message: "No product selected", color: "red" });
      return;
    }

    const original = editProduct.data || editProduct || {};
    const edited = editFields || {};

    // determine identifier
    const { field: identifier_field, id: identifier_value } = getPrimaryIdentifier(original);
    if (!identifier_field || !identifier_value) {
      setEditStatus({ message: "Could not determine product identifier (handle/sku/etc.)", color: "red" });
      return;
    }

    // build updates object containing only changed fields
    const updates = {};
    Object.keys(edited).forEach(k => {
      const origVal = original[k] == null ? "" : String(original[k]);
      const newVal = edited[k] == null ? "" : String(edited[k]);
      if (newVal !== origVal) updates[k] = newVal;
    });

    if (Object.keys(updates).length === 0) {
      setEditStatus({ message: "No changes to save", color: "#666" });
      return;
    }

    const payload = {
      identifier_field,
      id: identifier_value,
      updates
    };

    try {
      console.debug("update_product payload:", payload);
      const res = await fetch("/api/update_product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await (res.headers.get("Content-Type") || "").includes("application/json") ? res.json() : { ok: false, text: await res.text() };
      if (!res.ok) {
        console.error("update_product failed:", res.status, body);
        const msg = (body && (body.message || body.error || JSON.stringify(body))) || `HTTP ${res.status}`;
        setEditStatus({ message: `Save failed: ${msg}`, color: "red" });
      } else {
        setEditStatus({ message: "Saved successfully", color: "green" });
        // update local products list so preview reflects saved changes without reload
        setProducts(prev => {
          return (prev || []).map(p => {
            if ((p.index !== undefined && p.index === editProduct.index) || (p.data && p.data[identifier_field] === identifier_value)) {
              // merge edits into product.data
              const newData = { ...(p.data || {}), ...(updates || {}) };
              return { ...p, data: newData };
            }
            return p;
          });
        });
        // keep modal open briefly so user sees success
        setTimeout(() => {
          setEditModalOpen(false);
        }, 700);
      }
    } catch (err) {
      console.error("update_product exception:", err);
      setEditStatus({ message: `Save error: ${String(err)}`, color: "red" });
    }
  };
  
  // (moved groupedFields earlier)

  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
    setGroupPages((prev) => ({
      ...prev,
      [group]: prev[group] || 0,
    }));
  };

  const handleGroupPage = (group, direction) => {
    setGroupPages((prev) => {
      const current = prev[group] || 0;
      const total = groupedFields[group]?.length || 0;
      const maxPage = Math.max(0, Math.ceil(total / CATEGORY_PAGE_SIZE) - 1);
      let next = current + direction;
      if (next < 0) next = 0;
      if (next > maxPage) next = maxPage;
      return { ...prev, [group]: next };
    });
  };

  return (
    <div style={{ position: 'relative', paddingTop: 8 }}>
      <BackButton to="/"/>
      <div style={styles.container}>
        <h1 style={styles.heading}>Search Products</h1>

        <form onSubmit={handleSearchSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label className="form-label" htmlFor="search_query" style={styles.label}>Search:</label>
            <input
              id="search_query"
              type="text"
              name="query"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label className="form-label" htmlFor="field_key" style={styles.label}>Field:</label>
            <select
              id="field_key"
              name="field_key"
              value={fieldKey}
              onChange={e => setFieldKey(e.target.value)}
              style={styles.select}
            >
              <option value="">Any Field</option>
              {Object.entries(groupedFields).map(([group, groupFields]) => (
                <optgroup key={group} label={group}>
                  {groupFields.map(f => (
                    <option key={f.field_name} value={f.field_name}>
                      {f.field_name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label className="form-label" htmlFor="field_value" style={styles.label}>Value:</label>
            <input
              id="field_value"
              type="text"
              name="field_value"
              value={fieldValue}
              onChange={e => setFieldValue(e.target.value)}
              style={styles.input}
            />
          </div>
          <button type="submit" className="button" style={styles.button}>Search</button>
        </form>

        <h2 style={{ marginBottom: 16, textAlign: 'center', fontWeight: 700, fontSize: 20, color: "#1a2233" }}>Results</h2>
        {status.message && (
          <div style={{ color: status.color, marginBottom: 10, textAlign: 'center', fontWeight: 600 }}>{status.message}</div>
        )}
        {products.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#888', fontSize: 17, marginTop: 32 }}>No results found.</p>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Product Name</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => {
                  // prefer backend "title" field first, then fallbacks; also log for debugging
                  const productName =
                    (product.data && (product.data.title || product.data['title'])) ||
                    product.data['Product Description EN'] ||
                    product.data.product_name ||
                    'Unnamed Product';
                  console.log('render product title:', productName);
                  const isExpanded = expandedIndex === product.index;
                  return (
                    <React.Fragment key={product.index}>
                      <tr style={isExpanded ? styles.trExpanded : {}}>
                        <td
                          style={{
                            ...styles.td,
                            cursor: "pointer",
                            color: "#007BFF",
                            fontWeight: 700,
                            fontSize: 16
                          }}
                          onClick={() => toggleDetails(product.index)}
                        >
                          {productName}
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <button
                                  className="button"
                                  style={styles.button}
                                  onClick={() => openEditModal(product)}
                                  disabled={!fields.length}
                                >
                                  {fields.length ? 'Edit' : 'Loading fields...'}
                                </button>
                            <button
                              className="button"
                              style={styles.buttonDanger}
                              onClick={() => handleDelete(product.index)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={2} style={{ background: "#f8fafc", padding: 0 }}>
                            <div style={{ padding: 18 }}>
                              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                {renderPage(product)}
                              </table>
                              <div style={{ marginTop: 10, display: 'flex', gap: 10, justifyContent: "center" }}>
                                <button
                                  onClick={() => prevPage(product.index)}
                                  disabled={(pageIndices[product.index] || 0) === 0}
                                  className="button"
                                  style={{
                                    ...styles.button,
                                    background: (pageIndices[product.index] || 0) === 0 ? "#ccc" : "#007BFF",
                                    color: "#fff",
                                    minWidth: 80
                                  }}
                                >
                                  Prev
                                </button>
                                <button
                                  onClick={() => nextPage(product.index)}
                                  className="button"
                                  style={{
                                    ...styles.button,
                                    minWidth: 80
                                  }}
                                  disabled={
                                    (() => {
                                      const keys = Object.keys(product.data || {});
                                      const pageIndex = pageIndices[product.index] || 0;
                                      const maxPage = Math.floor((keys.length - 1) / PAGE_SIZE);
                                      return pageIndex >= maxPage;
                                    })()
                                  }
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {editModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.25)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
            boxSizing: 'border-box'
          }}>
            <div style={{
              background: '#fff',
              borderRadius: 10,
              padding: 24,
              minWidth: 320,
              maxWidth: 'min(92vw, 980px)',   // limit modal width
              width: '100%',
              maxHeight: '86vh',              // limit modal height
              overflowY: 'auto',              // scroll inside modal
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
            }}>
              <h2 style={{ marginBottom: 18, fontWeight: 700, fontSize: 20 }}>Edit Product</h2>
              <form
                onSubmit={saveEditProduct}
              >
                {Object.entries(modalGroups).map(([group, groupFields]) => {
                  const page = groupPages[group] || 0;
                  const totalPages = Math.ceil(groupFields.length / CATEGORY_PAGE_SIZE);
                  const start = page * CATEGORY_PAGE_SIZE;
                  const end = start + CATEGORY_PAGE_SIZE;
                  return (
                    <div key={group} style={{
                      border: "1px solid #e0e0e0",
                      borderRadius: 8,
                      marginBottom: 18,
                      background: "#f8fafc",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                    }}>
                      <div
                        style={{
                          cursor: "pointer",
                          padding: "12px 18px",
                          fontWeight: 700,
                          fontSize: 18,
                          background: "#e3e9f6",
                          borderRadius: "8px 8px 0 0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          userSelect: "none",
                        }}
                        onClick={() => toggleGroup(group)}
                        tabIndex={0}
                        role="button"
                        aria-expanded={!!expandedGroups[group]}
                        onKeyDown={e => {
                          if (e.key === "Enter" || e.key === " ") toggleGroup(group);
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "#1976d2", fontSize: 17 }}>
                          {expandedGroups[group] ? "▼" : "▶"} {group}
                        </span>
                        <span style={{ fontWeight: 400, color: "#888", fontSize: 15, marginLeft: 8 }}>
                          ({groupFields.length})
                        </span>
                      </div>
                      {expandedGroups[group] && (
                        <div style={{ padding: "18px 18px 8px 18px", background: "#fff", borderRadius: "0 0 8px 8px" }}>
                          {groupFields.slice(start, end).map(field => (
                            <div key={field.field_name} style={{ marginBottom: 14 }}>
                              <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>
                                {field.field_name}
                              </label>
                              {field.options && field.options.trim() ? (
                                <select
                                  value={editFields[field.field_name] ?? ''}
                                  onChange={e =>
                                    setEditFields(f => ({
                                      ...f,
                                      [field.field_name]: e.target.value
                                    }))
                                  }
                                  style={styles.input}
                                >
                                  <option value="">Select...</option>
                                  {field.options.split(',').map(opt => (
                                    <option key={opt.trim()} value={opt.trim()}>
                                      {opt.trim()}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={editFields[field.field_name] ?? ''}
                                  onChange={e =>
                                    setEditFields(f => ({
                                      ...f,
                                      [field.field_name]: e.target.value
                                    }))
                                  }
                                  style={{
                                    ...styles.input,
                                    ...(
                                      (String(editProduct?.data?.id) === String(highlightProductId) ||
                                       String(editProduct?.data?.shopify_id) === String(highlightProductId)) &&
                                      field.field_name === highlightField
                                        ? { border: '2px solid red', boxShadow: '0 0 0 2px #ffb3b3' }
                                        : {}
                                    )
                                  }}
                                />
                              )}
                            </div>
                          ))}
                          {totalPages > 1 && (
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '10px 0 0 0' }}>
                              <button
                                type="button"
                                className="button"
                                style={{
                                  ...styles.button,
                                  minWidth: 70,
                                  background: page === 0 ? '#ccc' : styles.button.background,
                                  color: '#fff',
                                  cursor: page === 0 ? 'not-allowed' : 'pointer'
                                }}
                                disabled={page === 0}
                                onClick={() => handleGroupPage(group, -1)}
                              >
                                Prev
                              </button>
                              <span style={{ alignSelf: 'center', color: '#444', fontSize: 15 }}>
                                Page {page + 1} of {totalPages}
                              </span>
                              <button
                                type="button"
                                className="button"
                                style={{
                                  ...styles.button,
                                  minWidth: 70,
                                  background: page + 1 >= totalPages ? '#ccc' : styles.button.background,
                                  color: '#fff',
                                  cursor: page + 1 >= totalPages ? 'not-allowed' : 'pointer'
                                }}
                                disabled={page + 1 >= totalPages}
                                onClick={() => handleGroupPage(group, 1)}
                              >
                                Next
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Removed the old flat page selector here */}
                {editStatus.message && (
                  <div style={{ color: editStatus.color, marginBottom: 12, fontWeight: 600 }}>{editStatus.message}</div>
                )}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    className="button"
                    style={styles.button}
                    type="submit"
                  >
                    Save
                  </button>
                  <button
                    className="button"
                    style={{ ...styles.button, background: '#888' }}
                    type="button"
                    onClick={closeEditModal}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchProducts;