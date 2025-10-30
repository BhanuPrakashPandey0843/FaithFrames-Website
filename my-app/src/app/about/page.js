"use client";

import React from "react";
import Abouthero from "../../components/abouthero/abouthero";
import Navbar from "../../components/Navbar/Navbar";
import Newsletter from "../../components/Newsletter/Newsletter";
import About from "../../components/About/About";
import Footer from "../../components/Footer/Footer";

const Page = () => {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Navbar Section */}
      <Navbar />
      <Abouthero  />
      <About />

        
        {/* Newsletter Section */}
        <Newsletter />
   
      {/* Footer Section */}
      <Footer />
    </div>
  );
};

export default Page;
