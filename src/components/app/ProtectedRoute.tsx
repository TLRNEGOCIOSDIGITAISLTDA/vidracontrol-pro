import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Loader2 } from "lucide-react";
import BottomNav from "./BottomNav";
import InstallBanner from "./InstallBanner";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="pb-bottom-nav">
      {children}
      <BottomNav />
      <InstallBanner />
    </div>
  );
};

export default ProtectedRoute;
