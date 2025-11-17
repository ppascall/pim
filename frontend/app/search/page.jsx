import React, { Suspense } from 'react';
import SearchProducts from '../components/Search';

// Ensure build doesn't try to statically pre-render without a suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading search…</div>}>
      <SearchProducts />
    </Suspense>
  );
}