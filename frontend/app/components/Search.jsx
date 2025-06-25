import React, { useState, useEffect } from 'react';

const PAGE_SIZE = 5;

const SearchProducts = ({
  fetchFieldsEndpoint = '/fields',
  fetchProductsEndpoint = '/products',
  searchEndpoint = '/search_products',
  deleteProductEndpoint = '/delete_product'
}) => {
  const [fields, setFields] = useState([]);
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [fieldKey, setFieldKey] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [expandedIndex, setExpandedIndex] = useState(null);
  const [pageIndices, setPageIndices] = useState({});
  const [status, setStatus] = useState({ message: '', color: '' });

  // Fetch fields and all products on mount
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await fetch(fetchFieldsEndpoint);
        const data = await res.json();
        setFields(data.fields ? data.fields.map(f => f.field_name) : []);
      } catch {
        setStatus({ message: 'Failed to fetch fields.', color: 'red' });
      }
    };
    const fetchProducts = async () => {
      try {
        const res = await fetch(fetchProductsEndpoint);
        const data = await res.json();
        // Expecting array of objects with { index, ...fields }
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
    fetchFields();
    fetchProducts();
  }, [fetchFieldsEndpoint, fetchProductsEndpoint]);

  // Toggle product details expand/collapse
  const toggleDetails = (index) => {
    setExpandedIndex(prev => (prev === index ? null : index));
    setPageIndices(prev => ({ ...prev, [index]: 0 }));
  };

  // Pagination handlers
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

  // Render product details table rows for current page
  const renderPage = (product) => {
    const data = product.data || {};
    const keys = Object.keys(data);
    const pageIndex = pageIndices[product.index] || 0;
    const start = pageIndex * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, keys.length);
    const rows = keys.slice(start, end).map(key => (
      <tr key={key}>
        <th>{key}</th>
        <td>{data[key]}</td>
      </tr>
    ));
    return rows;
  };

  // Search handler (calls backend)
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

  // Delete handler (calls backend)
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
        setProducts(products.filter(p => p.index !== productIdx));
        setStatus({ message: 'Product deleted!', color: 'green' });
      } else {
        setStatus({ message: data.message || 'Delete failed.', color: 'red' });
      }
    } catch {
      setStatus({ message: 'Error deleting product.', color: 'red' });
    }
  };

  return (
    <div className="container" style={{ maxWidth: 800, margin: 'auto', padding: 20 }}>
      <h1>Search Products</h1>

      <form onSubmit={handleSearchSubmit} style={{ marginBottom: 20 }}>
        <label>
          Search:&nbsp;
          <input
            type="text"
            name="query"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ marginRight: 10 }}
          />
        </label>

        <label>
          Field:&nbsp;
          <select
            name="field_key"
            value={fieldKey}
            onChange={e => setFieldKey(e.target.value)}
            style={{ marginRight: 10 }}
          >
            <option value="">Any Field</option>
            {fields.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>

        <label>
          Value:&nbsp;
          <input
            type="text"
            name="field_value"
            value={fieldValue}
            onChange={e => setFieldValue(e.target.value)}
            style={{ marginRight: 10 }}
          />
        </label>

        <button type="submit" style={{ padding: '6px 12px' }}>Search</button>
      </form>

      <h2>Results</h2>
      {status.message && (
        <div style={{ color: status.color, marginBottom: 10 }}>{status.message}</div>
      )}
      {products.length === 0 ? (
        <p>No results found.</p>
      ) : (
        products.map(product => {
          const productName = product.data['Product Description EN'] || product.data.product_name || 'Unnamed Product';
          const isExpanded = expandedIndex === product.index;
          return (
            <div key={product.index} className="card" style={{
              border: '1px solid #ddd',
              borderRadius: 6,
              marginBottom: 15,
              padding: 10,
            }}>
              <div
                className="title"
                onClick={() => toggleDetails(product.index)}
                style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1em', color: '#007BFF' }}
              >
                {productName}
              </div>

              {isExpanded && (
                <div className="expandable-content" style={{ marginTop: 10, borderTop: '1px solid #ddd', paddingTop: 10 }}>
                  <table
                    id={`product-table-${product.index}`}
                    style={{ width: '100%', borderCollapse: 'collapse' }}
                  >
                    <tbody>
                      {renderPage(product)}
                    </tbody>
                  </table>

                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => prevPage(product.index)} disabled={(pageIndices[product.index] || 0) === 0}>
                      Prev
                    </button>
                    <button onClick={() => nextPage(product.index)} style={{ marginLeft: 10 }}>
                      Next
                    </button>
                  </div>

                  <form
                    method="get"
                    action="/manage_products"
                    style={{ marginTop: 10 }}
                    onSubmit={e => {
                      e.preventDefault();
                      window.location.href = `/manage_products?product_index=${product.index}`;
                    }}
                  >
                    <input type="hidden" name="product_index" value={product.index} />
                    <input
                      style={{ backgroundColor: '#007BFF', color: 'white', cursor: 'pointer', border: 'none', padding: '8px 12px', borderRadius: 4 }}
                      type="submit"
                      value="Edit"
                    />
                  </form>

                  <form
                    method="post"
                    action="#"
                    className="delete-form"
                    style={{ marginTop: 10 }}
                    onSubmit={e => {
                      e.preventDefault();
                      handleDelete(product.index);
                    }}
                  >
                    <input
                      style={{ backgroundColor: 'red', color: 'white', cursor: 'pointer', border: 'none', padding: '8px 12px', borderRadius: 4 }}
                      type="submit"
                      value="Delete"
                    />
                  </form>
                </div>
              )}
            </div>
          );
        })
      )}

      <a href="/" style={{ display: 'block', marginTop: 20 }}>Back</a>
    </div>
  );
};

export default SearchProducts;