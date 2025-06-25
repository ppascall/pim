import React, { useState } from 'react';

const UploadCSV = ({
  uploadEndpoint = '/upload_csv',
  onBack
}) => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState({ message: '', color: '' });

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ message: 'Upload successful!', color: 'green' });
        setFile(null);
      } else {
        setStatus({ message: data.message || 'Upload failed.', color: 'red' });
      }
    } catch {
      setStatus({ message: 'Error uploading file.', color: 'red' });
    }
  };

  return (
    <div className="container" style={{ maxWidth: 600, margin: 'auto', padding: 20 }}>
      <h1>Upload CSV File</h1>
      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <input
          type="file"
          name="file"
          accept=".csv"
          required
          onChange={handleFileChange}
          style={{ marginBottom: '1rem' }}
        />
        <br />
        <input
          type="submit"
          value="Upload"
          style={{
            padding: '10px 20px',
            backgroundColor: '#007BFF',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        />
      </form>

      {status.message && (
        <div style={{ color: status.color, marginTop: 10, textAlign: 'center' }}>
          {status.message}
        </div>
      )}

      <button
        onClick={onBack}
        style={{
          marginTop: 20,
          background: 'none',
          border: 'none',
          color: '#666',
          cursor: 'pointer',
          textDecoration: 'underline',
          fontSize: '1rem',
        }}
      >
        Back
      </button>
    </div>
  );
};

export default UploadCSV;