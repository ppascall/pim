'use client';
import React, { useState } from 'react';
import Link from 'next/link';

const InventoryManager = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const res = await fetch('/api/refresh_products', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRefreshMsg(`Refreshed ${data.count} products from Shopify!`);
      } else {
        setRefreshMsg(`Error: ${data.message}`);
      }
    } catch (err) {
      setRefreshMsg('Error refreshing products.');
    }
    setRefreshing(false);
  };

  return (
    <div className="container">
      <h1 style={{
        fontSize: '2.2rem',
        fontWeight: 700,
        marginBottom: '2.2rem',
        textAlign: 'center',
        letterSpacing: '-1px',
        color: '#222'
      }}>
        Inventory Manager
      </h1>
      <ul style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '18px'
      }}>
        <li>
          <Link href="/add_field" className="button">
            Add a field
          </Link>
        </li>
        <li>
          <Link href="/manage_fields" className="button">
            Manage Fields
          </Link>
        </li>
        <li>
          <Link href="/manage_products" className="button">
            Manage Products
          </Link>
        </li>
        <li>
          <Link href="/add_product" className="button">
            Add Product
          </Link>
        </li>
        <li>
          <Link href="/search" className="button">
            Search Products
          </Link>
        </li>
        <li>
          <Link href="/upload" className="button">
            Upload CSV
          </Link>
        </li>
        <li>
          <Link href="/download" className="button">
            Download CSV
          </Link>
        </li>
        <li>
          <Link href="/ai_theme" className="button">
            AI Theme Descriptions
          </Link>
        </li>
        <li>
          <Link href="/lang" className="button">
            Translate All Products
          </Link>
        </li>
        <li>
          <button
            onClick={handleRefresh}
            className="button"
            disabled={refreshing}
            style={{
              background: '#007BFF',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 18px',
              fontSize: '1rem',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.7 : 1
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh from Shopify'}
          </button>
        </li>
      </ul>
      {refreshMsg && (
        <div style={{ marginTop: 16, textAlign: 'center', color: refreshMsg.startsWith('Error') ? 'red' : 'green' }}>
          {refreshMsg}
        </div>
      )}
    </div>
  );
};

export default InventoryManager;