import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { Plus, Check, X, AlertCircle, Calendar } from "lucide-react";
import { cn } from "../lib/utils";
import { format, isPast, isToday } from "date-fns";

type Filter = "toutes" | "en_attente" | "confirmee" | "echec";

export default function Saillies({ hideTitle }: { hideTitle?: boolean }) {
  const [filter, setFilter] = useState<Filter>("toutes");
  const navigate = useNavigate();

  const saillies = useLiveQuery(async () => {
    let collection = db.saillies.toCollection();
    const all = await collection.toArray();
    
    // Reverse chronological sort
    all.sort((a, b) => new Date(b.dateSaillie).getTime() - new Date(a.dateSaillie).getTime());

    return all.filter(s => {
      if (filter === "en_attente" && s.statut !== "en_attente" && s.statut !== "enregistree") return false;
      if (filter === "confirmee" && s.statut !== "confirmee") return false;
      if (filter === "echec" && (s.statut !== "echec" && s.statut !== "non_confirmee" && s.statut !== "annulee")) return false;
      return true;
    });
  }, [filter]) || [];

  const reproducteurs = useLiveQuery(() => db.reproducteurs.toArray()) || [];
  
  const getReproDisplay = (id: string) => {
    const repro = reproducteurs.find(r => r.id === id);
    if (!repro) return "?";
    return repro.nom ? `${repro.nom} (${repro.code})` : repro.code;
  };

  return (
    <div className="space-y-section pb-24 min-h-screen relative">
      <div className="flex flex-col gap-4">
        {!hideTitle && (
          <div className="flex justify-between items-center bg-surface-container-high p-4 rounded-2xl border border-surface-border">
            <div>
              <span className="font-mono text-[12px] font-semibold text-secondary uppercase tracking-widest">Suivi reproduction</span>
              <h2 className="font-heading text-2xl font-semibold text-text-primary mt-1">Saillies</h2>
            </div>
          </div>
        )}
        
        {hideTitle && (
           <div className="flex justify-end mb-2">
           </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {["toutes", "en_attente", "confirmee", "echec"].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f as Filter)}
              className={cn("whitespace-nowrap px-4 py-1.5 rounded-full font-mono text-[12px] font-semibold transition-colors border",
                filter === f 
                  ? "bg-primary-container text-on-primary-container border-transparent" 
                  : "bg-surface-container text-on-surface-variant border-surface-border hover:bg-surface-variant"
              )}
            >
              {f.replace("_", " ").toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Cards List */}
      <div className="flex flex-col gap-stack-gap">
        {saillies.length === 0 ? (
          <div className="h-48 border-2 border-dashed border-surface-border rounded-xl flex items-center justify-center text-text-secondary text-sm">
            Aucune saillie trouvée pour ce filtre.
          </div>
        ) : (
          saillies.map(saillie => (
            <div 
              key={saillie.id} 
              role="button"
              tabIndex={0}
              aria-label={`Éditer la saillie ${saillie.statut} du ${format(new Date(saillie.dateSaillie), 'dd/MM/yyyy')}`}
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('a') && !target.closest('button')) {
                  navigate(`/saillies/${saillie.id}`);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  const target = e.target as HTMLElement;
                  if (!target.closest('a') && !target.closest('button')) {
                    navigate(`/saillies/${saillie.id}`);
                  }
                }
              }}
              className="cursor-pointer bg-surface-card border border-surface-border rounded-xl p-card-padding flex flex-col gap-3 relative overflow-hidden hover:border-primary focus-visible:border-primary transition-colors group"
            >
              {/* Header: Date & Badge */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-text-secondary">
                  <Calendar className="w-4 h-4" />
                  <span className="font-mono text-sm font-semibold">{format(new Date(saillie.dateSaillie), 'dd/MM/yyyy')}</span>
                  {saillie.type && <span className="font-sans text-xs bg-surface-container px-2 py-0.5 rounded-md border border-surface-border text-on-surface-variant font-medium ml-1">{saillie.type}</span>}
                </div>
                <div className={cn("px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-full flex items-center gap-1.5", 
                  saillie.statut === 'confirmee' ? 'bg-secondary/20 text-secondary' : 
                  (saillie.statut === 'enregistree' || saillie.statut === 'en_attente') ? 'bg-status-breeding/20 text-status-breeding' : 
                  (saillie.statut === 'echec' || saillie.statut === 'non_confirmee' || saillie.statut === 'annulee') ? 'bg-error/20 text-error' :
                  'bg-surface-variant text-on-surface-variant'
                )}>
                  {saillie.statut === 'confirmee' && <Check className="w-3 h-3" />}
                  {(saillie.statut === 'enregistree' || saillie.statut === 'en_attente') && <AlertCircle className="w-3 h-3" />}
                  {(saillie.statut === 'echec' || saillie.statut === 'non_confirmee' || saillie.statut === 'annulee') && <X className="w-3 h-3" />}
                  {saillie.statut.replace("_", " ")}
                </div>
              </div>

              {/* Reproducers */}
              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs uppercase text-text-secondary font-semibold w-16">Femelle</span>
                  <span className="font-heading text-base font-semibold text-primary">{getReproDisplay(saillie.femelleId)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs uppercase text-text-secondary font-semibold w-16">Mâle(s)</span>
                  <span className="font-heading text-base font-semibold text-secondary">{saillie.maleIds.map(getReproDisplay).join(', ')}</span>
                </div>
              </div>

              {/* Status Specific UI */}
              {saillie.statut === 'confirmee' && (
                <div className="bg-surface-container-low border border-outline-variant/30 rounded-lg p-3 mt-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                       <Calendar className="w-4 h-4 text-primary" />
                       <span className="font-sans text-xs font-medium text-on-surface-variant">Mise bas prévue</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-primary">{format(new Date(saillie.dateMiseBasPrevue), 'dd/MM/yyyy')}</span>
                  </div>
                </div>
              )}

              {(saillie.statut === 'enregistree' || saillie.statut === 'en_attente') && (
                <div className="flex items-center gap-3 py-2 px-3 bg-status-breeding/10 border border-status-breeding/30 rounded-lg mt-1">
                  <AlertCircle className="w-4 h-4 text-status-breeding shrink-0" />
                  <span className="font-sans text-xs text-status-breeding font-medium">Contrôle palpation : {format(new Date(saillie.dateControle), 'dd/MM')}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {(saillie.statut === 'enregistree' || saillie.statut === 'en_attente') && (
                  <>
                    <Link to={`/saillies/${saillie.id}`} className="flex-1 bg-secondary text-on-secondary-container py-2 rounded-lg font-heading font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center gap-1">
                      <Check className="w-4 h-4" /> Palper
                    </Link>
                  </>
                )}
                {saillie.statut === 'confirmee' && (
                  <>
                    <Link to={`/portees/new?saillieId=${saillie.id}`} className="flex-1 bg-primary text-on-primary py-2 rounded-lg font-heading font-semibold text-sm active:scale-95 transition-transform flex items-center justify-center text-center">
                      Mise bas
                    </Link>
                    <Link to={`/saillies/${saillie.id}`} className="flex-1 border border-surface-border flex items-center justify-center rounded-lg font-heading font-semibold text-sm text-on-surface-variant hover:bg-surface-variant transition-colors text-center">
                      Détails
                    </Link>
                  </>
                )}
                {saillie.statut !== 'confirmee' && saillie.statut !== 'enregistree' && saillie.statut !== 'en_attente' && (
                  <Link to={`/saillies/${saillie.id}`} className="flex-1 border border-surface-border flex items-center justify-center py-2 rounded-lg font-heading font-semibold text-sm text-on-surface-variant hover:bg-surface-variant transition-colors w-full">
                      Détails
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Actions */}
      <div className="fixed bottom-20 left-0 right-0 pointer-events-none z-40 flex justify-center">
        <div className="w-full max-w-[600px] px-4 flex flex-col items-end gap-3 pointer-events-auto">
          <Link to="/saillies/new" aria-label="Nouvelle saillie" className="h-14 w-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all">
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
