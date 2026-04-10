import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload, ImageIcon, Search } from "lucide-react";

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", price: "", category_id: "", unit: "Per 1 KG", is_best_selling: false, image_url: "" });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, categories(name)").order("category_id").order("name");
      return data || [];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("sort_order");
      return data || [];
    },
  });

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let list = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p: any) => p.name.toLowerCase().includes(q));
    }

    if (filterCategory && filterCategory !== "all") {
      list = list.filter((p: any) => p.category_id === filterCategory);
    }

    switch (sortBy) {
      case "name_asc": list.sort((a: any, b: any) => a.name.localeCompare(b.name)); break;
      case "name_desc": list.sort((a: any, b: any) => b.name.localeCompare(a.name)); break;
      case "price_asc": list.sort((a: any, b: any) => a.price - b.price); break;
      case "price_desc": list.sort((a: any, b: any) => b.price - a.price); break;
      case "newest": list.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "oldest": list.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
    }

    return list;
  }, [products, searchQuery, filterCategory, sortBy]);

  const uploadImage = async (file: File, productId?: string) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${productId || crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm(f => ({ ...f, image_url: urlData.publicUrl }));
      toast({ title: "Image uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Product name is required");
      if (!form.price || isNaN(parseFloat(form.price))) throw new Error("Valid price is required");
      if (!form.category_id) throw new Error("Please select a category");

      const payload = {
        name: form.name.trim(),
        price: parseFloat(form.price),
        category_id: form.category_id,
        unit: form.unit || "Per 1 KG",
        is_best_selling: form.is_best_selling,
        image_url: form.image_url || null,
      };
      if (editing) {
        const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: editing ? "Product updated" : "Product added" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
    },
  });

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", price: "", category_id: "", unit: "Per 1 KG", is_best_selling: false, image_url: "" });
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ name: p.name, price: String(p.price), category_id: p.category_id, unit: p.unit, is_best_selling: p.is_best_selling, image_url: p.image_url || "" });
    setDialogOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Products</h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="font-body gap-2"><Plus className="h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">{editing ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-body">Product Image</Label>
                <div className="flex items-center gap-4">
                  {form.image_url ? (
                    <img src={form.image_url} alt="Preview" className="h-20 w-20 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-20 w-20 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadImage(e.target.files[0], editing?.id); }} />
                    <Button type="button" variant="outline" size="sm" className="font-body gap-1.5" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      <Upload className="h-3.5 w-3.5" />
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                    {form.image_url && (
                      <Button type="button" variant="ghost" size="sm" className="font-body text-destructive ml-1" onClick={() => setForm(f => ({ ...f, image_url: "" }))}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Name</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Price (₹)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} required className="font-body" />
              </div>
              <div className="space-y-2">
                <Label className="font-body">Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger className="font-body"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c) => <SelectItem key={c.id} value={c.id} className="font-body">{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Unit</Label>
                <Input value={form.unit} onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))} className="font-body" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_best_selling} onCheckedChange={(v) => setForm(f => ({ ...f, is_best_selling: v }))} />
                <Label className="font-body">Best Seller</Label>
              </div>
              <Button type="submit" className="w-full font-body" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 font-body"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-48 font-body"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body">All Categories</SelectItem>
            {categories?.map((c) => <SelectItem key={c.id} value={c.id} className="font-body">{c.icon} {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-44 font-body"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name_asc" className="font-body">Name A-Z</SelectItem>
            <SelectItem value="name_desc" className="font-body">Name Z-A</SelectItem>
            <SelectItem value="price_asc" className="font-body">Price Low-High</SelectItem>
            <SelectItem value="price_desc" className="font-body">Price High-Low</SelectItem>
            <SelectItem value="newest" className="font-body">Newest First</SelectItem>
            <SelectItem value="oldest" className="font-body">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground font-body mb-2">{filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""}</p>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-body w-12">Image</TableHead>
              <TableHead className="font-body">Name</TableHead>
              <TableHead className="font-body">Category</TableHead>
              <TableHead className="font-body">Price</TableHead>
              <TableHead className="font-body">Unit</TableHead>
              <TableHead className="font-body">Status</TableHead>
              <TableHead className="font-body text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-body font-medium">{p.name}</TableCell>
                <TableCell className="font-body text-muted-foreground">{p.categories?.name}</TableCell>
                <TableCell className="font-body">₹{p.price}</TableCell>
                <TableCell className="font-body text-muted-foreground">{p.unit}</TableCell>
                <TableCell>
                  {p.is_best_selling && <Badge className="bg-gold text-gold-foreground text-[10px] font-body">Best Seller</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminProducts;
