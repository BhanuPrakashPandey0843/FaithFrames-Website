"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, CreditCard } from "lucide-react";
import Image from "next/image";

export default function PrivacyPolicyHero() {
  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center text-center overflow-hidden py-20 px-6 bg-gradient-to-b from-blue-50 via-white to-blue-100">

      {/* ✅ FLOATING BACKGROUND LAYERS */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-blue-400 opacity-25 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-20 right-1/3 w-[20rem] sm:w-[35rem] h-[20rem] sm:h-[35rem] bg-cyan-300 opacity-25 rounded-full blur-3xl animate-float-medium"></div>
        <div className="absolute top-1/2 left-1/3 w-60 sm:w-80 h-60 sm:h-80 bg-indigo-300 opacity-20 rounded-full blur-3xl animate-float-fast"></div>
        <div className="absolute top-1/3 right-10 w-[18rem] sm:w-[28rem] h-[18rem] sm:h-[28rem] bg-blue-200 opacity-30 rounded-full blur-3xl animate-float-medium"></div>
        <div className="absolute bottom-1/4 left-10 w-[20rem] sm:w-[28rem] h-[20rem] sm:h-[28rem] bg-sky-200 opacity-25 rounded-full blur-3xl animate-float-slow"></div>

        <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-blue-50/30 to-transparent"></div>
        <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/noise.png')] mix-blend-overlay"></div>
      </div>

      {/* ✅ MAIN CONTENT */}
      <motion.div
        className="max-w-3xl mx-auto flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.4 }}
      >
        {/* Heading */}
        <motion.h1
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 leading-snug"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          Your <span className="text-blue-600">Privacy</span> &{" "}
          <span className="text-blue-500">Security</span> Matter Most
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="mt-4 sm:mt-6 text-gray-600 text-base sm:text-lg leading-relaxed max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          At <span className="font-semibold text-gray-800">Faith Frames</span>, your data is sacred.  
          We ensure every transaction and personal detail is handled with the highest level of care, transparency, and protection.
        </motion.p>

        {/* Icons Row */}
        <motion.div
          className="flex flex-wrap justify-center gap-6 sm:gap-10 mt-8 sm:mt-10"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {/* Card 1 */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex flex-col items-center text-center bg-white/80 backdrop-blur-md shadow-md rounded-2xl p-5 sm:p-6 w-52 border border-blue-100"
          >
            <ShieldCheck className="text-blue-600 w-10 h-10 mb-3" />
            <h3 className="font-semibold text-gray-800">Privacy First</h3>
            <p className="text-sm text-gray-600 mt-2">
              Your personal data is stored securely under strict privacy standards.
            </p>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex flex-col items-center text-center bg-white/80 backdrop-blur-md shadow-md rounded-2xl p-5 sm:p-6 w-52 border border-blue-100"
          >
            <CreditCard className="text-blue-600 w-10 h-10 mb-3" />
            <h3 className="font-semibold text-gray-800">Secure Payments</h3>
            <p className="text-sm text-gray-600 mt-2">
              Powered by <span className="font-semibold">Stripe</span> & <span className="font-semibold">Razorpay</span> — PCI DSS Level 1 certified.
            </p>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex flex-col items-center text-center bg-white/80 backdrop-blur-md shadow-md rounded-2xl p-5 sm:p-6 w-52 border border-blue-100"
          >
            <Lock className="text-blue-600 w-10 h-10 mb-3" />
            <h3 className="font-semibold text-gray-800">Data Encryption</h3>
            <p className="text-sm text-gray-600 mt-2">
              Advanced SSL encryption ensures your transactions remain confidential.
            </p>
          </motion.div>
        </motion.div>

        {/* Summary Line */}
        <motion.p
          className="mt-10 sm:mt-12 text-gray-700 text-sm sm:text-base italic max-w-lg"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
        >
          “Your trust is our foundation — we protect it with every click.”
        </motion.p>
      </motion.div>

      {/* ✅ FLOATING ANIMATION KEYFRAMES */}
      <style jsx global>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(-50px) translateX(30px) scale(1.05); }
        }
        @keyframes floatMedium {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(40px) translateX(-40px) scale(1.1); }
        }
        @keyframes floatFast {
          0%, 100% { transform: translateY(0px) translateX(0px) scale(1); }
          50% { transform: translateY(-30px) translateX(20px) scale(1.08); }
        }
        .animate-float-slow { animation: floatSlow 18s ease-in-out infinite; }
        .animate-float-medium { animation: floatMedium 14s ease-in-out infinite; }
        .animate-float-fast { animation: floatFast 10s ease-in-out infinite; }
      `}</style>
    </section>
  );
}
