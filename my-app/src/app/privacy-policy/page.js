"use client";

import React from "react";

import Navbar from "../../components/Navbar/Navbar";
import Newsletter from "../../components/Newsletter/Newsletter";
import Policyhero from "../../components/privacy-policyhero/privacy-policyhero";
import Footer from "../../components/Footer/Footer";

const Page = () => {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Navbar Section */}
      <Navbar />
      <Policyhero />
        {/* Newsletter Section */}
        <Newsletter />
   
      {/* Footer Section */}
      <Footer />
    </div>
  );
};

export default Page;
