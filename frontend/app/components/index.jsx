'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BackButton from './BackButton';

export default function InventoryManager() {
  const router = useRouter();

  // ui
  const [statusMsg, setStatusMsg] = useState('');
  const [useShopify, setUseShopify] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem('useShopify');
      setUseShopify(v === 'true');
    } catch (e) {
      setUseShopify(false);
    }
  }, []);

  const toggleShopify = async () => {
    const next = !useShopify;
    setUseShopify(next);
    try {
      localStorage.setItem('useShopify', next ? 'true' : 'false');
    } catch {}
    try {
      await fetch('/api/set_use_shopify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ use_shopify: next }),
      });
      setStatusMsg(next ? 'Shopify sync enabled' : 'Shopify sync disabled');
    } catch {
      setStatusMsg(next ? 'Shopify toggle saved (local)' : 'Shopify toggle saved (local)');
    }
    setTimeout(() => setStatusMsg(''), 2200);
  };

  return (
    <div style={{ position: 'relative' }}>
      <BackButton to="/" />{/* top-left consistent back button (goes home) */}

      <div style={styles.page}>
        <div style={styles.container}>
          <header style={styles.header}>
            <div>
              <h1 style={styles.title}>PIM Dashboard</h1>
              <p style={styles.subtitle}>Grouped navigation — click a button to go to the page.</p>
            </div>

            <div style={styles.topControls}>
              <div style={styles.switchRow}>
                <label style={styles.switchLabel}>Shopify Sync</label>
                <button
                  role="switch"
                  aria-checked={useShopify}
                  onClick={toggleShopify}
                  style={{ ...styles.switch, background: useShopify ? '#16a34a' : '#d1d5db' }}
                >
                  <span style={{ ...styles.knob, transform: useShopify ? 'translateX(20px)' : 'translateX(2px)' }} />
                </button>
              </div>
              <div style={styles.status}>{statusMsg || (useShopify ? 'Live sync: ON' : 'Live sync: OFF')}</div>
            </div>
          </header>

          <main style={styles.grid}>
            <section style={styles.group}>
              <div style={styles.groupInner}>
                <div>
                  <h2 style={styles.groupTitle}>Fields</h2>
                  <p style={styles.groupDesc}>Manage product fields and groups used across your catalog.</p>
                </div>
                <div style={styles.buttons}>
                  <Link href="/add_field" className="card-btn primary">Add Field</Link>
                  <Link href="/manage_fields" className="card-btn neutral">Manage Fields</Link>
                </div>
              </div>
            </section>

            <section style={styles.group}>
              <div style={styles.groupInner}>
                <div>
                  <h2 style={styles.groupTitle}>Products</h2>
                  <p style={styles.groupDesc}>Create and manage products. Changes sync to Shopify when enabled.</p>
                </div>
                <div style={styles.buttons}>
                  <Link href="/add_product" className="card-btn primary">Add Product</Link>
                  <Link href="/manage_products" className="card-btn neutral">Manage Products</Link>
                  <Link href="/search" className="card-btn neutral">Search</Link>
                </div>
              </div>
            </section>

            <section style={styles.group}>
              <div style={styles.groupInner}>
                <div>
                  <h2 style={styles.groupTitle}>Data</h2>
                  <p style={styles.groupDesc}>Import/export and sync utilities.</p>
                </div>
                <div style={styles.buttons}>
                  <Link href="/upload" className="card-btn neutral">Upload CSV</Link>
                  <Link href="/download" className="card-btn neutral">Download CSV</Link>
                  <button
                    className="card-btn neutral"
                    onClick={async () => {
                      setStatusMsg('Syncing...');
                      try {
                        // Sync products
                        await fetch('/api/refresh_from_shopify', { method: 'POST' });
                        // Sync categories
                        await fetch('/api/refresh_categories_from_shopify', { method: 'POST' });
                        setStatusMsg('Products & categories refreshed from Shopify!');
                      } catch {
                        setStatusMsg('Shopify sync failed');
                      }
                      setTimeout(() => setStatusMsg(''), 2200);
                    }}
                  >
                    Refresh from Shopify
                  </button>
                </div>
              </div>
            </section>

            <section style={styles.group}>
              <div style={styles.groupInner}>
                <div>
                  <h2 style={styles.groupTitle}>Utilities</h2>
                  <p style={styles.groupDesc}>Extra tools and helpers.</p>
                </div>
                <div style={styles.buttons}>
                  <Link href="/ai_theme" className="card-btn neutral">AI Descriptions</Link>
                  <Link href="/lang" className="card-btn neutral">Translate</Link>
                </div>
              </div>
            </section>
          </main>

        </div>

        <style>{`
          :root {
            --accent: #2563eb;   /* single accent color */
            --muted: #6b7280;    /* muted text / gray */
            --card-bg: #ffffff;
            --btn-bg: #f3f4f6;   /* neutral button background */
            --btn-text: #0f172a;
          }

          .card-btn {
            display:inline-flex;
            align-items:center;
            justify-content:center;
            padding:10px 16px;
            color: var(--btn-text);
            background: var(--btn-bg);
            border-radius:10px;
            font-weight:700;
            text-decoration:none;
            border: 1px solid rgba(15,23,42,0.06);
            cursor:pointer;
            min-width:140px;
            margin:6px;
          }
          .card-btn.primary {
            background: var(--accent);
            color: #fff;
            border-color: rgba(15,23,42,0.06);
          }
          .card-btn.neutral {
            background: var(--btn-bg);
            color: var(--btn-text);
          }
          .card-btn:hover { filter: brightness(0.98); }
        `}</style>
      </div>
    </div>
  );
}

const styles = {
  page: { padding: 28, fontFamily: 'Inter, system-ui, Arial, sans-serif', background: '#f8fafc', minHeight: '100vh' },
  container: { maxWidth: 1100, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, marginBottom: 18 },
  title: { margin: 0, fontSize: 28, color: '#0f172a' },
  subtitle: { margin: '6px 0 0 0', color: '#6b7280' },
  topControls: { display: 'flex', alignItems: 'center', gap: 16, textAlign: 'right' },
  switchRow: { display: 'flex', alignItems: 'center', gap: 10 },
  switchLabel: { fontSize: 13, color: '#374151', fontWeight: 700 },
  switch: { width: 46, height: 26, borderRadius: 999, position: 'relative', border: 'none', padding: 0, display: 'inline-block' },
  knob: { width: 20, height: 20, background: '#fff', borderRadius: '50%', display: 'block', margin: 3, transition: 'transform 160ms' },
  status: { fontSize: 13, color: '#374151', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 },
  group: { background: '#fff', borderRadius: 12, padding: 0, boxShadow: '0 8px 26px rgba(2,6,23,0.04)' },
  groupInner: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 18, minHeight: 140 },
  groupTitle: { margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' },
  groupDesc: { marginTop: 6, color: '#6b7280', fontSize: 13, minHeight: 48 },
  buttons: { marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
};