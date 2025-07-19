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
  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState({});
  const [status, setStatus] = useState({ message: "", color: "" });

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
        setCurrentPage(0);
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

  const nextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(fields.length / pageSize));
  const startIndex = currentPage * pageSize;
  const visibleFields = fields.slice(startIndex, startIndex + pageSize);

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

        {visibleFields.map((field, idx) => (
          <label key={idx} style={styles.label}>
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
            <input
              type="text"
              name={field.field_name}
              required={field.required === "True"}
              value={formData[field.field_name] || ""}
              onChange={handleChange}
              style={styles.input}
            />
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

        <div style={styles.navButtons}>
          <button
            type="button"
            onClick={prevPage}
            disabled={currentPage === 0}
            style={{
              ...styles.navButton,
              ...(currentPage === 0 ? styles.navButtonDisabled : {}),
            }}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={nextPage}
            disabled={currentPage === totalPages - 1}
            style={{
              ...styles.navButton,
              ...(currentPage === totalPages - 1 ? styles.navButtonDisabled : {}),
            }}
          >
            Next
          </button>
        </div>

        <input type="submit" value="Add Product" style={styles.submit} />
      </form>

      <div style={styles.pageIndicator}>
        Page {currentPage + 1} of {totalPages}
      </div>

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
  navButtons: {
    display: "flex",
    justifyContent: "space-between",
  },
  navButton: {
    padding: 12,
    fontSize: 16,
    backgroundColor: "#007BFF",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    transition: "background-color 0.3s",
  },
  navButtonDisabled: {
    backgroundColor: "#ccc",
    cursor: "not-allowed",
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
  pageIndicator: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
    color: "#333",
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
};