import { useState, useEffect } from 'react';
import { MessageCircle, X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useSecureChat } from '@/hooks/useSecureChat';
import MessageThread from './MessageThread';
import MessageInput from './MessageInput';

interface PatientChatWidgetProps {
  patientId: string;
}

const PatientChatWidget = ({ patientId }: PatientChatWidgetProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const {
    messages,
    activeConversation,
    sendMessage,
    getOrCreateConversation,
    isLoading,
    conversations,
  } = useSecureChat('patient', patientId);

  const unreadCount = conversations.reduce((acc, conv) => acc + (conv.unread_count || 0), 0);

  useEffect(() => {
    if (isOpen && !activeConversation) {
      getOrCreateConversation();
    }
  }, [isOpen, activeConversation, getOrCreateConversation]);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-6 right-6 w-[380px] shadow-2xl z-50 flex flex-col transition-all duration-200",
      isMinimized ? "h-[60px]" : "h-[500px] max-h-[80vh]"
    )}>
      <CardHeader className="py-3 px-4 border-b flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <CardTitle className="text-base font-medium">Care Team</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <>
          {isLoading ? (
            <CardContent className="flex-1 p-4">
              <div className="space-y-4">
                <Skeleton className="h-12 w-3/4" />
                <Skeleton className="h-12 w-1/2 ml-auto" />
                <Skeleton className="h-12 w-2/3" />
              </div>
            </CardContent>
          ) : (
            <>
              <MessageThread messages={messages} currentUserRole="patient" />
              <MessageInput 
                onSend={sendMessage}
                placeholder="Message your care team..."
              />
            </>
          )}
        </>
      )}
    </Card>
  );
};

export default PatientChatWidget;
