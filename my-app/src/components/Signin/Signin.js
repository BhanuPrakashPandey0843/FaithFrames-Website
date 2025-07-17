"use client";
import React from "react";

const Signup = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100 flex justify-center items-center px-4">
      <div className="max-w-screen-lg w-full bg-white shadow-xl rounded-xl flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT SIDE - FORM */}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center">
         

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mt-8 text-center lg:text-left">
            Create Your Account
          </h1>
          <p className="text-gray-500 mt-2 text-center lg:text-left">
            Join us and start your journey today!
          </p>

          {/* Social Signup */}
          <div className="mt-6 flex justify-center lg:justify-start">
            <button className="w-full max-w-xs font-semibold shadow-sm rounded-lg py-3 bg-indigo-100 text-gray-800 flex items-center justify-center transition-all duration-300 hover:shadow-lg">
              <div className="bg-white p-2 rounded-full">
                <svg className="w-4" viewBox="0 0 533.5 544.3">
                  <path
                    d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"
                    fill="#4285f4"
                  />
                  <path
                    d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"
                    fill="#34a853"
                  />
                  <path
                    d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"
                    fill="#fbbc04"
                  />
                  <path
                    d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 339.7-.8 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"
                    fill="#ea4335"
                  />
                </svg>
              </div>
              <span className="ml-4">Sign Up with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="mx-4 text-gray-500 text-sm">or</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Signup Form */}
          <form className="space-y-4">
            {/* Full Name */}
            <input
              className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white"
              type="text"
              placeholder="Full Name"
            />

            {/* Email */}
            <input
              className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white"
              type="email"
              placeholder="Email Address"
            />

            {/* Password */}
            <input
              className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white"
              type="password"
              placeholder="Password"
            />

            {/* Confirm Password */}
            <input
              className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-400 focus:bg-white"
              type="password"
              placeholder="Confirm Password"
            />

            {/* Signup Button */}
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
              Create Account
            </button>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center mt-2">
              By signing up, you agree to our{" "}
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
            Already have an account?{" "}
            <a href="/login" className="text-indigo-600 font-medium hover:underline">
              Log In
            </a>
          </p>
        </div>

        {/* RIGHT SIDE IMAGE */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-100 to-indigo-200 items-center justify-center">
          <img
            src="https://storage.googleapis.com/devitary-image-host.appspot.com/15848031292911696601-undraw_designer_life_w96d.svg"
            alt="Signup Illustration"
            className="max-w-md"
          />
        </div>
      </div>
    </div>
  );
};

export default Signup;
