"use client";
import './globals.css';
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      // Allow access to /login and /register without token
      if (!token && pathname !== "/login" && pathname !== "/register") {
        router.replace("/login");
      }
      if (token && (pathname === "/login" || pathname === "/register")) {
        router.replace("/");
      }
    }
  }, [pathname, router]);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
