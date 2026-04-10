import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapPin, LocateFixed, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddressFormData {
  label: string;
  address_line: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

interface AddressPickerProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: AddressFormData) => void;
  initialData?: Partial<AddressFormData>;
}

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };

const reverseGeocode = async (lat: number, lng: number) => {
  try {
    const { data, error } = await supabase.functions.invoke("reverse-geocode", {
      body: { lat, lng },
    });
    if (error) throw error;
    return data as { address_line: string; city: string; pincode: string };
  } catch {
    return null;
  }
};

const AddressPicker = ({ open, onClose, onSave, initialData }: AddressPickerProps) => {
  const [form, setForm] = useState<AddressFormData>({
    label: initialData?.label || "Home",
    address_line: initialData?.address_line || "",
    city: initialData?.city || "",
    pincode: initialData?.pincode || "",
    latitude: initialData?.latitude || DEFAULT_CENTER.lat,
    longitude: initialData?.longitude || DEFAULT_CENTER.lng,
  });
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        label: initialData?.label || "Home",
        address_line: initialData?.address_line || "",
        city: initialData?.city || "",
        pincode: initialData?.pincode || "",
        latitude: initialData?.latitude || DEFAULT_CENTER.lat,
        longitude: initialData?.longitude || DEFAULT_CENTER.lng,
      });
    }
  }, [open]);

  const useCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", description: "Your browser doesn't support location services", variant: "destructive" });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setForm((f) => ({ ...f, latitude, longitude }));
        const geo = await reverseGeocode(latitude, longitude);
        if (geo) {
          setForm((f) => ({
            ...f,
            address_line: geo.address_line,
            city: geo.city,
            pincode: geo.pincode,
          }));
          toast({ title: "Location detected ✅" });
        } else {
          toast({ title: "Location found", description: "Could not fetch address details. Please enter manually." });
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast({
          title: "Location access denied",
          description: err.code === 1 ? "Please allow location access in your browser settings" : "Could not get your location",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = () => {
    if (!form.address_line.trim()) {
      toast({ title: "Please enter an address", variant: "destructive" });
      return;
    }
    // Only include coordinates if they were actually detected (not default)
    const hasRealCoords = form.latitude !== DEFAULT_CENTER.lat || form.longitude !== DEFAULT_CENTER.lng;
    const saveData = {
      ...form,
      latitude: hasRealCoords ? form.latitude : null,
      longitude: hasRealCoords ? form.longitude : null,
    };
    onSave(saveData);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Select Address
          </DialogTitle>
        </DialogHeader>

        <Button
          variant="outline"
          className="w-full font-body gap-2 border-primary/30 hover:border-primary hover:bg-primary/5"
          onClick={useCurrentLocation}
          disabled={locating}
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LocateFixed className="h-4 w-4 text-primary" />
          )}
          {locating ? "Detecting location..." : "Use Current Location"}
        </Button>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="font-body text-xs">Label</Label>
            <Select value={form.label} onValueChange={(v) => setForm((f) => ({ ...f, label: v }))}>
              <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Home">🏠 Home</SelectItem>
                <SelectItem value="Office">🏢 Office</SelectItem>
                <SelectItem value="Other">📍 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="font-body text-xs">Full Address</Label>
            <Input
              value={form.address_line}
              onChange={(e) => setForm((f) => ({ ...f, address_line: e.target.value }))}
              className="font-body"
              placeholder="Click 'Use Current Location' or type your address"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="font-body text-xs">City</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="font-body" />
            </div>
            <div className="space-y-1">
              <Label className="font-body text-xs">Pincode</Label>
              <Input value={form.pincode} onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value }))} className="font-body" />
            </div>
          </div>
          {(form.latitude !== DEFAULT_CENTER.lat || form.longitude !== DEFAULT_CENTER.lng) && (
            <p className="text-xs text-muted-foreground font-body">
              📍 {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
            </p>
          )}
          <Button onClick={handleSave} className="w-full font-body">Save Address</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddressPicker;
