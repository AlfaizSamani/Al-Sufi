import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const AdminCategories = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ id: "", name: "", icon: "🍽️", description: "", sort_order: "0", is_active: true });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Category name is required");
      const id = form.id.trim() || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const payload = {
        id,
        name: form.name.trim(),
        icon: form.icon || "🍽️",
        description: form.description.trim() || null,
        sort_order: parseInt(form.sort_order) || 0,
        is_active: form.is_active,
      };

      if (editing) {
        const { error } = await supabase.from("categories").update({
          name: payload.name,
          icon: payload.icon,
          description: payload.description,
          sort_order: payload.sort_order,
          is_active: payload.is_active,
        }).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: editing ? "Category updated" : "Category added" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check if category has products
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("category_id", id);
      if (count && count > 0) throw new Error(`Cannot delete: ${count} product(s) use this category. Move or delete them first.`);
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Category deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ id: "", name: "", icon: "🍽️", description: "", sort_order: "0", is_active: true });
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ id: c.id, name: c.name, icon: c.icon, description: c.description || "", sort_order: String(c.sort_order), is_active: c.is_active });
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Categories</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="font-body gap-2"><Plus className="h-4 w-4" /> Add Category</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Edit Category" : "Add Category"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-body">Name</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required className="font-body" placeholder="e.g. Biryani" />
              </div>
              {!editing && (
                <div className="space-y-2">
                  <Label className="font-body">ID (slug, auto-generated if empty)</Label>
                  <Input value={form.id} onChange={(e) => setForm(f => ({ ...f, id: e.target.value }))} className="font-body" placeholder="e.g. biryani" />
                </div>
              )}
              <div className="space-y-2">
                <Label className="font-body">Icon (emoji)</Label>
                <Input value={form.icon} onChange={(e) => setForm(f => ({ ...f, icon: e.target.value }))} className="font-body text-2xl" maxLength={4} />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Description</Label>
                <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Sort Order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: e.target.value }))} className="font-body" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
                <Label className="font-body">Active</Label>
              </div>
              <Button type="submit" className="w-full font-body" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-body w-16">Icon</TableHead>
              <TableHead className="font-body">Name</TableHead>
              <TableHead className="font-body">ID</TableHead>
              <TableHead className="font-body">Sort</TableHead>
              <TableHead className="font-body">Status</TableHead>
              <TableHead className="font-body text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories?.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="text-2xl">{c.icon}</TableCell>
                <TableCell className="font-body font-medium">{c.name}</TableCell>
                <TableCell className="font-body text-muted-foreground text-xs">{c.id}</TableCell>
                <TableCell className="font-body">{c.sort_order}</TableCell>
                <TableCell className="font-body text-xs">{c.is_active ? "✅ Active" : "❌ Inactive"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(c.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminCategories;
