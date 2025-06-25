import React from 'react';
import Link from 'next/link';

const InventoryManager = () => {
  return (
    <div className="container mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-bold mb-6">Inventory Manager</h1>
      <ul className="space-y-2">
        <li>
          <Link href="/add_field"><span className="text-blue-600 hover:underline">Add a field</span></Link>
        </li>
        <li>
          <Link href="/manage_fields"><span className="text-blue-600 hover:underline">Manage Fields</span></Link>
        </li>
        <li>
          <Link href="/manage_products"><span className="text-blue-600 hover:underline">Manage Products</span></Link>
        </li>
        <li>
          <Link href="/add_product"><span className="text-blue-600 hover:underline">Add Product</span></Link>
        </li>
        <li>
          <Link href="/search"><span className="text-blue-600 hover:underline">Search Products</span></Link>
        </li>
        <li>
          <Link href="/upload"><span className="text-blue-600 hover:underline">Upload CSV</span></Link>
        </li>
        <li>
          <Link href="/download"><span className="text-blue-600 hover:underline">Download CSV</span></Link>
        </li>
      </ul>
    </div>
  );
};

export default InventoryManager;