"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { X } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolling(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "#about" },
    { name: "Pricing", href: "#pricing" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <motion.nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolling
          ? "bg-white/80 backdrop-blur-lg shadow-sm"
          : "bg-transparent"
      }`}
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">
        {/* ✅ Elegant Logo */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="text-2xl font-bold tracking-tight bg-gradient-to-r from-black to-gray-700 bg-clip-text text-transparent cursor-pointer"
        >
          Faith Frames
        </motion.div>

        {/* ✅ Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-10">
          {navLinks.map((link, index) => (
            <motion.div
              key={link.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -2 }}
            >
              <Link
                href={link.href}
                className="relative text-gray-800 hover:text-black font-medium transition group"
              >
                {link.name}
                {/* Smooth animated underline */}
                <span className="absolute left-0 -bottom-1 w-0 h-[1.5px] bg-black transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* ✅ Desktop Auth Buttons */}
        <div className="hidden lg:flex items-center gap-4">
          {/* Log in Button with Shine */}
          <Link
            href="/login"
            className="relative px-6 py-2 rounded-md border border-gray-300 text-gray-800 font-medium overflow-hidden group transition hover:border-black hover:scale-[1.03]"
          >
            <span className="relative z-10">Sign In</span>
            {/* Shine animation */}
            <span className="absolute top-0 left-[-50%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent transform rotate-12 group-hover:left-[120%] transition-all duration-700 ease-out"></span>
          </Link>

          {/* Sign Up Button - Black with Shine */}
          <Link
            href="/signup"
            className="relative px-6 py-2 rounded-md bg-black text-white font-medium overflow-hidden group transition hover:bg-gray-900 hover:scale-[1.03] shadow-sm"
          >
            <span className="relative z-10">Sign Up</span>
            {/* Shine animation */}
            <span className="absolute top-0 left-[-50%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent transform rotate-12 group-hover:left-[120%] transition-all duration-700 ease-out"></span>
          </Link>
        </div>

        {/* ✅ Premium Hamburger Button */}
        <button
          className="lg:hidden flex flex-col justify-center items-center space-y-1.5 focus:outline-none"
          onClick={() => setIsOpen(true)}
        >
          <motion.span
            className="block h-[2px] w-6 bg-black rounded-sm"
          />
          <motion.span
            className="block h-[2px] w-6 bg-black rounded-sm"
          />
          <motion.span
            className="block h-[2px] w-6 bg-black rounded-sm"
          />
        </button>
      </div>

      {/* ✅ Mobile Menu Slide-in */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mobile-menu"
            className="lg:hidden fixed inset-0 bg-white/95 backdrop-blur-lg flex flex-col items-center justify-center space-y-8 shadow-lg"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", stiffness: 80 }}
          >
            {/* ✅ Close Button (top-right corner) */}
            <motion.button
              className="absolute top-6 right-6 p-3 rounded-full bg-black text-white hover:bg-gray-900 shadow-md transition"
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(false)}
            >
              <X size={26} />
            </motion.button>

            {/* Mobile Links */}
            {navLinks.map((link, index) => (
              <motion.div
                key={link.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  href={link.href}
                  className="text-2xl font-medium text-gray-800 hover:text-black transition"
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              </motion.div>
            ))}

            {/* Divider for better visual separation */}
            <div className="w-2/3 h-[1px] bg-gray-200 my-4" />

            {/* ✅ Mobile Auth Buttons with Shine */}
            <div className="flex flex-col gap-4 mt-6 w-2/3">
              <Link
                href="/login"
                className="relative px-6 py-3 rounded-md border border-gray-300 text-gray-800 text-center overflow-hidden group hover:border-black"
                onClick={() => setIsOpen(false)}
              >
                <span className="relative z-10">Sign in</span>
                <span className="absolute top-0 left-[-50%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent rotate-12 group-hover:left-[120%] transition-all duration-700 ease-out"></span>
              </Link>

              <Link
                href="/signup"
                className="relative px-6 py-3 rounded-md bg-black text-white text-center overflow-hidden group hover:bg-gray-900"
                onClick={() => setIsOpen(false)}
              >
                <span className="relative z-10">Sign Up</span>
                <span className="absolute top-0 left-[-50%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 to-transparent rotate-12 group-hover:left-[120%] transition-all duration-700 ease-out"></span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
