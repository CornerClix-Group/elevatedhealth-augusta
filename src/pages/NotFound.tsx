import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  
  // Detect if user is in provider/admin context
  const isProviderContext = location.pathname.startsWith("/provider/") || 
                            location.pathname.startsWith("/admin/") ||
                            location.pathname.startsWith("/office-manager") ||
                            location.pathname.startsWith("/business");

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center px-4">
        <h1 className="mb-4 text-6xl font-bold text-primary">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Oops! Page not found</p>
        <p className="mb-8 text-sm text-muted-foreground max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        {isProviderContext ? (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="default">
              <Link to="/provider/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Provider Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/login">
                Provider Login
              </Link>
            </Button>
          </div>
        ) : (
          <Button asChild variant="default">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Return to Home
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default NotFound;
