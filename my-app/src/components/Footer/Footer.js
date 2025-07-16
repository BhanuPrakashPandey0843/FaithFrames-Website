"use client";
import React from "react";
import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
} from "lucide-react";
import { motion } from "framer-motion";

const Footer = () => {
  return (
    <footer className="relative w-full bg-gradient-to-b from-[#000] to-black text-white overflow-hidden font-sans">
      {/* Animated glow blobs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <motion.div
          className="absolute -top-40 left-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-[160px]"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 5, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-1/2 -left-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-[130px]"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-16">
        <div className="flex flex-col lg:flex-row justify-between gap-14 lg:gap-20">
          {/* Brand Section */}
          <motion.div
            className="max-w-lg text-center lg:text-left"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <a
              href="#"
              className="flex justify-center lg:justify-start mb-6 hover:scale-105 transition-transform"
            >
              <h1 className="text-3xl font-extrabold tracking-wide bg-gradient-to-r from-white via-gray-300 to-gray-400 bg-clip-text text-transparent">
                Faith Frames
              </h1>
            </a>
            <p className="text-gray-300 text-base leading-relaxed">
              Create sleek, customizable short links with real-time analytics,
              click tracking, and branded domains.
            </p>

            {/* Newsletter */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="py-3 px-4 rounded-full bg-white/5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 w-full sm:w-64"
              />
              <button className="h-12 px-6 rounded-full border border-white text-white font-semibold hover:bg-white hover:text-black transition-all duration-300 shadow-white/10 shadow-sm">
                Subscribe
              </button>
            </div>
          </motion.div>

          {/* Footer Links */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 gap-10 text-center sm:text-left"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <div>
              <h4 className="text-lg font-semibold text-white mb-5">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white">Dashboard</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Shorten URL</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Link History</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Analytics</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-5">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-5">Legal</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Terms</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Security</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">GDPR</a></li>
              </ul>
            </div>
          </motion.div>
        </div>

        {/* Bottom Row */}
        <div className="mt-12 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-sm text-gray-400">
            © {new Date().getFullYear()}{" "}
            <span className="text-white font-medium">Faith Frames</span>. All rights reserved.
          </span>

          <div className="flex space-x-5">
            <a href="#" className="text-gray-400 hover:text-white hover:scale-110 transition-transform">
              <Facebook size={18} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white hover:scale-110 transition-transform">
              <Twitter size={18} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white hover:scale-110 transition-transform">
              <Linkedin size={18} />
            </a>
            <a href="#" className="text-gray-400 hover:text-white hover:scale-110 transition-transform">
              <Instagram size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;


