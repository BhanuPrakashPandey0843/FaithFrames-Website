"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

const Signup = () => {
  const router = useRouter();

  // State for inputs
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Hidden credentials
  const ADMIN_EMAIL = "faithframes@gmail.com";
  const ADMIN_PASS = "Faith1234@";

  const handleSubmit = (e) => {
    e.preventDefault();

    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
      router.push("/admin"); // ✅ Redirect to admin page
    } else {
      setError("Invalid email or password. Try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100 flex justify-center items-center px-4">
      <div className="max-w-screen-lg w-full bg-white shadow-xl rounded-xl flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT SIDE - FORM */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mt-8 text-center lg:text-left">
            Admin Login
          </h1>
          <p className="text-gray-500 mt-2 text-center lg:text-left">
            Please log in with your credentials.
          </p>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 text-gray-500 text-sm">or</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <input
              className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white"
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            {/* Password */}
            <input
              className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* Login Button */}
            <button
              type="submit"
              className="w-full mt-4 tracking-wide font-semibold bg-indigo-500 text-white py-3 rounded-lg hover:bg-indigo-600 transition-all duration-300 flex items-center justify-center shadow-md"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <path d="M20 8v6M23 11h-6" />
              </svg>
              Log In
            </button>

            {/* Error Message */}
            {error && (
              <p className="text-red-500 text-sm text-center mt-2">{error}</p>
            )}

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center mt-2">
              By logging in, you agree to our{" "}
              <a href="#" className="border-b border-gray-500 hover:text-indigo-600">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="border-b border-gray-500 hover:text-indigo-600">
                Privacy Policy
              </a>
            </p>
          </form>

          {/* Already have an account */}
          <p className="text-sm text-gray-600 mt-6 text-center">
            Not authorized?{" "}
            <span className="text-indigo-600 font-medium">
              Contact admin
            </span>
          </p>
        </div>

        {/* RIGHT SIDE IMAGE */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-100 to-indigo-200 items-center justify-center">
          <img
            src="https://storage.googleapis.com/devitary-image-host.appspot.com/15848031292911696601-undraw_designer_life_w96d.svg"
            alt="Login Illustration"
            className="max-w-md"
          />
        </div>
      </div>
    </div>
  );
};

export default Signup;
