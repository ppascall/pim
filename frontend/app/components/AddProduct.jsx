"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function AddProduct({
  fields: initialFields,
  endpoint = "/api/add_product",
  fetchFieldsEndpoint = "/api/fields",
}) {
  const [fields, setFields] = useState(initialFields || []);
  const [loading, setLoading] = useState(
    !initialFields || initialFields.length === 0
  );
  const [primaryTitle, setPrimaryTitle] = useState("");
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState({ message: "", color: "" });
  const [expandedGroups, setExpandedGroups] = useState({});

  // Fetch fields if not provided
  useEffect(() => {
    if (!initialFields || initialFields.length === 0) {
      setLoading(true);
      fetch(fetchFieldsEndpoint)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.fields) && data.fields.length > 0) {
            setFields(data.fields);
            // Initialize formData for all fields
            const initialData = {};
            data.fields.forEach((field) => {
              initialData[field.field_name] = "";
            });
            setFormData(initialData);
          } else {
            setFields([]);
            setStatus({ message: "No fields found.", color: "red" });
          }
        })
        .catch(() => setStatus({ message: "Failed to load fields.", color: "red" }))
        .finally(() => setLoading(false));
    } else {
      // Initialize formData for all fields
      const initialData = {};
      initialFields.forEach((field) => {
        initialData[field.field_name] = "";
      });
      setFormData(initialData);
      setLoading(false);
    }
  }, [initialFields, fetchFieldsEndpoint]);

  // Group fields by group property, default to 'Ungrouped'
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePrimaryTitleChange = (e) => {
    setPrimaryTitle(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = { ...formData, primary_title: primaryTitle };
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      const result = await response.json();
      if (result.success) {
        setStatus({ message: "Product added successfully!", color: "green" });
        const resetData = {};
        fields.forEach((field) => (resetData[field.field_name] = ""));
        setFormData(resetData);
        setPrimaryTitle("");
        setExpandedGroups({});
      } else {
        setStatus({
          message: result.message || "Failed to add product.",
          color: "red",
        });
      }
    } catch {
      setStatus({ message: "Error occurred. Try again.", color: "red" });
    }
  };

  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h1 style={styles.heading}>Add Product</h1>
        <div
          style={{
            textAlign: "center",
            margin: 40,
            fontSize: 18,
          }}
        >
          Loading fields...
        </div>
        <Link href="/" style={styles.link}>
          ← Back
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Add Product</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Primary Title <span style={styles.required}>*</span>
          <input
            type="text"
            name="primary_title"
            required
            value={primaryTitle}
            onChange={handlePrimaryTitleChange}
            style={styles.input}
            placeholder="Enter main product title"
          />
        </label>

        {/* Grouped fields */}
        {Object.entries(groupedFields).map(([group, groupFields]) => (
          <div key={group} style={styles.groupBlock}>
            <div
              style={styles.groupHeader}
              onClick={() => toggleGroup(group)}
              tabIndex={0}
              role="button"
              aria-expanded={!!expandedGroups[group]}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") toggleGroup(group);
              }}
            >
              <span style={styles.groupTitle}>
                {expandedGroups[group] ? "▼" : "▶"} {group}
              </span>
              <span style={styles.groupCount}>({groupFields.length})</span>
            </div>
            {expandedGroups[group] && (
              <div style={styles.groupFields}>
                {groupFields.map((field, idx) => (
                  <label key={field.field_name} style={styles.label}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>
                        {field.field_name}
                        {field.required === "True" && (
                          <span style={styles.required}>*</span>
                        )}
                      </span>
                      <button
                        type="button"
                        title="Not Applicable"
                        style={styles.iconButton}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            [field.field_name]: "NA",
                          }))
                        }
                      >
                        NA
                      </button>
                      <button
                        type="button"
                        title="Missing Data"
                        style={styles.iconButton}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            [field.field_name]: "MD",
                          }))
                        }
                      >
                        MD
                      </button>
                    </div>
                    {/* Render select if options are present, else input */}
                    {field.options && field.options.trim() ? (
                      <select
                        name={field.field_name}
                        required={field.required === "True"}
                        value={formData[field.field_name] || ""}
                        onChange={handleChange}
                        style={styles.input}
                      >
                        <option value="">Select...</option>
                        {field.options.split(",").map((opt) => (
                          <option key={opt.trim()} value={opt.trim()}>
                            {opt.trim()}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name={field.field_name}
                        required={field.required === "True"}
                        value={formData[field.field_name] || ""}
                        onChange={handleChange}
                        style={styles.input}
                      />
                    )}
                    {field.description && (
                      <div
                        style={{
                          color: "#888",
                          fontSize: 13,
                          marginTop: 2,
                        }}
                      >
                        {field.description}
                      </div>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <input type="submit" value="Add Product" style={styles.submit} />
      </form>

      {status.message && (
        <div style={{ ...styles.status, color: status.color }}>
          {status.message}
        </div>
      )}

      <Link href="/" style={styles.link}>
        ← Back
      </Link>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: "#fff",
    padding: "30px 40px",
    borderRadius: "12px",
    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)",
    width: "90%",
    maxWidth: 700,
    margin: "40px auto",
    fontFamily: "Arial, sans-serif",
  },
  heading: {
    textAlign: "center",
    marginBottom: 30,
    color: "#333",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  label: {
    display: "flex",
    flexDirection: "column",
    fontWeight: "bold",
    color: "#444",
    marginBottom: 12,
  },
  required: {
    color: "red",
    marginLeft: 4,
    fontWeight: "normal",
  },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    marginTop: 5,
  },
  submit: {
    padding: 12,
    fontSize: 16,
    backgroundColor: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background-color 0.3s",
    marginTop: 16,
  },
  status: {
    marginTop: 15,
    textAlign: "center",
    fontWeight: "bold",
  },
  link: {
    display: "block",
    marginTop: 20,
    textAlign: "center",
    color: "#666",
    textDecoration: "none",
  },
  iconButton: {
    background: "#f4f4f4",
    border: "1px solid #ccc",
    borderRadius: 4,
    cursor: "pointer",
    padding: "2px 4px",
    fontSize: 13,
    marginLeft: 2,
    marginRight: 2,
    color: "#555",
    transition: "background 0.2s, color 0.2s",
    display: "flex",
    alignItems: "center",
    height: 22,
    width: 22,
    justifyContent: "center",
  },
  groupBlock: {
    border: "1px solid #e0e0e0",
    borderRadius: 8,
    marginBottom: 18,
    background: "#f8fafc",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
  },
  groupHeader: {
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
  },
  groupTitle: {
    fontWeight: 700,
    color: "#1976d2",
    fontSize: 17,
  },
  groupCount: {
    fontWeight: 400,
    color: "#888",
    fontSize: 15,
    marginLeft: 8,
  },
  groupFields: {
    padding: "18px 18px 8px 18px",
    background: "#fff",
    borderRadius: "0 0 8px 8px",
  },
};