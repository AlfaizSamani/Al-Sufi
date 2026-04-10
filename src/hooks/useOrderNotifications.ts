import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const statusLabels: Record<string, string> = {
  placed: "Order Placed",
  confirmed: "Order Confirmed ✅",
  preparing: "Being Prepared 🍳",
  out_for_delivery: "Out for Delivery 🚚",
  delivered: "Delivered! 🎉",
  cancelled: "Order Cancelled ❌",
};

export const useOrderNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!user || subscribedRef.current) return;
    subscribedRef.current = true;

    const channel = supabase
      .channel("order-status-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new.status as string;
          const oldStatus = payload.old.status as string;
          if (newStatus !== oldStatus) {
            toast({
              title: statusLabels[newStatus] || `Status: ${newStatus}`,
              description: `Order #${(payload.new.id as string).slice(0, 8)} has been updated`,
            });
            queryClient.invalidateQueries({ queryKey: ["my-orders"] });
            queryClient.invalidateQueries({ queryKey: ["order-tracking"] });
          }
        }
      )
      .subscribe();

    return () => {
      subscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
};
