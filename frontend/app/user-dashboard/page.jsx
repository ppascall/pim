"use client";
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:8000";

export default function UserDashboard() {
  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Edit state
  const [editingIdx, setEditingIdx] = useState(null);
  const [editData, setEditData] = useState({});
  const [editAnim, setEditAnim] = useState(false);

  // Add product state
  const [fields, setFields] = useState([]);
  const [addForm, setAddForm] = useState({});
  const [addStatus, setAddStatus] = useState("");
  const [addAnim, setAddAnim] = useState(false);

  // Fetch fields for add form on mount
  useEffect(() => {
    fetch(`${API_BASE}/fields`)
      .then(res => res.json())
      .then(data => setFields(data.fields || []));
  }, []);

  // Search products
  const handleSearch = async () => {
    setSearching(true);
    setTimeout(async () => {
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      const products = data.products || [];
      const filtered = products.filter(product =>
        Object.values(product).some(val =>
          String(val).toLowerCase().includes(query.toLowerCase())
        )
      );
      setResults(filtered);
      setSearching(false);
    }, 400); // Animation delay
  };

  // Start editing a product
  const startEdit = (idx) => {
    setEditingIdx(idx);
    setEditData({ ...results[idx] });
    setEditAnim(true);
    setTimeout(() => setEditAnim(false), 400);
  };

  // Handle edit input change
  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  // Save edited product
  const saveEdit = async () => {
    setEditAnim(true);
    await fetch(`${API_BASE}/update_product`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    setTimeout(() => {
      setEditingIdx(null);
      setEditAnim(false);
      handleSearch();
    }, 400);
  };

  // Add product form change
  const handleAddChange = (e) => {
    setAddForm({ ...addForm, [e.target.name]: e.target.value });
  };

  // Submit new product
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
      handleSearch();
    } else {
      setAddStatus("❌ Error adding product.");
    }
    setTimeout(() => setAddAnim(false), 600);
    setTimeout(() => setAddStatus(""), 2000);
  };

  return (
    <div style={styles.bg}>
      <div style={styles.container}>
        <h1 style={styles.heading}>🛒 Product Dashboard</h1>
        {/* Search Bar */}
        <div style={{ ...styles.card, ...styles.fadeIn }}>
          <div style={styles.searchBarWrap}>
            <input
              type="text"
              placeholder="🔍 Search products..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={styles.searchBar}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="button"
              style={styles.searchBtn}
              disabled={searching}
            >
              {searching ? (
                <span className="spinner" style={styles.spinner}></span>
              ) : (
                "Search"
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        <ul style={styles.resultsList}>
          {results.map((product, idx) => (
            <li
              key={idx}
              style={{
                ...styles.resultItem,
                ...(editingIdx === idx && editAnim ? styles.editAnim : {}),
              }}
              className={editingIdx === idx ? "editing" : ""}
            >
              {editingIdx === idx ? (
                <div style={styles.editForm}>
                  {Object.keys(product).map(key => (
                    <div key={key} style={styles.editField}>
                      <label style={styles.editLabel}>{key}:</label>
                      <input
                        name={key}
                        value={editData[key] || ""}
                        onChange={handleEditChange}
                        style={styles.editInput}
                      />
                    </div>
                  ))}
                  <div style={styles.editBtns}>
                    <button onClick={saveEdit} className="button" style={styles.saveBtn}>
                      Save
                    </button>
                    <button
                      onClick={() => setEditingIdx(null)}
                      className="button"
                      style={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={styles.productView}>
                  {Object.entries(product).map(([k, v]) => (
                    <div key={k} style={styles.productField}>
                      <b>{k}:</b> <span>{v}</span>
                    </div>
                  ))}
                  <button
                    onClick={() => startEdit(idx)}
                    className="button"
                    style={styles.editBtn}
                  >
                    Edit
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>

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
              <div key={field.field_name} style={styles.addField}>
                <label style={styles.addLabel}>{field.field_name}</label>
                <input
                  name={field.field_name}
                  value={addForm[field.field_name] || ""}
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
  searchBarWrap: {
    flexDirection: "column",
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 0,
  },
  searchBar: {
    flex: 1,
    padding: "14px 180px",
    borderRadius: 8,
    border: "1.5px solid #b2c2e0",
    fontSize: 18, // Increased font size
    height: 48,   // Increased height
    background: "#fff",
    transition: "border 0.2s",
    outline: "none",
  },
  searchBtn: {
    minWidth: 90,
    fontSize: 16,
    fontWeight: 600,
  },
  resultsList: {
    listStyle: "none",
    padding: 0,
    margin: "0 0 32px 0",
    animation: "fadeIn 0.7s",
  },
  resultItem: {
    background: "#f4f8ff",
    borderRadius: 10,
    marginBottom: 18,
    padding: "18px 18px 12px 18px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    transition: "box-shadow 0.3s, background 0.3s",
    position: "relative",
    animation: "slideUp 0.5s",
  },
  productView: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 8,
    animation: "fadeIn 0.5s",
  },
  productField: {
    fontSize: 15,
    color: "#222",
    marginBottom: 2,
  },
  editBtn: {
    marginTop: 10,
    background: "linear-gradient(90deg, #00c6ff 60%, #007bff 100%)",
    color: "#fff",
    fontWeight: 600,
    border: "none",
    borderRadius: 6,
    padding: "8px 18px",
    fontSize: 15,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    transition: "background 0.2s, transform 0.15s",
  },
  editForm: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    animation: "fadeIn 0.4s",
  },
  editField: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  editLabel: {
    minWidth: 80,
    fontWeight: 600,
    color: "#007bff",
  },
  editInput: {
    flex: 1,
    padding: "8px 10px",
    borderRadius: 6,
    border: "1.5px solid #b2c2e0",
    fontSize: 15,
    background: "#fff",
    outline: "none",
    transition: "border 0.2s",
  },
  editBtns: {
    display: "flex",
    gap: 12,
    marginTop: 8,
  },
  saveBtn: {
    background: "linear-gradient(90deg, #27ae60 60%, #00c6ff 100%)",
  },
  cancelBtn: {
    background: "linear-gradient(90deg, #e74c3c 60%, #ff7675 100%)",
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
    padding: "10px 12px",
    borderRadius: 6,
    border: "1.5px solid #b2c2e0",
    fontSize: 15,
    background: "#fff",
    outline: "none",
    transition: "border 0.2s",
  },
  addBtn: {
    marginTop: 8,
    fontWeight: 600,
    fontSize: 16,
  },
  statusMsg: {
    marginTop: 10,
    fontWeight: 600,
    fontSize: 14,
    textAlign: "center",
  },
  editAnim: {
    animation: "editAnim 0.4s forwards",
  },
  addAnim: {
    animation: "addAnim 0.6s forwards",
  },
  "@keyframes fadeIn": {
    "0%": {
      opacity: 0,
      transform: "translateY(10px)",
    },
    "100%": {
      opacity: 1,
      transform: "translateY(0)",
    },
  },
  "@keyframes slideDown": {
    "0%": {
      opacity: 0,
      transform: "translateY(-10px)",
    },
    "100%": {
      opacity: 1,
      transform: "translateY(0)",
    },
  },
  "@keyframes spin": {
    to: {
      transform: "rotate(360deg)",
    },
  },
  "@keyframes editAnim": {
    "0%": {
      backgroundColor: "#fff",
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    },
    "100%": {
      backgroundColor: "#e1f5fe",
      boxShadow: "0 4px 16px rgba(0,123,255,0.2)",
    },
  },
  "@keyframes addAnim": {
    "0%": {
      opacity: 0,
      transform: "scale(0.95)",
    },
    "100%": {
      opacity: 1,
      transform: "scale(1)",
    },
  },
};