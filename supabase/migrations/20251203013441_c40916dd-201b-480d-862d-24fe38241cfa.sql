-- Allow patients to mark messages as read in their own conversations
CREATE POLICY "Patients can mark messages as read"
ON public.messages FOR UPDATE
USING (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  )
);