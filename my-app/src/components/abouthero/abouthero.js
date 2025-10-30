"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, Users, Sparkles } from "lucide-react";
import Faith from "../Hero/Faith.png";
import Middlephone from "../Hero/MiddlePhone.png";

export default function AboutHero() {
  return (
    <section className="relative w-full min-h-screen flex flex-col items-center justify-center text-center overflow-hidden py-20 px-6 bg-gradient-to-b from-blue-50 via-white to-blue-100">
      
      {/* ✨ Floating background blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-10 left-1/3 w-80 h-80 bg-blue-400 opacity-30 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-20 right-1/3 w-[25rem] h-[25rem] bg-indigo-300 opacity-25 rounded-full blur-3xl animate-float-medium"></div>
        <div className="absolute top-1/2 left-10 w-72 h-72 bg-cyan-300 opacity-20 rounded-full blur-3xl animate-float-fast"></div>
      </div>

      {/* 🌟 Title Section */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight">
          Spreading <span className="text-blue-600">Faith</span> Through  
          <br /> Every Screen
        </h1>
        <p className="text-gray-600 mt-5 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          At <span className="font-semibold text-gray-800">Faith Frames</span>, we believe that technology can be a tool  
          to bring peace, positivity, and hope into our daily lives.  
          Our mission is to fill every digital screen with the beauty  
          of God’s Word — reminding hearts of His love in every moment.
        </p>
      </motion.div>


      {/* 📱 Floating Mockup Image */}
      <motion.div
        className="relative mt-16 w-[170px] sm:w-[220px] md:w-[260px] lg:w-[300px]"
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        viewport={{ once: true }}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          {/* Faith Banner inside phone */}
          <div className="absolute top-[7%] left-[13%] w-[74%] h-[82%] rounded-[20px] overflow-hidden z-10">
            <Image src={Faith} alt="Faith Banner" className="object-cover w-full h-full" />
          </div>
          <Image
            src={Middlephone}
            alt="Phone Mockup"
            className="relative z-20 drop-shadow-2xl"
          />
        </motion.div>
      </motion.div>

      {/* Floating Animation Keyframes */}
      <style jsx global>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-40px) translateX(30px); }
        }
        @keyframes floatMedium {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(40px) translateX(-40px); }
        }
        @keyframes floatFast {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          50% { transform: translateY(-30px) translateX(20px); }
        }
        .animate-float-slow { animation: floatSlow 18s ease-in-out infinite; }
        .animate-float-medium { animation: floatMedium 14s ease-in-out infinite; }
        .animate-float-fast { animation: floatFast 10s ease-in-out infinite; }
      `}</style>
    </section>
  );
}
