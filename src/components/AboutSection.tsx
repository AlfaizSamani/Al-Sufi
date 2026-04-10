import AnimatedSection from "./AnimatedSection";
import { Shield, Truck, Award, Clock } from "lucide-react";

const features = [
  { icon: Shield, title: "100% Halal", desc: "All products are certified halal" },
  { icon: Award, title: "Premium Quality", desc: "Made with finest ingredients" },
  { icon: Truck, title: "Fast Delivery", desc: "Delivered frozen to your door" },
  { icon: Clock, title: "Ready to Cook", desc: "Just fry, bake, or air-fry" },
];

const AboutSection = () => {
  return (
    <section id="about" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <AnimatedSection>
            <div>
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6">
                Crafted With
                <span className="text-primary"> Passion</span>
              </h2>
              <p className="text-muted-foreground font-body text-lg mb-6 leading-relaxed">
                Al-Sufi Frozen Foods brings you the finest frozen delicacies, handcrafted with premium ingredients 
                and authentic spices. From our kitchen to your table — every bite tells a story of quality and tradition.
              </p>
              <p className="text-muted-foreground font-body mb-8 leading-relaxed">
                With over 70 varieties across chicken specials, kababs, samosas, tikkas, seekh kebabs, burger patties, 
                and vegetarian options — we have something for every taste and occasion.
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="grid grid-cols-2 gap-4">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl p-5 text-center hover:border-primary/30 transition-colors"
                >
                  <f.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-display font-semibold text-sm text-card-foreground mb-1">{f.title}</h3>
                  <p className="text-xs text-muted-foreground font-body">{f.desc}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
