-- Create conversations table
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now(),
  is_archived boolean DEFAULT false
);

-- Create messages table
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('patient', 'provider')),
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations RLS policies
CREATE POLICY "Patients can view their own conversations"
ON public.conversations FOR SELECT
USING (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "Patients can create their own conversations"
ON public.conversations FOR INSERT
WITH CHECK (patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "Staff and admins can view all conversations"
ON public.conversations FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff and admins can manage conversations"
ON public.conversations FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Messages RLS policies
CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'staff')
);

CREATE POLICY "Users can send messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id FROM conversations 
    WHERE patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'staff')
);

CREATE POLICY "Staff can update messages (mark as read)"
ON public.messages FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff'));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Index for performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_conversations_patient_id ON public.conversations(patient_id);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);