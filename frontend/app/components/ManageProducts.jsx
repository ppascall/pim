import React, { useState, useEffect } from 'react';

const ManageProducts = ({
  fetchProductsEndpoint = '/products',
  fetchFieldsEndpoint = '/fields',
  updateProductEndpoint = '/update_product',
  deleteProductEndpoint = '/delete_product'
}) => {
  const [fields, setFields] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [editData, setEditData] = useState({});
  const [status, setStatus] = useState({ message: '', color: '' });

  // Fetch fields and products on mount
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await fetch(fetchFieldsEndpoint);
        const data = await res.json();
        setFields(data.fields || []);
      } catch {
        setStatus({ message: 'Failed to fetch fields.', color: 'red' });
      }
    };
    const fetchProducts = async () => {
      try {
        const res = await fetch(fetchProductsEndpoint);
        const data = await res.json();
        setProducts(data.products || []);
      } catch {
        setStatus({ message: 'Failed to fetch products.', color: 'red' });
      }
    };
    fetchFields();
    fetchProducts();
  }, [fetchFieldsEndpoint, fetchProductsEndpoint]);

  // Update editData when selected product changes
  useEffect(() => {
    if (selectedIndex !== null && products[selectedIndex]) {
      setEditData(products[selectedIndex]);
    } else {
      setEditData({});
    }
  }, [selectedIndex, products]);

  // Filter products by search input
  const filteredProducts = products.filter(p =>
    (p['Product Description EN'] || p.product_name || 'Unnamed Product')
      .toLowerCase()
      .includes(searchProduct.toLowerCase())
  );

  const handleSelectChange = (e) => {
    const idx = e.target.value !== '' ? parseInt(e.target.value, 10) : null;
    setSelectedIndex(idx);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (selectedIndex !== null) {
      try {
        const res = await fetch(updateProductEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            index: selectedIndex,
            ...editData
          }),
        });
        const data = await res.json();
        if (data.success) {
          const updatedProducts = [...products];
          updatedProducts[selectedIndex] = { ...editData };
          setProducts(updatedProducts);
          setStatus({ message: 'Product updated!', color: 'green' });
        } else {
          setStatus({ message: data.message || 'Update failed.', color: 'red' });
        }
      } catch {
        setStatus({ message: 'Error updating product.', color: 'red' });
      }
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (selectedIndex !== null && window.confirm('Are you sure you want to delete this product?')) {
      try {
        const res = await fetch(deleteProductEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: selectedIndex }),
        });
        const data = await res.json();
        if (data.success) {
          const updatedProducts = products.filter((_, idx) => idx !== selectedIndex);
          setProducts(updatedProducts);
          setSelectedIndex(null);
          setEditData({});
          setStatus({ message: 'Product deleted!', color: 'green' });
        } else {
          setStatus({ message: data.message || 'Delete failed.', color: 'red' });
        }
      } catch {
        setStatus({ message: 'Error deleting product.', color: 'red' });
      }
    }
  };

  return (
    <div className="container" style={{
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f2f2f2',
      margin: 0,
      padding: 0,
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <div style={{
        backgroundColor: '#fff',
        padding: '30px 40px',
        borderRadius: '12px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
        width: '90%',
        maxWidth: '700px',
      }}>
        <h1 style={{ textAlign: 'center', color: '#333' }}>Manage Products</h1>

        <form
          onSubmit={e => e.preventDefault()}
          style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
        >
          <label htmlFor="search_product" style={{ fontWeight: 'bold', color: '#444' }}>
            Search or Select a Product
          </label>
          <input
            id="search_product"
            name="search_product"
            type="text"
            placeholder="Enter product name"
            value={searchProduct}
            onChange={e => setSearchProduct(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '14px',
              marginTop: '5px'
            }}
          />

          <select
            name="product_index"
            id="product_index"
            value={selectedIndex !== null ? selectedIndex : ''}
            onChange={handleSelectChange}
            style={{
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid #ccc',
              fontSize: '14px',
              marginTop: '5px'
            }}
          >
            <option value="">Select a Product</option>
            {filteredProducts.map((p, idx) => {
              // Find original index in products array
              const originalIndex = products.findIndex(
                prod =>
                  (prod['Product Description EN'] || prod.product_name || 'Unnamed Product') ===
                  (p['Product Description EN'] || p.product_name || 'Unnamed Product')
              );
              return (
                <option key={originalIndex} value={originalIndex}>
                  {p['Product Description EN'] || p.product_name || 'Unnamed Product'}
                </option>
              );
            })}
          </select>
        </form>

        <hr />

        {selectedIndex !== null && products[selectedIndex] ? (
          <>
            <h3 style={{ textAlign: 'center', color: '#333' }}>Edit Product</h3>

            <form
              onSubmit={handleUpdate}
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              {fields.map((field) => (
                <label
                  key={field.field_name}
                  style={{ display: 'flex', flexDirection: 'column', fontWeight: 'bold', color: '#444' }}
                >
                  {field.field_name}
                  {field.required === 'True' && (
                    <span style={{ color: 'red', marginLeft: '4px', fontWeight: 'normal' }}>*</span>
                  )}
                  <input
                    type="text"
                    name={field.field_name}
                    value={editData[field.field_name] || ''}
                    required={field.required === 'True'}
                    onChange={handleInputChange}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ccc',
                      fontSize: '14px',
                      marginTop: '5px'
                    }}
                  />
                </label>
              ))}

              <input
                type="submit"
                value="Update Product"
                style={{
                  padding: '12px',
                  fontSize: '16px',
                  backgroundColor: '#007BFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#0056b3'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#007BFF'}
              />
            </form>

            <form
              onSubmit={handleDelete}
              style={{ textAlign: 'center', marginTop: '20px' }}
            >
              <button
                type="submit"
                style={{
                  backgroundColor: 'red',
                  color: 'white',
                  padding: '12px',
                  fontSize: '16px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Delete Product
              </button>
            </form>
          </>
        ) : (
          <p style={{ textAlign: 'center' }}>No product selected.</p>
        )}

        {status.message && (
          <div style={{ color: status.color, marginTop: 10, textAlign: 'center' }}>
            {status.message}
          </div>
        )}

        <a href="/" style={{ display: 'block', marginTop: '20px', textAlign: 'center', color: '#666', textDecoration: 'none' }}>
          ← Back
        </a>
      </div>
    </div>
  );
};

export default ManageProducts;