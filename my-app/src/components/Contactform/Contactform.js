"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, User, MessageSquare } from "lucide-react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 2500);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 via-white to-blue-100 px-6 py-20 overflow-hidden">
      {/* Animated Blobs */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-10 left-1/3 w-72 h-72 bg-blue-400/30 blur-[130px] rounded-full animate-float-slow"></div>
        <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-indigo-300/25 blur-[130px] rounded-full animate-float-medium"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-3xl bg-white/70 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-2xl p-10 sm:p-12 md:p-14"
      >
        {/* Title */}
        <div className="text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-2"
          >
            Contact <span className="text-blue-600">Faith Frames</span>
          </motion.h2>
          <p className="text-gray-500 text-base max-w-md mx-auto leading-relaxed">
            We’d love to hear from you. Drop your message below — we’ll get back
            to you within 24 hours.
          </p>
        </div>

        {/* Contact Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div className="relative">
            <User className="absolute left-4 top-4 text-blue-600" size={18} />
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Your Name"
              className="w-full py-3 pl-11 pr-4 bg-white/80 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all placeholder-gray-400 shadow-sm"
            />
          </div>

          {/* Email Field */}
          <div className="relative">
            <Mail className="absolute left-4 top-4 text-blue-600" size={18} />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="Your Email"
              className="w-full py-3 pl-11 pr-4 bg-white/80 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all placeholder-gray-400 shadow-sm"
            />
          </div>

          {/* Message Field */}
          <div className="relative">
            <MessageSquare
              className="absolute left-4 top-4 text-blue-600"
              size={18}
            />
            <textarea
              name="message"
              required
              rows="4"
              value={formData.message}
              onChange={handleChange}
              placeholder="Write your message..."
              className="w-full py-3 pl-11 pr-4 bg-white/80 border border-gray-200 rounded-xl text-gray-700 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all placeholder-gray-400 shadow-sm resize-none"
            ></textarea>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-lg shadow-md hover:shadow-lg transition-all"
          >
            {isSubmitted ? "Message Sent ✅" : "Send Message"}
          </motion.button>
        </form>

        {/* Contact Info */}
        <div className="flex flex-col sm:flex-row justify-center sm:justify-between items-center gap-4 mt-10 text-gray-600 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="text-blue-600" size={18} /> +91 98765 43210
          </div>
          <div className="flex items-center gap-2">
            <Mail className="text-blue-600" size={18} /> support@faithframes.in
          </div>
        </div>
      </motion.div>

      {/* Floating Keyframes */}
      <style jsx global>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes floatMedium {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(40px); }
        }
        .animate-float-slow { animation: floatSlow 18s ease-in-out infinite; }
        .animate-float-medium { animation: floatMedium 14s ease-in-out infinite; }
      `}</style>
    </section>
  );
}
