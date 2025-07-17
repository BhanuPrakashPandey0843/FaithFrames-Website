"use client";

import React from "react";
import { TrendingUp, BellRing, FileText } from "lucide-react";

const About = () => {
  return (
    <section className="relative bg-gradient-to-b from-blue-100 via-white to-blue-100 text-black px-6 md:px-12 py-20 font-sans">
      {/* ✅ Heading Section */}
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-blue-600 text-sm font-medium mb-2">About Us</p>
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">
          Bringing Faith & Inspiration to Your Screen
        </h2>
        <p className="text-gray-700 mt-4 max-w-2xl mx-auto text-sm md:text-base">
          Faith Frames is more than just a wallpaper app – it’s a source of daily 
          inspiration, featuring beautiful religious images, uplifting quotes, 
          and spiritual reminders to keep your faith alive every day.
        </p>
      </div>

      {/* ✅ Cards with Staircase Effect */}
      <div className="max-w-6xl mx-auto mt-16 flex flex-col md:flex-row gap-6">
        
        {/* Card 1 - Slightly Lower */}
        <div className="flex-1 p-6 rounded-xl bg-white/30 backdrop-blur-md border border-white/40 shadow-lg text-center hover:shadow-xl transition translate-y-6">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mt-4">Daily Spiritual Growth</h3>
          <p className="text-gray-700 text-sm mt-2">
            Receive wallpapers that inspire peace, positivity, and strengthen your faith every day.
          </p>
        </div>

        {/* Card 2 - Middle Level */}
        <div className="flex-1 p-6 rounded-xl bg-white/30 backdrop-blur-md border border-white/40 shadow-lg text-center hover:shadow-xl transition translate-y-0">
          <div className="flex justify-center">
            <div className="p-3 bg-green-100 rounded-full">
              <BellRing className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mt-4">Faithful Reminders</h3>
          <p className="text-gray-700 text-sm mt-2">
            Get gentle reminders of hope, prayer, and blessings right on your screen.
          </p>
        </div>

        {/* Card 3 - Slightly Higher */}
        <div className="flex-1 p-6 rounded-xl bg-white/30 backdrop-blur-md border border-white/40 shadow-lg text-center hover:shadow-xl transition -translate-y-6">
          <div className="flex justify-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mt-4">Inspirational Library</h3>
          <p className="text-gray-700 text-sm mt-2">
            Access a curated collection of holy images, quotes, and wallpapers for every moment.
          </p>
        </div>

      </div>
    </section>
  );
};

export default About;
