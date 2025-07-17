import Navbar from "../components/Navbar/Navbar";
import Hero from "../components/Hero/Hero";
import About from "../components/About/About";
import SecuritySection from "../components/SecuritySection/SecuritySection"
import FaqSection from "../components/FaqSection/FaqSection";
import Description from "../components/Description/Description";
import Newsletter from "../components/Newsletter/Newsletter";
import Footer from "../components/Footer/Footer";
import Testimonial from "../components/Testimonial/Testimonial";
export default function Page() {
  return (
    <div>
      <Navbar />
      <Hero />
      <About />
      <SecuritySection/>
      <Description />
      <FaqSection />
      <Testimonial />
      <Newsletter />
      <Footer />
    </div>
  );
}
