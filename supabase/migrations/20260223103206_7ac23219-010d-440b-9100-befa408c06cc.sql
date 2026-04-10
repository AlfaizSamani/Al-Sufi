
-- Categories table
CREATE TABLE public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🍽️',
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
  ON public.categories FOR SELECT USING (true);

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  category_id TEXT NOT NULL REFERENCES public.categories(id),
  unit TEXT NOT NULL DEFAULT 'Per 1 KG',
  description TEXT,
  image_url TEXT,
  is_best_selling BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
  ON public.products FOR SELECT USING (true);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed categories
INSERT INTO public.categories (id, name, icon, description, sort_order) VALUES
  ('chicken-specials', 'Chicken Specials', '🍗', 'Premium chicken delicacies, crispy & juicy', 1),
  ('kababs', 'Kababs', '🍢', 'Authentic hand-crafted kababs', 2),
  ('samosa-tikka', 'Samosa & Tikka', '🥟', 'Classic samosas & marinated tikkas', 3),
  ('seekh-burger', 'Seekh & Burger Patty', '🍔', 'Seekh kababs & gourmet burger patties', 4),
  ('veg-items', 'Veg Items', '🥦', 'Delicious vegetarian frozen treats', 5);

-- Seed products
INSERT INTO public.products (name, price, category_id, unit, is_best_selling) VALUES
  -- Chicken Specials
  ('Chi. Crispy Popcorn (KFC Style)', 480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Nugget (KFC Style)', 480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Wings (KFC Style)', 480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Strips (KFC Style)', 480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Popcorn', 400, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Strips', 400, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Thread', 450, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Crispy Nugget', 400, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Cheesy Nugget', 480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Cheese Ball', 480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Shahi Roll', 500, 'chicken-specials', 'Per 1 KG', true),
  ('Chi. Donut', 450, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Garlic Finger', 450, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Classic Momos', 400, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Peri Peri Momos', 425, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Kurkure Momos', 455, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Cheese Momos', 480, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Kandi', 450, 'chicken-specials', 'Per 1 KG', false),
  ('Chi. Spring Roll', 450, 'chicken-specials', 'Per 1 KG', false),
  -- Kababs
  ('Chi. Shami Kabab', 420, 'kababs', 'Per 1 KG', false),
  ('Chi. Cutlet Kabab', 400, 'kababs', 'Per 1 KG', false),
  ('Chi. Chatkara Kabab', 450, 'kababs', 'Per 1 KG', false),
  ('Chi. Cheesy Cutney Kabab', 450, 'kababs', 'Per 1 KG', false),
  ('Chi. Tikka Kabab', 450, 'kababs', 'Per 1 KG', false),
  ('Chi. Smokey Kabab', 450, 'kababs', 'Per 1 KG', false),
  -- Samosa & Tikka
  ('Chi. Samosa', 380, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Pizza Samosa', 400, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Shezwan Samosa', 400, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Keema Samosa', 400, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Smokey Samosa', 420, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Al-Sufi Special Samosa', 420, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Tikka Samosa', 420, 'samosa-tikka', 'Per 1 KG', false),
  ('Veg Cheese Corn Samosa', 360, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Haryali Tikka', 480, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Italian Tikka', 480, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Reshmi Tikka', 480, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Malai Tikka', 480, 'samosa-tikka', 'Per 1 KG', false),
  ('Chi. Tandoori Tikka', 480, 'samosa-tikka', 'Per 1 KG', false),
  -- Seekh & Burger Patty
  ('Chi. Seekh', 400, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Tandoori Seekh', 425, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Reshmi Seekh', 425, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Haryali Seekh', 425, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Italian Seekh', 425, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Smokey Seekh', 450, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Cheesy Seekh', 480, 'seekh-burger', 'Per 1 KG', false),
  ('Chi. Crispy Burger Patty', 180, 'seekh-burger', '6 Pieces', false),
  ('Chi. Zinger Burger Patty', 210, 'seekh-burger', '6 Pieces', false),
  ('Chi. Tikki Burger Patty', 210, 'seekh-burger', '6 Pieces', false),
  ('Grilled Chicken Patty', 240, 'seekh-burger', '6 Pieces', false),
  ('Chi. Chatkara Patty', 240, 'seekh-burger', '6 Pieces', false),
  ('Burger Patty (Aalu Tikki)', 120, 'seekh-burger', '6 Pieces', false),
  ('Veggies Burger Patty', 150, 'seekh-burger', '6 Pieces', false),
  -- Veg Items
  ('Veg Spring Roll', 270, 'veg-items', 'Per 1 KG', false),
  ('Veg Finger', 250, 'veg-items', 'Per 1 KG', false),
  ('Veg Pizza Pocket', 250, 'veg-items', 'Per 1 KG', false),
  ('Potato Cheese Ball', 280, 'veg-items', 'Per 1 KG', false),
  ('Cheese Corn Nugget', 280, 'veg-items', 'Per 1 KG', false),
  ('Veg Mini Puff Samosa', 280, 'veg-items', 'Per 1 KG', false),
  ('Veg Harabhara Kabab', 280, 'veg-items', 'Per 1 KG', false),
  ('French Fries (500g)', 100, 'veg-items', '500g', false);
