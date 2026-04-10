import { useState, useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, MapPin, Clock } from "lucide-react";
import { motion } from "framer-motion";

const OrderConfirmation = () => {
  const { orderId } = useParams();
  const { user } = useAuth();

  // Redirect unauthenticated users
  if (!user) return <Navigate to="/auth" replace />;

  const { data: order } = useQuery({
    queryKey: ["order", orderId],
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
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-lg">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center pt-12 mb-8"
          >
            <div className="h-24 w-24 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-14 w-14 text-accent" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground font-body">Your delicious food is being prepared 🎉</p>
            <div className="mt-3 inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-body font-medium">
                <DeliveryCountdown order={order} />
              </span>
            </div>
          </motion.div>

          {order && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-body text-muted-foreground">Order ID</span>
                    <span className="font-mono text-xs">{order.id.slice(0, 12)}...</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-body text-muted-foreground">Status</span>
                    <Badge className="bg-blue-100 text-blue-800 font-body">{order.status}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-body text-muted-foreground">Payment</span>
                    <Badge variant="outline" className="font-body">{order.payment_method === "cod" ? "Cash on Delivery" : "UPI"}</Badge>
                  </div>
                  {(order as any).addresses && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-body text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Delivery</span>
                      <span className="text-sm font-body">{(order as any).addresses?.label} — {(order as any).addresses?.city}</span>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <p className="text-sm font-body font-semibold mb-2">Items</p>
                    {(order as any).order_items?.map((i: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm font-body">
                        <span>{i.product_name} × {i.quantity}</span>
                        <span>₹{i.subtotal}</span>
                      </div>
                    ))}
                  </div>
                  {order.coupon_discount > 0 && (
                    <div className="flex justify-between text-sm font-body text-accent">
                      <span>Coupon Discount</span>
                      <span>-₹{order.coupon_discount}</span>
                    </div>
                  )}
                  <div className="border-t pt-3 flex justify-between font-bold font-body">
                    <span>Total</span>
                    <span className="text-primary">₹{order.total}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          <div className="flex gap-3 mt-6">
            <Button asChild variant="outline" className="flex-1 font-body">
              <Link to="/orders">My Orders</Link>
            </Button>
            <Button asChild className="flex-1 font-body gap-2">
              <Link to={`/order-tracking/${orderId}`}>
                <Package className="h-4 w-4" /> Track Order
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

// Live countdown component
const DeliveryCountdown = ({ order }: { order: any }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!order) return <>Preparing your order...</>;

  const estMins = order.estimated_delivery_minutes;
  if (!estMins) return <>🕐 Delivery time will be assigned shortly</>;

  const deliveryAt = new Date(order.created_at).getTime() + estMins * 60 * 1000;
  const remaining = deliveryAt - now;

  if (remaining <= 0) return <>Your order should arrive any moment!</>;

  const mins = Math.floor(remaining / 60000);
  if (mins < 60) return <>🕐 Arriving in ~{mins} min</>;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return <>🕐 Arriving in ~{hrs}h {mins % 60}m</>;
  const days = Math.floor(hrs / 24);
  return <>🕐 Arriving in ~{days}d {hrs % 24}h</>;
};

export default OrderConfirmation;
