import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AddressPicker from "@/components/AddressPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import {
  User, MapPin, Plus, Trash2, Phone, Mail, Pencil, Save, Loader2,
  ShoppingBag, Package, Clock, CheckCircle, XCircle, LogOut, ChevronRight, CalendarDays
} from "lucide-react";
import { format } from "date-fns";

const MyAccount = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: addresses, isLoading: addressesLoading } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("addresses").select("*").eq("user_id", user!.id).order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch order stats
  const { data: orderStats } = useQuery({
    queryKey: ["order-stats", user?.id],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, total, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      const all = orders || [];
      return {
        total: all.length,
        delivered: all.filter((o) => o.status === "delivered").length,
        active: all.filter((o) => !["delivered", "cancelled"].includes(o.status)).length,
        cancelled: all.filter((o) => o.status === "cancelled").length,
        totalSpent: all.filter((o) => o.status === "delivered").reduce((s, o) => s + Number(o.total), 0),
        recentOrders: all.slice(0, 3),
      };
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (form: { full_name: string; phone: string }) => {
      const { error } = await supabase.from("profiles").update(form).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditingProfile(false);
      toast({ title: "Profile updated ✅" });
    },
    onError: () => toast({ title: "Failed to update profile", variant: "destructive" }),
  });

  const saveAddress = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from("addresses").insert({ ...data, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast({ title: "Address saved ✅" });
    },
    onError: () => toast({ title: "Failed to save address", variant: "destructive" }),
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      // Check if address is used by any order
      const { data: linkedOrders } = await supabase.from("orders").select("id").eq("address_id", id).limit(1);
      if (linkedOrders && linkedOrders.length > 0) {
        throw new Error("linked");
      }
      const { error, status } = await supabase.from("addresses").delete().eq("id", id);
      if (error) {
        if (status === 409) throw new Error("linked");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast({ title: "Address deleted" });
    },
    onError: (err: any) => toast({
      title: err.message === "linked" ? "Cannot delete this address" : "Failed to delete address",
      description: err.message === "linked" ? "This address is linked to existing orders. You can add a new address instead." : undefined,
      variant: "destructive",
    }),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("addresses").update({ is_default: false }).eq("user_id", user!.id);
      const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast({ title: "Default address updated" });
    },
  });

  if (!user) return <Navigate to="/auth" replace />;

  const startEditProfile = () => {
    setProfileForm({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
    });
    setEditingProfile(true);
  };

  const profileComplete = !!(profile?.full_name && profile?.phone && profile?.email);
  const memberSince = user.created_at ? format(new Date(user.created_at), "MMM yyyy") : "";

  const statusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "cancelled": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl">

        {/* Header with avatar */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">{profile?.full_name || "Welcome!"}</h1>
            <p className="text-sm text-muted-foreground font-body flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> Member since {memberSince}
            </p>
            {!profileComplete && (
              <Badge variant="outline" className="mt-1 text-xs font-body border-amber-400 text-amber-600">
                Complete your profile
              </Badge>
            )}
          </div>
        </div>

        {/* Order Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate("/orders")}>
            <CardContent className="p-4 text-center">
              <ShoppingBag className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-display font-bold">{orderStats?.total ?? 0}</p>
              <p className="text-xs text-muted-foreground font-body">Total Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <p className="text-xl font-display font-bold">{orderStats?.active ?? 0}</p>
              <p className="text-xs text-muted-foreground font-body">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <p className="text-xl font-display font-bold">{orderStats?.delivered ?? 0}</p>
              <p className="text-xs text-muted-foreground font-body">Delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xl font-display font-bold text-primary">₹{(orderStats?.totalSpent ?? 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground font-body">Total Spent</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        {orderStats?.recentOrders && orderStats.recentOrders.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-primary" /> Recent Orders
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/orders")} className="font-body text-xs">
                View All <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {orderStats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/order-tracking/${order.id}`)}
                >
                  <div className="flex items-center gap-3">
                    {statusIcon(order.status)}
                    <div>
                      <p className="text-sm font-body font-medium">#{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground font-body">
                        {format(new Date(order.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-body font-semibold">₹{Number(order.total).toLocaleString()}</p>
                    <Badge variant="secondary" className="text-[10px] font-body capitalize">{order.status.replace("_", " ")}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Profile Section */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" /> Personal Info
            </CardTitle>
            {!editingProfile && (
              <Button variant="ghost" size="sm" onClick={startEditProfile}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : editingProfile ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="font-body text-xs">Full Name</Label>
                  <Input
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm((f) => ({ ...f, full_name: e.target.value }))}
                    className="font-body"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-body text-xs">Phone</Label>
                  <Input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
                    className="font-body"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-body text-xs">Email</Label>
                  <Input value={profile?.email || user.email || ""} disabled className="font-body bg-muted" />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => updateProfile.mutate(profileForm)}
                    disabled={updateProfile.isPending}
                    className="font-body"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {updateProfile.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingProfile(false)} className="font-body">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 font-body text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{profile?.full_name || <span className="text-muted-foreground italic">Not set</span>}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{profile?.phone || <span className="text-muted-foreground italic">Not set</span>}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile?.email || user.email}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Addresses Section */}
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" /> My Addresses
            </CardTitle>
            <Button size="sm" onClick={() => setPickerOpen(true)} className="font-body">
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent>
            {addressesLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : !addresses?.length ? (
              <div className="text-center py-6">
                <MapPin className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground font-body">No addresses saved yet</p>
                <Button variant="outline" size="sm" className="mt-2 font-body" onClick={() => setPickerOpen(true)}>
                  Add your first address
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <div key={addr.id} className="border rounded-lg p-3 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="font-body text-xs">{addr.label}</Badge>
                        {addr.is_default && <Badge className="font-body text-xs bg-primary/10 text-primary border-primary/20">Default</Badge>}
                      </div>
                      <p className="text-sm font-body text-foreground truncate">{addr.address_line}</p>
                      <p className="text-xs font-body text-muted-foreground">
                        {[addr.city, addr.pincode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!addr.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs font-body h-7 px-2"
                          onClick={() => setDefault.mutate(addr.id)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs font-body h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => deleteAddress.mutate(addr.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links & Sign Out */}
        <Separator className="my-6" />
        <div className="space-y-3">
          <Button variant="outline" onClick={() => navigate("/orders")} className="font-body w-full justify-between">
            <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> My Orders</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate("/menu")} className="font-body w-full justify-between">
            <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Browse Menu</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={async () => { await signOut(); navigate("/"); }}
            className="font-body w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sign Out
          </Button>
        </div>
      </div>

      <AddressPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSave={(data) => saveAddress.mutate(data)}
      />
      <Footer />
    </div>
  );
};

export default MyAccount;
