
-- FAQs table for chatbot knowledge
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "FAQs are viewable by everyone" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Admins can manage FAQs" ON public.faqs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies table for chatbot knowledge
CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Policies are viewable by everyone" ON public.policies FOR SELECT USING (true);
CREATE POLICY "Admins can manage policies" ON public.policies FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add payment_method to orders
ALTER TABLE public.orders ADD COLUMN payment_method TEXT DEFAULT 'cod';
ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN payment_id TEXT;

-- Seed some FAQs
INSERT INTO public.faqs (question, answer, category) VALUES
('What are your delivery hours?', 'We deliver from 9 AM to 9 PM, 7 days a week.', 'delivery'),
('What is the minimum order value?', 'The minimum order value is ₹300.', 'orders'),
('Do you offer free delivery?', 'Yes, delivery is free for orders above ₹999.', 'delivery'),
('What payment methods do you accept?', 'We accept online payments via Stripe and Cash on Delivery (COD).', 'payments'),
('Can I cancel my order?', 'You can cancel your order before it reaches the "Preparing" stage.', 'orders'),
('Are your products frozen?', 'Yes, all our products are flash-frozen to maintain freshness and quality.', 'products'),
('How do I contact support?', 'You can reach us via WhatsApp or call us. Check the Contact section on our website.', 'support');

-- Seed some policies
INSERT INTO public.policies (title, content, slug) VALUES
('Return & Refund Policy', 'We accept returns within 24 hours of delivery if the product is unopened and in its original packaging. Refunds are processed within 5-7 business days.', 'returns'),
('Delivery Policy', 'We deliver within a 15km radius from our store. Delivery times are estimated and may vary. Free delivery on orders above ₹999.', 'delivery'),
('Privacy Policy', 'We collect your name, email, phone number, and address for order processing. We do not share your data with third parties except for delivery purposes.', 'privacy');

-- Triggers for updated_at
CREATE TRIGGER update_faqs_updated_at BEFORE UPDATE ON public.faqs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON public.policies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
