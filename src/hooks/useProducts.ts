import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DBProduct {
  id: string;
  name: string;
  price: number;
  category_id: string;
  unit: string;
  is_best_selling: boolean;
  is_active: boolean;
  image_url: string | null;
  description: string | null;
}

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name, icon)")
        .eq("is_active", true)
        .order("category_id")
        .order("name");
      return (data || []) as (DBProduct & { categories: { name: string; icon: string } | null })[];
    },
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });
};
