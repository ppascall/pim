'use client';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import Link from 'next/link';

const InventoryManager = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');
  const [errorModal, setErrorModal] = useState(null);
  const router = useRouter();

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const res = await fetch('/api/refresh_products', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRefreshMsg(`Refreshed products! Updated: ${data.updated}, Created: ${data.created}`);
      } else {
        if (data.errors && data.errors.length > 0) {
          const firstError = data.errors[0];
          setErrorModal({
            message: firstError.message,
            productId: firstError.product?.id || firstError.product?.shopify_id || '',
            field: firstError.field || '', // Add this to your backend error if possible!
            type: firstError.type
          });
        } else {
          setRefreshMsg(`Error: ${data.message}`);
        }
      }
    } catch (err) {
      setRefreshMsg('Error refreshing products.');
    }
    setRefreshing(false);
  };

  const handleModalClose = () => setErrorModal(null);

  const handleModalGo = () => {
    if (errorModal) {
      // Redirect to /search with query params for edit and field
      let url = '/search';
      const params = [];
      if (errorModal.productId) params.push(`edit=${encodeURIComponent(errorModal.productId)}`);
      if (errorModal.field) params.push(`field=${encodeURIComponent(errorModal.field)}`);
      if (params.length) url += '?' + params.join('&');
      router.push(url);
      setErrorModal(null);
    }
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
      {/* Custom error modal */}
      {errorModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.25)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 10, padding: 32, minWidth: 320, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            textAlign: 'center'
          }}>
            <h2 style={{ color: '#d32f2f', marginBottom: 12 }}>Product Sync Error</h2>
            <div style={{ color: '#333', marginBottom: 18, fontSize: 16 }}>
              {errorModal.message}
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
              <button className="button" style={{ background: '#1976d2', color: '#fff' }} onClick={handleModalGo}>
                Go to Problem
              </button>
              <button className="button" style={{ background: '#888', color: '#fff' }} onClick={handleModalClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryManager;