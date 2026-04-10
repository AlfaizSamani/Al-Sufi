import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Search } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useTrackProductClick } from "@/hooks/useAnalytics";
import { Skeleton } from "@/components/ui/skeleton";

const Menu = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const [search, setSearch] = useState("");
  const { addItem } = useCart();
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const trackClick = useTrackProductClick();

  const filtered = useMemo(() => {
    let items = products;
    if (activeCategory !== "all") {
      items = items.filter((p) => p.category_id === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((p) => p.name.toLowerCase().includes(q));
    }
    return items;
  }, [activeCategory, search, products]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <div className="text-center mb-10 pt-8">
              <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">Our Menu</h1>
              <p className="text-muted-foreground font-body text-lg max-w-xl mx-auto">
                {products.length}+ frozen delicacies across {categories.length} categories
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <div className="max-w-md mx-auto mb-8 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 font-body"
              />
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              <Button
                variant={activeCategory === "all" ? "default" : "outline"}
                size="sm"
                className="font-body"
                onClick={() => setSearchParams({})}
              >
                All ({products.length})
              </Button>
              {categories.map((cat) => {
                const count = products.filter((p) => p.category_id === cat.id).length;
                return (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    className="font-body"
                    onClick={() => setSearchParams({ category: cat.id })}
                  >
                    {cat.icon} {cat.name} ({count})
                  </Button>
                );
              })}
            </div>
          </AnimatedSection>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl border border-border p-0 overflow-hidden">
                  <Skeleton className="h-40 w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-8 w-full mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((product, i) => (
                <AnimatedSection key={product.id} delay={Math.min(i * 0.03, 0.3)}>
                  <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300 group" onClick={() => trackClick(product.id, product.name)}>
                    <div className="relative h-40 bg-muted overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl opacity-40">
                          {product.categories?.icon || "🍽️"}
                        </div>
                      )}
                      {product.is_best_selling && (
                        <Badge className="absolute top-2 right-2 bg-gold text-gold-foreground text-[10px] font-body">
                          Best Seller
                        </Badge>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-display font-semibold text-card-foreground text-sm leading-tight mb-1">
                        {product.name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-body mb-3">{product.unit}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold text-primary font-body">₹{product.price}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 font-body text-xs group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                          onClick={() => addItem({ id: product.id, name: product.name, price: product.price, category: product.category_id, unit: product.unit, isBestSelling: product.is_best_selling })}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground font-body text-lg">No products found.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Menu;
