import React, { useEffect, useState } from 'react';
import AddProduct from '../components/AddProduct';

export default function AddProductPage() {
  const [fields, setFields] = useState([]);

  useEffect(() => {
    fetch('/fields')
      .then(res => res.json())
      .then(data => setFields(data.fields || []));
  }, []);

  if (!fields.length) return <div>Loading...</div>;
  return <AddProduct fields={fields} />;
}