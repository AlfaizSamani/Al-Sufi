import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ShoppingCart, Search, LogOut, Shield, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { setIsOpen: setCartOpen, itemCount } = useCart();
  const { data: isAdmin } = useIsAdmin();
  const { data: settings } = useStoreSettings();
  const navigate = useNavigate();

  const logoUrl = settings?.logo_url;

  const links = [
    { name: "Home", href: "/", isHash: false },
    { name: "Menu", href: "/menu", isHash: false },
    ...(user ? [
      { name: "Orders", href: "/orders", isHash: false },
    ] : []),
    { name: "About", href: "#about", isHash: true },
    { name: "Contact", href: "#contact", isHash: true },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={`${logoUrl}?t=${Date.now()}`} alt="Al-Sufi" className="h-9 w-9 rounded-full object-cover" loading="eager" />
            ) : null}
            <span className="text-2xl font-display font-bold text-primary">Al-Sufi</span>
            <span className="text-sm font-body text-muted-foreground hidden sm:block">Frozen Foods</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map((link) =>
              link.isHash ? (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.location.pathname !== "/") {
                      navigate("/");
                      setTimeout(() => {
                        document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" });
                      }, 300);
                    } else {
                      document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors font-body cursor-pointer"
                >
                  {link.name}
                </a>
              ) : (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors font-body"
                >
                  {link.name}
                </Link>
              )
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-foreground/70" onClick={() => navigate("/menu")}>
              <Search className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-foreground/70"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="icon" className="text-primary" onClick={() => navigate("/admin")} title="Admin Panel">
                <Shield className="h-5 w-5" />
              </Button>
            )}
            {user ? (
              <Button variant="ghost" size="icon" onClick={() => navigate("/my-account")} className="text-foreground/70" title="My Account">
                <UserCircle className="h-5 w-5" />
              </Button>
            ) : (
              <Button size="sm" className="hidden md:inline-flex font-body" onClick={() => navigate("/auth")}>
                Login
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border bg-background overflow-hidden"
          >
            <div className="px-4 py-4 space-y-3">
              {links.map((link) =>
                link.isHash ? (
                  <a
                    key={link.name}
                    href={link.href}
                    className="block text-sm font-medium text-foreground/80 hover:text-primary font-body cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsOpen(false);
                      if (window.location.pathname !== "/") {
                        navigate("/");
                        setTimeout(() => {
                          document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" });
                        }, 300);
                      } else {
                        document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.href}
                    className="block text-sm font-medium text-foreground/80 hover:text-primary font-body"
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </Link>
                )
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="block text-sm font-medium text-primary hover:text-primary/80 font-body"
                  onClick={() => setIsOpen(false)}
                >
                  🛡️ Admin Panel
                </Link>
              )}
              {user ? (
                <>
                  <Link
                    to="/my-account"
                    className="block text-sm font-medium text-foreground/80 hover:text-primary font-body"
                    onClick={() => setIsOpen(false)}
                  >
                    👤 My Account
                  </Link>
                  <Button size="sm" variant="outline" className="w-full font-body" onClick={() => { signOut(); setIsOpen(false); }}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button size="sm" className="w-full font-body" onClick={() => { navigate("/auth"); setIsOpen(false); }}>
                  Login
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
