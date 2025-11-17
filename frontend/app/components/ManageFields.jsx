"use client";
import React, { useState, useEffect } from 'react';

import { apiUrl } from '../lib/api';

const ManageFields = ({
  fetchEndpoint = '/api/fields',
  updateEndpoint = '/api/update_field',
  deleteEndpoint = '/api/delete_field'
}) => {
  const [fields, setFields] = useState([]);
  const [searchField, setSearchField] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [editData, setEditData] = useState({ field_name: '', description: '', required: 'False', options: '', group: '' }); // <-- add group
  const [status, setStatus] = useState({ message: '', color: '' });
  const [existingGroups, setExistingGroups] = useState([]); // <-- add state for groups

  // Fetch fields and parse them like in Search.jsx
  useEffect(() => {
    const fetchFields = async () => {
      try {
  const res = await fetch(apiUrl(fetchEndpoint));
        const data = await res.json();
        // Debug: log raw payload for diagnosing empty list issues
        // Remove once verified
        console.log('[ManageFields] fetched fields payload:', data);
        if (Array.isArray(data.fields)) {
          setFields(
            data.fields
              .filter(f => f && (f.field_name || f.description || f.required))
              .map(f => ({
                field_name: f.field_name || '',
                description: f.description || '',
                required: f.required || 'False',
                options: f.options || '',
                group: f.group || '', // <-- add group
              }))
          );
          // Extract unique groups for dropdown
          const groups = Array.from(
            new Set(
              data.fields
                .map(f => (f.group || '').trim())
                .filter(g => g)
            )
          );
          setExistingGroups(groups);
        } else {
          setFields([]);
          setExistingGroups([]);
        }
      } catch {
        setStatus({ message: 'Failed to fetch fields.', color: 'red' });
        setExistingGroups([]);
      }
    };
    fetchFields();
  }, [fetchEndpoint]);

  useEffect(() => {
    if (selectedIndex !== null && fields[selectedIndex]) {
      setSelectedField(fields[selectedIndex]);
      const f = fields[selectedIndex];
      setEditData({
        field_name: f.field_name,
        description: f.description || '',
        required: f.required || 'False',
        options: f.options || '',
        group: f.group || '', // <-- add group
      });
    } else {
      setSelectedField(null);
      setEditData({ field_name: '', description: '', required: 'False', options: '', group: '' });
    }
  }, [selectedIndex, fields]);

  const filteredFields = fields.filter(f =>
    (f.field_name || '').toLowerCase().includes(searchField.toLowerCase())
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
  const res = await fetch(apiUrl(updateEndpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            index: selectedIndex,
            ...editData
          }),
        });
        const data = await res.json();
        if (data.success) {
          const updatedFields = [...fields];
          updatedFields[selectedIndex] = { ...editData };
          setFields(updatedFields);
          setStatus({ message: 'Field updated!', color: 'green' });
        } else {
          setStatus({ message: data.message || 'Update failed.', color: 'red' });
        }
      } catch {
        setStatus({ message: 'Error updating field.', color: 'red' });
      }
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    if (selectedIndex !== null && window.confirm('Are you sure you want to delete this field?')) {
      try {
  const res = await fetch(apiUrl(deleteEndpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: selectedIndex }),
        });
        const data = await res.json();
        if (data.success) {
          const updatedFields = fields.filter((_, idx) => idx !== selectedIndex);
          setFields(updatedFields);
          setSelectedIndex(null);
          setStatus({ message: 'Field deleted!', color: 'green' });
        } else {
          setStatus({ message: data.message || 'Delete failed.', color: 'red' });
        }
      } catch {
        setStatus({ message: 'Error deleting field.', color: 'red' });
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f4f6f8'
    }}>
      <div className="container" style={{ width: 420, padding: 32 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 24, fontWeight: 700, fontSize: '2rem' }}>
          Manage Custom Fields
        </h1>

        <form onSubmit={e => e.preventDefault()} style={{ marginBottom: 18 }}>
          <label htmlFor="search_field">Search or Select a Field:</label>
          <input
            id="search_field"
            name="search_field"
            placeholder="Enter field name"
            value={searchField}
            onChange={(e) => setSearchField(e.target.value)}
          />

          <select
            name="field_index"
            id="field_index"
            value={selectedIndex !== null ? selectedIndex : ''}
            onChange={handleSelectChange}
          >
            <option value="">Select a Field</option>
            {filteredFields.map((field, idx) => {
              const originalIndex = fields.findIndex(f => f.field_name === field.field_name);
              return (
                <option key={originalIndex} value={originalIndex}>
                  {field.field_name}
                </option>
              );
            })}
          </select>
        </form>

        {selectedField ? (
          <>
            <h3 style={{ textAlign: 'center', margin: '18px 0 10px 0', fontWeight: 600 }}>
              Edit Field: {selectedField.field_name}
            </h3>
            <form onSubmit={handleUpdate} style={{ marginBottom: 10 }}>
              <input type="hidden" name="field_index" value={selectedIndex} />

              <label htmlFor="field_name">Field Name:</label>
              <input
                id="field_name"
                name="field_name"
                type="text"
                value={editData.field_name}
                onChange={handleInputChange}
                required
              />

              <label htmlFor="description">Description:</label>
              <input
                id="description"
                name="description"
                type="text"
                value={editData.description}
                onChange={handleInputChange}
              />

              <label htmlFor="required">Required:</label>
              <select
                id="required"
                name="required"
                value={editData.required}
                onChange={handleInputChange}
              >
                <option value="True">Yes</option>
                <option value="False">No</option>
              </select>

              <label htmlFor="options">
                Options <span style={{ fontWeight: 400, color: '#888', fontSize: 13 }}>(comma separated, e.g. red,blue,green)</span>
              </label>
              <input
                id="options"
                name="options"
                type="text"
                value={editData.options}
                onChange={handleInputChange}
                placeholder="e.g. red,blue,green"
              />

              <label htmlFor="group">
                Group <span style={{ fontWeight: 400, color: '#888', fontSize: 13 }}>(optional, e.g. Appearance, Logistics)</span>
              </label>
              <input
                id="group"
                name="group"
                type="text"
                list="group-list"
                value={editData.group}
                onChange={handleInputChange}
                placeholder="e.g. Appearance"
              />
              <datalist id="group-list">
                {existingGroups.map(g => (
                  <option key={g} value={g} />
                ))}
              </datalist>

              <button type="submit" className="button" style={{ marginTop: 10 }}>
                Update Field
              </button>
            </form>

            <form onSubmit={handleDelete}>
              <button
                type="submit"
                className="button button-danger"
                style={{ marginTop: 0 }}
              >
                Delete Field
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', marginTop: 24, color: '#555' }}>
            {fields.length === 0 ? (
              <p>No fields found. Add one via the Add Field page or refresh categories from Shopify.</p>
            ) : (
              <p style={{ color: '#888' }}>No field selected yet.</p>
            )}
          </div>
        )}

        {status.message && (
          <div style={{ color: status.color, marginTop: 14, textAlign: 'center' }}>
            {status.message}
          </div>
        )}

        <a href="/" className="button" style={{ marginTop: 28 }}>
          ← Back
        </a>
      </div>
    </div>
  );
};

export default ManageFields;