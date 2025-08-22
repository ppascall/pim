"use client";
import { useState, useEffect } from "react";

export default function SearchProducts() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editData, setEditData] = useState({});
  const [fields, setFields] = useState([]);

  useEffect(() => {
    fetch("/api/fields")
      .then(res => res.json())
      .then(data => setFields(data.fields || []));
  }, []);

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

  const groupedFields = React.useMemo(() => {
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
  }, [fields]);

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
      {Object.entries(groupedFields).map(([group, groupFields]) => (
        <div key={group} style={{ marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 16, margin: "8px 0" }}>{group}</div>
          {groupFields.map(field => (
            <div key={field.field_name} style={{ marginBottom: 8 }}>
              <label>
                {field.field_name}:
                {field.options && field.options.trim() ? (
                  <select
                    name={field.field_name}
                    value={editData[field.field_name] || ""}
                    onChange={handleEditChange}
                  >
                    <option value="">Select...</option>
                    {field.options.split(",").map(opt => (
                      <option key={opt.trim()} value={opt.trim()}>
                        {opt.trim()}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.field_name}
                    value={editData[field.field_name] || ""}
                    onChange={handleEditChange}
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