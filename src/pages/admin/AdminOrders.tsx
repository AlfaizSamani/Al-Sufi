import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Clock, ExternalLink } from "lucide-react";

const statusColors: Record<string, string> = {
  placed: "bg-blue-100 text-blue-800",
  confirmed: "bg-yellow-100 text-yellow-800",
  preparing: "bg-orange-100 text-orange-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const statuses = ["placed", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"];

const AdminOrders = () => {
  const queryClient = useQueryClient();

  const { data: orders, error: ordersError } = useQuery({
    queryKey: ["admin-orders-list"],
    queryFn: async () => {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      if (!ordersData?.length) return [];

      const userIds = [...new Set(ordersData.map((o) => o.user_id).filter(Boolean))] as string[];
      const addressIds = [...new Set(ordersData.map((o) => o.address_id).filter(Boolean))] as string[];
      const orderIds = ordersData.map((o) => o.id);

      const [profilesRes, addressesRes, itemsRes] = await Promise.all([
        userIds.length
          ? supabase.from("profiles").select("id, full_name, email, phone").in("id", userIds)
          : Promise.resolve({ data: [], error: null }),
        addressIds.length
          ? supabase.from("addresses").select("id, label, address_line, city, latitude, longitude").in("id", addressIds)
          : Promise.resolve({ data: [], error: null }),
        orderIds.length
          ? supabase.from("order_items").select("order_id, product_name, quantity, subtotal").in("order_id", orderIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (addressesRes.error) throw addressesRes.error;
      if (itemsRes.error) throw itemsRes.error;

      const profilesById = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
      const addressesById = new Map((addressesRes.data || []).map((a: any) => [a.id, a]));
      const itemsByOrderId = (itemsRes.data || []).reduce((acc: Record<string, any[]>, item: any) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push(item);
        return acc;
      }, {});

      return ordersData.map((order) => ({
        ...order,
        profiles: profilesById.get(order.user_id) || null,
        addresses: order.address_id ? addressesById.get(order.address_id) || null : null,
        order_items: itemsByOrderId[order.id] || [],
      }));
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: ({ id, status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders-count"] });
      toast({ title: "Order status updated" });
      // Send email notification for status update
      const emailType = status === "delivered" ? "delivered" : "status_update";
      supabase.functions.invoke("send-order-email", {
        body: { order_id: id, email_type: emailType },
      }).catch(() => {});
    },
  });

  const updateDeliveryTime = useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: number }) => {
      const { error } = await supabase.from("orders").update({ estimated_delivery_minutes: minutes } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders-list"] });
      toast({ title: "Delivery estimate updated" });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-foreground mb-6">Orders</h1>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-body">Order ID</TableHead>
              <TableHead className="font-body">Customer</TableHead>
              <TableHead className="font-body">Items</TableHead>
              <TableHead className="font-body">Address</TableHead>
              <TableHead className="font-body">Total</TableHead>
              <TableHead className="font-body">Status</TableHead>
              <TableHead className="font-body">Est. Delivery</TableHead>
              <TableHead className="font-body">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground font-body py-8">No orders yet</TableCell></TableRow>
            )}
            {orders?.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-body font-mono text-xs">{o.id.slice(0, 8)}...</TableCell>
                <TableCell className="font-body">
                  <div>{o.profiles?.full_name || "N/A"}</div>
                  <div className="text-xs text-muted-foreground">{o.profiles?.phone}</div>
                </TableCell>
                <TableCell className="font-body text-sm">
                  {o.order_items?.map((i: any) => `${i.product_name} x${i.quantity}`).join(", ") || "—"}
                  {o.notes && <p className="text-xs text-muted-foreground mt-1 italic">📝 {o.notes}</p>}
                </TableCell>
                <TableCell className="font-body text-xs text-muted-foreground">
                  {o.addresses?.label ? (
                    <div>
                      <span>{o.addresses.label} — {o.addresses.address_line}</span>
                      {o.addresses.latitude && o.addresses.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${o.addresses.latitude},${o.addresses.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline mt-0.5 text-[11px]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on Maps
                        </a>
                      )}
                    </div>
                  ) : "—"}
                </TableCell>
                <TableCell className="font-body font-semibold">₹{o.total}</TableCell>
                <TableCell>
                  <Select value={o.status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v })}>
                    <SelectTrigger className="w-40">
                      <Badge className={`${statusColors[o.status]} text-xs font-body`}>
                        {o.status.replace(/_/g, " ")}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s} className="font-body">{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <DeliveryTimeCell order={o} onSet={(mins) => updateDeliveryTime.mutate({ id: o.id, minutes: mins })} />
                </TableCell>
                <TableCell className="font-body text-sm text-muted-foreground">
                  {new Date(o.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// Inline component for delivery time per order
const DeliveryTimeCell = ({ order, onSet }: { order: any; onSet: (mins: number) => void }) => {
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState<"minutes" | "hours" | "days">("minutes");

  const handleSet = () => {
    const num = parseInt(value);
    if (!num || num <= 0) return;
    const multiplier = unit === "days" ? 1440 : unit === "hours" ? 60 : 1;
    onSet(num * multiplier);
    setValue("");
  };

  const estMins = order.estimated_delivery_minutes;
  const createdAt = new Date(order.created_at).getTime();

  const getRemainingLabel = () => {
    if (!estMins) return null;
    const deliveryAt = createdAt + estMins * 60 * 1000;
    const remaining = deliveryAt - Date.now();
    if (remaining <= 0) return "Due now";
    const mins = Math.floor(remaining / 60000);
    if (mins < 60) return `${mins}m left`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ${mins % 60}m left`;
    const days = Math.floor(hrs / 24);
    return `${days}d ${hrs % 24}h left`;
  };

  const formatSet = () => {
    if (!estMins) return null;
    if (estMins < 60) return `${estMins}m`;
    if (estMins < 1440) return `${Math.floor(estMins / 60)}h ${estMins % 60}m`;
    return `${Math.floor(estMins / 1440)}d ${Math.floor((estMins % 1440) / 60)}h`;
  };

  if (order.status === "delivered" || order.status === "cancelled") {
    return <span className="text-xs text-muted-foreground font-body">—</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="font-body text-xs gap-1 h-auto py-1">
          <Clock className="h-3 w-3" />
          {estMins ? (
            <span>{getRemainingLabel()}<br/><span className="text-muted-foreground">({formatSet()})</span></span>
          ) : (
            <span className="text-muted-foreground">Set time</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3">
        <p className="text-xs font-body font-semibold mb-2">Set delivery estimate</p>
        <div className="flex gap-1.5 mb-2">
          <Input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 40"
            className="font-body text-sm h-8"
          />
          <Select value={unit} onValueChange={(v: any) => setUnit(v)}>
            <SelectTrigger className="w-24 h-8 text-xs font-body">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minutes" className="font-body text-xs">min</SelectItem>
              <SelectItem value="hours" className="font-body text-xs">hrs</SelectItem>
              <SelectItem value="days" className="font-body text-xs">days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" className="w-full font-body text-xs h-7" onClick={handleSet} disabled={!value}>Set</Button>
      </PopoverContent>
    </Popover>
  );
};

export default AdminOrders;
