import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { AmbientMarquee } from "@/components/AmbientMarquee";
import { FreshFromTheCart } from "@/components/FreshFromTheCart";
import { Why } from "@/components/Why";
import { Menu } from "@/components/Menu";
import { Waffles } from "@/components/Waffles";
import { Visit } from "@/components/Visit";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <AmbientMarquee />
        <FreshFromTheCart />
        <Why />
        <Menu />
        <Waffles />
        <Visit />
      </main>
      <Footer />
      <CartDrawer />
    </>
  );
}
