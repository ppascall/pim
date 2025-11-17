'use client';
import React, { useState, useEffect, useRef } from 'react';

const MAX_VISIBLE_FIELDS = 6;
const PRODUCTS_PER_PAGE = 25;

const styles = {
  container: {
    padding: 32,
    maxWidth: 1100,
    margin: '0 auto',
    background: '#f9fafd',
    borderRadius: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
  },
  heading: {
    fontSize: '2rem',
    fontWeight: 700,
    marginBottom: 28,
    textAlign: 'center',
    color: '#1a2233',
    letterSpacing: '-1px',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  filterInput: {
    padding: '10px 14px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    fontSize: 16,
    width: 320,
    background: '#fff',
  },
  navFields: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    justifyContent: 'center',
  },
  navButton: {
    background: '#e5e9f2',
    color: '#222',
    border: 'none',
    borderRadius: 6,
    padding: '7px 16px',
    fontSize: 16,
    cursor: 'pointer',
    transition: 'background 0.2s',
    fontWeight: 600,
  },
  navButtonDisabled: {
    background: '#f3f4f6',
    color: '#aaa',
    cursor: 'not-allowed',
  },
  tableWrap: {
    overflowX: 'auto',
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    marginBottom: 18,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 15,
  },
  th: {
    background: '#f3f4f6',
    color: '#333',
    fontWeight: 700,
    padding: '10px 8px',
    borderBottom: '2px solid #e5e9f2',
    textAlign: 'left',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  },
  td: {
    padding: '8px 8px',
    borderBottom: '1px solid #f0f0f0',
    background: '#fff',
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  trSelected: {
    background: '#e6f7ff',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 18,
    marginBottom: 18,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  button: {
    background: 'linear-gradient(90deg,#007bff 60%,#0056b3 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 20px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s,opacity 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
  },
  buttonDanger: {
    background: 'linear-gradient(90deg,#ff4d4f 60%,#b30000 100%)',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  select: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    fontSize: 15,
    background: '#fff',
  },
  input: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #d1d5db',
    fontSize: 15,
    background: '#fff',
    minWidth: 120,
  },
  pagination: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 10,
  },
  status: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: 600,
    fontSize: 15,
  },
  backLink: {
    display: 'block',
    marginTop: 24,
    textAlign: 'center',
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 16,
  }
};

