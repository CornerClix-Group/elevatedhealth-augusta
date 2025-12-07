-- Create a function to check if user has business_admin role
CREATE OR REPLACE FUNCTION public.has_business_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'business_admin'::app_role
  )
$$;