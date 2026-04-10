import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { type Product } from "@/data/products";
import { toast } from "@/hooks/use-toast";
import { useTrackCartEvent } from "@/hooks/useAnalytics";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  subtotal: number;
  gstAmount: number;
  deliveryFee: number;
  packagingCharge: number;
  total: number;
  itemCount: number;
  meetsMinOrder: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const trackCartEvent = useTrackCartEvent();
  const { data: settings } = useStoreSettings();

  // Dynamic settings from DB, with sensible defaults
  const GST_PERCENTAGE = parseFloat(settings?.gst_percentage || "5");
  const DELIVERY_FEE = parseFloat(settings?.delivery_fee || "40");
  const FREE_DELIVERY_THRESHOLD = parseFloat(settings?.free_delivery_threshold || "999");
  const PACKAGING_CHARGE = parseFloat(settings?.packaging_charge || "20");
  const MINIMUM_ORDER_VALUE = parseFloat(settings?.minimum_order_value || "300");

  const addItem = useCallback((product: Product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsOpen(true);
    toast({ title: "Added to cart", description: product.name });
    trackCartEvent("add_to_cart", product.id, product.name);
  }, [trackCartEvent]);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.product.id === productId);
      if (item) trackCartEvent("remove_from_cart", productId, item.product.name);
      return prev.filter((i) => i.product.id !== productId);
    });
  }, [trackCartEvent]);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const gstAmount = Math.round(subtotal * (GST_PERCENTAGE / 100));
  const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : (items.length > 0 ? DELIVERY_FEE : 0);
  const packagingCharge = items.length > 0 ? PACKAGING_CHARGE : 0;
  const total = subtotal + gstAmount + deliveryFee + packagingCharge;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const meetsMinOrder = subtotal >= MINIMUM_ORDER_VALUE;

  return (
    <CartContext.Provider
      value={{
        items, addItem, removeItem, updateQuantity, clearCart,
        isOpen, setIsOpen,
        subtotal, gstAmount, deliveryFee, packagingCharge, total,
        itemCount, meetsMinOrder,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
};
