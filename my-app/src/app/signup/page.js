"use client";
import React from 'react'
import Signin from '../../components/Signin/Signin'
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
const page = () => {
  return (
    <div>
      <Navbar />
      <Signin />
      <Footer />
    </div>
  )
}

export default page
