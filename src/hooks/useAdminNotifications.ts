import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";

/**
 * useAdminNotifications
 * 
 * Subscribes to real-time ORDER inserts via Supabase Realtime.
 * When a new order arrives:
 *   1. Shows an in-app toast notification
 *   2. Fires a browser push notification (if permission granted)
 *   3. Plays an alert sound
 *   4. Invalidates the admin-orders query to auto-refresh the table
 */
export const useAdminNotifications = () => {
  const queryClient  = useQueryClient();
  const channelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const { data: isAdmin } = useIsAdmin();

  // Request browser notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    // Only subscribe if the current user is an admin
    if (!isAdmin) return;

    // Create a Supabase Realtime channel for the orders table
    const channel = supabase
      .channel("admin-new-orders")
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "orders",
        },
        async (payload) => {
          const order = payload.new as any;
          const shortId = order.id?.slice(0, 8) ?? "—";
          const total   = order.total ?? "—";

          // 1. In-app toast
          toast({
            title: `🔔 New Order Received! #${shortId}`,
            description: `₹${total} — Check the Orders page to manage it.`,
            duration: 10000,
          });

          // 2. Browser push notification (works even if tab is in background)
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("🔔 New Order — Al-Sufi Admin", {
              body: `Order #${shortId} for ₹${total} just came in!`,
              icon: "/favicon.ico",
              badge: "/favicon.ico",
              tag: `order-${order.id}`,  // prevents duplicate notifications
              requireInteraction: true,   // stays until dismissed
            });
          }

          // 3. Play alert sound (subtle ping)
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
          } catch {
            // Audio not supported — silently skip
          }

          // 4. Refresh the orders table
          queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
          queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
          queryClient.invalidateQueries({ queryKey: ["admin-orders-count"] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [queryClient, isAdmin]);
};
