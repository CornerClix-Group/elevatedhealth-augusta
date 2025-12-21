import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isProvider: boolean;
  userName: string | null;
  userAvatar: string | null;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProvider, setIsProvider] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const fetchUserDetails = async (userId: string, userEmail: string | undefined) => {
    // Check if user is a provider (admin or staff)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    
    const hasProviderRole = roles?.some(r => r.role === "admin" || r.role === "staff" || r.role === "business_admin");
    setIsProvider(hasProviderRole || false);
    
    if (!hasProviderRole) {
      // Try to get patient name and avatar
      const { data: patient } = await supabase
        .from("patients")
        .select("full_name, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();
      setUserName(patient?.full_name || null);
      setUserAvatar(patient?.avatar_url || null);
    } else {
      // For providers, use email as display name
      setUserName(userEmail?.split("@")[0] || "Provider");
      setUserAvatar(null);
    }
  };

  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setUserName(null);
    setUserAvatar(null);
    setIsProvider(false);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT') {
        clearAuthState();
        return;
      }
      
      if (session?.user) {
        // Defer Supabase calls to avoid deadlock
        setTimeout(() => {
          fetchUserDetails(session.user.id, session.user.email);
        }, 0);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserDetails(session.user.id, session.user.email).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    clearAuthState();
    
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error("SignOut error:", error);
    }
    
    // Clear all auth-related storage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-')) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
      
      if ('serviceWorker' in navigator && 'caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => caches.delete(name));
        });
      }
    } catch (e) {
      console.error("Storage clear error:", e);
    }
    
    toast.success("Logged out successfully");
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isLoggedIn: !!user,
      isProvider,
      userName,
      userAvatar,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
