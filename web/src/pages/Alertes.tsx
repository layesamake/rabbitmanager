import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { SearchCheck, Flame, HeartPulse, Rabbit, Info, CalendarClock, Plus } from "lucide-react";
import { format, isPast, isToday, isTomorrow, addDays, differenceInDays } from "date-fns";
import { cn } from "../lib/utils";

type AlerteUi = {
  id: string;
  titre: string;
  type: string;
  date: Date;
  referenceId?: string;
  url: string;
  criticite: "haute" | "moyenne" | "basse";
};

export default function Alertes() {
  const [filterCriticite, setFilterCriticite] = useState<string>("haute");
  const [filterType, setFilterType] = useState<string>("mise_bas");

  // Config
  const params = useLiveQuery(() => db.parametres.toArray().then(p => p[0])) || {
    joursAvantControle: 14,
    joursAvantPreparation: 27,
    dureeGestation: 31,
    ageSevrage: 35
  };

  const saillies = useLiveQuery(() => db.saillies.filter(s => s.statut === "enregistree" || s.statut === "en_attente" || s.statut === "confirmee").toArray()) || [];
  const portees = useLiveQuery(() => db.portees.filter(p => p.statut === "nee" || p.statut === "en_cours" || p.statut === "a_surveiller").toArray()) || [];
  const reproducteurs = useLiveQuery(() => db.reproducteurs.toArray()) || [];

  const getReproCode = (id: string) => reproducteurs.find(r => r.id === id)?.code || "Inconnu";

  const traitements = useLiveQuery(() => db.traitements.toArray()) || [];

  const alertes: AlerteUi[] = useMemo(() => {
    let list: AlerteUi[] = [];

    // Saillies
    saillies.forEach(s => {
      const codeFemelle = getReproCode(s.femelleId);
      if (s.statut === "enregistree" || s.statut === "en_attente") {
        list.push({
          id: `controle-${s.id}`,
          titre: `Contrôle palpation - ${codeFemelle}`,
          type: "controle",
          date: new Date(s.dateControle),
          referenceId: s.id,
          url: `/saillies/${s.id}`,
          criticite: isPast(new Date(s.dateControle)) ? "haute" : "moyenne"
        });
      }
      if (s.statut === "confirmee") {
        list.push({
          id: `prepa-${s.id}`,
          titre: `Mise en place nid - ${codeFemelle}`,
          type: "preparation",
          date: new Date(s.datePreparation),
          referenceId: s.id,
          url: `/saillies/${s.id}`,
          criticite: isPast(new Date(s.datePreparation)) ? "haute" : "moyenne"
        });
        list.push({
          id: `misebas-${s.id}`,
          titre: `Mise bas prévue - ${codeFemelle}`,
          type: "mise_bas",
          date: new Date(s.dateMiseBasPrevue),
          referenceId: s.id,
          url: `/saillies/${s.id}`,
          criticite: isPast(new Date(s.dateMiseBasPrevue)) ? "haute" : "moyenne"
        });
      }
    });

    // Portees (Sevrage)
    portees.forEach(p => {
      list.push({
        id: `sevrage-${p.id}`,
        titre: `Sevrage portée ${p.code}`,
        type: "sevrage",
        date: new Date(p.dateSevragePrevue),
        referenceId: p.id,
        url: `/portees/${p.id}`,
        criticite: isPast(new Date(p.dateSevragePrevue)) ? "haute" : "moyenne"
      });
    });

    // Traitements (Santé)
    traitements.forEach(t => {
      if (t.statut === "À faire" || t.statut === "Programmé" || t.statut === "À renouveler") {
        list.push({
          id: `sante-${t.id}`,
          titre: `${t.typeAction} - ${t.sujetNom || t.sujetId}`,
          type: "sante",
          date: new Date(t.datePrevue),
          referenceId: t.id,
          url: `/sante/${t.id}`,
          criticite: isPast(new Date(t.datePrevue)) && !isToday(new Date(t.datePrevue)) ? "haute" : "moyenne"
        });
      }
      
      if (t.prochainRappel && t.statut !== "Annulé" && t.statut !== "Terminé") {
        list.push({
          id: `sante-rappel-${t.id}`,
          titre: `Rappel: ${t.typeAction} - ${t.sujetNom || t.sujetId}`,
          type: "sante",
          date: new Date(t.prochainRappel),
          referenceId: t.id,
          url: `/sante/${t.id}`,
          criticite: isPast(new Date(t.prochainRappel)) && !isToday(new Date(t.prochainRappel)) ? "haute" : "moyenne"
        });
      }
    });

    // Trier les alertes de la plus ancienne/urgente à la plus lointaine
    list.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Filtrer pour ne garder que celles qui sont passées ou dans les 7 prochains jours
    const in7Days = addDays(new Date(), 7);
    return list.filter(a => a.date <= in7Days);
  }, [saillies, portees, reproducteurs, traitements]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'controle': return <SearchCheck className="w-5 h-5 text-status-breeding" />;
      case 'preparation': return <Flame className="w-5 h-5 text-secondary" />;
      case 'mise_bas': return <HeartPulse className="w-5 h-5 text-status-critical" />;
      case 'sevrage': return <Rabbit className="w-5 h-5 text-primary" />;
      case 'sante': return <Plus className="w-5 h-5 text-warning" />;
      default: return <Info className="w-5 h-5 text-on-surface-variant" />;
    }
  };

  const getRelativeTime = (date: Date) => {
    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return "Demain";
    if (isPast(date)) {
      const diff = differenceInDays(new Date(), date);
      return `En retard de ${diff} jour${diff > 1 ? 's' : ''}`;
    }
    const diff = differenceInDays(date, new Date());
    return `Dans ${diff} jour${diff > 1 ? 's' : ''}`;
  };

  const filteredAlertes = useMemo(() => {
    let copy = [...alertes];
    if (filterCriticite !== 'toutes') {
      copy = copy.filter(a => a.criticite === filterCriticite);
    }
    if (filterType !== 'tous') {
      copy = copy.filter(a => a.type === filterType);
    }
    return copy;
  }, [alertes, filterCriticite, filterType]);

  return (
    <div className="space-y-section pb-24">
      <section>
        <div className="flex items-center gap-2 mb-1">
          <CalendarClock className="w-4 h-4 text-secondary" />
          <span className="font-mono text-[12px] font-semibold text-secondary uppercase tracking-widest">Planification</span>
        </div>
        <h2 className="font-heading text-3xl font-semibold text-text-primary">Tâches à faire</h2>
        <p className="font-sans text-sm text-text-secondary mt-1">Actions requises dans les 7 prochains jours.</p>
      </section>

      <section className="flex flex-col sm:flex-row gap-3">
        <select 
          value={filterCriticite} 
          onChange={(e) => setFilterCriticite(e.target.value)}
          className="h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-sm text-text-primary outline-none focus:border-primary shrink-0"
        >
          <option value="toutes">Toutes les criticités</option>
          <option value="haute">Haute (En retard)</option>
          <option value="moyenne">Moyenne (À venir)</option>
          <option value="basse">Basse</option>
        </select>
        
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-sm text-text-primary outline-none focus:border-primary shrink-0"
        >
          <option value="tous">Tous les types</option>
          <option value="controle">Contrôle palpation</option>
          <option value="preparation">Préparation nid</option>
          <option value="mise_bas">Mise bas</option>
          <option value="sevrage">Sevrage</option>
          <option value="sante">Santé / Traitements</option>
        </select>
      </section>

      <section className="space-y-stack-gap">
        {filteredAlertes.length === 0 ? (
          <div className="h-32 border-2 border-dashed border-surface-border rounded-xl flex items-center justify-center text-text-secondary text-sm">
            Aucune tâche trouvée pour ces filtres.
          </div>
        ) : (
          filteredAlertes.map((alerte) => (
            <Link 
              key={alerte.id} 
              to={alerte.url}
              className={cn(
                "p-4 rounded-xl border flex gap-4 transition-colors",
                alerte.criticite === 'haute' ? 'bg-status-critical/10 border-status-critical/30 hover:border-status-critical/60' : 'bg-surface-card border-surface-border hover:border-primary'
              )}
            >
              <div className="mt-1">
                <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-surface-border shadow-sm">
                  {getIcon(alerte.type)}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-sans font-semibold text-base text-text-primary leading-tight">{alerte.titre}</h3>
                  <span className={cn(
                    "whitespace-nowrap font-mono text-[10px] font-bold uppercase rounded px-2 py-0.5 border",
                    alerte.criticite === 'haute' ? 'bg-status-critical text-on-error border-status-critical' : 'bg-surface-variant text-on-surface-variant border-surface-border'
                  )}>
                    {getRelativeTime(alerte.date)}
                  </span>
                </div>
                <p className="font-sans text-sm text-text-secondary mt-1 flex items-center gap-1">
                  Échéance : {format(alerte.date, 'dd/MM/yyyy')}
                </p>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
