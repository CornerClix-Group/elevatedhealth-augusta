import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Message } from '@/hooks/useSecureChat';

interface MessageThreadProps {
  messages: Message[];
  currentUserRole: 'patient' | 'provider';
}

const MessageThread = ({ messages, currentUserRole }: MessageThreadProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
        <div>
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm mt-1">Start a conversation with your care team</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4" ref={scrollRef}>
      <div className="space-y-4">
        {messages.map((message, index) => {
          const isCurrentUser = message.sender_role === currentUserRole;
          const showTimestamp = index === 0 || 
            new Date(message.created_at).getTime() - new Date(messages[index - 1].created_at).getTime() > 300000;

          return (
            <div key={message.id}>
              {showTimestamp && (
                <div className="text-center text-xs text-muted-foreground my-4">
                  {format(new Date(message.created_at), 'MMM d, h:mm a')}
                </div>
              )}
              <div className={cn(
                "flex items-end gap-2",
                isCurrentUser ? "flex-row-reverse" : "flex-row"
              )}>
                {!isCurrentUser && (
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {message.sender_role === 'provider' ? 'EH' : 'P'}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2",
                  isCurrentUser 
                    ? "bg-primary text-primary-foreground rounded-br-sm" 
                    : "bg-muted rounded-bl-sm"
                )}>
                  <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};

export default MessageThread;
