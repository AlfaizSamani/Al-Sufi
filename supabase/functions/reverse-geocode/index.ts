import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const lat = parseFloat(body?.lat);
    const lng = parseFloat(body?.lng);

    if (isNaN(lat) || isNaN(lng)) {
      return new Response(JSON.stringify({ error: 'lat and lng must be valid numbers' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return new Response(JSON.stringify({ error: 'lat/lng out of valid range' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
      {
        headers: {
          'User-Agent': 'AlSufiFrozenFoods/1.0',
          'Accept-Language': 'en',
        },
      }
    );

    const data = await res.json();
    const addr = data.address || {};

    // Build detailed address from components
    const parts = [
      addr.house_number,
      addr.road || addr.pedestrian,
      addr.neighbourhood || addr.suburb,
      addr.city_district,
      addr.city || addr.town || addr.village,
      addr.state_district || addr.county,
      addr.state,
      addr.postcode,
    ].filter(Boolean);

    const detailedAddress = parts.join(', ') || data.display_name || '';

    return new Response(JSON.stringify({
      address_line: detailedAddress,
      city: addr.city || addr.town || addr.village || addr.county || '',
      pincode: addr.postcode || '',
      latitude: lat,
      longitude: lng,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Geocoding failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
