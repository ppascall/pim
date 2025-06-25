import React, { useState } from 'react';

export default function AddField({ endpoint = '/add_field' }) { // Added endpoint prop with default
  const [fieldName, setFieldName] = useState('');
  const [required, setRequired] = useState('no');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState({ message: '', color: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('field_name', fieldName);
    formData.append('required', required);
    formData.append('description', description);

    try {
      const response = await fetch(endpoint, { // Use endpoint prop here
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setStatus({ message: 'Field added successfully!', color: 'green' });
        setFieldName('');
        setRequired('no');
        setDescription('');
      } else {
        setStatus({ message: data.message || 'Failed to add field.', color: 'red' });
      }
    } catch {
      setStatus({ message: 'Error occurred. Try again.', color: 'red' });
    }
  };


  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Add New Field</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Field Name
          <input
            type="text"
            name="field_name"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            required
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Required?
          <select
            name="required"
            value={required}
            onChange={(e) => setRequired(e.target.value)}
            style={styles.select}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </label>

        <label style={styles.label}>
          Description
          <textarea
            name="description"
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={styles.textarea}
          />
        </label>

        <input type="submit" value="Add Field" style={styles.submit} />
      </form>

      {status.message && (
        <div style={{ ...styles.status, color: status.color }}>{status.message}</div>
      )}

      <a href="/manage_fields" style={styles.link}>
        ← Back to Manage Fields
      </a>
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
    maxWidth: 600,
    margin: '40px auto',
    fontFamily: 'Arial, sans-serif',
  },
  heading: {
    textAlign: 'center',
    marginBottom: 25,
    color: '#333',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 15,
  },
  label: {
    fontWeight: 'bold',
    color: '#444',
    display: 'flex',
    flexDirection: 'column',
  },
  input: {
    padding: 10,
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #ccc',
    marginTop: 6,
  },
  select: {
    padding: 10,
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #ccc',
    marginTop: 6,
  },
  textarea: {
    padding: 10,
    fontSize: 14,
    borderRadius: 6,
    border: '1px solid #ccc',
    marginTop: 6,
  },
  submit: {
    padding: 12,
    fontSize: 16,
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
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
