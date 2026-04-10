-- Prevent customers from advancing delivery statuses.
-- Customers may only cancel their own orders while still in placed/confirmed states.
DROP POLICY IF EXISTS "Users can update own orders before preparing" ON public.orders;

CREATE POLICY "Users can cancel own pending orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status IN ('placed'::public.order_status, 'confirmed'::public.order_status)
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'cancelled'::public.order_status
);