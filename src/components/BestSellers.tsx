import AnimatedSection from "./AnimatedSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useProducts } from "@/hooks/useProducts";

const BestSellers = () => {
  const { addItem } = useCart();
  const { data: products = [] } = useProducts();

  const featured = products.filter((p) => p.is_best_selling).slice(0, 6);

  if (featured.length === 0) return null;

  return (
    <section className="py-20 bg-muted/50">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-14">
            <Badge variant="secondary" className="mb-4 font-body">⭐ Customer Favorites</Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              Best Sellers
            </h2>
            <p className="text-muted-foreground font-body text-lg max-w-xl mx-auto">
              The most loved items from our kitchen, tried and trusted by thousands
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featured.map((product, i) => (
            <AnimatedSection key={product.id} delay={i * 0.1}>
              <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 group">
                <div className="relative h-44 bg-muted overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl opacity-40">
                      {product.categories?.icon || "🍽️"}
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 bg-gold text-gold-foreground text-[10px] font-body">
                    Best Seller
                  </Badge>
                </div>
                <div className="p-5">
                  <h3 className="font-display font-semibold text-card-foreground text-base mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-body">{product.unit}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-2xl font-bold text-primary font-body">₹{product.price}</span>
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
      </div>
    </section>
  );
};

export default BestSellers;
