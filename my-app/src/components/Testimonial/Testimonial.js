"use client";

import React from "react";
import { motion } from "framer-motion";

const testimonials = [
  {
    text: "Faith Frames fills my screen with daily hope and spiritual peace. I feel more connected every day.",
    name: "Sarah M.",
    role: "Teacher",
    img: "https://i.pravatar.cc/100?img=1",
  },
  {
    text: "The wallpapers are so beautiful and uplifting. They remind me to stay grounded in my faith.",
    name: "James K.",
    role: "Student",
    img: "https://i.pravatar.cc/100?img=2",
  },
  {
    text: "Every day feels more peaceful with these quotes and images. Truly a blessing!",
    name: "Priya S.",
    role: "Designer",
    img: "https://i.pravatar.cc/100?img=3",
  },
  {
    text: "I love how simple and elegant it is. It feels like a daily spiritual companion.",
    name: "David R.",
    role: "Business Owner",
    img: "https://i.pravatar.cc/100?img=4",
  },
  {
    text: "This app makes my phone feel like a window to peace and positivity.",
    name: "Maria L.",
    role: "Blogger",
    img: "https://i.pravatar.cc/100?img=5",
  },
  {
    text: "It’s not just wallpapers, it’s a daily dose of faith and love. Highly recommend!",
    name: "William T.",
    role: "Engineer",
    img: "https://i.pravatar.cc/100?img=6",
  },
];

const Card = ({ t }) => (
  <div className="bg-gradient-to-b from-blue-100 via-white to-blue-100 rounded-xl p-5 shadow-md text-gray-800 w-[250px] sm:w-[280px]">
    <p className="text-sm leading-relaxed">{t.text}</p>
    <div className="mt-4 flex items-center gap-3">
      <img
        src={t.img}
        alt={t.name}
        className="w-8 h-8 rounded-full border border-gray-300"
      />
      <div>
        <p className="text-sm font-semibold text-gray-900">{t.name}</p>
        <span className="text-xs text-gray-500">{t.role}</span>
      </div>
    </div>
  </div>
);

const Testimonial = () => {
  // Duplicate the list multiple times for seamless scroll
  const repeatedTestimonials = [...testimonials, ...testimonials, ...testimonials];

  return (
    <section className="relative w-full bg-gradient-to-b from-[#000] to-black text-white overflow-hidden font-sans py-20 px-6 md:px-12">
      {/* ✅ Background Glow Blobs */}
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

      {/* ✅ Main Container */}
      <div className="relative z-10 max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
        {/* ✅ LEFT SIDE HEADING */}
        <div className="flex flex-col justify-center">
          <h2 className="text-3xl md:text-4xl font-bold leading-tight">
            What People Say About Us
          </h2>
          <p className="text-gray-300 mt-4 text-sm md:text-base max-w-sm">
            Join thousands of believers who use{" "}
            <span className="text-blue-200 font-semibold">Faith Frames</span> for
            daily inspiration, peace & spirituality.
          </p>
        </div>

        {/* ✅ RIGHT SIDE CAROUSEL */}
        <div className="relative flex justify-center gap-8 overflow-hidden h-[400px]">
          {/* Fade effect on top & bottom */}
          <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-black to-transparent z-20"></div>
          <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black to-transparent z-20"></div>

          {/* LEFT COLUMN -> moves DOWN */}
          <motion.div
            className="flex flex-col gap-6"
            animate={{ y: ["0%", "100%"] }}
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          >
            {repeatedTestimonials.map((t, idx) => (
              <Card key={`left-${idx}`} t={t} />
            ))}
          </motion.div>

          {/* RIGHT COLUMN -> moves UP */}
          <motion.div
            className="flex flex-col gap-6"
            animate={{ y: ["0%", "-100%"] }} // opposite direction
            transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
          >
            {repeatedTestimonials.map((t, idx) => (
              <Card key={`right-${idx}`} t={t} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Testimonial;
