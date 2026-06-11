import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { Plus, Rabbit, Info } from "lucide-react";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import type { Portee } from "../types";

type Filter = "toutes" | "en_cours" | "sevree" | "cloturee";

export default function Portees({ hideTitle }: { hideTitle?: boolean }) {
  const [filter, setFilter] = useState<Filter>("toutes");

  const portees = useLiveQuery(async () => {
    let collection = db.portees.toCollection();
    const all = await collection.toArray();
    
    // Reverse chronological sort
    all.sort((a, b) => new Date(b.dateMiseBas).getTime() - new Date(a.dateMiseBas).getTime());

    return all.filter(p => {
      if (filter === "en_cours" && p.statut !== "nee" && p.statut !== "en_cours" && p.statut !== "a_surveiller" && p.statut !== "a_sevrer") return false;
      if (filter === "sevree" && p.statut !== "sevree") return false;
      if (filter === "cloturee" && p.statut !== "cloturee") return false;
      return true;
    });
  }, [filter]) || [];

  const reproducteurs = useLiveQuery(() => db.reproducteurs.toArray()) || [];
  const getReproCode = (id: string) => reproducteurs.find(r => r.id === id)?.code || "?";

  return (
    <div className="space-y-section pb-24 min-h-screen relative">
      <div className="flex flex-col gap-4">
        {!hideTitle && (
          <div className="flex justify-between items-center bg-surface-container-high p-4 rounded-2xl border border-surface-border">
            <div>
              <span className="font-mono text-[12px] font-semibold text-secondary uppercase tracking-widest">Gestion</span>
              <h2 className="font-heading text-2xl font-semibold text-text-primary mt-1">Portées</h2>
            </div>
          </div>
        )}
        
        {hideTitle && (
           <div className="flex justify-end mb-2">
           </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {["toutes", "en_cours", "sevree", "cloturee"].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f as Filter)}
              className={cn("whitespace-nowrap px-4 py-1.5 rounded-full font-mono text-[12px] font-semibold transition-colors border uppercase tracking-wider",
                filter === f 
                  ? "bg-primary-container text-on-primary-container border-transparent" 
                  : "bg-surface-container text-on-surface-variant border-surface-border hover:bg-surface-variant"
              )}
            >
              {f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Cards List */}
      <div className="flex flex-col gap-stack-gap">
        {portees.length === 0 ? (
          <div className="h-48 border-2 border-dashed border-surface-border rounded-xl flex items-center justify-center text-text-secondary text-sm">
            Aucune portée trouvée.
          </div>
        ) : (
          portees.map(portee => (
            <Link to={`/portees/${portee.id}`} key={portee.id} className="bg-surface-card border border-surface-border rounded-xl p-card-padding flex flex-col gap-4 relative overflow-hidden group hover:border-primary transition-colors cursor-pointer">
              <div className="absolute top-0 right-0">
                <div className={cn("px-3 py-1 font-mono text-[10px] font-bold rounded-bl-lg uppercase", 
                  (portee.statut === 'en_cours' || portee.statut === 'nee' || portee.statut === 'a_surveiller' || portee.statut === 'a_sevrer') ? 'bg-secondary-container text-on-secondary-container' : 
                  portee.statut === 'sevree' ? 'bg-primary-container text-on-primary-container' : 
                  'bg-surface-variant text-on-surface-variant'
                )}>
                  {portee.statut.replace("_", " ")}
                </div>
              </div>

              <div className="flex justify-between items-start mt-2">
                <div>
                  <h3 className="font-heading text-xl font-semibold text-text-primary">
                    <span className="text-secondary">{getReproCode(portee.femelleId)}</span>
                    <span className="text-outline mx-2">/</span>
                    <span className="font-mono text-lg">{portee.code}</span>
                  </h3>
                  <p className="font-sans text-sm text-text-secondary mt-1">
                    Née le {format(new Date(portee.dateMiseBas), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 py-3 border-y border-surface-border">
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[10px] text-text-secondary uppercase">Nés</span>
                  <span className="font-heading text-lg font-bold text-text-primary">{portee.totalNes}</span>
                </div>
                <div className="flex flex-col items-center border-l border-surface-border">
                  <span className="font-mono text-[10px] text-secondary uppercase">Vivants</span>
                  <span className="font-heading text-lg font-bold text-secondary">{portee.vivantsActuels}</span>
                </div>
                <div className="flex flex-col items-center border-l border-surface-border">
                  <span className="font-mono text-[10px] text-status-critical uppercase">Pert.</span>
                  <span className="font-heading text-lg font-bold text-status-critical">{portee.totalNes - portee.vivantsActuels}</span>
                </div>
              </div>

              {portee.statut !== 'cloturee' && portee.statut !== 'sevree' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant flex items-center gap-1"><Rabbit className="w-4 h-4"/> Sevrage :</span>
                  <span className="font-mono font-bold text-primary">{format(new Date(portee.dateSevragePrevue), 'dd/MM/yyyy')}</span>
                </div>
              )}
            </Link>
          ))
        )}
      </div>

      {/* Floating Actions */}
      <div className="fixed bottom-20 left-0 right-0 pointer-events-none z-40 flex justify-center">
        <div className="w-full max-w-[600px] px-4 flex flex-col items-end gap-3 pointer-events-auto">
          <Link to="/portees/new" aria-label="Nouvelle portée" className="h-14 w-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all">
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
