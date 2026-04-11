import { useEffect } from "react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const BrandingManager = () => {
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    if (settings) {
      // 1. Update Document Title
      const storeName = settings.store_name || "Al-Sufi Frozen Foods";
      const heroTitle = settings.hero_title || "Premium Frozen Delicacies";
      document.title = `${storeName} — ${heroTitle}`;

      // 2. Update Favicon dynamically with circular clipping
      const logoUrl = settings.logo_url;
      if (logoUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = logoUrl;
        
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const size = 64; // High-res favicon size
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          
          if (ctx) {
            // Draw circle clip
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            
            // Draw image scaled to fit
            ctx.drawImage(img, 0, 0, size, size);
            
            // Apply to link tag
            const circularLogoUrl = canvas.toDataURL("image/png");
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement("link");
              link.rel = "icon";
              document.getElementsByTagName("head")[0].appendChild(link);
            }
            link.href = circularLogoUrl;
          }
        };
      }
    }
  }, [settings]);

  return null;
};

export default BrandingManager;
