import { Calculator } from "lucide-react";

const Footer = () => {
  return (
    <footer className="py-8 bg-card border-t border-border">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <Calculator className="h-5 w-5 text-primary" />
          VidraControl
        </div>
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} VidraControl. Feito para vidraceiros autônomos.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
