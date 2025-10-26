"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const UploadCSV = ({
  uploadEndpoint = '/api/upload_csv', // <-- use /api/ for proxy!
  onBack
}) => {
  const router = useRouter();
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

      // Try to parse JSON, but if not, show generic error
      let data = {};
      try {
        data = await res.json();
      } catch {
        setStatus({ message: 'Server error or invalid response.', color: 'red' });
        return;
      }

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
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f4f6f8'
    }}>
    <div className="container" style={{
      maxWidth: 400,
      width: '100%',
      boxSizing: 'border-box',
      margin: '0 auto',
      padding: 32,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
        <h1 style={{ marginBottom: 24 }}>Upload CSV File</h1>
        <form onSubmit={handleSubmit} encType="multipart/form-data">
          <input
            type="file"
            name="file"
            accept=".csv"
            required
            onChange={handleFileChange}
            style={{ marginBottom: '1rem', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
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
              marginBottom: 10
            }}
          />
        </form>

        {status.message && (
          <div style={{ color: status.color, marginTop: 10, textAlign: 'center' }}>
            {status.message}
          </div>
        )}

        <button
          onClick={() => {
            if (typeof onBack === 'function') return onBack();
            router.back();
          }}
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
    </div>
  );
};

export default UploadCSV;