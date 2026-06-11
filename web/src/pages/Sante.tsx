import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { Plus, Check, Shield, Activity, Calendar, AlertCircle, Edit2 } from "lucide-react";
import { cn } from "../lib/utils";
import { format, isPast, isToday, startOfMonth, endOfMonth } from "date-fns";
import type { Traitement } from "../types";

export default function Sante() {
  const [filter, setFilter] = useState("toutes");
  const navigate = useNavigate();

  const traitements = useLiveQuery(async () => {
    const all = await db.traitements.toArray();
    // Sort by date (closet datePrevue first)
    all.sort((a, b) => new Date(a.datePrevue).getTime() - new Date(b.datePrevue).getTime());
    return all;
  }, []) || [];

  const filteredTraitements = traitements.filter((t) => {
    if (filter === "a_faire" && t.statut !== "À faire" && t.statut !== "À renouveler") return false;
    if (filter === "en_cours" && t.statut !== "En cours") return false;
    if (filter === "faits" && t.statut !== "Fait") return false;
    if (filter === "en_retard" && t.statut !== "En retard") return false;
    if (filter === "programmes" && t.statut !== "Programmé") return false;
    if (filter === "prophylaxie" && t.typeAction !== "Prophylaxie") return false;
    if (filter === "curatif" && t.typeAction !== "Traitement curatif") return false;
    return true;
  });

  const now = new Date();
  const startMonth = startOfMonth(now);
  const endMonth = endOfMonth(now);

  const stats = {
    aFaireAujourdhui: traitements.filter(t => (t.statut === "À faire" || t.statut === "À renouveler" || t.statut === "Programmé") && isToday(new Date(t.datePrevue))).length,
    enCours: traitements.filter(t => t.statut === "En cours").length,
    programmes: traitements.filter(t => t.statut === "Programmé" && new Date(t.datePrevue) > now).length,
    faitsMois: traitements.filter(t => t.statut === "Fait" && t.dateRealisation && new Date(t.dateRealisation) >= startMonth && new Date(t.dateRealisation) <= endMonth).length,
    animaux: new Set(traitements.filter(t => t.sujetType === 'Reproducteur').map(t => t.sujetId)).size,
    portees: new Set(traitements.filter(t => t.sujetType === 'Portee').map(t => t.sujetId)).size,
  };

  const getStatusColor = (statut: string) => {
    switch(statut) {
      case 'Programmé': return 'bg-info/20 text-info border-info/30';
      case 'À faire': return 'bg-warning/20 text-warning border-warning/30';
      case 'En cours': return 'bg-primary/20 text-primary border-primary/30';
      case 'Fait': case 'Terminé': return 'bg-status-success/20 text-status-success border-status-success/30';
      case 'En retard': return 'bg-error/20 text-error border-error/30';
      case 'À renouveler': return 'bg-warning-strong/20 text-warning-strong border-warning-strong/30';
      case 'Annulé': return 'bg-surface-variant text-on-surface-variant border-surface-border';
      default: return 'bg-surface-variant text-on-surface-variant';
    }
  };

  return (
    <div className="space-y-section pb-24 min-h-screen relative">
      <div className="flex flex-col gap-4">
        <div>
          <span className="font-mono text-[12px] font-semibold text-secondary uppercase tracking-widest">Suivi sanitaire</span>
          <h2 className="font-heading text-2xl font-semibold text-text-primary mt-1">Santé & Prophylaxie</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-surface-card p-3 rounded-xl border border-surface-border flex flex-col">
           <span className="font-mono text-[10px] text-text-secondary uppercase">À faire ajd</span>
           <span className="font-heading text-xl font-bold text-warning">{stats.aFaireAujourdhui}</span>
        </div>
        <div className="bg-surface-card p-3 rounded-xl border border-surface-border flex flex-col">
           <span className="font-mono text-[10px] text-text-secondary uppercase">En cours</span>
           <span className="font-heading text-xl font-bold text-primary">{stats.enCours}</span>
        </div>
        <div className="bg-surface-card p-3 rounded-xl border border-surface-border flex flex-col">
           <span className="font-mono text-[10px] text-text-secondary uppercase">Programmés</span>
           <span className="font-heading text-xl font-bold text-info">{stats.programmes}</span>
        </div>
        <div className="bg-surface-card p-3 rounded-xl border border-surface-border flex flex-col">
           <span className="font-mono text-[10px] text-text-secondary uppercase">Faits (mois)</span>
           <span className="font-heading text-xl font-bold text-status-success">{stats.faitsMois}</span>
        </div>
        <div className="bg-surface-card p-3 rounded-xl border border-surface-border flex flex-col">
           <span className="font-mono text-[10px] text-text-secondary uppercase">Animaux</span>
           <span className="font-heading text-xl font-bold text-text-primary">{stats.animaux}</span>
        </div>
        <div className="bg-surface-card p-3 rounded-xl border border-surface-border flex flex-col">
           <span className="font-mono text-[10px] text-text-secondary uppercase">Portées</span>
           <span className="font-heading text-xl font-bold text-text-primary">{stats.portees}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link to="/sante/new" className="flex-1 bg-primary text-on-primary py-3 rounded-lg flex items-center justify-center gap-2 font-semibold active:scale-95 transition-transform text-sm">
          <Calendar className="w-4 h-4" />
          <span>Nouveau prévu</span>
        </Link>
        <Link to="/sante/fait" className="flex-1 bg-secondary text-on-secondary-container py-3 rounded-lg flex items-center justify-center gap-2 font-semibold active:scale-95 transition-transform text-sm">
          <Check className="w-4 h-4" />
          <span>Enregistrer fait</span>
        </Link>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 pt-2 -mx-2 px-2">
        {[
          { id: "toutes", label: "Tous" },
          { id: "a_faire", label: "À faire" },
          { id: "en_cours", label: "En cours" },
          { id: "faits", label: "Faits" },
          { id: "en_retard", label: "En retard" },
          { id: "programmes", label: "Programmés" },
          { id: "prophylaxie", label: "Prophylaxie" },
          { id: "curatif", label: "Curatif" }
        ].map((f) => (
          <button 
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn("whitespace-nowrap px-4 py-1.5 rounded-full font-mono text-[12px] font-semibold transition-colors border",
              filter === f.id 
                ? "bg-primary-container text-on-primary-container border-transparent" 
                : "bg-surface-container text-on-surface-variant border-surface-border hover:bg-surface-variant"
            )}
          >
            {f.label.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filteredTraitements.length === 0 ? (
          <div className="h-48 border-2 border-dashed border-surface-border rounded-xl flex items-center justify-center text-text-secondary text-sm">
            Aucun traitement trouvé.
          </div>
        ) : (
          filteredTraitements.map(t => (
            <div 
              key={t.id}
              onClick={() => navigate(`/sante/${t.id}`)}
              className="bg-surface-card border border-surface-border rounded-xl p-card-padding flex flex-col gap-2 relative overflow-hidden hover:border-primary transition-colors group cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-semibold text-lg text-text-primary">
                    {t.sujetNom || t.sujetType}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md border", getStatusColor(t.statut))}>
                    {t.statut}
                  </div>
                  <Link 
                    to={`/sante/edit/${t.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 bg-surface-container rounded-md hover:bg-surface-variant transition-colors text-text-secondary hover:text-primary"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <p className="font-sans text-sm font-medium text-secondary">{t.nomProduit} <span className="text-text-secondary text-xs ml-1">• {t.typeAction}</span></p>
              
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-surface-border">
                <div className="flex flex-col">
                   <span className="font-mono text-[10px] text-text-secondary uppercase">Date prévue</span>
                   <span className="font-sans text-sm font-medium text-on-surface-variant flex items-center gap-1">
                     <Calendar className="w-3 h-3"/> {format(new Date(t.datePrevue), 'dd/MM/yyyy')}
                   </span>
                </div>
                {t.prochainRappel && (
                   <div className="flex flex-col">
                     <span className="font-mono text-[10px] text-text-secondary uppercase">Rappel</span>
                     <span className="font-sans text-sm font-medium text-on-surface-variant">
                       {format(new Date(t.prochainRappel), 'dd/MM/yyyy')}
                     </span>
                   </div>
                )}
              </div>
              
              {t.objectif && (
                <p className="text-xs text-text-secondary mt-1 bg-surface-container/50 p-2 rounded line-clamp-1">
                  {t.objectif}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
