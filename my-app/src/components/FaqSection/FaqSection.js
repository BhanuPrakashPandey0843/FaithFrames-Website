"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";

const faqs = [
  {
    question: "How safe is my money with Faith Frames?",
    answer:
      "At Faith Frames, payment safety is our top priority. We use Stripe for global and Razorpay for Indian transactions—both PCI DSS Level 1 certified. All payments are processed securely with encryption and fraud protection. We never store your card or bank details."
  },
  {
    question: "What kind of spiritual wallpapers do you provide?",
    answer:
      "We provide high-quality Bible-based wallpapers designed to inspire faith and positivity. Available in English, Telugu, Hindi, and Tamil—each wallpaper is crafted to promote prayer, peace, and reflection. New designs are added regularly."
  },
  {
    question: "Can I request a custom wallpaper?",
    answer:
      "Yes! Faith Frames allows users to request custom Bible verse wallpapers in their preferred language or theme. Our team ensures each design reflects Christian values and uplifting messages."
  },
  {
    question: "Do you offer wallpapers for both mobile and desktop?",
    answer:
      "Absolutely. All wallpapers are optimized for both mobile and desktop devices, ensuring perfect fit, clarity, and quality across all screens."
  },
  {
    question: "Are the wallpapers free to download?",
    answer:
      "Faith Frames offers a one-time lifetime subscription — ₹10 for Indian users (Razorpay) and $3 globally (Stripe). This gives you unlimited lifetime access to all wallpapers without recurring charges."
  },
  {
    question: "How do I contact Faith Frames for support?",
    answer:
      "For support, email support@faithframes.in. For partnerships or admin queries, contact nagendra@faithframes.in. You can also reach us through our in-app support section — all messages are replied to within 24 hours."
  }
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const filteredFaqs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <section className="relative min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-100 py-20 px-6 lg:px-24">
      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center text-3xl md:text-5xl font-bold mb-4 text-gray-800"
      >
        You’ve Got Questions{" "}
        <span className="text-gray-500">About Faith Frames?</span>
      </motion.h2>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="text-center text-base md:text-lg text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed"
      >
        Find answers to the most common questions about our wallpapers and
        services. Can’t find yours? We’d love to help!
      </motion.p>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="relative max-w-2xl mx-auto flex flex-col md:flex-row gap-4 items-center mb-14"
      >
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search for a question..."
            className="w-full px-5 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm text-gray-700 placeholder-gray-400 backdrop-blur-sm bg-white/70"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md text-sm md:text-base font-medium"
        >
          Ask Our Team
        </motion.button>
      </motion.div>

      {/* FAQ List */}
      <div className="max-w-3xl mx-auto divide-y divide-gray-200 bg-white/70 backdrop-blur-md rounded-2xl shadow-md p-6 md:p-10">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="py-4"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex justify-between items-center text-left text-lg font-medium text-gray-800 hover:text-blue-700 transition-all"
              >
                {faq.question}
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown
                    size={20}
                    className={`text-gray-400 ${
                      openIndex === index ? "text-blue-500" : ""
                    }`}
                  />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="mt-3 text-gray-600 leading-relaxed text-sm md:text-base"
                  >
                    {faq.answer}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        ) : (
          <p className="text-center text-gray-400 py-8 text-base">
            No questions found. Try a different keyword.
          </p>
        )}
      </div>
    </section>
  );
}
