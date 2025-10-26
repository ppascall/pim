'use client';
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function AIThemePage() {
  const [theme, setTheme] = useState('');
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const eventSourceRef = useRef(null);
  const router = useRouter();

  const handleTheme = (e) => {
    e.preventDefault();
    if (!theme.trim()) {
      setStatus('Please enter a theme.');
      return;
    }
    setLoading(true);
    setStatus('Starting...');
    setProgress(0);
    setTotal(0);

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Use GET with query param
    eventSourceRef.current = new window.EventSource(`/api/theme_descriptions?theme=${encodeURIComponent(theme)}`);

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data.progress);
        setTotal(data.total);
        if (data.status === 'complete') {
          setStatus('Done!');
          setLoading(false);
          eventSourceRef.current.close();
        } else if (data.status === 'error') {
          setStatus('Error on one or more products.');
        } else if (data.status === 'skipped') {
          setStatus('Some products skipped (no description).');
        } else {
          setStatus(`Processing ${data.progress} of ${data.total}...`);
        }
      } catch {
        setStatus('Error parsing progress.');
      }
    };

    eventSourceRef.current.onerror = () => {
      setStatus('Connection lost or error occurred.');
      setLoading(false);
      eventSourceRef.current.close();
    };
  };

  const percent = total ? Math.round((progress / total) * 100) : 0;

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
        AI Theme Product Descriptions
      </h1>
      <form onSubmit={handleTheme} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label style={{ fontWeight: 600, marginBottom: 6, display: 'block' }}>
            Theme (e.g. Christmas, Summer, Black Friday)
          </label>
          <input
            type="text"
            value={theme}
            onChange={e => setTheme(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              border: '1px solid #d1d5db',
              fontSize: 16,
              background: '#f9fafd',
              width: '100%',
            }}
            disabled={loading}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: loading ? '#aaa' : '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 5,
            padding: '10px 0',
            fontSize: 16,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: 10
          }}
        >
          {loading ? 'Generating...' : 'Generate Themed Descriptions'}
        </button>
      </form>
      {loading && (
        <div style={{ marginTop: 18 }}>
          <div style={{
            height: 18,
            width: '100%',
            background: '#e0e0e0',
            borderRadius: 8,
            overflow: 'hidden',
            marginBottom: 8
          }}>
            <div style={{
              width: `${percent}%`,
              height: '100%',
              background: '#1976d2',
              transition: 'width 0.3s'
            }} />
          </div>
          <div style={{ fontWeight: 600, textAlign: 'center' }}>
            {status} ({progress}/{total})
          </div>
        </div>
      )}
      {!loading && status && (
        <div style={{
          marginTop: 18,
          color: status.startsWith('Done!') ? 'green' : '#d32f2f',
          fontWeight: 600,
          textAlign: 'center'
        }}>
          {status}
        </div>
      )}
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
    </div>
  );
}