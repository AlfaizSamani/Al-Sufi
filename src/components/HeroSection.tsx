import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-food.jpg";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const HeroOfferBadge = () => {
  const { data: settings } = useStoreSettings();
  const offer = settings?.hero_offer;
  if (!offer) return (
    <Badge className="bg-primary/90 text-primary-foreground mb-6 text-sm px-4 py-1.5 font-body">
      🔥 Flat 10% Off on First Order
    </Badge>
  );
  return (
    <Badge className="bg-primary/90 text-primary-foreground mb-6 text-sm px-4 py-1.5 font-body">
      🔥 {offer}
    </Badge>
  );
};

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Delicious frozen foods by Al-Sufi"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-warm/90 via-warm/70 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-20">
        <div className="max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HeroOfferBadge />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-4xl md:text-6xl lg:text-7xl font-display font-bold text-warm-foreground leading-tight mb-6"
          >
            Premium Frozen
            <span className="block text-gold">Delicacies</span>
            At Your Doorstep
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg md:text-xl text-warm-foreground/80 mb-8 font-body max-w-lg"
          >
            From crispy KFC-style nuggets to authentic seekh kababs — 70+ frozen delights crafted with premium ingredients.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button asChild size="lg" className="text-base font-body gap-2 px-8 py-6">
              <Link to="/menu">
                Explore Menu <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base font-body border-warm-foreground/30 text-warm-foreground bg-transparent hover:bg-warm-foreground/10 px-8 py-6"
              onClick={() => document.querySelector("#categories")?.scrollIntoView({ behavior: "smooth" })}
            >
              View Categories
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
