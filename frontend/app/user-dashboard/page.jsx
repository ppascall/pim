"use client";
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:3000/api";
const PAGE_SIZE = 5;
const PRODUCTS_PER_PAGE = 15;

export default function UserDashboard() {
  // Search state
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [searching, setSearching] = useState(false);

  // Edit modal state
  const [fields, setFields] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editStatus, setEditStatus] = useState({ message: "", color: "" });
  const [editFieldPage, setEditFieldPage] = useState(0);

  // Add product state (untouched)
  const [addForm, setAddForm] = useState({});
  const [addStatus, setAddStatus] = useState("");
  const [addAnim, setAddAnim] = useState(false);

  // Pagination state
  const [productPage, setProductPage] = useState(0);

  // Fetch fields and products on mount
  useEffect(() => {
    fetch(`${API_BASE}/fields`)
      .then(res => res.json())
      .then(data => setFields(data.fields ? data.fields.map(f => f.field_name) : []));
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch {
      setProducts([]);
    }
  };

  // Search products
  const handleSearch = async (e) => {
    e && e.preventDefault();
    setSearching(true);
    setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/products`);
        const data = await res.json();
        const allProducts = data.products || [];
        const filtered = allProducts.filter(product =>
          Object.values(product).some(val =>
            String(val).toLowerCase().includes(query.toLowerCase())
          )
        );
        setProducts(filtered);
      } catch {
        setProducts([]);
      }
      setSearching(false);
    }, 400);
  };

  // Edit modal logic
  const openEditModal = (product) => {
    setEditProduct(product);
    setEditFields({ ...product });
    setEditStatus({ message: "", color: "" });
    setEditFieldPage(0);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditProduct(null);
    setEditFields({});
    setEditStatus({ message: "", color: "" });
    setEditFieldPage(0);
  };

  const handleEditSave = async () => {
    if (!editProduct) return;
    try {
      const payload = { ...editFields };
      const res = await fetch(`${API_BASE}/update_product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success || res.ok) {
        setEditStatus({ message: "Product updated!", color: "green" });
        await fetchProducts();
        setTimeout(closeEditModal, 800);
      } else {
        setEditStatus({ message: data.message || "Edit failed.", color: "red" });
      }
    } catch {
      setEditStatus({ message: "Error updating product.", color: "red" });
    }
  };

  // Add product form change (untouched)
  const handleAddChange = (e) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  // Submit new product (untouched)
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddAnim(true);
    const res = await fetch(`${API_BASE}/add_product`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      setAddStatus("✅ Product added!");
      setAddForm({});
      fetchProducts();
    } else {
      setAddStatus("❌ Error adding product.");
    }
    setTimeout(() => setAddAnim(false), 600);
    setTimeout(() => setAddStatus(""), 2000);
  };

  // Pagination logic for products
  const paginatedProducts = products.slice(
    productPage * PRODUCTS_PER_PAGE,
    (productPage + 1) * PRODUCTS_PER_PAGE
  );
  const totalProductPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        <h1 style={styles.heading}>🛒 Product Dashboard</h1>
        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          style={styles.form}
        >
          <div style={styles.formGroup}>
            <label htmlFor="search_query" style={styles.label}>Search:</label>
            <input
              id="search_query"
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={styles.input}
              placeholder="Type to search..."
            />
          </div>
          <button
            type="submit"
            className="button"
            style={styles.button}
            disabled={searching}
          >
            {searching ? (
              <span className="spinner" style={styles.spinner}></span>
            ) : (
              "Search"
            )}
          </button>
        </form>

        {/* Product Names List with Pagination */}
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Product Name</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.map((product, idx) => {
                // Try to get the first image URL from possible fields
                let imageUrl = "";
                if (Array.isArray(product.images) && product.images.length > 0) {
                  imageUrl = product.images[0];
                } else if (product.image_url) {
                  imageUrl = product.image_url;
                } else if (product["Image URL"]) {
                  imageUrl = product["Image URL"];
                } else if (typeof product.images === "string") {
                  // If images is a comma-separated string
                  imageUrl = product.images.split(",")[0];
                }

                const productName =
                  product["Product Description EN"] ||
                  product.product_name ||
                  Object.values(product)[0] ||
                  "Unnamed Product";
                return (
                  <tr key={idx}>
                    <td style={styles.td}>
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt="Product"
                          style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, marginRight: 10, verticalAlign: "middle" }}
                        />
                      )}
                      <span>{productName}</span>
                    </td>
                    <td style={styles.td}>
                      <button
                        className="button"
                        style={styles.button}
                        onClick={() => openEditModal(product)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {products.length === 0 && (
            <p style={{ textAlign: "center", color: "#888", fontSize: 17, marginTop: 32 }}>
              No results found.
            </p>
          )}
          {/* Pagination controls */}
          {products.length > PRODUCTS_PER_PAGE && (
            <div style={{ display: "flex", justifyContent: "center", gap: 12, margin: "18px 0" }}>
              <button
                className="button"
                style={{ ...styles.button, minWidth: 70 }}
                disabled={productPage === 0}
                onClick={() => setProductPage(p => Math.max(0, p - 1))}
              >
                Prev
              </button>
              <span style={{ alignSelf: "center", color: "#444", fontSize: 15 }}>
                Page {productPage + 1} of {totalProductPages}
              </span>
              <button
                className="button"
                style={{ ...styles.button, minWidth: 70 }}
                disabled={productPage + 1 >= totalProductPages}
                onClick={() => setProductPage(p => Math.min(totalProductPages - 1, p + 1))}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editModalOpen && (
          <div style={{
            position: "fixed",
            top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.25)", zIndex: 1000,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <div style={{
              background: "#fff",
              borderRadius: 10,
              padding: 24,
              minWidth: 260,
              width: 340,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}>
              <h2 style={{ marginBottom: 18, fontWeight: 700, fontSize: 20 }}>Edit Product</h2>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleEditSave();
                }}
              >
                {/* Fixed height for fields area */}
                <div style={{
                  minHeight: PAGE_SIZE * 60, // enough for 5 fields
                  maxHeight: PAGE_SIZE * 60,
                  overflow: "hidden",
                  marginBottom: 10,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start"
                }}>
                  {fields
                    .slice(editFieldPage * PAGE_SIZE, (editFieldPage + 1) * PAGE_SIZE)
                    .map(field => (
                      <div key={field} style={{ marginBottom: 14 }}>
                        <label style={{ fontWeight: 600, marginBottom: 6, display: "block" }}>{field}</label>
                        <input
                          type="text"
                          value={editFields[field] ?? ""}
                          onChange={e => setEditFields(f => ({ ...f, [field]: e.target.value }))}
                          style={styles.input}
                        />
                      </div>
                    ))}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "space-between", margin: "10px 0 18px 0" }}>
                  <button
                    type="button"
                    className="button"
                    style={{
                      ...styles.button,
                      minWidth: 70,
                      background: editFieldPage === 0 ? "#ccc" : styles.button.background,
                      color: "#fff",
                      cursor: editFieldPage === 0 ? "not-allowed" : "pointer"
                    }}
                    disabled={editFieldPage === 0}
                    onClick={() => setEditFieldPage(p => Math.max(0, p - 1))}
                  >
                    Prev
                  </button>
                  <span style={{ alignSelf: "center", color: "#444", fontSize: 15 }}>
                    Page {editFieldPage + 1} of {Math.ceil(fields.length / PAGE_SIZE)}
                  </span>
                  <button
                    type="button"
                    className="button"
                    style={{
                      ...styles.button,
                      minWidth: 70,
                      background: (editFieldPage + 1) * PAGE_SIZE >= fields.length ? "#ccc" : styles.button.background,
                      color: "#fff",
                      cursor: (editFieldPage + 1) * PAGE_SIZE >= fields.length ? "not-allowed" : "pointer"
                    }}
                    disabled={(editFieldPage + 1) * PAGE_SIZE >= fields.length}
                    onClick={() => setEditFieldPage(p => Math.min(Math.ceil(fields.length / PAGE_SIZE) - 1, p + 1))}
                  >
                    Next
                  </button>
                </div>
                {editStatus.message && (
                  <div style={{ color: editStatus.color, marginBottom: 12, fontWeight: 600 }}>{editStatus.message}</div>
                )}
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                  <button
                    className="button"
                    style={styles.button}
                    type="submit"
                  >
                    Save
                  </button>
                  <button
                    className="button"
                    style={{ ...styles.button, background: "#888" }}
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

        {/* Add Product */}
        <div
          style={{
            ...styles.card,
            ...styles.fadeIn,
            ...(addAnim ? styles.addAnim : {}),
            marginTop: 40,
          }}
        >
          <h2 style={styles.subheading}>➕ Add a Product</h2>
          <form onSubmit={handleAddSubmit} style={styles.addForm}>
            {fields.map(field => (
              <div key={field} style={styles.addField}>
                <label style={styles.addLabel}>{field}</label>
                <input
                  name={field}
                  value={addForm[field] || ""}
                  onChange={handleAddChange}
                  style={styles.addInput}
                  autoComplete="off"
                />
              </div>
            ))}
            <button type="submit" className="button" style={styles.addBtn}>
              Add Product
            </button>
            {addStatus && (
              <div
                style={{
                  ...styles.statusMsg,
                  color: addStatus.startsWith("✅") ? "#27ae60" : "#e74c3c",
                }}
              >
                {addStatus}
              </div>
            )}
          </form>
        </div>
      </div>
      <style>{`
        .button {
          background: linear-gradient(90deg, #007bff 60%, #00c6ff 100%);
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 10px 22px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
          transition: background 0.2s, transform 0.15s;
        }
        .button:active {
          transform: scale(0.97);
        }
        .button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 3px solid #fff;
          border-top: 3px solid #007bff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .editing {
          box-shadow: 0 0 0 3px #007bff33;
        }
      `}</style>
    </div>
  );
}

