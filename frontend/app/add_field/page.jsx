'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AddFieldPage() {
  const [fieldName, setFieldName] = useState('');
  const [required, setRequired] = useState('No');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState('');
  const [group, setGroup] = useState(''); // <-- NEW
  const [status, setStatus] = useState({ message: '', color: '' });
  const [existingGroups, setExistingGroups] = useState([]);
  const router = useRouter();

  useEffect(() => {
    // Fetch all fields to get existing groups
    fetch('/api/fields')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.fields)) {
          const groups = Array.from(
            new Set(
              data.fields
                .map(f => (f.group || '').trim())
                .filter(g => g)
            )
          );
          setExistingGroups(groups);
        }
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ message: '', color: '' });
    if (!fieldName.trim()) {
      setStatus({ message: 'Field name is required.', color: 'red' });
      return;
    }
    try {
      const res = await fetch('/api/add_field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          field_name: fieldName,
          required,
          description,
          options,
          group, // <-- NEW
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ message: 'Field added!', color: 'green' });
        setFieldName('');
        setRequired('No');
        setDescription('');
        setOptions('');
        setGroup(''); // <-- NEW
      } else {
        setStatus({ message: data.message || 'Failed to add field.', color: 'red' });
      }
    } catch {
      setStatus({ message: 'Error adding field.', color: 'red' });
    }
  };

  return (
    <div style={{
      maxWidth: 500,
      margin: '40px auto',
      background: '#f8fafc',
      borderRadius: 12,
      boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
      padding: 32,
    }}>
      <h1 style={{
        textAlign: 'center',
        fontWeight: 800,
        fontSize: '2rem',
        marginBottom: 28,
        color: '#1a2233'
      }}>
        Add New Field
      </h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Field Name</label>
          <input
            type="text"
            value={fieldName}
            onChange={e => setFieldName(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 16,
              background: '#f9fafd',
              width: '100%',
            }}
            required
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Required</label>
          <select
            value={required}
            onChange={e => setRequired(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 16,
              background: '#f9fafd',
              width: '100%',
            }}
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>
        <div>
          <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 16,
              background: '#f9fafd',
              width: '100%',
              minHeight: 60,
              resize: 'vertical'
            }}
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>
            Options <span style={{ fontWeight: 400, color: '#888', fontSize: 13 }}>(comma separated, e.g. red,blue,green)</span>
          </label>
          <input
            type="text"
            value={options}
            onChange={e => setOptions(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 16,
              background: '#f9fafd',
              width: '100%',
            }}
            placeholder="e.g. red,blue,green"
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>
            Group <span style={{ fontWeight: 400, color: '#888', fontSize: 13 }}>(optional, e.g. Appearance, Logistics)</span>
          </label>
          <input
            list="group-list"
            type="text"
            value={group}
            onChange={e => setGroup(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 16,
              background: '#f9fafd',
              width: '100%',
            }}
            placeholder="e.g. Appearance"
          />
          <datalist id="group-list">
            {existingGroups.map(g => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>
        {status.message && (
          <div style={{ color: status.color, fontWeight: 600, marginBottom: 8 }}>{status.message}</div>
        )}
        <button
          type="submit"
          style={{
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 5,
            padding: '10px 0',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 10
          }}
        >
          Add Field
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            background: '#e0e0e0',
            color: '#333',
            border: 'none',
            borderRadius: 5,
            padding: '10px 0',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 10
          }}
        >
          Back
        </button>
      </form>
    </div>
  );
}