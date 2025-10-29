"use client";

import React from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

const Newsletter = () => {
  return (
     
    <div className="w-full bg-gradient-to-b from-blue-100 via-white to-blue-100 py-16 flex justify-center"> 
    <section className="relative w-full max-w-5xl mx-auto overflow-hidden rounded-3xl bg-gradient-to-b from-[#000] to-black text-white font-sans shadow-2xl my-12">
      {/* ✅ Glow Blobs (same as Footer) */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          className="absolute -top-32 left-1/3 w-72 h-72 bg-purple-500/10 rounded-full blur-[140px]"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/2 -left-32 w-64 h-64 bg-indigo-500/10 rounded-full blur-[120px]"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      {/* ✅ Compact Content */}
      <div className="relative z-10 text-center px-6 py-12 sm:py-14 lg:py-16">
        <motion.h2
          className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-wide bg-gradient-to-r from-white via-gray-300 to-gray-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Inspire Your Day with Faith Frames
        </motion.h2>

        <motion.p
          className="mt-3 text-sm sm:text-base lg:text-lg text-gray-300 leading-relaxed max-w-xl mx-auto"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Experience {" "}
          <span className="font-semibold text-white"> daily </span> 
         encouragement through beautiful Bible verse wallpapers designed to strengthen your faith and fill your day with peace.
        </motion.p>

        {/* ✅ Compact Button */}
        <motion.div
          className="mt-6 flex justify-center"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          <motion.a
            href="/brochure.pdf"
            download
            whileHover={{
              scale: 1.08,
              boxShadow: "0px 0px 20px rgba(255,255,255,0.3)",
            }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm sm:text-base font-medium shadow-md hover:bg-gray-100 transition-all duration-500"
          >
            Download App
            <Download className="w-4 h-4" />
          </motion.a>
        </motion.div>
      </div>

      {/* ✅ Soft fade bottom */}
      <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-black/60 to-transparent" />
    </section>
    </div>
  );
};

export default Newsletter;
