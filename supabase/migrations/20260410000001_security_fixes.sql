-- Security fix: atomic coupon usage increment to prevent race conditions
-- When two orders place simultaneously with the same coupon, a non-atomic
-- client-side increment (used_count + 1) can allow exceeding usage_limit.
-- This function increments atomically at the DB level.

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET used_count = used_count + 1
  WHERE id = coupon_id
    AND is_active = true
    AND (usage_limit IS NULL OR used_count < usage_limit);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Coupon is no longer valid or usage limit reached';
  END IF;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(UUID) TO authenticated;
