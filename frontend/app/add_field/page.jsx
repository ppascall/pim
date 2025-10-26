'use client';
import React, { useEffect, useState } from 'react';
import AddField from '../components/AddField';

export default function AddFieldPage() {
  const [fields, setFields] = useState([]);

  useEffect(() => {
    fetch('/api/fields')
      .then(res => res.json())
      .then(data => setFields(data.fields || []));
  }, []);

  if (!fields.length) return <div>Loading...</div>;
  return <AddField endpoint="/api/add_field" fields={fields} />;
}