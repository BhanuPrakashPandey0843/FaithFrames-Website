"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Search } from "lucide-react";

const faqs = [
  {
    question: "How safe is my money with Faith Frames?",
    answer:
      "Faith Frames partners with trusted institutions to ensure a secure and peaceful experience. Your data and transactions are fully encrypted and handled with utmost care."
  },
  {
    question: "What kind of spiritual wallpapers do you provide?",
    answer:
      "We offer high-quality wallpapers inspired by nature, mindfulness, meditation, and sacred art—designed to bring serenity to your screens."
  },
  {
    question: "Can I request a custom wallpaper?",
    answer:
      "Yes! Faith Frames allows you to request personalized wallpapers that align with your spiritual journey or specific preferences."
  },
  {
    question: "Do you offer wallpapers for both mobile and desktop?",
    answer:
      "Absolutely. All wallpapers are optimized for various devices including smartphones, tablets, and desktops."
  },
  {
    question: "Are the wallpapers free to download?",
    answer:
      "We provide both free and premium wallpapers. Premium ones are crafted exclusively and available through a one-time purchase or subscription."
  },
  {
    question: "How do I contact Faith Frames for support?",
    answer:
      "You can reach our team anytime through the contact form on our website. We’re always here to help."
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
    <section className="relative min-h-screen bg-gradient-to-b from-blue-100 via-white to-blue-100 py-16 px-6 lg:px-20">
    
      {/* Heading */}
      <motion.h2
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-center text-3xl md:text-4xl font-semibold tracking-wide mb-4 leading-snug text-gray-700"
      >
        You’ve Got Questions <span className="text-gray-500">About Faith Frames?</span>
      </motion.h2>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-center text-base md:text-lg text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed"
      >
        Find answers to frequently asked questions about our spiritual wallpapers.  
        Can’t find what you’re looking for? Reach out to us anytime.
      </motion.p>

      {/* Search Bar + Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="relative max-w-2xl mx-auto flex flex-col md:flex-row gap-4 items-center mb-12"
      >
        <div className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search for a question..."
            className="w-full px-5 py-3 rounded-lg border border-gray-200 focus:border-gray-300 focus:ring-2 focus:ring-gray-100 transition-all shadow-sm text-gray-700 placeholder-gray-400"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>
        <button className="px-6 py-3 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-all shadow-sm text-sm md:text-base font-medium">
          Ask Our Team
        </button>
      </motion.div>

      {/* FAQ List */}
      <div className="max-w-3xl mx-auto divide-y divide-gray-100">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="py-5"
            >
              {/* Question */}
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex justify-between items-center text-left text-base md:text-lg font-medium text-gray-700 hover:text-gray-900 transition"
              >
                {faq.question}
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown size={20} className="text-gray-400" />
                </motion.div>
              </button>

              {/* Answer */}
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

      {/* Bottom Call-to-Action */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex justify-center mt-12"
      >
       
      </motion.div>
    </section>
  );
}
