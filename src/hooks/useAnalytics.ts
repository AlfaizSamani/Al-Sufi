import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const getSessionId = () => {
  let id = sessionStorage.getItem("analytics_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("analytics_session_id", id);
  }
  return id;
};

export const useAnalyticsTracker = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const pageEntryTime = useRef(Date.now());
  const lastPath = useRef(pathname);
  const sessionId = useRef(getSessionId());

  // Track page view and time spent
  useEffect(() => {
    const now = Date.now();
    // Record time spent on previous page
    if (lastPath.current && lastPath.current !== pathname) {
      const duration = Math.round((now - pageEntryTime.current) / 1000);
      if (duration > 1) {
        supabase.from("analytics_events").insert({
          user_id: user?.id || null,
          session_id: sessionId.current,
          event_type: "page_view",
          page_path: lastPath.current,
          duration_seconds: duration,
        }).then();
      }
    }

    // Reset for new page
    pageEntryTime.current = now;
    lastPath.current = pathname;

    // On unmount / tab close, record final page using keepalive fetch (supports headers unlike sendBeacon)
    const handleUnload = () => {
      const dur = Math.round((Date.now() - pageEntryTime.current) / 1000);
      if (dur > 1) {
        // Use fetch with keepalive — unlike sendBeacon, this supports auth headers
        supabase.from("analytics_events").insert({
          user_id: user?.id || null,
          session_id: sessionId.current,
          event_type: "page_view",
          page_path: pathname,
          duration_seconds: dur,
        }).then();
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [pathname, user]);
};

export const useTrackProductClick = () => {
  const { user } = useAuth();
  const sessionId = useRef(getSessionId());

  return useCallback((productId: string, productName: string) => {
    supabase.from("analytics_events").insert({
      user_id: user?.id || null,
      session_id: sessionId.current,
      event_type: "product_click",
      product_id: productId,
      product_name: productName,
    }).then();
  }, [user]);
};

export const useTrackCartEvent = () => {
  const { user } = useAuth();
  const sessionId = useRef(getSessionId());

  return useCallback((eventType: "add_to_cart" | "remove_from_cart", productId: string, productName: string) => {
    supabase.from("analytics_events").insert({
      user_id: user?.id || null,
      session_id: sessionId.current,
      event_type: eventType,
      product_id: productId,
      product_name: productName,
    }).then();
  }, [user]);
};