const styles = {
  bg: {
    minHeight: "100vh",
    background: "linear-gradient(120deg, #e0eafc 0%, #cfdef3 100%)",
    padding: "0 0 60px 0",
  },
  container: {
    maxWidth: 650,
    margin: "40px auto",
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
    padding: "36px 32px 40px 32px",
    fontFamily: "Inter, Arial, sans-serif",
    animation: "fadeIn 0.7s",
  },
  heading: {
    textAlign: "center",
    fontWeight: 800,
    fontSize: 32,
    marginBottom: 28,
    letterSpacing: "-1px",
    color: "#007bff",
    textShadow: "0 2px 8px #007bff11",
    animation: "slideDown 0.7s",
  },
  subheading: {
    textAlign: "center",
    fontWeight: 700,
    fontSize: 22,
    marginBottom: 18,
    color: "#222",
    letterSpacing: "-0.5px",
  },
  card: {
    background: "#f8faff",
    borderRadius: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    padding: "24px 20px",
    marginBottom: 32,
    animation: "fadeIn 0.7s",
  },
  fadeIn: {
    animation: "fadeIn 0.7s",
  },
  form: {
    marginBottom: 32,
    display: "flex",
    flexDirection: "row",
    gap: 24,
    alignItems: "flex-end",
    flexWrap: "wrap",
    justifyContent: "center",
    background: "#fff",
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    padding: 18,
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
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
  button: {
    background: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 5,
    padding: "10px 22px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    margin: "0 4px",
    minWidth: 90,
    transition: "background 0.2s,opacity 0.2s",
    boxShadow: "none",
    height: 48,
    lineHeight: "20px",
    letterSpacing: 0,
  },
  tableWrap: {
    overflowX: "auto",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    marginBottom: 18,
    marginTop: 18,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 16,
    minWidth: 420,
  },
  th: {
    background: "#f3f4f6",
    color: "#333",
    fontWeight: 800,
    padding: "12px 10px",
    borderBottom: "2px solid #e5e9f2",
    textAlign: "left",
    fontSize: 16,
    letterSpacing: "0.2px",
  },
  td: {
    padding: "10px 10px",
    borderBottom: "1px solid #f0f0f0",
    background: "#fff",
    maxWidth: 220,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 15,
    verticalAlign: "top",
  },
  addForm: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    marginTop: 10,
  },
  addField: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  addLabel: {
    fontWeight: 600,
    color: "#007bff",
    marginBottom: 2,
  },
  addInput: {
    padding: "12px 14px",
    borderRadius: 6,
    border: "1.5px solid #b2c2e0",
    fontSize: 17,
    background: "#fff",
    outline: "none",
    transition: "border 0.2s",
  },
  addBtn: {
    marginTop: 8,
    fontWeight: 600,
    fontSize: 18,
    height: 48,
  },
  statusMsg: {
    marginTop: 10,
    fontWeight: 600,
    fontSize: 16,
    textAlign: "center",
  },  
  addAnim: {
    animation: "addAnim 0.6s forwards",
  },
};