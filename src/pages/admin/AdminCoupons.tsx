import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_value: number;
  max_discount: number | null;
  usage_limit: number | null;
  used_count: number;
  is_first_order_only: boolean;
  is_active: boolean;
  expires_at: string | null;
}

const emptyCoupon = {
  code: "",
  description: "",
  discount_type: "percentage",
  discount_value: 0,
  min_order_value: 0,
  max_discount: null as number | null,
  usage_limit: null as number | null,
  is_first_order_only: false,
  is_active: true,
  expires_at: "",
};

const AdminCoupons = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyCoupon);

  const { data: coupons } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      return (data || []) as Coupon[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code.toUpperCase().trim(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        min_order_value: form.min_order_value,
        max_discount: form.max_discount || null,
        usage_limit: form.usage_limit || null,
        is_first_order_only: form.is_first_order_only,
        is_active: form.is_active,
        expires_at: form.expires_at || null,
      };
      if (editing) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editing);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: editing ? "Coupon updated" : "Coupon created" });
      setOpen(false);
      setEditing(null);
      setForm(emptyCoupon);
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast({ title: "Coupon deleted" });
    },
  });

  const openEdit = (c: Coupon) => {
    setForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: c.discount_value,
      min_order_value: c.min_order_value,
      max_discount: c.max_discount,
      usage_limit: c.usage_limit,
      is_first_order_only: c.is_first_order_only,
      is_active: c.is_active,
      expires_at: c.expires_at ? c.expires_at.split("T")[0] : "",
    });
    setEditing(c.id);
    setOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Coupons</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyCoupon); } }}>
          <DialogTrigger asChild>
            <Button className="font-body gap-2"><Plus className="h-4 w-4" /> Add Coupon</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body">Code</Label>
                  <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} placeholder="FIRST10" className="font-body uppercase" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Type</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm(f => ({ ...f, discount_type: v }))}>
                    <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Description</Label>
                <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="10% off first order" className="font-body" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body">Discount Value</Label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))} className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Min Order (₹)</Label>
                  <Input type="number" value={form.min_order_value} onChange={(e) => setForm(f => ({ ...f, min_order_value: Number(e.target.value) }))} className="font-body" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body">Max Discount (₹)</Label>
                  <Input type="number" value={form.max_discount ?? ""} onChange={(e) => setForm(f => ({ ...f, max_discount: e.target.value ? Number(e.target.value) : null }))} placeholder="No limit" className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Usage Limit</Label>
                  <Input type="number" value={form.usage_limit ?? ""} onChange={(e) => setForm(f => ({ ...f, usage_limit: e.target.value ? Number(e.target.value) : null }))} placeholder="Unlimited" className="font-body" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Expires At</Label>
                <Input type="date" value={form.expires_at} onChange={(e) => setForm(f => ({ ...f, expires_at: e.target.value }))} className="font-body" />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_first_order_only} onCheckedChange={(v) => setForm(f => ({ ...f, is_first_order_only: v }))} />
                <Label className="font-body">First Order Only</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
                <Label className="font-body">Active</Label>
              </div>
              <Button className="w-full font-body" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.code}>
                {saveMutation.isPending ? "Saving..." : editing ? "Update Coupon" : "Create Coupon"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {coupons?.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-body font-bold text-foreground">{c.code}</span>
                    <Badge variant={c.is_active ? "default" : "secondary"} className="text-xs">
                      {c.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {c.is_first_order_only && <Badge variant="outline" className="text-xs font-body">First Order</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {c.discount_type === "percentage" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                    {c.min_order_value > 0 ? ` • Min ₹${c.min_order_value}` : ""}
                    {c.max_discount ? ` • Max ₹${c.max_discount}` : ""}
                    {` • Used ${c.used_count}${c.usage_limit ? `/${c.usage_limit}` : ""}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteMutation.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {coupons?.length === 0 && <p className="text-muted-foreground font-body text-center py-8">No coupons yet. Create your first one!</p>}
      </div>
    </div>
  );
};

export default AdminCoupons;
