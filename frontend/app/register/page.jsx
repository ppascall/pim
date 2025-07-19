"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = "http://localhost:8000/api/v1";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ message: "", color: "" });
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ message: "", color: "" });
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("role", data.role || "user");
        router.push("/");
      } else {
        setStatus({ message: data.detail || "Registration failed", color: "red" });
      }
    } catch {
      setStatus({ message: "Registration error", color: "red" });
    }
  };

  return (
    <div className="container">
      <h1 style={{ textAlign: "center", marginBottom: 24 }}>Register</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          required
          onChange={e => setEmail(e.target.value)}
          style={{ padding: 12, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          required
          onChange={e => setPassword(e.target.value)}
          style={{ padding: 12, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button type="submit" className="button">Register</button>
      </form>
      {status.message && (
        <div style={{ color: status.color, marginTop: 14, textAlign: "center" }}>{status.message}</div>
      )}
    </div>
  );
}