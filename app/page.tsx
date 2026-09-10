import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
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
