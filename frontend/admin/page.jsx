'use client';
import React, { useEffect, useState } from 'react';

export default function ManageAccountsPage() {
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState({ message: "", color: "" });

  useEffect(() => {
    fetch('http://localhost:5000/api/users')
      .then(res => res.json())
      .then(data => setUsers(data.users || []));
  }, []);

  const handleRoleChange = async (email, newRole) => {
    const res = await fetch(`http://localhost:5000/api/users/${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setUsers(users =>
        users.map(u => u.email === email ? { ...u, role: newRole } : u)
      );
      setStatus({ message: "Role updated!", color: "green" });
    } else {
      setStatus({ message: "Failed to update role.", color: "red" });
    }
    setTimeout(() => setStatus({ message: "", color: "" }), 2000);
  };

  const handleDelete = async (email) => {
    if (!window.confirm(`Delete user ${email}?`)) return;
    const res = await fetch(`http://localhost:5000/api/users/${encodeURIComponent(email)}`, {
      method: "DELETE"
    });
    if (res.ok) {
      setUsers(users => users.filter(u => u.email !== email));
      setStatus({ message: "User deleted.", color: "green" });
    } else {
      setStatus({ message: "Failed to delete user.", color: "red" });
    }
    setTimeout(() => setStatus({ message: "", color: "" }), 2000);
  };

  if (!users.length) return <div>Loading...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", background: "#fff", borderRadius: 12, boxShadow: "0 2px 12px #0001", padding: 32 }}>
      <h1 style={{ textAlign: "center", marginBottom: 24 }}>Manage Accounts</h1>
      {status.message && (
        <div style={{ color: status.color, marginBottom: 16, textAlign: "center" }}>{status.message}</div>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Email</th>
            <th style={th}>Role</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.email}>
              <td style={td}>{user.email}</td>
              <td style={td}>
                <select
                  value={user.role}
                  onChange={e => handleRoleChange(user.email, e.target.value)}
                  style={{ padding: 6, borderRadius: 4 }}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td style={td}>
                <button
                  style={{ color: "#fff", background: "#e74c3c", border: "none", borderRadius: 4, padding: "6px 14px", cursor: "pointer" }}
                  onClick={() => handleDelete(user.email)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th = {
  background: "#f3f4f6",
  color: "#333",
  fontWeight: 700,
  padding: "10px 8px",
  borderBottom: "2px solid #e5e9f2",
  textAlign: "left"
};
const td = {
  padding: "8px 8px",
  borderBottom: "1px solid #f0f0f0",
  fontSize: 15,
};