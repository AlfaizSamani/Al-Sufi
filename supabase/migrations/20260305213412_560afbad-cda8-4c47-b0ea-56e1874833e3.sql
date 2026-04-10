
-- Analytics events table for tracking page views, clicks, time spent
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  event_type text NOT NULL, -- 'page_view', 'product_click', 'add_to_cart', 'remove_from_cart'
  page_path text,
  product_id uuid,
  product_name text,
  duration_seconds integer, -- time spent on page
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert analytics events (even anonymous)
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Only admins can read analytics
CREATE POLICY "Admins can read analytics"
  ON public.analytics_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage analytics
CREATE POLICY "Admins can manage analytics"
  ON public.analytics_events FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for common queries
CREATE INDEX idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_created_at ON public.analytics_events(created_at);
CREATE INDEX idx_analytics_product_id ON public.analytics_events(product_id);
