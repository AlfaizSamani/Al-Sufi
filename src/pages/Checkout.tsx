import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import Footer from "@/components/Footer";
import AddressPicker from "@/components/AddressPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Plus, Check, Tag, Banknote, Smartphone, Ticket, Clock } from "lucide-react";

const Checkout = () => {
  const { user } = useAuth();
  const { items, subtotal, gstAmount, deliveryFee, packagingCharge, total, meetsMinOrder, clearCart } = useCart();
  const navigate = useNavigate();
  const { data: storeSettings } = useStoreSettings();
  const gstLabel = storeSettings?.gst_percentage || "5";
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [validating, setValidating] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");

  const { data: addresses, refetch } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("addresses").select("*").eq("user_id", user!.id).order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  // Check if user is first-time orderer
  const { data: isFirstOrder } = useQuery({
    queryKey: ["is-first-order", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return (count ?? 0) === 0;
    },
    enabled: !!user,
  });

  // Fetch visible/active coupons
  const { data: availableCoupons } = useQuery({
    queryKey: ["available-coupons", isFirstOrder],
    queryFn: async () => {
      const { data } = await supabase.from("coupons").select("*").eq("is_active", true);
      if (!data) return [];
      const now = new Date();
      return data.filter((c: any) => {
        if (c.expires_at && new Date(c.expires_at) < now) return false;
        if (c.usage_limit && c.used_count >= c.usage_limit) return false;
        if (c.is_first_order_only && !isFirstOrder) return false;
        return true;
      });
    },
    enabled: isFirstOrder !== undefined,
  });

  // Auto-apply first-order coupon
  useEffect(() => {
    if (isFirstOrder && availableCoupons && !appliedCoupon) {
      const firstOrderCoupon = availableCoupons.find((c: any) => c.is_first_order_only);
      if (firstOrderCoupon && subtotal >= firstOrderCoupon.min_order_value) {
        setAppliedCoupon(firstOrderCoupon);
        setCouponCode(firstOrderCoupon.code);
        toast({ title: "First order discount applied! 🎉", description: `${firstOrderCoupon.discount_type === "percentage" ? `${firstOrderCoupon.discount_value}%` : `₹${firstOrderCoupon.discount_value}`} off` });
      }
    }
  }, [isFirstOrder, availableCoupons, subtotal]);

  const saveAddress = async (data: any) => {
    const { error } = await supabase.from("addresses").insert({ ...data, user_id: user!.id });
    if (error) {
      toast({ title: "Error saving address", description: error.message, variant: "destructive" });
    } else {
      refetch();
      toast({ title: "Address saved" });
    }
  };

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? Math.min(Math.round(subtotal * (appliedCoupon.discount_value / 100)), appliedCoupon.max_discount || Infinity)
      : Math.min(appliedCoupon.discount_value, subtotal)
    : 0;

  const finalTotal = total - couponDiscount;

  const applyCouponByCode = async (code: string) => {
    if (!code.trim()) return;
    setValidating(true);
    setCouponError("");
    try {
      const c = code.toUpperCase().trim();
      const { data: coupon } = await supabase.from("coupons").select("*").eq("code", c).eq("is_active", true).maybeSingle();
      if (!coupon) { setCouponError("Invalid coupon code"); return; }
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) { setCouponError("Coupon expired"); return; }
      if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) { setCouponError("Coupon usage limit reached"); return; }
      if (subtotal < coupon.min_order_value) { setCouponError(`Min order ₹${coupon.min_order_value} required`); return; }
      if (coupon.is_first_order_only && !isFirstOrder) { setCouponError("This coupon is for first-time orders only"); return; }
      setAppliedCoupon(coupon);
      setCouponCode(coupon.code);
      toast({ title: "Coupon applied! 🎉", description: coupon.description || `${coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`} off` });
    } catch {
      setCouponError("Error validating coupon");
    } finally {
      setValidating(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!selectedAddress) throw new Error("Please select an address");
      if (!meetsMinOrder) throw new Error("Minimum order not met");

      const { data: order, error: orderError } = await supabase.from("orders").insert({
        user_id: user!.id,
        address_id: selectedAddress,
        subtotal,
        gst_amount: gstAmount,
        delivery_fee: deliveryFee,
        packaging_charge: packagingCharge,
        total: finalTotal,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code || null,
        coupon_discount: couponDiscount,
        notes: orderNotes.trim() || null,
      }).select().single();

      if (orderError) throw orderError;

      const orderItems = items.map((i) => ({
        order_id: order.id,
        product_id: i.product.id,
        product_name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        subtotal: i.product.price * i.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      if (appliedCoupon) {
        // Atomic increment to prevent race condition with concurrent orders
        await supabase.rpc("increment_coupon_usage", { coupon_id: appliedCoupon.id });
      }

      return order;
    },
    onSuccess: (order) => {
      clearCart();
      navigate(`/order-confirmation/${order.id}`);
      toast({ title: "Order placed successfully! 🎉" });
      // Send order confirmation email (fire and forget)
      supabase.functions.invoke("send-order-email", {
        body: { order_id: order.id, email_type: "order_placed" },
      }).catch(() => {});
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!user) return <Navigate to="/auth" replace />;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-28">
          <div className="text-center">
            <p className="text-muted-foreground font-body text-lg mb-4">Your cart is empty</p>
            <Button onClick={() => navigate("/menu")} className="font-body">Browse Menu</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-display font-bold text-foreground mb-8 pt-8">Checkout</h1>

          {/* Address Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" /> Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {addresses?.map((addr: any) => (
                <button
                  key={addr.id}
                  onClick={() => setSelectedAddress(addr.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedAddress === addr.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="font-body text-xs">{addr.label}</Badge>
                    {selectedAddress === addr.id && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-sm font-body mt-1 text-foreground">{addr.address_line}</p>
                  <p className="text-xs text-muted-foreground font-body">{addr.city} {addr.pincode}</p>
                </button>
              ))}
              <Button variant="outline" className="w-full font-body gap-2" onClick={() => setPickerOpen(true)}>
                <Plus className="h-4 w-4" /> Add New Address
              </Button>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" /> Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                onClick={() => setPaymentMethod("cod")}
                className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3 ${paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
              >
                <Banknote className="h-5 w-5 text-accent" />
                <div className="flex-1">
                  <p className="text-sm font-body font-medium text-foreground">Cash on Delivery</p>
                  <p className="text-xs text-muted-foreground font-body">Pay when your order arrives</p>
                </div>
                {paymentMethod === "cod" && <Check className="h-4 w-4 text-primary" />}
              </button>
              <div className="w-full text-left p-3 rounded-lg border border-border opacity-50 flex items-center gap-3 cursor-not-allowed">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-body font-medium text-foreground">UPI Payment</p>
                  <p className="text-xs text-muted-foreground font-body">Google Pay, PhonePe, Paytm</p>
                </div>
                <Badge variant="secondary" className="font-body text-xs">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Coupon Code */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Tag className="h-5 w-5 text-primary" /> Coupon Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-accent bg-accent/5">
                  <div>
                    <p className="text-sm font-body font-medium text-foreground">{appliedCoupon.code}</p>
                    <p className="text-xs text-accent font-body">-₹{couponDiscount} discount applied</p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive font-body" onClick={removeCoupon}>Remove</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                    placeholder="Enter coupon code"
                    className="font-body uppercase"
                  />
                  <Button variant="outline" className="font-body shrink-0" onClick={() => applyCouponByCode(couponCode)} disabled={validating || !couponCode.trim()}>
                    {validating ? "..." : "Apply"}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-xs text-destructive font-body mt-1">{couponError}</p>}

              {/* Available coupons */}
              {!appliedCoupon && availableCoupons && availableCoupons.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-body text-muted-foreground flex items-center gap-1"><Ticket className="h-3 w-3" /> Available Coupons</p>
                  {availableCoupons.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => applyCouponByCode(c.code)}
                      className="w-full text-left p-3 rounded-lg border border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-body font-bold text-primary">{c.code}</span>
                        <Badge variant="outline" className="font-body text-xs">
                          {c.discount_type === "percentage" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                        </Badge>
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground font-body mt-1">{c.description}</p>}
                      <div className="flex gap-2 mt-1">
                        {c.min_order_value > 0 && <span className="text-[10px] text-muted-foreground font-body">Min ₹{c.min_order_value}</span>}
                        {c.is_first_order_only && <span className="text-[10px] text-accent font-body">First order only</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Notes */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> Special Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={orderNotes}
                onChange={(e) => {
                  if (e.target.value.length <= 500) setOrderNotes(e.target.value);
                }}
                placeholder="Any special requests? E.g., extra spicy, no onion, ring the bell..."
                className="font-body resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground font-body mt-1 text-right">
                {orderNotes.length}/500
              </p>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="font-display text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {items.map((i) => (
                  <div key={i.product.id} className="flex justify-between text-sm font-body">
                    <span>{i.product.name} × {i.quantity}</span>
                    <span>₹{i.product.price * i.quantity}</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-sm font-body"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal}</span></div>
                  <div className="flex justify-between text-sm font-body"><span className="text-muted-foreground">GST ({gstLabel}%)</span><span>₹{gstAmount}</span></div>
                  <div className="flex justify-between text-sm font-body"><span className="text-muted-foreground">Delivery</span><span>{deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}</span></div>
                  <div className="flex justify-between text-sm font-body"><span className="text-muted-foreground">Packaging</span><span>₹{packagingCharge}</span></div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm font-body text-accent"><span>Coupon Discount</span><span>-₹{couponDiscount}</span></div>
                  )}
                  <div className="flex justify-between text-base font-bold font-body pt-2 border-t">
                    <span>Total</span><span className="text-primary">₹{finalTotal}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full font-body text-base py-6"
            disabled={!selectedAddress || !meetsMinOrder || placeOrder.isPending}
            onClick={() => placeOrder.mutate()}
          >
            {placeOrder.isPending ? "Placing Order..." : `Place Order (COD) — ₹${finalTotal}`}
          </Button>
        </div>
      </main>
      <Footer />
      <AddressPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSave={saveAddress} />
    </div>
  );
};

export default Checkout;
