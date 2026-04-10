import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2, Clock, Truck, ChefHat, MapPin, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  { key: "placed", label: "Order Placed", icon: Package, description: "Your order has been received" },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2, description: "Restaurant confirmed your order" },
  { key: "preparing", label: "Preparing", icon: ChefHat, description: "Your food is being prepared" },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck, description: "On the way to you!" },
  { key: "delivered", label: "Delivered", icon: MapPin, description: "Enjoy your meal!" },
];

const statusColors: Record<string, string> = {
  placed: "bg-blue-100 text-blue-800",
  confirmed: "bg-yellow-100 text-yellow-800",
  preparing: "bg-orange-100 text-orange-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const OrderTracking = () => {
  const { orderId } = useParams();
  const { user } = useAuth();

  // Redirect unauthenticated users
  if (!user) return <Navigate to="/auth" replace />;

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-tracking", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(product_name, quantity, price, subtotal), addresses(address_line, city, label)")
        .eq("id", orderId!)
        .eq("user_id", user.id)  // IDOR fix: only fetch own orders
        .single();
      return data;
    },
    enabled: !!orderId && !!user,
    refetchInterval: 10000, // Poll every 10s for status updates
  });

  const currentStepIndex = order ? steps.findIndex((s) => s.key === order.status) : -1;
  const isCancelled = order?.status === "cancelled";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="pt-8 mb-6">
            <Button variant="ghost" size="sm" asChild className="font-body mb-4">
              <Link to="/orders"><ArrowLeft className="h-4 w-4 mr-1" /> My Orders</Link>
            </Button>
            <h1 className="text-2xl font-display font-bold text-foreground">Order Tracking</h1>
            {order && (
              <p className="text-sm text-muted-foreground font-mono mt-1">#{order.id.slice(0, 12)}</p>
            )}
          </div>

          {isLoading && (
            <div className="text-center py-20">
              <Clock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3 animate-spin" />
              <p className="text-muted-foreground font-body">Loading order...</p>
            </div>
          )}

          {order && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`${statusColors[order.status]} font-body text-sm px-3 py-1`}>
                  {order.status.replace(/_/g, " ").toUpperCase()}
                </Badge>
                {order.payment_method && (
                  <Badge variant="outline" className="font-body text-xs">
                    {order.payment_method === "cod" ? "Cash on Delivery" : "UPI"}
                  </Badge>
                )}
                {order.status !== "delivered" && order.status !== "cancelled" && (
                  <Badge variant="secondary" className="font-body text-xs">
                    <TrackingCountdown order={order} />
                  </Badge>
                )}
              </div>

              {/* Timeline Tracker */}
              <Card>
                <CardContent className="p-6">
                  {isCancelled ? (
                    <div className="text-center py-6">
                      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                        <Package className="h-8 w-8 text-destructive" />
                      </div>
                      <p className="font-display font-bold text-destructive text-lg">Order Cancelled</p>
                      <p className="text-sm text-muted-foreground font-body mt-1">This order has been cancelled</p>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {steps.map((step, idx) => {
                        const isCompleted = idx <= currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        const Icon = step.icon;
                        return (
                          <motion.div
                            key={step.key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex gap-4"
                          >
                            {/* Vertical line + circle */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                  isCompleted
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                              {idx < steps.length - 1 && (
                                <div
                                  className={`w-0.5 h-10 transition-colors ${
                                    idx < currentStepIndex ? "bg-primary" : "bg-muted"
                                  }`}
                                />
                              )}
                            </div>

                            {/* Label */}
                            <div className="pt-2 pb-4">
                              <p className={`text-sm font-body font-semibold ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                                {step.label}
                              </p>
                              <p className="text-xs text-muted-foreground font-body">{step.description}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delivery Address */}
              {(order as any).addresses && (
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm font-body font-semibold text-foreground mb-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> Delivery Address
                    </p>
                    <p className="text-sm font-body text-muted-foreground">
                      {(order as any).addresses.label} — {(order as any).addresses.address_line}, {(order as any).addresses.city}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Order Items */}
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm font-body font-semibold text-foreground mb-3">Items</p>
                  <div className="space-y-2">
                    {(order as any).order_items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm font-body">
                        <span className="text-muted-foreground">{item.product_name} × {item.quantity}</span>
                        <span>₹{item.subtotal}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t mt-3 pt-3 space-y-1">
                    <div className="flex justify-between text-sm font-body">
                      <span className="text-muted-foreground">Subtotal</span><span>₹{order.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-sm font-body">
                      <span className="text-muted-foreground">GST</span><span>₹{order.gst_amount}</span>
                    </div>
                    <div className="flex justify-between text-sm font-body">
                      <span className="text-muted-foreground">Delivery</span><span>{order.delivery_fee === 0 ? "Free" : `₹${order.delivery_fee}`}</span>
                    </div>
                    <div className="flex justify-between text-sm font-body">
                      <span className="text-muted-foreground">Packaging</span><span>₹{order.packaging_charge}</span>
                    </div>
                    {order.coupon_discount > 0 && (
                      <div className="flex justify-between text-sm font-body text-accent">
                        <span>Coupon ({order.coupon_code})</span><span>-₹{order.coupon_discount}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold font-body pt-2 border-t">
                      <span>Total</span><span className="text-primary">₹{order.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button asChild variant="outline" className="flex-1 font-body">
                  <Link to="/orders">All Orders</Link>
                </Button>
                <Button asChild className="flex-1 font-body">
                  <Link to="/menu">Order More</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

// Live countdown for tracking page
const TrackingCountdown = ({ order }: { order: any }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const estMins = order.estimated_delivery_minutes;
  if (!estMins) return <>🕐 Delivery time will be assigned shortly</>;

  const deliveryAt = new Date(order.created_at).getTime() + estMins * 60 * 1000;
  const remaining = deliveryAt - now;

  if (remaining <= 0) return <>🕐 Arriving any moment!</>;

  const mins = Math.floor(remaining / 60000);
  if (mins < 60) return <>🕐 ~{mins} min remaining</>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <>🕐 ~{hrs}h {mins % 60}m remaining</>;
  const days = Math.floor(hrs / 24);
  return <>🕐 ~{days}d {hrs % 24}h remaining</>;
};

export default OrderTracking;
