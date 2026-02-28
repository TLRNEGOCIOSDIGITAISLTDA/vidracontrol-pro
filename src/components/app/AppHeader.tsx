import { Link } from "react-router-dom";
import { Calculator, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

interface AppHeaderProps {
  title?: string;
  backTo?: string;
}

const AppHeader = ({ title = "VidraControl", backTo }: AppHeaderProps) => {
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-lg border-b border-border">
      <div className="container flex items-center h-14 gap-3">
        {backTo ? (
          <Link to={backTo}>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        ) : (
          <Calculator className="h-5 w-5 text-primary" />
        )}
        <h1 className="font-bold text-foreground text-lg truncate flex-1">{title}</h1>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={signOut}
          title="Sair"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
