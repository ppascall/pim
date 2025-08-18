'use client';
import React from 'react';

export default function DownloadPage() {
  React.useEffect(() => {
    // Use the full API path if your backend is on a different port or behind /api
    window.location.href = '/api/download';
  }, []);
  return <div>Downloading CSV...</div>;
}