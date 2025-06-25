import React, { useState, useEffect } from 'react';

const ManageFields = ({
  fetchEndpoint = '/fields',
  updateEndpoint = '/update_field',
  deleteEndpoint = '/delete_field'
}) => {
  const [fields, setFields] = useState([]);
  const [searchField, setSearchField] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [editData, setEditData] = useState({ field_name: '', description: '', required: 'False' });
  const [status, setStatus] = useState({ message: '', color: '' });

  // Fetch fields on mount
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await fetch(fetchEndpoint);
        const data = await res.json();
        setFields(data.fields || []);
      } catch {
        setStatus({ message: 'Failed to fetch fields.', color: 'red' });
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
      });
    } else {
      setSelectedField(null);
      setEditData({ field_name: '', description: '', required: 'False' });
    }
  }, [selectedIndex, fields]);

  const filteredFields = fields.filter(f =>
    f.field_name.toLowerCase().includes(searchField.toLowerCase())
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
        const res = await fetch(updateEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            index: selectedIndex,
            ...editData
          }),
        });
        const data = await res.json();
        if (data.success) {
          // Update local fields state
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
        const res = await fetch(deleteEndpoint, {
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
    <div className="container">
      <h1>Manage Custom Fields</h1>

      <form onSubmit={e => e.preventDefault()}>
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
          <h3>Edit Field: {selectedField.field_name}</h3>
          <form onSubmit={handleUpdate}>
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

            <br />
            <button type="submit">Update Field</button>
          </form>

          <form onSubmit={handleDelete}>
            <button
              type="submit"
              style={{ backgroundColor: 'red', color: 'white', marginTop: '10px' }}
            >
              Delete Field
            </button>
          </form>
        </>
      ) : (
        <p>No field selected yet.</p>
      )}

      {status.message && (
        <div style={{ color: status.color, marginTop: 10, textAlign: 'center' }}>
          {status.message}
        </div>
      )}

      <br />
      <a href="/">Back</a>
    </div>
  );
};

export default ManageFields;