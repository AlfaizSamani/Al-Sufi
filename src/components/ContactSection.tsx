import AnimatedSection from "./AnimatedSection";
import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const ContactSection = () => {
  return (
    <section id="contact" className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              Get In Touch
            </h2>
            <p className="text-muted-foreground font-body text-lg max-w-xl mx-auto">
              Have a question or want to place a bulk order? We'd love to hear from you.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <div className="max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-2xl p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <a
                  href="tel:+919876543210"
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold font-body text-card-foreground">Call Us</p>
                    <p className="text-xs text-muted-foreground font-body">+91 98765 43210</p>
                  </div>
                </a>

                <a
                  href="https://wa.me/919876543210"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-accent/30 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold font-body text-card-foreground">WhatsApp</p>
                    <p className="text-xs text-muted-foreground font-body">Chat with us</p>
                  </div>
                </a>
              </div>

              <div className="flex items-center justify-center gap-4 pt-4">
                <Button variant="outline" size="sm" asChild className="font-body">
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                    📸 Instagram
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="font-body">
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
                    🎥 YouTube
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default ContactSection;
