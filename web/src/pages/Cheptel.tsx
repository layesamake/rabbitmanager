import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { Search, Plus, Tag, Venus, Mars } from "lucide-react";
import { cn } from "../lib/utils";

type Filter = "tous" | "males" | "femelles" | "gestantes" | "inactifs";

export default function Cheptel() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("tous");

  const reproducteurs = useLiveQuery(async () => {
    let collection = db.reproducteurs.toCollection();
    
    const all = await collection.toArray();
    
    return all.filter(r => {
      // 1. Search text
      if (search && !r.code.toLowerCase().includes(search.toLowerCase()) && !(r.nom?.toLowerCase() || "").includes(search.toLowerCase())) {
        return false;
      }
      
      const isActif = r.statut !== 'mort' && r.statut !== 'reforme' && r.statut !== 'vendu';

      // 2. Chips filter
      if (filter === "inactifs") return !isActif;
      
      // For all other filters, ensure they are active
      if (!isActif) return false;

      if (filter === "males" && r.sexe !== "male") return false;
      if (filter === "femelles" && r.sexe !== "femelle") return false;
      if (filter === "gestantes" && r.statut !== "gestante") return false;

      return true;
    });
  }, [search, filter]) || [];

  const races = useLiveQuery(() => db.races.toArray()) || [];
  const getRaceName = (id: string) => races.find(r => r.id === id)?.nom || "Inconnue";

  // Helpers pour l'affichage conditionnel
  const getBadgeClass = (statut: string) => {
    switch (statut) {
      case "gestante": return "bg-secondary-container text-on-secondary-container";
      case "allaitante": return "bg-status-breeding/20 text-status-breeding border border-status-breeding/30";
      case "actif": return "border border-secondary text-secondary";
      case "disponible": return "bg-primary-container text-on-primary-container";
      case "saillie": return "bg-tertiary-container text-on-tertiary-container";
      case "decede":
      case "reforme": return "bg-error-container text-on-error-container";
      default: return "bg-surface-variant text-on-surface-variant";
    }
  };

  return (
    <div className="space-y-section pb-24 relative min-h-screen">
      {/* Search and Filters Section */}
      <div className="space-y-stack-gap">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none" aria-hidden="true">
            <Search className="w-5 h-5 text-outline" />
          </div>
          <input 
            type="text" 
            aria-label="Rechercher par code ou nom"
            placeholder="Rechercher par code ou nom..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 bg-surface-container border border-surface-border rounded-lg pl-10 pr-4 text-on-surface placeholder:text-outline focus:border-primary focus:ring-0 transition-colors duration-200"
          />
        </div>

        {/* Horizontal Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button 
            onClick={() => setFilter("tous")}
            className={cn("whitespace-nowrap px-4 py-2 rounded-full font-mono text-[12px] font-semibold transition-all uppercase tracking-wider", 
              filter === "tous" ? "bg-primary text-on-primary" : "border border-surface-border text-on-surface-variant hover:bg-surface-variant")}
          >
            Tous
          </button>
          <button 
            onClick={() => setFilter("males")}
            className={cn("whitespace-nowrap px-4 py-2 rounded-full font-mono text-[12px] font-semibold transition-all uppercase tracking-wider", 
              filter === "males" ? "bg-primary text-on-primary" : "border border-surface-border text-on-surface-variant hover:bg-surface-variant")}
          >
            Mâles
          </button>
          <button 
            onClick={() => setFilter("femelles")}
            className={cn("whitespace-nowrap px-4 py-2 rounded-full font-mono text-[12px] font-semibold transition-all uppercase tracking-wider", 
              filter === "femelles" ? "bg-primary text-on-primary" : "border border-surface-border text-on-surface-variant hover:bg-surface-variant")}
          >
            Femelles
          </button>
          <button 
            onClick={() => setFilter("gestantes")}
            className={cn("whitespace-nowrap px-4 py-2 rounded-full font-mono text-[12px] font-semibold transition-all uppercase tracking-wider", 
              filter === "gestantes" ? "bg-primary text-on-primary" : "border border-surface-border text-on-surface-variant hover:bg-surface-variant")}
          >
            Gestantes
          </button>
          <button 
            onClick={() => setFilter("inactifs")}
            className={cn("whitespace-nowrap px-4 py-2 rounded-full font-mono text-[12px] font-semibold transition-all uppercase tracking-wider", 
              filter === "inactifs" ? "bg-primary text-on-primary" : "border border-surface-border text-on-surface-variant hover:bg-surface-variant")}
          >
            Inactifs
          </button>
        </div>
      </div>

      {/* Cheptel List */}
      <section className="space-y-stack-gap">
        <h2 className="font-mono text-[12px] font-semibold text-outline uppercase tracking-widest">Cheptel Actuel ({reproducteurs.length})</h2>
        
        {reproducteurs.length === 0 ? (
          <div className="h-48 border-2 border-dashed border-surface-border rounded-xl flex flex-col items-center justify-center text-text-secondary gap-2">
            <span className="font-sans text-sm">Aucun reproducteur trouvé.</span>
          </div>
        ) : (
          reproducteurs.map(rabbit => (
            <Link to={`/cheptel/${rabbit.id}`} key={rabbit.id} className="block">
              <article className="bg-surface-card border border-surface-border rounded-xl p-card-padding flex gap-4 hover:border-primary transition-colors cursor-pointer group">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-lg bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0 border border-surface-border group-hover:border-primary transition-colors relative">
                  {rabbit.photo ? (
                    <img src={rabbit.photo} alt={rabbit.code} className="w-full h-full object-cover" />
                  ) : (
                    <div className={cn("text-xl font-bold uppercase", rabbit.sexe === "male" ? "text-secondary" : "text-primary")}>
                      {rabbit.code.slice(0, 2)}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 space-y-0.5">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-primary font-bold text-base">{rabbit.code}</span>
                    <span className={cn("px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold tracking-wider", getBadgeClass(rabbit.statut))}>
                      {rabbit.statut}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="flex items-center gap-1 font-heading font-semibold text-text-primary text-sm leading-tight">
                      {rabbit.sexe === 'male' ? <Mars className="w-3.5 h-3.5 text-secondary" /> : <Venus className="w-3.5 h-3.5 text-primary" />}
                      {rabbit.sexe === 'male' ? 'Mâle' : 'Femelle'}{rabbit.nom ? ` - ${rabbit.nom}` : ''}, {getRaceName(rabbit.raceId)}
                    </span>
                    <div className="flex items-center gap-3 mt-1 opacity-80">
                      {rabbit.emplacement && (
                        <span className="flex items-center gap-1 font-sans text-xs text-text-secondary">
                          <Tag className="w-3 h-3" />
                          Cage {rabbit.emplacement}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))
        )}
      </section>

      {/* Floating Actions */}
      <div className="fixed bottom-20 left-0 right-0 pointer-events-none z-40 flex justify-center">
        <div className="w-full max-w-[600px] px-4 flex flex-col items-end gap-3 pointer-events-auto">
          <Link to="/races/new" className="h-10 px-4 bg-surface-container-high border border-surface-border rounded-full flex items-center gap-2 text-text-primary hover:bg-surface-variant transition-all active:scale-95 shadow-xl">
            <span className="font-mono text-[11px] font-semibold uppercase">Nouvelle race</span>
          </Link>
          <Link to="/cheptel/new" aria-label="Nouveau reproducteur" className="h-14 w-14 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-2xl active:scale-95 transition-all">
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
