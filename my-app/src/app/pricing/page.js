"use client";

import React from "react";
import Pricinghero from "../../components/pricinghero/pricinghero";
import Navbar from "../../components/Navbar/Navbar";
import Newsletter from "../../components/Newsletter/Newsletter";
import Pricing from "../../components/Pricing/Pricing";
import Footer from "../../components/Footer/Footer";

const Page = () => {
  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      {/* Navbar Section */}
      <Navbar />
      <Pricinghero />

          <Pricing />
        {/* Newsletter Section */}
        <Newsletter />
   
      {/* Footer Section */}
      <Footer />
    </div>
  );
};

export default Page;
