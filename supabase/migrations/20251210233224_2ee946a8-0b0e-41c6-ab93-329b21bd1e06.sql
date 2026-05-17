-- Seed the master admin account role (if not exists)
INSERT INTO public.user_roles (user_id, role)
SELECT '1227a9b3-e319-4c79-a31a-ad17cdc847cc', 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = '1227a9b3-e319-4c79-a31a-ad17cdc847cc'
);

-- Add protection policy to prevent deletion of master admin role
DROP POLICY IF EXISTS "Protect master admin role" ON public.user_roles;

CREATE POLICY "Protect master admin role"
ON public.user_roles
FOR DELETE
USING (
  NOT (user_id = '1227a9b3-e319-4c79-a31a-ad17cdc847cc' AND role = 'admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role) = false
);