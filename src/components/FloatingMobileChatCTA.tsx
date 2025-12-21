import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const STORAGE_KEY = "floatingChatCTA_dismissed";

export const FloatingMobileChatCTA = () => {
  const isMobile = useIsMobile();
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to prevent flash
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === "true");
    
    // Show after a short delay for better UX
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    sessionStorage.setItem(STORAGE_KEY, "true");
  };

  const openChat = () => {
    const chatButton = document.querySelector('[aria-label="Open assistant"]');
    if (chatButton) (chatButton as HTMLButtonElement).click();
  };

  if (!isMobile || isDismissed || !isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 animate-fade-in">
      <div 
        onClick={openChat}
        className="relative bg-accent text-accent-foreground rounded-xl shadow-2xl p-4 flex items-center gap-3 cursor-pointer hover:bg-accent/90 transition-colors"
      >
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 bg-background text-foreground rounded-full flex items-center justify-center shadow-md hover:bg-muted transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
        
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Have questions?</p>
          <p className="text-xs opacity-90">Chat with our Virtual Care Team</p>
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          className="shrink-0 font-semibold"
        >
          Chat Now
        </Button>
      </div>
    </div>
  );
};