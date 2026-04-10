import AnimatedSection from "./AnimatedSection";
import { categories, products } from "@/data/products";
import { Link } from "react-router-dom";

const CategoryShowcase = () => {
  return (
    <section id="categories" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <AnimatedSection>
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              Our Categories
            </h2>
            <p className="text-muted-foreground font-body text-lg max-w-xl mx-auto">
              Explore our wide range of premium frozen foods, crafted with the finest ingredients
            </p>
          </div>
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {categories.map((cat, i) => {
            const count = products.filter((p) => p.category === cat.id).length;
            return (
              <AnimatedSection key={cat.id} delay={i * 0.1}>
                <Link
                  to={`/menu?category=${cat.id}`}
                  className="group block bg-card rounded-xl border border-border p-6 text-center hover:border-primary/40 hover:shadow-lg transition-all duration-300"
                >
                  <span className="text-4xl md:text-5xl block mb-4">{cat.icon}</span>
                  <h3 className="font-display font-semibold text-card-foreground text-sm md:text-base mb-1">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-body">{count} items</p>
                </Link>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryShowcase;
