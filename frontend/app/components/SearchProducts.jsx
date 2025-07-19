"use client";
import { useState } from "react";

export default function SearchProducts() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editData, setEditData] = useState({});

  const handleSearch = async () => {
    const res = await fetch("http://localhost:8000/products");
    const data = await res.json();
    const filtered = data.products.filter(product =>
      Object.values(product).some(val =>
        String(val).toLowerCase().includes(query.toLowerCase())
      )
    );
    setResults(filtered);
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditData({ ...results[index] });
  };

  const handleEditChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const saveEdit = async () => {
    await fetch("http://localhost:8000/update_product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editData, index: editingIndex }),
    });
    setEditingIndex(null);
    handleSearch();
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Search products..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 12 }}
      />
      <button onClick={handleSearch} className="button">Search</button>
      <ul>
        {results.map((product, idx) => (
          <li key={idx} style={{ margin: "16px 0", border: "1px solid #eee", padding: 12 }}>
            {editingIndex === idx ? (
              <div>
                {Object.keys(product).map(key => (
                  <div key={key}>
                    <label>{key}: </label>
                    <input
                      name={key}
                      value={editData[key] || ""}
                      onChange={handleEditChange}
                    />
                  </div>
                ))}
                <button onClick={saveEdit} className="button">Save</button>
                <button onClick={() => setEditingIndex(null)} className="button">Cancel</button>
              </div>
            ) : (
              <div>
                {Object.entries(product).map(([k, v]) => (
                  <div key={k}><b>{k}:</b> {v}</div>
                ))}
                <button onClick={() => startEdit(idx)} className="button">Edit</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}