const ManageProducts = ({
  fetchEndpoint = '/api/products',
  bulkDeleteEndpoint = '/api/bulk_delete_products',
  bulkEditEndpoint = '/api/bulk_edit_products'
}) => {
  const [products, setProducts] = useState([]);
  const [fields, setFields] = useState([]);
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState('');
  const [editField, setEditField] = useState('');
  const [editValue, setEditValue] = useState('');
  const [status, setStatus] = useState({ message: '', color: '' });
  const [fieldOffset, setFieldOffset] = useState(0);
  const [page, setPage] = useState(0);
  const [editProduct, setEditProduct] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editStatus, setEditStatus] = useState({ message: '', color: '' });
  const selectAllRef = useRef();

  // Fetch products and fields
  const fetchProducts = async () => {
    const res = await fetch(fetchEndpoint);
    const data = await res.json();
    setProducts(data.products || []);
  };
  const fetchFields = async () => {
    const res = await fetch('/api/fields');
    const data = await res.json();
    setFields(data.fields || []);
  };

  useEffect(() => {
    fetchProducts();
    fetchFields();
  }, [fetchEndpoint]);

  // Filtered products
  const filteredProducts = products.filter(p =>
    !filter ||
    Object.values(p).some(val => String(val).toLowerCase().includes(filter.toLowerCase()))
  );

  // Pagination for products
  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    page * PRODUCTS_PER_PAGE,
    (page + 1) * PRODUCTS_PER_PAGE
  );

  // Handle select/deselect
  const toggleSelect = idx => {
    setSelected(sel =>
      sel.includes(idx) ? sel.filter(i => i !== idx) : [...sel, idx]
    );
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (!selected.length) return;
    if (!window.confirm('Delete selected products?')) return;
    const res = await fetch(bulkDeleteEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ indices: selected }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchProducts(); // <-- Refresh after delete
      setSelected([]);
      setStatus({ message: 'Deleted selected products.', color: 'green' });
    } else {
      setStatus({ message: data.message || 'Delete failed.', color: 'red' });
    }
  };

  // Bulk edit
  const handleBulkEdit = async () => {
    if (!selected.length || !editField) return;
    const res = await fetch(bulkEditEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        indices: selected,
        field: editField,
        value: editValue
      }),
    });
    const data = await res.json();
    if (data.success) {
      await fetchProducts(); // <-- Refresh after edit
      setStatus({ message: 'Edited selected products.', color: 'green' });
    } else {
      setStatus({ message: data.message || 'Edit failed.', color: 'red' });
    }
  };

  // Edit product
  const handleEditSave = async () => {
    if (!editProduct) return;
    try {
      const payload = { index: editProduct.index, ...editFields };
      const res = await fetch('/api/update_product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setEditStatus({ message: 'Product updated!', color: 'green' });
        await fetchProducts();
        setTimeout(closeEditModal, 800);
      } else {
        setEditStatus({ message: data.message || 'Edit failed.', color: 'red' });
      }
    } catch {
      setEditStatus({ message: 'Error updating product.', color: 'red' });
    }
  };

  // Group fields by group property
  const groupedFields = (() => {
    const groups = {};
    fields.forEach((field) => {
      const group = field.group && field.group.trim() ? field.group.trim() : "Ungrouped";
      if (!groups[group]) groups[group] = [];
      groups[group].push(field);
    });
    // Sort group names alphabetically, Ungrouped last
    const ordered = {};
    Object.keys(groups)
      .sort((a, b) => {
        if (a === "Ungrouped") return 1;
        if (b === "Ungrouped") return -1;
        return a.localeCompare(b);
      })
      .forEach((g) => (ordered[g] = groups[g]));
    return ordered;
  })();

  const groupNames = ["All", ...Object.keys(groupedFields)];
  const [selectedGroup, setSelectedGroup] = useState("All");

  // Only show fields from the selected group, or all fields if "All" is selected
  const allFields = Object.values(groupedFields).flat();
  const groupFields = selectedGroup === "All" ? allFields : (groupedFields[selectedGroup] || []);
  const visibleFields = groupFields.slice(fieldOffset, fieldOffset + MAX_VISIBLE_FIELDS);
  const canPrevField = fieldOffset > 0;
  const canNextField = fieldOffset + MAX_VISIBLE_FIELDS < groupFields.length;

  // Pagination for products
  const canPrevPage = page > 0;
  const canNextPage = page < totalPages - 1;

  useEffect(() => {
    if (selectAllRef.current) {
      const allSelected = paginatedProducts.length > 0 &&
        paginatedProducts.every((_, idx) =>
          selected.includes(idx + page * PRODUCTS_PER_PAGE)
        );
      const someSelected = paginatedProducts.some((_, idx) =>
        selected.includes(idx + page * PRODUCTS_PER_PAGE)
      );
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [selected, paginatedProducts, page]);

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Bulk Manage Products</h1>
      <div style={styles.filterRow}>
        <input
          type="text"
          placeholder="Filter products..."
          value={filter}
          onChange={e => { setFilter(e.target.value); setPage(0); }}
          style={styles.filterInput}
        />
        <span style={{ color: '#888', fontSize: 15 }}>
          Showing {filteredProducts.length} result{filteredProducts.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div style={styles.navFields}>
        <button
          onClick={() => setFieldOffset(o => Math.max(0, o - MAX_VISIBLE_FIELDS))}
          disabled={!canPrevField}
          style={{
            ...styles.navButton,
            ...(canPrevField ? {} : styles.navButtonDisabled)
          }}
        >
          ◀ Prev Fields
        </button>
        <span style={{ fontSize: 15, color: '#444' }}>
          Fields {fieldOffset + 1} - {Math.min(fieldOffset + MAX_VISIBLE_FIELDS, fields.length)} of {fields.length}
        </span>
        <button
          onClick={() => setFieldOffset(o => Math.min(fields.length - MAX_VISIBLE_FIELDS, o + MAX_VISIBLE_FIELDS))}
          disabled={!canNextField}
          style={{
            ...styles.navButton,
            ...(canNextField ? {} : styles.navButtonDisabled)
          }}
        >
          Next Fields ▶
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <label style={{ fontWeight: 600 }}>Field Group:</label>
        <select
          value={selectedGroup}
          onChange={e => {
            setSelectedGroup(e.target.value);
            setFieldOffset(0); // Reset paging when group changes
          }}
          style={styles.select}
        >
          {groupNames.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>
      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={
                    filteredProducts.length > 0 &&
                    filteredProducts.every((_, idx) => selected.includes(idx))
                  }
                  onChange={e => {
                    if (e.target.checked) {
                      // Select all filtered products (across all pages, using their index in products)
                      setSelected(filteredProducts.map(fp => products.indexOf(fp)));
                    } else {
                      setSelected([]);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              {visibleFields.map(f => (
                <th key={f.field_name} style={styles.th}>{f.field_name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.length === 0 ? (
              <tr>
                <td colSpan={visibleFields.length + 1} style={{ ...styles.td, textAlign: 'center', color: '#aaa' }}>
                  No products found.
                </td>
              </tr>
            ) : paginatedProducts.map((p, idx) => {
              // Find the global index of this product in filteredProducts
              const globalIdx = products.indexOf(p);
              return (
                <tr
                  key={globalIdx}
                  style={selected.includes(globalIdx) ? styles.trSelected : {}}
                >
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selected.includes(globalIdx)}
                      onChange={() => toggleSelect(globalIdx)}
                    />
                  </td>
                  {visibleFields.map(f => (
                    <td key={f.field_name} style={styles.td}>
                      {p[f.field_name] && String(p[f.field_name]).trim() !== ''
                        ? p[f.field_name]
                        : <span style={{ color: '#aaa' }}>—</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Move pagination here, under the table */}
        <div style={styles.pagination}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={!canPrevPage}
            style={{
              ...styles.navButton,
              ...(canPrevPage ? {} : styles.navButtonDisabled)
            }}
          >
            ◀ Previous
          </button>
          <span style={{ fontSize: 15, color: '#444' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={!canNextPage}
            style={{
              ...styles.navButton,
              ...(canNextPage ? {} : styles.navButtonDisabled)
            }}
          >
            Next ▶
          </button>
        </div>
      </div>
      {/* Remove the old pagination from here */}
      <div style={styles.actionRow}>
        <div style={styles.actionGroup}>
          <button
            onClick={handleBulkDelete}
            disabled={!selected.length}
            style={{
              ...styles.button,
              ...styles.buttonDanger,
              ...(!selected.length ? styles.buttonDisabled : {})
            }}
          >
            Delete Selected
          </button>
          <select
            value={editField}
            onChange={e => setEditField(e.target.value)}
            style={styles.select}
          >
            <option value="">Bulk Edit Field...</option>
            {Object.entries(groupedFields).map(([group, groupFields]) => (
              <optgroup key={group} label={group}>
                {groupFields.map(f => (
                  <option key={f.field_name} value={f.field_name}>{f.field_name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <input
            type="text"
            placeholder="New value"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            style={styles.input}
          />
          <button
            onClick={handleBulkEdit}
            disabled={!selected.length || !editField}
            style={{
              ...styles.button,
              ...(!selected.length || !editField ? styles.buttonDisabled : {})
            }}
          >
            Set For Selected
          </button>
        </div>
      </div>
      {status.message && (
        <div style={{ ...styles.status, color: status.color }}>{status.message}</div>
      )}
      <a href="/" style={styles.backLink}>← Back</a>
    </div>
  );
};

export default ManageProducts;