import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { Upload, ImageIcon } from "lucide-react";

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["store-settings-raw"],
    queryFn: async () => {
      const { data } = await supabase.from("store_settings").select("*");
      return data || [];
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
    }
  }, [data]);

  const uploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      update("logo_url", urlData.publicUrl);
      toast({ title: "Logo uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from("store_settings").update({ value }).eq("key", key);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings-raw"] });
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = (key: string, value: string) => setSettings(s => ({ ...s, [key]: value }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Store Settings</h1>
        <Button onClick={() => saveMutation.mutate()} className="font-body" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save All"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Financial</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">GST Percentage (%)</Label>
              <Input value={settings.gst_percentage || ""} onChange={(e) => update("gst_percentage", e.target.value)} className="font-body" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={settings.gst_inclusive === "true"} onCheckedChange={(v) => update("gst_inclusive", String(v))} />
              <Label className="font-body">GST Inclusive</Label>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Delivery Fee (₹)</Label>
              <Input value={settings.delivery_fee || ""} onChange={(e) => update("delivery_fee", e.target.value)} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Free Delivery Threshold (₹)</Label>
              <Input value={settings.free_delivery_threshold || ""} onChange={(e) => update("free_delivery_threshold", e.target.value)} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Packaging Charge (₹)</Label>
              <Input value={settings.packaging_charge || ""} onChange={(e) => update("packaging_charge", e.target.value)} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Minimum Order Value (₹)</Label>
              <Input value={settings.minimum_order_value || ""} onChange={(e) => update("minimum_order_value", e.target.value)} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Delivery Radius (KM)</Label>
              <Input value={settings.delivery_radius_km || ""} onChange={(e) => update("delivery_radius_km", e.target.value)} className="font-body" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="font-display text-lg">Branding & Contact</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label className="font-body">Store Logo</Label>
              <div className="flex items-center gap-4">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="h-16 w-16 rounded-full object-cover border border-border" />
                ) : (
                  <div className="h-16 w-16 rounded-full border border-dashed border-border flex items-center justify-center bg-muted">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); }} />
                  <Button type="button" variant="outline" size="sm" className="font-body gap-1.5" onClick={() => logoRef.current?.click()} disabled={uploading}>
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Uploading..." : "Upload Logo"}
                  </Button>
                  {settings.logo_url && (
                    <Button type="button" variant="ghost" size="sm" className="font-body text-destructive ml-1" onClick={() => update("logo_url", "")}>
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Store Name</Label>
              <Input value={settings.store_name || ""} onChange={(e) => update("store_name", e.target.value)} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Phone</Label>
              <Input value={settings.store_phone || ""} onChange={(e) => update("store_phone", e.target.value)} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">WhatsApp</Label>
              <Input value={settings.store_whatsapp || ""} onChange={(e) => update("store_whatsapp", e.target.value)} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Instagram</Label>
              <Input value={settings.store_instagram || ""} onChange={(e) => update("store_instagram", e.target.value)} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Hero Title</Label>
              <Input value={settings.hero_title || ""} onChange={(e) => update("hero_title", e.target.value)} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Hero Offer Badge</Label>
              <Input value={settings.hero_offer || ""} onChange={(e) => update("hero_offer", e.target.value)} className="font-body" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
