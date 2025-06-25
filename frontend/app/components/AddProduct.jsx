import React, { useState } from 'react';
import Link from 'next/link';

export default function AddProduct({ fields, endpoint = '/add_product' }) {
  const pageSize = 5;
  const totalPages = Math.ceil(fields.length / pageSize);

  const [currentPage, setCurrentPage] = useState(0);
  const [formData, setFormData] = useState(() => {
    // Initialize all fields with empty strings
    const initialData = {};
    fields.forEach(field => {
      initialData[field.field_name] = '';
    });
    return initialData;
  });
  const [status, setStatus] = useState({ message: '', color: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare FormData to send (could also send JSON if backend supports)
    const data = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      data.append(key, value);
    });

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: data,
      });
      const result = await response.json();
      if (result.success) {
        setStatus({ message: 'Product added successfully!', color: 'green' });
        // Reset form
        const resetData = {};
        fields.forEach(field => (resetData[field.field_name] = ''));
        setFormData(resetData);
        setCurrentPage(0);
      } else {
        setStatus({ message: result.message || 'Failed to add product.', color: 'red' });
      }
    } catch {
      setStatus({ message: 'Error occurred. Try again.', color: 'red' });
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 0) setCurrentPage(currentPage - 1);
  };

  // Calculate fields to show on current page
  const startIndex = currentPage * pageSize;
  const visibleFields = fields.slice(startIndex, startIndex + pageSize);

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Add Product</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        {visibleFields.map((field, idx) => (
          <label key={idx} style={styles.label}>
            {field.field_name}
            {field.required === 'True' && <span style={styles.required}>*</span>}
            <input
              type="text"
              name={field.field_name}
              required={field.required === 'True'}
              value={formData[field.field_name]}
              onChange={handleChange}
              style={styles.input}
            />
          </label>
        ))}

        <div style={styles.navButtons}>
          <button type="button" onClick={prevPage} disabled={currentPage === 0} style={styles.navButton}>
            Previous
          </button>
          <button type="button" onClick={nextPage} disabled={currentPage === totalPages - 1} style={styles.navButton}>
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

      <Link href="/" style={styles.link}>← Back</Link>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#fff',
    padding: '30px 40px',
    borderRadius: '12px',
    boxShadow: '0 8px 20px rgba(0, 0, 0, 0.1)',
    width: '90%',
    maxWidth: 700,
    margin: '40px auto',
    fontFamily: 'Arial, sans-serif',
  },
  heading: {
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    fontWeight: 'bold',
    color: '#444',
  },
  required: {
    color: 'red',
    marginLeft: 4,
    fontWeight: 'normal',
  },
  input: {
    padding: 10,
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 14,
    marginTop: 5,
  },
  navButtons: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  navButton: {
    padding: 12,
    fontSize: 16,
    backgroundColor: '#007BFF',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.3s',
    disabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed',
    },
  },
  submit: {
    padding: 12,
    fontSize: 16,
    backgroundColor: '#007BFF',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  pageIndicator: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 14,
    color: '#333',
  },
  status: {
    marginTop: 15,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  link: {
    display: 'block',
    marginTop: 20,
    textAlign: 'center',
    color: '#666',
    textDecoration: 'none',
  },
};