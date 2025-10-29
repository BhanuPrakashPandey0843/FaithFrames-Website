"use client";

import React from "react";
import { CheckCircle, Shield, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

const Pricing = () => {
  return (
    <section className="relative bg-gradient-to-b from-blue-100 via-white to-blue-100 text-black px-6 md:px-12 py-20 font-sans overflow-hidden">
      {/* ✅ Heading Section */}
      <div className="max-w-4xl mx-auto text-center mb-16">
        <p className="text-blue-600 text-sm font-medium mb-2">Pricing</p>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          Simple, Transparent, and One-Time Pricing
        </h2>
        <p className="text-gray-700 mt-4 max-w-2xl mx-auto text-sm md:text-base">
          At <span className="font-semibold text-blue-600">Faith Frames</span>, we
          believe in keeping things simple — no subscriptions, no hidden charges.
          Just a one-time payment for lifetime access to inspiring, faith-filled wallpapers.
        </p>
      </div>

      {/* ✅ Pricing Cards */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 justify-center items-center">
        {/* 🌍 Global Plan */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex-1 p-8 bg-white/30 backdrop-blur-md border border-white/40 shadow-lg rounded-2xl text-center transition duration-300"
        >
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Global Plan </h3>
          <p className="text-gray-700 text-sm mt-2">One-time Lifetime Access</p>

          <div className="mt-6">
            <p className="text-3xl font-bold text-blue-600">$3 USD</p>
            <p className="text-xs text-gray-500 mt-1">(via Stripe)</p>
          </div>

          <ul className="mt-6 space-y-3 text-gray-700 text-sm text-left max-w-xs mx-auto">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Lifetime Access to All Wallpapers
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Regular Updates & New Designs
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              One-Time Secure Payment
            </li>
          </ul>

          <button className="mt-8 px-6 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition">
            Pay via Stripe
          </button>
        </motion.div>

        {/* 🇮🇳 Indian Plan */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex-1 p-8 bg-white/40 backdrop-blur-lg border border-white/50 shadow-lg rounded-2xl text-center transition duration-300"
        >
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Indian Plan 🇮🇳</h3>
          <p className="text-gray-700 text-sm mt-2">One-time Lifetime Access</p>

          <div className="mt-6">
            <p className="text-3xl font-bold text-green-600">₹10 INR</p>
            <p className="text-xs text-gray-500 mt-1">(via Razorpay)</p>
          </div>

          <ul className="mt-6 space-y-3 text-gray-700 text-sm text-left max-w-xs mx-auto">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Unlimited Premium Wallpapers
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Ad-Free Experience Forever
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              Lifetime Updates
            </li>
          </ul>

          <button className="mt-8 px-6 py-3 rounded-full bg-green-600 text-white font-medium hover:bg-green-700 transition">
            Pay via Razorpay
          </button>
        </motion.div>
      </div>

      {/* ✅ Secure Payment Info */}
      <div className="max-w-3xl mx-auto mt-16 text-center text-gray-700 text-sm">
        <div className="flex justify-center mb-3">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <p className="font-medium text-gray-800">
           Secure Payments through Trusted Platforms
        </p>
        <p className="mt-2">
          All transactions are handled by PCI DSS Level 1 certified gateways –{" "}
          <span className="font-semibold text-blue-600">Stripe</span> and{" "}
          <span className="font-semibold text-green-600">Razorpay</span>.
          <br />
          Faith Frames does not store any card or bank details.
        </p>
      </div>

      {/* ✅ Contact Info */}
      <div className="max-w-2xl mx-auto text-center mt-12">
        <p className="text-gray-700 text-sm">
          Have any questions about billing or payments?
        </p>
        <a
          href="mailto:support@faithframes.in"
          className="text-blue-600 font-medium hover:underline"
        >
          support@faithframes.in
        </a>
      </div>
    </section>
  );
};

export default Pricing;
