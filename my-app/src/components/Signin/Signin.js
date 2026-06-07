"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * AdminLogin — secure server-validated login using HMAC session cookie.
 * Firebase client-side auth is NOT required for the admin panel —
 * auth is credential-based via /api/login.
 */
export default function Signin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid email or password.");
        return;
      }

      router.replace("/admin");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100 flex justify-center items-center px-4">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-xl flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Form */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-gray-900 text-center lg:text-left">
            Admin Login
          </h1>
          <p className="text-gray-500 mt-2 text-center lg:text-left">
            Sign in to manage Faith Frames content
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="sr-only">Email Address</label>
              <input
                id="email"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                type="email"
                placeholder="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            {error && (
              <p role="alert" className="text-red-500 text-sm text-center">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full tracking-wide font-semibold bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 active:bg-indigo-800 transition duration-200 flex items-center justify-center shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Right: Illustration */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-100 to-indigo-200 items-center justify-center p-10">
          <div className="text-center">
            <div className="text-6xl mb-4">✝️</div>
            <h2 className="text-xl font-bold text-indigo-800">Faith Frames</h2>
            <p className="text-indigo-600 text-sm mt-1">Admin Control Panel</p>
          </div>
        </div>
      </div>
    </div>
  );
}
