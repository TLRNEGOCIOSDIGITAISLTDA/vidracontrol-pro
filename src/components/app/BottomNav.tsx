import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, FileText, User } from "lucide-react";

const tabs = [
  { to: "/app", icon: LayoutDashboard, label: "Início" },
  { to: "/app/nova-obra", icon: Briefcase, label: "Nova Obra" },
  { to: "/app/orcamentos", icon: FileText, label: "Orçamentos" },
  { to: "/app/perfil", icon: User, label: "Perfil" },
];

const BottomNav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] py-2 px-3 rounded-xl transition-colors touch-target ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
