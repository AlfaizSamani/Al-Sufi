-- =============================================================================
-- AL-SUFI CONNECT — COMPLETE DATABASE SCHEMA
-- Run this file to set up the entire database from scratch locally or on any
-- PostgreSQL-compatible host (Supabase, AWS RDS, Azure Database for PostgreSQL).
--
-- USAGE (Supabase local):
--   supabase db reset   (wipes and replays all migrations)
--   OR paste this directly in Supabase SQL editor
--
-- USAGE (raw PostgreSQL):
--   psql -U postgres -d your_db -f database.sql
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Helper triggers ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ── CATEGORIES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '🍽️',
  description TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories"        ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories"        ON public.categories;
DROP POLICY IF EXISTS "Admins can delete categories"        ON public.categories;

CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ── PRODUCTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id              UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT    NOT NULL,
  price           NUMERIC(10,2) NOT NULL,
  category_id     TEXT    NOT NULL REFERENCES public.categories(id),
  unit            TEXT    NOT NULL DEFAULT 'Per 1 KG',
  description     TEXT,
  image_url       TEXT,
  is_best_selling BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products"        ON public.products;
DROP POLICY IF EXISTS "Admins can update products"        ON public.products;
DROP POLICY IF EXISTS "Admins can delete products"        ON public.products;

CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── PROFILES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  phone      TEXT,
  email      TEXT,
  is_admin   BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles"  ON public.profiles;

CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── USER ROLES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_roles (
  id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role    app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles"  ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles"  ON public.user_roles FOR ALL    TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ── ADDRESSES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.addresses (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID    REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  label        TEXT    NOT NULL DEFAULT 'Home',
  address_line TEXT    NOT NULL,
  city         TEXT,
  pincode      TEXT,
  latitude     DOUBLE PRECISION,
  longitude    DOUBLE PRECISION,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own addresses"  ON public.addresses;
DROP POLICY IF EXISTS "Admins can read all addresses"   ON public.addresses;

CREATE POLICY "Users can manage own addresses" ON public.addresses FOR ALL TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all addresses" ON public.addresses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- ── ORDERS ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address_id                  UUID        REFERENCES public.addresses(id),
  status                      order_status NOT NULL DEFAULT 'placed',
  subtotal                    NUMERIC(10,2) NOT NULL DEFAULT 0,
  gst_amount                  NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee                NUMERIC(10,2) NOT NULL DEFAULT 0,
  packaging_charge            NUMERIC(10,2) NOT NULL DEFAULT 0,
  total                       NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes                       TEXT,
  payment_method              TEXT DEFAULT 'cod',
  payment_status              TEXT DEFAULT 'pending',
  payment_id                  TEXT,
  coupon_code                 TEXT,
  coupon_discount             NUMERIC NOT NULL DEFAULT 0,
  estimated_delivery_minutes  INTEGER DEFAULT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own orders"              ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders"            ON public.orders;
DROP POLICY IF EXISTS "Users can update own orders before preparing" ON public.orders;
DROP POLICY IF EXISTS "Users can cancel own pending orders"    ON public.orders;
DROP POLICY IF EXISTS "Admins can manage all orders"           ON public.orders;

CREATE POLICY "Users can view own orders"   ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Customers may ONLY move status → cancelled, and only when in placed/confirmed
CREATE POLICY "Users can cancel own pending orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('placed'::public.order_status, 'confirmed'::public.order_status))
  WITH CHECK (auth.uid() = user_id AND status = 'cancelled'::public.order_status);

CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE OR REPLACE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── ORDER ITEMS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID    REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id   UUID    REFERENCES public.products(id) NOT NULL,
  product_name TEXT    NOT NULL,
  price        NUMERIC(10,2) NOT NULL,
  quantity     INT     NOT NULL DEFAULT 1,
  subtotal     NUMERIC(10,2) NOT NULL
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own order items"   ON public.order_items;
DROP POLICY IF EXISTS "Users can create own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;

CREATE POLICY "Users can view own order items"   ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can create own order items" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can manage all order items" ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- ── STORE SETTINGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_settings (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT  UNIQUE NOT NULL,
  value      TEXT  NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read settings"  ON public.store_settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.store_settings;

CREATE POLICY "Anyone can read settings"  ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.store_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- ── COUPONS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT    NOT NULL UNIQUE,
  description        TEXT,
  discount_type      TEXT    NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value     NUMERIC NOT NULL DEFAULT 0,
  min_order_value    NUMERIC NOT NULL DEFAULT 0,
  max_discount       NUMERIC,
  usage_limit        INTEGER,
  used_count         INTEGER NOT NULL DEFAULT 0,
  is_first_order_only BOOLEAN NOT NULL DEFAULT false,
  is_active          BOOLEAN NOT NULL DEFAULT true,
  expires_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons"      ON public.coupons;

CREATE POLICY "Anyone can read active coupons" ON public.coupons FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Admins can manage coupons"      ON public.coupons FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- Atomic coupon increment (prevents race condition)
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = coupon_id AND is_active = true
    AND (usage_limit IS NULL OR used_count < usage_limit);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon is no longer valid or usage limit reached';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(UUID) TO authenticated;

-- ── FAQs ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.faqs (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  question   TEXT    NOT NULL,
  answer     TEXT    NOT NULL,
  category   TEXT    DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "FAQs are viewable by everyone" ON public.faqs;
DROP POLICY IF EXISTS "Admins can manage FAQs"        ON public.faqs;

CREATE POLICY "FAQs are viewable by everyone" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Admins can manage FAQs"        ON public.faqs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── POLICIES ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.policies (
  id         UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT    NOT NULL,
  content    TEXT    NOT NULL,
  slug       TEXT    UNIQUE NOT NULL,
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Policies are viewable by everyone" ON public.policies;
DROP POLICY IF EXISTS "Admins can manage policies"        ON public.policies;

CREATE POLICY "Policies are viewable by everyone" ON public.policies FOR SELECT USING (true);
CREATE POLICY "Admins can manage policies"        ON public.policies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── ANALYTICS EVENTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id       TEXT    NOT NULL,
  event_type       TEXT    NOT NULL,
  page_path        TEXT,
  product_id       UUID,
  product_name     TEXT,
  duration_seconds INTEGER,
  metadata         JSONB   DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can read analytics"          ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can manage analytics"        ON public.analytics_events;

CREATE POLICY "Anyone can insert analytics events" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read analytics"          ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can manage analytics"        ON public.analytics_events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_analytics_event_type  ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at  ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_product_id  ON public.analytics_events(product_id);

-- ── STORAGE BUCKETS ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images"       ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images"       ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images"       ON storage.objects;
DROP POLICY IF EXISTS "Branding assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload branding"             ON storage.objects;
DROP POLICY IF EXISTS "Admins can update branding"             ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete branding"             ON storage.objects;

CREATE POLICY "Product images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Admins can upload product images"       ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update product images"       ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete product images"       ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Branding assets are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "Admins can upload branding"              ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update branding"              ON storage.objects FOR UPDATE USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete branding"              ON storage.objects FOR DELETE USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

-- ── SEED DATA ─────────────────────────────────────────────────────────────────
INSERT INTO public.categories (id, name, icon, description, sort_order) VALUES
  ('chicken-specials', 'Chicken Specials', '🍗', 'Premium chicken delicacies, crispy & juicy', 1),
  ('kababs',           'Kababs',           '🍢', 'Authentic hand-crafted kababs', 2),
  ('samosa-tikka',     'Samosa & Tikka',   '🥟', 'Classic samosas & marinated tikkas', 3),
  ('seekh-burger',     'Seekh & Burger Patty', '🍔', 'Seekh kababs & gourmet burger patties', 4),
  ('veg-items',        'Veg Items',        '🥦', 'Delicious vegetarian frozen treats', 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (name, price, category_id, unit, is_best_selling) VALUES
  ('Chi. Crispy Popcorn (KFC Style)', 480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Nugget (KFC Style)',  480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Wings (KFC Style)',   480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Strips (KFC Style)',  480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Popcorn',            400, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Strips',             400, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Thread',             450, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Nugget',             400, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Cheesy Nugget',             480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Cheese Ball',               480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Shahi Roll',                500, 'chicken-specials', 'Per 1 KG', true),
  ('Chi. Donut',                     450, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Garlic Finger',             450, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Classic Momos',             400, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Peri Peri Momos',           425, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Kurkure Momos',             455, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Cheese Momos',              480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Kandi',                     450, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Spring Roll',               450, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Shami Kabab',               420, 'kababs', 'Per 1 KG', false),
  ('Chi. Cutlet Kabab',              400, 'kababs', 'Per 1 KG', false),
  ('Chi. Chatkara Kabab',            450, 'kababs', 'Per 1 KG', false),
  ('Chi. Cheesy Cutney Kabab',       450, 'kababs', 'Per 1 KG', false),
  ('Chi. Tikka Kabab',               450, 'kababs', 'Per 1 KG', false),
  ('Chi. Smokey Kabab',              450, 'kababs', 'Per 1 KG', false),
  ('Chi. Samosa',                    380, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Pizza Samosa',              400, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Shezwan Samosa',            400, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Keema Samosa',              400, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Smokey Samosa',             420, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Al-Sufi Special Samosa',    420, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Tikka Samosa',              420, 'samosa-tikka', 'Per 1 KG', false),
  ('Veg Cheese Corn Samosa',         360, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Haryali Tikka',             480, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Italian Tikka',             480, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Reshmi Tikka',              480, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Malai Tikka',               480, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Tandoori Tikka',            480, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Seekh',                     400, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Tandoori Seekh',            425, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Reshmi Seekh',              425, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Haryali Seekh',             425, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Italian Seekh',             425, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Smokey Seekh',              450, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Cheesy Seekh',              480, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Crispy Burger Patty',       180, 'seekh-burger', '6 Pieces', false),
  ('Chi. Zinger Burger Patty',       210, 'seekh-burger', '6 Pieces', false),
  ('Chi. Tikki Burger Patty',        210, 'seekh-burger', '6 Pieces', false),
  ('Grilled Chicken Patty',          240, 'seekh-burger', '6 Pieces', false),
  ('Chi. Chatkara Patty',            240, 'seekh-burger', '6 Pieces', false),
  ('Burger Patty (Aalu Tikki)',      120, 'seekh-burger', '6 Pieces', false),
  ('Veggies Burger Patty',           150, 'seekh-burger', '6 Pieces', false),
  ('Veg Spring Roll',                270, 'veg-items', 'Per 1 KG', false),
  ('Veg Finger',                     250, 'veg-items', 'Per 1 KG', false),
  ('Veg Pizza Pocket',               250, 'veg-items', 'Per 1 KG', false),
  ('Potato Cheese Ball',             280, 'veg-items', 'Per 1 KG', false),
  ('Cheese Corn Nugget',             280, 'veg-items', 'Per 1 KG', false),
  ('Veg Mini Puff Samosa',           280, 'veg-items', 'Per 1 KG', false),
  ('Veg Harabhara Kabab',            280, 'veg-items', 'Per 1 KG', false),
  ('French Fries (500g)',            100, 'veg-items', '500g', false)
ON CONFLICT DO NOTHING;

INSERT INTO public.store_settings (key, value) VALUES
  ('gst_percentage',        '5'),
  ('gst_inclusive',         'false'),
  ('delivery_fee',          '40'),
  ('free_delivery_threshold','999'),
  ('packaging_charge',      '20'),
  ('minimum_order_value',   '300'),
  ('currency_symbol',       '₹'),
  ('store_name',            'Al-Sufi Frozen Foods'),
  ('store_phone',           '+91 98765 43210'),
  ('store_whatsapp',        '+91 98765 43210'),
  ('store_instagram',       '@alsufifrozenfoods'),
  ('store_youtube',         ''),
  ('hero_title',            'Premium Frozen Delicacies At Your Doorstep'),
  ('hero_subtitle',         'From crispy KFC-style nuggets to authentic seekh kababs — 70+ frozen delights crafted with premium ingredients.'),
  ('hero_offer',            '🔥 Flat 10% Off on First Order'),
  ('delivery_radius_km',    '15'),
  ('logo_url',              '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.faqs (question, answer, category) VALUES
  ('What are your delivery hours?',      'We deliver from 9 AM to 9 PM, 7 days a week.', 'delivery'),
  ('What is the minimum order value?',   'The minimum order value is ₹300.', 'orders'),
  ('Do you offer free delivery?',        'Yes, delivery is free for orders above ₹999.', 'delivery'),
  ('What payment methods do you accept?','We accept Cash on Delivery (COD).', 'payments'),
  ('Can I cancel my order?',             'You can cancel your order before it reaches the "Preparing" stage.', 'orders'),
  ('Are your products frozen?',          'Yes, all our products are flash-frozen to maintain freshness and quality.', 'products'),
  ('How do I contact support?',          'You can reach us via WhatsApp or call us. Check the Contact section on our website.', 'support')
ON CONFLICT DO NOTHING;

INSERT INTO public.policies (title, content, slug) VALUES
  ('Return & Refund Policy', 'We accept returns within 24 hours of delivery if the product is unopened and in its original packaging. Refunds are processed within 5-7 business days.', 'returns'),
  ('Delivery Policy',        'We deliver within a 15km radius from our store. Delivery times are estimated and may vary. Free delivery on orders above ₹999.', 'delivery'),
  ('Privacy Policy',         'We collect your name, email, phone number, and address for order processing. We do not share your data with third parties except for delivery purposes.', 'privacy')
ON CONFLICT (slug) DO NOTHING;

-- ── REALTIME ──────────────────────────────────────────────────────────────────
-- Uncomment below if using Supabase Realtime (hosted or self-hosted)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;
