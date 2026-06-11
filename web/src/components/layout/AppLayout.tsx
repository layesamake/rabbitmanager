import { Home, Rabbit, HeartPulse, Bell, Settings, Shield } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../lib/db";
import { addDays } from "date-fns";
import { cn } from "../../lib/utils";

export default function AppLayout() {
  const location = useLocation();

  const navItems = [
    { name: "Accueil", path: "/", icon: Home },
    { name: "Cheptel", path: "/cheptel", icon: Rabbit },
    { name: "Repro", path: "/reproduction", icon: HeartPulse },
    { name: "Santé", path: "/sante", icon: Shield },
    { name: "Alertes", path: "/alertes", icon: Bell },
  ];

  const alertCount = useLiveQuery(() => {
    return Promise.all([
      db.saillies.filter(s => s.statut === "enregistree" || s.statut === "en_attente" || s.statut === "confirmee").toArray(),
      db.portees.filter(p => p.statut === "nee" || p.statut === "en_cours" || p.statut === "a_surveiller").toArray()
    ]).then(([saillies, portees]) => {
      let count = 0;
      const in7Days = addDays(new Date(), 7).getTime();

      saillies.forEach(s => {
        if (s.statut === "enregistree" || s.statut === "en_attente") {
          if (new Date(s.dateControle).getTime() <= in7Days) count++;
        }
        if (s.statut === "confirmee") {
          if (new Date(s.datePreparation).getTime() <= in7Days) count++;
          if (new Date(s.dateMiseBasPrevue).getTime() <= in7Days) count++;
        }
      });

      portees.forEach(p => {
        if (new Date(p.dateSevragePrevue).getTime() <= in7Days) count++;
      });

      return count;
    });
  }, []) || 0;

  return (
    <div className="min-h-screen bg-background text-on-surface pb-24 print:bg-white print:text-black print:pb-0">
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 focus:bg-primary focus:text-on-primary focus:py-2 focus:px-4 focus:rounded-lg"
      >
        Aller au contenu principal
      </a>
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-surface border-b border-surface-border print:hidden">
        <div className="flex justify-between items-center px-container h-14 w-full max-w-[600px] mx-auto">
          <div className="flex items-center gap-3">
            <Rabbit className="text-primary w-6 h-6" aria-hidden="true" />
            <h1 className="font-heading text-lg font-semibold text-primary">Lapin Manager</h1>
          </div>
          <Link to="/parametres" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors duration-200" aria-label="Paramètres">
            <Settings className="text-on-surface-variant w-5 h-5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main id="main-content" role="main" className="pt-20 print:pt-0 px-container max-w-[600px] print:max-w-none mx-auto min-h-screen">
        <Outlet />
      </main>

      {/* Bottom Nav Bar */}
      <nav aria-label="Navigation principale" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] flex justify-around items-center h-16 px-2 bg-surface-container border-t border-surface-border z-50 print:hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (item.path !== "/" && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center transition-colors px-2 relative",
                isActive 
                  ? "text-primary" 
                  : "text-on-surface-variant hover:text-primary"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "fill-primary/20")} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
              {item.name === "Alertes" && alertCount > 0 && (
                <span className="absolute top-0 right-1 w-3.5 h-3.5 bg-status-critical text-on-error flex items-center justify-center text-[8px] font-bold rounded-full border border-surface-container" aria-label={`${alertCount} alertes actives`}>
                  <span aria-hidden="true">{alertCount > 9 ? "9+" : alertCount}</span>
                </span>
              )}
              <span className="font-mono text-[10px] uppercase font-semibold mt-1 tracking-wider">
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
