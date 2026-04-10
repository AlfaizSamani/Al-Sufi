import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import AnimatedSection from "@/components/AnimatedSection";
import { Package } from "lucide-react";

const statusSteps = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered"];
const statusColors: Record<string, string> = {
  placed: "bg-blue-100 text-blue-800",
  confirmed: "bg-yellow-100 text-yellow-800",
  preparing: "bg-orange-100 text-orange-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const Orders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(product_name, quantity, subtotal), addresses(label, address_line)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const cancelOrder = useMutation({
    mutationFn: async (orderId: string) => {
      // Explicit user_id guard in addition to DB-level RLS
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" as any })
        .eq("id", orderId)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast({ title: "Order cancelled" });
    },
  });

  if (!user) return <Navigate to="/auth" />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-3xl font-display font-bold text-foreground mb-8 pt-8">My Orders</h1>

          {orders?.length === 0 && (
            <div className="text-center py-20">
              <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-body">No orders yet</p>
            </div>
          )}

          <div className="space-y-4">
            {orders?.map((order: any, i: number) => {
              const currentStep = statusSteps.indexOf(order.status);
              const canCancel = ["placed", "confirmed"].includes(order.status);
              return (
                <AnimatedSection key={order.id} delay={i * 0.05}>
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-xs text-muted-foreground font-mono">{order.id.slice(0, 12)}...</p>
                          <p className="text-xs text-muted-foreground font-body mt-1">
                            {new Date(order.created_at).toLocaleDateString()} • {(order as any).addresses?.label}
                          </p>
                        </div>
                        <Badge className={`${statusColors[order.status]} font-body text-xs`}>
                          {order.status.replace(/_/g, " ")}
                        </Badge>
                      </div>

                      {/* Progress bar */}
                      {order.status !== "cancelled" && (
                        <div className="flex gap-1 mb-3">
                          {statusSteps.map((s, idx) => (
                            <div
                              key={s}
                              className={`h-1.5 flex-1 rounded-full transition-colors ${idx <= currentStep ? "bg-primary" : "bg-muted"}`}
                            />
                          ))}
                        </div>
                      )}

                      <div className="space-y-1">
                        {order.order_items?.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-sm font-body">
                            <span className="text-muted-foreground">{item.product_name} × {item.quantity}</span>
                            <span>₹{item.subtotal}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <span className="font-bold font-body text-primary">₹{order.total}</span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="font-body text-xs" asChild>
                            <Link to={`/order-tracking/${order.id}`}>Track</Link>
                          </Button>
                          {canCancel && (
                          <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive font-body text-xs"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to cancel this order?")) {
                                  cancelOrder.mutate(order.id);
                                }
                              }}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
