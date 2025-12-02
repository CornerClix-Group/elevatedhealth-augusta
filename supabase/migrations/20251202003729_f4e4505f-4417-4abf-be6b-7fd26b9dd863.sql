-- Drop existing restrictive policies on patients table
DROP POLICY IF EXISTS "Patients can view their own record" ON public.patients;
DROP POLICY IF EXISTS "Staff and admins can view all patients" ON public.patients;
DROP POLICY IF EXISTS "Patients can update their own record" ON public.patients;
DROP POLICY IF EXISTS "Staff and admins can manage patients" ON public.patients;
DROP POLICY IF EXISTS "Users can create their own patient record" ON public.patients;

-- Recreate as PERMISSIVE policies (default) so that ANY matching policy allows access
CREATE POLICY "Patients can view their own record" 
ON public.patients 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Staff and admins can view all patients" 
ON public.patients 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Patients can update their own record" 
ON public.patients 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Staff and admins can manage patients" 
ON public.patients 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Users can create their own patient record" 
ON public.patients 
FOR INSERT 
WITH CHECK (user_id = auth.uid());