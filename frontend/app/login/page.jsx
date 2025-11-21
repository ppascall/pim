"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "../lib/api";

const LOGIN_ENDPOINT = "/api/login";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ message: "", color: "" });
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ message: "", color: "" });
    try {
      const res = await fetch(apiUrl(LOGIN_ENDPOINT), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
        localStorage.setItem("role", data.role || "user");
        router.push("/");
      } else {
        setStatus({ message: data.detail || "Login failed", color: "red" });
      }
    } catch {
      setStatus({ message: "Login error", color: "red" });
    }
  };

  return (
    <div className="container">
      <h1 style={{ textAlign: "center", marginBottom: 24 }}>Login</h1>
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
        <button type="submit" className="button">Login</button>
      </form>
      <div
        style={{
          marginTop: 18,
          textAlign: "center",
        }}
      >
        <span
          style={{
            color: "#1976d2",
            cursor: "pointer",
            textDecoration: "underline",
            fontWeight: 600,
            fontSize: 16,
          }}
          onClick={() => router.push("/register")}
        >
          Don't have an account? Register
        </span>
      </div>
      {status.message && (
        <div style={{ color: status.color, marginTop: 14, textAlign: "center" }}>{status.message}</div>
      )}
    </div>
  );
}