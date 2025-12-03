import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: 'patient' | 'provider';
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  patient_id: string;
  created_at: string;
  last_message_at: string;
  is_archived: boolean;
  patient?: {
    full_name: string;
    avatar_url: string | null;
  };
  unread_count?: number;
}

export const useSecureChat = (userRole: 'patient' | 'provider', patientId?: string) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      let query = supabase
        .from('conversations')
        .select(`
          *,
          patient:patients(full_name, avatar_url)
        `)
        .eq('is_archived', false)
        .order('last_message_at', { ascending: false });

      if (userRole === 'patient' && patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get unread counts for each conversation
      const conversationsWithUnread = await Promise.all(
        (data || []).map(async (conv) => {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_role', userRole);

          return { ...conv, unread_count: count || 0 };
        })
      );

      setConversations(conversationsWithUnread);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userRole, patientId]);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(msg => ({
        ...msg,
        sender_role: msg.sender_role as 'patient' | 'provider'
      })));

      // Mark messages as read
      if (userRole === 'provider') {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .eq('sender_role', 'patient')
          .eq('is_read', false);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [userRole]);

  // Send a message
  const sendMessage = useCallback(async (content: string) => {
    if (!activeConversation || !content.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('messages').insert({
        conversation_id: activeConversation,
        sender_id: user.id,
        sender_role: userRole,
        content: content.trim(),
      });

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeConversation);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    }
  }, [activeConversation, userRole, toast]);

  // Create or get existing conversation (for patients)
  const getOrCreateConversation = useCallback(async () => {
    if (!patientId) return null;

    try {
      // Check for existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('patient_id', patientId)
        .eq('is_archived', false)
        .single();

      if (existing) {
        setActiveConversation(existing.id);
        return existing.id;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert({ patient_id: patientId })
        .select('id')
        .single();

      if (error) throw error;
      
      setActiveConversation(newConv.id);
      await fetchConversations();
      return newConv.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [patientId, fetchConversations]);

  // Set up realtime subscription
  useEffect(() => {
    fetchConversations();

    const channel = supabase
      .channel('chat-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          // Add to messages if it's the active conversation
          if (newMessage.conversation_id === activeConversation) {
            setMessages((prev) => [...prev, newMessage]);
          }
          
          // Update conversations list
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConversations, activeConversation]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation);
    }
  }, [activeConversation, fetchMessages]);

  return {
    conversations,
    messages,
    activeConversation,
    setActiveConversation,
    sendMessage,
    getOrCreateConversation,
    isLoading,
    refetch: fetchConversations,
  };
};
