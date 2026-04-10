import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const CartDrawer = () => {
  const {
    items, isOpen, setIsOpen,
    updateQuantity, removeItem,
    subtotal, gstAmount, deliveryFee, packagingCharge, total,
    meetsMinOrder, itemCount,
  } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!user) {
      setIsOpen(false);
      navigate("/auth");
      return;
    }
    setIsOpen(false);
    navigate("/checkout");
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your Cart ({itemCount})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-body">Your cart is empty</p>
              <Button
                variant="outline"
                className="mt-4 font-body"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/menu");
                }}
              >
                Browse Menu
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <AnimatePresence>
                {items.map((item) => (
                  <motion.div
                    key={item.product.id}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="bg-muted/50 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 pr-2">
                        <p className="font-body font-medium text-sm text-foreground">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground font-body">{item.product.unit}</p>
                      </div>
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-destructive/60 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-semibold font-body w-6 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-bold text-primary font-body">
                        ₹{item.product.price * item.quantity}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Order Summary */}
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">GST (5%)</span>
                <span>₹{gstAmount}</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">
                  Delivery {subtotal >= 999 && <Badge variant="secondary" className="text-[10px] ml-1">FREE</Badge>}
                </span>
                <span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span>
              </div>
              <div className="flex justify-between text-sm font-body">
                <span className="text-muted-foreground">Packaging</span>
                <span>₹{packagingCharge}</span>
              </div>
              <div className="flex justify-between text-base font-bold font-body pt-2 border-t border-border">
                <span>Total</span>
                <span className="text-primary">₹{total}</span>
              </div>

              {!meetsMinOrder && (
                <p className="text-xs text-destructive font-body text-center pt-1">
                  Minimum order value is ₹300. Add ₹{300 - subtotal} more.
                </p>
              )}

              <Button
                className="w-full mt-3 font-body"
                disabled={!meetsMinOrder}
                onClick={handleCheckout}
              >
                {!user ? "Login to Checkout" : "Proceed to Checkout"}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
