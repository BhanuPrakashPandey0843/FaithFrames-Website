"use client";

import { motion } from "framer-motion";
import { ShieldCheck, CreditCard, Mail, Globe } from "lucide-react";

export default function RefundHero() {
  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center text-center overflow-hidden py-20 px-6 bg-gradient-to-b from-blue-50 via-white to-blue-100">
      
      {/* 🌈 Floating Background Animation */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-80 sm:w-[26rem] h-80 sm:h-[26rem] bg-blue-300 opacity-25 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-20 right-1/3 w-[22rem] sm:w-[34rem] h-[22rem] sm:h-[34rem] bg-cyan-300 opacity-25 rounded-full blur-3xl animate-float-medium"></div>
        <div className="absolute top-1/2 left-1/3 w-60 sm:w-80 h-60 sm:h-80 bg-indigo-200 opacity-20 rounded-full blur-3xl animate-float-fast"></div>
        <div className="absolute top-1/3 right-10 w-[18rem] sm:w-[28rem] h-[18rem] sm:h-[28rem] bg-blue-200 opacity-30 rounded-full blur-3xl animate-float-medium"></div>
        <div className="absolute bottom-1/4 left-10 w-[20rem] sm:w-[28rem] h-[20rem] sm:h-[28rem] bg-sky-200 opacity-25 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-blue-50/30 to-transparent"></div>
      </div>

      {/* 🌟 Main Content */}
      <motion.div
        className="max-w-4xl mx-auto flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.4 }}
      >
        {/* Title */}
        <motion.h1
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-snug"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Refund & <span className="text-blue-600">Cancellation Policy</span>
        </motion.h1>

        <motion.h2
          className="text-base sm:text-lg text-gray-600 mt-2"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Faith Frames
        </motion.h2>

        {/* Content */}
        <motion.div
          className="mt-10 text-left text-gray-800 max-w-3xl space-y-10 leading-relaxed"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >

          {/* 1. Overview */}
          <section>
            <h3 className="text-2xl font-semibold text-blue-700 mb-3">1. Overview</h3>
            <p>
              Thank you for choosing <span className="font-semibold">Faith Frames</span> — a Christian wallpaper platform providing Bible verse–based premium wallpapers. 
              We value your trust and are committed to ensuring transparency in every transaction.
            </p>
            <p className="mt-3">
              All purchases made through Faith Frames are processed securely through our trusted payment gateways — 
              <span className="font-semibold"> Stripe (for global users)</span> and 
              <span className="font-semibold"> Razorpay (for Indian users)</span>.
            </p>
          </section>

          {/* 2. Subscription */}
          <section>
            <h3 className="text-2xl font-semibold text-blue-700 mb-3">2. One-Time Lifetime Subscription</h3>
            <p>Faith Frames offers a one-time lifetime subscription:</p>
            <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
              <li>₹10 INR for Indian users (via Razorpay)</li>
              <li>$3 USD for international users (via Stripe)</li>
            </ul>
            <p className="mt-3">
              Once purchased, users get lifetime access to all premium wallpapers and updates without any recurring charges.
            </p>
          </section>

          {/* 3. No Refund Policy */}
          <section>
            <h3 className="text-2xl font-semibold text-blue-700 mb-3">3. No Refund Policy</h3>
            <p>
              Since all wallpapers and digital content are instantly available after successful payment, 
              Faith Frames follows a strict no-refund and no-cancellation policy.
            </p>
            <p className="mt-3 font-medium">Refunds will not be issued for:</p>
            <ul className="list-disc list-inside mt-2 ml-4 space-y-1">
              <li>Change of mind after purchase</li>
              <li>Accidental or unauthorized purchases</li>
              <li>Device compatibility issues (app is tested on all major Android devices)</li>
              <li>Subscription dissatisfaction or personal preference</li>
            </ul>
          </section>

          {/* 4. Exceptions */}
          <section>
            <h3 className="text-2xl font-semibold text-blue-700 mb-3">4. Exceptions</h3>
            <p>Refunds will only be considered in the following cases:</p>
            <ol className="list-decimal list-inside mt-2 ml-4 space-y-1">
              <li>Duplicate payment due to technical error.</li>
              <li>Payment charged but access not received due to a verified system issue.</li>
            </ol>
            <p className="mt-3">
              In such cases, please email us at <span className="font-semibold text-blue-700">support@faithframes.in</span> within 7 days of payment. 
              We will verify and process your refund within 7–10 business days to your original payment method.
            </p>
          </section>

          {/* 5. Transaction Security */}
          <section>
            <h3 className="text-2xl font-semibold text-blue-700 mb-3">5. Transaction Security</h3>
            <p>
              All payments are handled securely by <span className="font-semibold">Stripe</span> and <span className="font-semibold">Razorpay</span>, 
              both <span className="font-semibold">PCI DSS Level 1 compliant</span>. 
              Faith Frames does not collect or store any credit card, debit card, or bank information.
            </p>
          </section>

          {/* 6. Contact */}
          <section>
            <h3 className="text-2xl font-semibold text-blue-700 mb-3">6. Contact for Refund Queries</h3>
            <p>If you experience any payment-related issues, please reach out to us:</p>
            <ul className="list-none mt-3 space-y-2">
              <li> <span className="font-medium">support@faithframes.in</span></li>
              <li> <a href="https://faithframes.in" className="text-blue-700 font-medium hover:underline">https://faithframes.in</a></li>
            </ul>
            <p className="mt-3">
              We’re here to help ensure a smooth and secure experience.
            </p>
          </section>
        </motion.div>

        {/* Icons */}
        <motion.div
          className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-12"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
          <div className="flex flex-col items-center bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-md border border-blue-100">
            <ShieldCheck className="text-blue-600 w-10 h-10 mb-3" />
            <h4 className="font-semibold text-gray-800">Secure Policy</h4>
          </div>
          <div className="flex flex-col items-center bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-md border border-blue-100">
            <CreditCard className="text-blue-600 w-10 h-10 mb-3" />
            <h4 className="font-semibold text-gray-800">Trusted Payments</h4>
          </div>
          <div className="flex flex-col items-center bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-md border border-blue-100">
            <Mail className="text-blue-600 w-10 h-10 mb-3" />
            <h4 className="font-semibold text-gray-800">Quick Support</h4>
          </div>
          <div className="flex flex-col items-center bg-white/80 backdrop-blur-md rounded-2xl p-5 shadow-md border border-blue-100">
            <Globe className="text-blue-600 w-10 h-10 mb-3" />
            <h4 className="font-semibold text-gray-800">Global Access</h4>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating animation keyframes */}
      <style jsx global>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(-40px) translateX(20px) scale(1.05); }
        }
        @keyframes floatMedium {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(40px) translateX(-30px) scale(1.1); }
        }
        @keyframes floatFast {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(-20px) translateX(15px) scale(1.08); }
        }
        .animate-float-slow { animation: floatSlow 18s ease-in-out infinite; }
        .animate-float-medium { animation: floatMedium 14s ease-in-out infinite; }
        .animate-float-fast { animation: floatFast 10s ease-in-out infinite; }
      `}</style>
    </section>
  );
}
