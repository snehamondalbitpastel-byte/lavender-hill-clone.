import AnnouncementBar from "./components/AnnouncementBar";
import Header from "./components/Header";
import Hero from "./components/Hero";
import WhyLavenderHill from "./components/WhyLavenderHill";
import ShopByCategory from "./components/ShopByCategory";
import AsStyledByYou from "./components/AsStyledByYou";
import Testimonials from "./components/Testimonials";
import FeaturedCollections from "./components/FeaturedCollections";
import PressLogos from "./components/PressLogos";
import BehindTheBrand from "./components/BehindTheBrand";
import FooterFeatures from "./components/FooterFeatures";
import ScrollingText from "./components/ScrollingText";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <main>
        <Hero />
        <WhyLavenderHill />
        <ShopByCategory />
        <Testimonials />
        <FeaturedCollections />
        <PressLogos />
        <BehindTheBrand />
        <AsStyledByYou />
      </main>
      <FooterFeatures />
      <ScrollingText />
      <Footer />
    </>
  );
}
