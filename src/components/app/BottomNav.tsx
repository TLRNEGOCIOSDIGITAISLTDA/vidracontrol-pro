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
      <div className="flex items-stretch justify-around max-w-lg mx-auto" style={{ height: "calc(4rem + env(safe-area-inset-bottom, 0px))" }}>
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = pathname === to || (to !== "/app" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 transition-colors active:scale-95 ${
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
              style={{ minHeight: 56 }}
            >
              <Icon
                className="h-5 w-5 transition-transform"
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className={`text-[10px] font-medium leading-none ${active ? "font-bold" : ""}`}>
                {label}
              </span>
              {active && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
