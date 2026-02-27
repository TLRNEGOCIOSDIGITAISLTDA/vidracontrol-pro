import { Link } from "react-router-dom";
import { Calculator, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  title?: string;
  backTo?: string;
}

const AppHeader = ({ title = "VidraControl", backTo }: AppHeaderProps) => {
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
        <h1 className="font-bold text-foreground text-lg truncate">{title}</h1>
      </div>
    </header>
  );
};

export default AppHeader;
