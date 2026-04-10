
-- Allow admins to read all addresses for order management
CREATE POLICY "Admins can read all addresses" ON public.addresses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));
