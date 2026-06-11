import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, initDbSettings } from "../lib/db";
import { Users, HeartPulse, Baby, Bell, Rabbit, AlertCircle, Plus, SearchCheck, Flame, Wallet, TrendingUp } from "lucide-react";
import { format, isPast, isToday, isTomorrow, addDays, differenceInDays } from "date-fns";

export default function Dashboard() {
  useEffect(() => {
    initDbSettings();
  }, []);

  const totalCheptel = useLiveQuery(() => db.reproducteurs.count());
  const malesCount = useLiveQuery(() => db.reproducteurs.where("sexe").equals("male").count());
  const femellesCount = useLiveQuery(() => db.reproducteurs.where("sexe").equals("femelle").count());
  
  const reproducteurs = useLiveQuery(() => db.reproducteurs.toArray()) || [];
  const getReproCode = (id: string) => reproducteurs.find(r => r.id === id)?.code || "Inconnu";

  const saillies = useLiveQuery(async () => {
    return (await db.saillies.toArray());
  }) || [];

  const portees = useLiveQuery(async () => {
    return (await db.portees.toArray());
  }) || [];

  const sailliesEnAttente = saillies.filter(s => s.statut === "en_attente" || s.statut === "enregistree").length;
  const porteesEnCours = portees.filter(p => p.statut === "nee" || p.statut === "en_cours" || p.statut === "a_surveiller" || p.statut === "a_sevrer").length;

  const depenses = useLiveQuery(() => db.depenses.toArray()) || [];
  const recettes = useLiveQuery(() => db.recettes.toArray()) || [];

  const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);
  const totalRecettes = recettes.reduce((sum, r) => sum + r.montant, 0);
  const solde = totalRecettes - totalDepenses;

  const getRelativeTime = (date: Date) => {
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return "Demain";
    if (isPast(date)) {
      const diff = differenceInDays(new Date(), date);
      return `En retard de ${diff}j`;
    }
    const diff = differenceInDays(date, new Date());
    return `Dans ${diff}j`;
  };

  const traitements = useLiveQuery(() => db.traitements.toArray()) || [];
  
  const santeStats = useMemo(() => {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    return {
      aFaire: traitements.filter(t => (t.statut === "À faire" || t.statut === "À renouveler" || t.statut === "Programmé") && isToday(new Date(t.datePrevue))).length,
      enCours: traitements.filter(t => t.statut === "En cours").length,
      enRetard: traitements.filter(t => t.statut === "En retard" || ((t.statut === "À faire" || t.statut === "À renouveler" || t.statut === "Programmé") && isPast(new Date(t.datePrevue)) && !isToday(new Date(t.datePrevue)))).length,
      prophylaxies: traitements.filter(t => t.typeAction === "Prophylaxie" && (t.statut === "Programmé" || t.statut === "À faire")).length,
      faitsMois: traitements.filter(t => t.statut === "Fait" && t.dateRealisation && new Date(t.dateRealisation) >= startMonth && new Date(t.dateRealisation) <= endMonth).length,
    };
  }, [traitements]);

  const alertes = useMemo(() => {
    let list: any[] = [];
    
    saillies.forEach(s => {
      const codeFemelle = getReproCode(s.femelleId);
      if (s.statut === "enregistree" || s.statut === "en_attente") {
        list.push({ id: `ctrl-${s.id}`, text: `Palpation - ${codeFemelle}`, dateObj: new Date(s.dateControle), type: "controle" });
      }
      if (s.statut === "confirmee") {
        list.push({ id: `prep-${s.id}`, text: `Boîte à nid - ${codeFemelle}`, dateObj: new Date(s.datePreparation), type: "preparation" });
        list.push({ id: `mb-${s.id}`, text: `Mise bas - ${codeFemelle}`, dateObj: new Date(s.dateMiseBasPrevue), type: "mise_bas" });
      }
    });

    portees.forEach(p => {
      if (p.statut !== 'sevree' && p.statut !== 'cloturee') {
        list.push({ id: `sev-${p.id}`, text: `Sevrage - Portée ${p.code}`, dateObj: new Date(p.dateSevragePrevue), type: "sevrage" });
      }
    });

    traitements.forEach(t => {
      if (t.statut === "À faire" || t.statut === "Programmé" || t.statut === "À renouveler") {
        list.push({ id: `trt-${t.id}`, text: `${t.typeAction} - ${t.sujetNom || t.sujetId}`, dateObj: new Date(t.datePrevue), type: "sante" });
      }
      if (t.prochainRappel && t.statut !== "Annulé" && t.statut !== "Terminé") {
        list.push({ id: `trt-rappel-${t.id}`, text: `Rappel: ${t.typeAction} - ${t.sujetNom || t.sujetId}`, dateObj: new Date(t.prochainRappel), type: "sante" });
      }
    });

    list.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    
    // Format after sort
    return list.slice(0, 5).map(a => ({
      ...a,
      date: getRelativeTime(a.dateObj)
    }));
  }, [saillies, portees, reproducteurs, traitements]);

  const getAlertIcon = (type: string) => {
    switch(type) {
      case 'controle': return <SearchCheck className="w-4 h-4 text-status-breeding" />;
      case 'preparation': return <Flame className="w-4 h-4 text-secondary" />;
      case 'mise_bas': return <HeartPulse className="w-4 h-4 text-status-critical" />;
      case 'sevrage': return <Rabbit className="w-4 h-4 text-primary" />;
      case 'sante': return <Plus className="w-4 h-4 text-warning" />;
      default: return <AlertCircle className="w-4 h-4 text-on-surface-variant" />;
    }
  };

  return (
    <div className="space-y-section pb-24">
      {/* Header Segment */}
      <section>
        <span className="font-mono text-[12px] font-semibold text-secondary uppercase tracking-widest">Vue d'ensemble</span>
        <h2 className="font-heading text-3xl font-semibold text-text-primary mt-1">Tableau de bord</h2>
      </section>

      {/* KPI Grid */}
      <section className="grid grid-cols-2 gap-stack-gap">
        <Link to="/cheptel" className="bg-surface-card p-card-padding rounded-xl border border-surface-border flex flex-col hover:border-primary transition-colors">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Users className="w-4 h-4" />
            <span className="font-mono text-[10px] uppercase font-semibold">Cheptel</span>
          </div>
          <p className="font-heading text-[40px] font-bold text-text-primary leading-none">{totalCheptel || 0}</p>
          <div className="flex justify-between mt-3 pt-3 border-t border-surface-border font-sans text-xs text-text-secondary">
            <span>{malesCount || 0} M</span>
            <span>{femellesCount || 0} F</span>
          </div>
        </Link>
        
        <Link to="/saillies" className="bg-surface-card p-card-padding rounded-xl border border-surface-border flex flex-col hover:border-primary transition-colors">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <HeartPulse className="w-4 h-4" />
            <span className="font-mono text-[10px] uppercase font-semibold">Saillies en cours</span>
          </div>
          <p className="font-heading text-[40px] font-bold text-secondary leading-none">{sailliesEnAttente || 0}</p>
        </Link>
        
        <Link to="/portees" className="bg-surface-card p-card-padding rounded-xl border border-surface-border flex flex-col hover:border-primary transition-colors col-span-2">
          <div className="flex items-center gap-2 text-text-secondary mb-2">
            <Baby className="w-4 h-4" />
            <span className="font-mono text-[10px] uppercase font-semibold">Portées actives</span>
          </div>
          <div className="flex justify-between items-end">
            <p className="font-heading text-[40px] font-bold text-primary leading-none">{porteesEnCours || 0}</p>
            <span className="font-sans text-sm text-text-secondary mb-1">Mises bas en suivi</span>
          </div>
        </Link>
      </section>

      {/* Quick Actions Array - Horizontal */}
      <section>
        <h3 className="font-mono text-[11px] font-semibold text-text-secondary uppercase tracking-widest mb-3">Actions rapides</h3>
        <div className="grid grid-cols-3 gap-2">
          <Link to="/cheptel/new" className="bg-surface-container-high border border-surface-border p-2 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-surface-variant transition-colors group text-center h-24">
            <div className="bg-surface-card p-1.5 rounded-full group-hover:scale-110 transition-transform">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <span className="font-sans text-[10px] font-medium text-text-primary leading-tight">Sujet</span>
          </Link>
          <Link to="/saillies/new" className="bg-surface-container-high border border-surface-border p-2 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-surface-variant transition-colors group text-center h-24">
            <div className="bg-surface-card p-1.5 rounded-full group-hover:scale-110 transition-transform">
              <HeartPulse className="w-4 h-4 text-secondary" />
            </div>
            <span className="font-sans text-[10px] font-medium text-text-primary leading-tight">Saillie</span>
          </Link>
          <Link to="/portees/new" className="bg-surface-container-high border border-surface-border p-2 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-surface-variant transition-colors group text-center h-24">
            <div className="bg-surface-card p-1.5 rounded-full group-hover:scale-110 transition-transform">
              <Baby className="w-4 h-4 text-tertiary-container" />
            </div>
            <span className="font-sans text-[10px] font-medium text-text-primary leading-tight">Portée</span>
          </Link>
        </div>
      </section>

      {/* Suivi sanitaire */}
      <section>
        <div className="flex justify-between items-end mb-3">
          <h3 className="font-mono text-[11px] font-semibold text-text-secondary uppercase tracking-widest">Suivi sanitaire</h3>
          <Link to="/sante" className="font-sans text-xs text-primary font-medium hover:underline">Voir détails</Link>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
           <div className="bg-surface-card p-3 rounded-xl border border-surface-border flex flex-col">
              <span className="font-mono text-[10px] text-text-secondary uppercase">À faire ajd</span>
              <span className="font-heading text-xl font-bold text-warning">{santeStats.aFaire}</span>
           </div>
           <div className="bg-surface-card p-3 rounded-xl border border-surface-border flex flex-col">
              <span className="font-mono text-[10px] text-text-secondary uppercase">En cours</span>
              <span className="font-heading text-xl font-bold text-primary">{santeStats.enCours}</span>
           </div>
           <div className="bg-surface-card p-3 rounded-xl border border-surface-border flex flex-col">
              <span className="font-mono text-[10px] text-error uppercase">En retard</span>
              <span className="font-heading text-xl font-bold text-error">{santeStats.enRetard}</span>
           </div>
           <div className="bg-surface-card p-3 rounded-xl border border-surface-border flex flex-col">
              <span className="font-mono text-[10px] text-text-secondary uppercase">Prophylaxies prévues</span>
              <span className="font-heading text-xl font-bold text-info">{santeStats.prophylaxies}</span>
           </div>
           <div className="bg-surface-card p-3 rounded-xl border border-surface-border flex flex-col lg:col-span-2">
              <span className="font-mono text-[10px] text-text-secondary uppercase">Faits (mois)</span>
              <span className="font-heading text-xl font-bold text-status-success">{santeStats.faitsMois}</span>
           </div>
        </div>

        <div className="bg-surface-card rounded-xl border border-surface-border p-card-padding">
           <div className="grid grid-cols-2 gap-4">
              <Link to="/sante/new" className="flex-1 bg-primary/10 text-primary py-3 rounded-lg flex items-center justify-center gap-2 font-semibold hover:bg-primary/20 transition-colors text-xs">
                <Plus className="w-4 h-4" /> Prévu
              </Link>
              <Link to="/sante/fait" className="flex-1 bg-status-success/10 text-status-success py-3 rounded-lg flex items-center justify-center gap-2 font-semibold hover:bg-status-success/20 transition-colors text-xs">
                <SearchCheck className="w-4 h-4" /> Fait
              </Link>
           </div>
        </div>
      </section>

      {/* Comptabilité */}
      <section>
        <div className="flex justify-between items-end mb-3">
          <h3 className="font-mono text-[11px] font-semibold text-text-secondary uppercase tracking-widest">Comptabilité</h3>
        </div>
        <div className="bg-surface-card rounded-xl border border-surface-border p-card-padding">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-sans text-xs text-text-secondary">Solde actuel</p>
              <p className={`font-heading text-2xl font-bold ${solde >= 0 ? "text-status-success" : "text-error"}`}>
                {solde >= 0 ? "+" : ""}{solde.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>
          
          <div className="flex gap-4 border-t border-surface-border pt-4 mb-4">
            <Link to="/recettes" className="flex-1 hover:bg-surface-variant p-2 -m-2 rounded-lg transition-colors cursor-pointer block">
              <p className="font-sans text-[10px] text-text-secondary mb-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-status-success" /> Recettes
              </p>
              <p className="font-mono text-sm font-semibold text-text-primary">{totalRecettes.toLocaleString('fr-FR')} F</p>
            </Link>
            <div className="w-px bg-surface-border my-2"></div>
            <Link to="/depenses" className="flex-1 hover:bg-surface-variant p-2 -m-2 rounded-lg transition-colors cursor-pointer block">
              <p className="font-sans text-[10px] text-text-secondary mb-1 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-error" /> Dépenses
              </p>
              <p className="font-mono text-sm font-semibold text-text-primary">{totalDepenses.toLocaleString('fr-FR')} F</p>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link to="/recettes?new=true" className="h-10 bg-status-success/10 text-status-success rounded-lg font-heading font-semibold text-xs flex items-center justify-center gap-2 hover:bg-status-success/20 transition-colors">
              <Plus className="w-4 h-4" /> Recette
            </Link>
            <Link to="/depenses?new=true" className="h-10 bg-error/10 text-error rounded-lg font-heading font-semibold text-xs flex items-center justify-center gap-2 hover:bg-error/20 transition-colors">
              <Plus className="w-4 h-4" /> Dépense
            </Link>
          </div>
        </div>
      </section>

      {/* Tâches à venir / Alertes */}
      <section>
        <div className="flex justify-between items-end mb-3">
          <h3 className="font-mono text-[11px] font-semibold text-text-secondary uppercase tracking-widest">Tâches imminentes</h3>
          <Link to="/alertes" className="font-sans text-xs text-primary font-medium hover:underline">Voir tout</Link>
        </div>
        <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
          {alertes.map((alerte, i) => (
            <div key={alerte.id} className={`p-4 flex gap-3 ${i !== alertes.length - 1 ? 'border-b border-surface-border' : ''}`}>
              <div className="mt-0.5">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center border border-surface-border">
                  {getAlertIcon(alerte.type)}
                </div>
              </div>
              <div>
                <p className="font-sans text-sm font-medium text-text-primary capitalize-first">{alerte.text}</p>
                <p className="font-sans text-xs text-text-secondary mt-1">{alerte.date}</p>
              </div>
            </div>
          ))}
          {alertes.length === 0 && (
            <div className="p-6 text-center">
              <p className="font-sans text-sm text-text-secondary">Aucune tâche imminente.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
