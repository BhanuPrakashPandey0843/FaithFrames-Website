"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Users } from "lucide-react";

export default function Home() {
  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden py-20 px-6 bg-gradient-to-b from-blue-50 via-white to-blue-100">
      
      {/* ✅ MULTI-LAYER MOVING BACKGROUND */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-10 left-1/4 w-72 sm:w-96 h-72 sm:h-96 bg-blue-400 opacity-30 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-20 right-1/3 w-[20rem] sm:w-[35rem] h-[20rem] sm:h-[35rem] bg-blue-200 opacity-25 rounded-full blur-3xl animate-float-medium"></div>
        <div className="absolute top-1/3 right-10 w-60 sm:w-80 h-60 sm:h-80 bg-cyan-300 opacity-20 rounded-full blur-3xl animate-float-fast"></div>
        <div className="absolute top-1/2 left-10 w-[18rem] sm:w-[28rem] h-[18rem] sm:h-[28rem] bg-purple-300 opacity-20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-1/4 left-1/3 w-60 sm:w-72 h-60 sm:h-72 bg-indigo-300 opacity-25 rounded-full blur-3xl animate-float-medium"></div>

        {/* Gradient overlay for smoother blending */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-blue-50/20 to-transparent"></div>

        {/* Soft noise/texture overlay for premium feel */}
        <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/noise.png')] mix-blend-overlay"></div>
      </div>

      {/* ✅ MAIN CENTERED CONTENT */}
      <motion.div
        className="flex flex-col items-center text-center max-w-xl md:max-w-2xl px-4"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.4 }}
      >
        {/* Title */}
        <motion.h1
          className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-gray-900"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          viewport={{ once: true }}
        >
          Empower Your{" "}
          <span className="text-blue-600">Business</span> <br />
          <span className="text-blue-500">Journey</span> in Portugal
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          className="text-gray-600 mt-4 sm:mt-6 text-base sm:text-lg leading-relaxed"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          viewport={{ once: true }}
        >
          The complete digital platform for entrepreneurs. Create your
          company, manage finances, and grow your business – all in one
          powerful solution.
        </motion.p>

        {/* Buttons */}
        <motion.div
          className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3 sm:gap-4"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          viewport={{ once: true }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-blue-600 text-white px-5 sm:px-6 py-3 rounded-lg shadow-md hover:shadow-xl transition text-sm sm:text-base"
          >
            Open a Free Account
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="border border-gray-300 text-gray-800 px-5 sm:px-6 py-3 rounded-lg hover:bg-gray-100 transition text-sm sm:text-base"
          >
            Create Your Company
          </motion.button>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          className="flex items-center gap-3 mt-6 sm:mt-8 justify-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          viewport={{ once: true }}
        >
          {/* Avatar stack */}
          <div className="flex -space-x-2">
            <Image
              src="https://i.pravatar.cc/40?img=1"
              width={36}
              height={36}
              alt="User1"
              className="rounded-full border-2 border-white"
            />
            <Image
              src="https://i.pravatar.cc/40?img=2"
              width={36}
              height={36}
              alt="User2"
              className="rounded-full border-2 border-white"
            />
            <Image
              src="https://i.pravatar.cc/40?img=3"
              width={36}
              height={36}
              alt="User3"
              className="rounded-full border-2 border-white"
            />
            <Image
              src="https://i.pravatar.cc/40?img=4"
              width={36}
              height={36}
              alt="User4"
              className="rounded-full border-2 border-white"
            />
          </div>
          <span className="flex items-center text-gray-700 font-medium text-sm sm:text-base">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-1 text-blue-600" /> 1.5k+ Users
          </span>
        </motion.div>
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
        .animate-float-slow {
          animation: floatSlow 18s ease-in-out infinite;
        }
        .animate-float-medium {
          animation: floatMedium 14s ease-in-out infinite;
        }
        .animate-float-fast {
          animation: floatFast 10s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
