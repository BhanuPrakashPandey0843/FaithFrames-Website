"use client";

import React from "react";

import Navbar from "../../components/Navbar/Navbar";
import Newsletter from "../../components/Newsletter/Newsletter";
import Refundhero from "../../components/Refundhero/Refundhero";
import Footer from "../../components/Footer/Footer";

const Page = () => {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Navbar Section */}
      <Navbar />
      <Refundhero/>
        {/* Newsletter Section */}
        <Newsletter />
   
      {/* Footer Section */}
      <Footer />
    </div>
  );
};

export default Page;
