import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useAdminNotifications = () => {
  const { data: isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!isAdmin || subscribedRef.current) return;
    subscribedRef.current = true;

    const channel = supabase
      .channel("admin-order-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          toast({
            title: "🔔 New Order Received!",
            description: `Order #${(payload.new.id as string).slice(0, 8)} — ₹${payload.new.total}`,
          });
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
          queryClient.invalidateQueries({ queryKey: ["admin-orders-count"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const newStatus = payload.new.status as string;
          const oldStatus = payload.old.status as string;
          if (newStatus === "cancelled" && oldStatus !== "cancelled") {
            toast({
              title: "❌ Order Cancelled",
              description: `Order #${(payload.new.id as string).slice(0, 8)} was cancelled by the customer`,
              variant: "destructive",
            });
            queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
          }
        }
      )
      .subscribe();

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);
};
