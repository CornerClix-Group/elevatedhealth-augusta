DROP POLICY IF EXISTS "Staff and admins can insert orders" ON public.orders;

CREATE POLICY "Staff and admins can insert orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));