import Navbar from "../components/Navbar/Navbar";
import Hero from "../components/Hero/Hero";
import SecuritySection from "../components/SecuritySection/SecuritySection"
import FaqSection from "../components/FaqSection/FaqSection"
import Newsletter from "../components/Newsletter/Newsletter";
import Footer from "../components/Footer/Footer";
export default function Page() {
  return (
    <div>
      <Navbar />
      <Hero />
      <SecuritySection/>
      <FaqSection />
      <Newsletter />
      <Footer />
    </div>
  );
}
