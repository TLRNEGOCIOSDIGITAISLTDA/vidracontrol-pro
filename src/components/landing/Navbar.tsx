import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
          <Calculator className="h-6 w-6 text-primary" />
          VidraControl
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#funcionalidades" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Funcionalidades</a>
          <a href="#vantagens" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Vantagens</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
          <Link to="/app">
            <Button>Começar Agora</Button>
          </Link>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-card border-b border-border p-4 flex flex-col gap-4">
          <a href="#funcionalidades" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>Funcionalidades</a>
          <a href="#vantagens" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>Vantagens</a>
          <a href="#faq" className="text-sm text-muted-foreground" onClick={() => setOpen(false)}>FAQ</a>
          <Link to="/app" onClick={() => setOpen(false)}>
            <Button className="w-full">Começar Agora</Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
