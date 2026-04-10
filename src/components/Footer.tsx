import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-warm text-warm-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-display font-bold mb-3">Al-Sufi <span className="text-gold">Frozen Foods</span></h3>
            <p className="text-sm text-warm-foreground/70 font-body leading-relaxed">
              Premium frozen delicacies crafted with authentic spices and the finest ingredients.
            </p>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm font-body text-warm-foreground/70">
              <li><Link to="/menu" className="hover:text-gold transition-colors">Full Menu</Link></li>
              <li><a href="#about" className="hover:text-gold transition-colors">About Us</a></li>
              <li><a href="#contact" className="hover:text-gold transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-semibold mb-3">Contact</h4>
            <ul className="space-y-2 text-sm font-body text-warm-foreground/70">
              <li>📞 +91 98765 43210</li>
              <li>💬 WhatsApp Available</li>
              <li>📸 @alsufifrozenfoods</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-warm-foreground/10 pt-6 text-center text-xs text-warm-foreground/50 font-body">
          © {new Date().getFullYear()} Al-Sufi Frozen Foods. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
