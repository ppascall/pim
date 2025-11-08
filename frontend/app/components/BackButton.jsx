'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function BackButton({ to }) {
  const router = useRouter();
  const handle = () => {
    if (to) router.push(to);
    else router.back();
  };

  return (
    <button
      onClick={handle}
      aria-label="Back"
      style={{
        position: 'absolute',
        top: 12,
        left: 12,
        zIndex: 60,
        padding: '8px 10px',
        borderRadius: 8,
        border: '1px solid rgba(15,23,42,0.06)',
        background: '#ffffff',
        color: '#0f172a',
        boxShadow: '0 6px 18px rgba(2,6,23,0.06)',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      ← Back
    </button>
  );
}