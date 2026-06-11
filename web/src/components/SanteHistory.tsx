import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { db } from "../lib/db";
import { Plus, CheckCircle, Shield } from "lucide-react";
import { format } from "date-fns";

export function SanteHistory({ subjectType, subjectId }: { subjectType: string, subjectId: string }) {
  const traitements = useLiveQuery(async () => {
    const all = await db.traitements.toArray();
    return all.filter(t => t.sujetType === subjectType && (!t.sujetId || t.sujetId === subjectId)).sort((a, b) => new Date(b.datePrevue).getTime() - new Date(a.datePrevue).getTime());
  }, [subjectType, subjectId]) || [];

  return (
    <section className="space-y-stack-gap mt-6">
      <div className="flex justify-between items-end mb-2">
        <h3 className="font-heading text-xl font-semibold text-text-primary">Historique sanitaire</h3>
      </div>
      
      <div className="bg-surface-card rounded-xl border border-surface-border p-card-padding">
        {traitements.length === 0 ? (
          <p className="text-sm text-text-secondary italic text-center py-4">Aucun historique sanitaire pour ce sujet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {traitements.slice(0, 5).map(t => (
              <Link to={`/sante/${t.id}`} key={t.id} className="flex flex-col gap-1 border-b border-surface-border pb-3 last:border-0 last:pb-0 group">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-2">
                     <Shield className="w-4 h-4 text-secondary group-hover:text-primary transition-colors" />
                     <span className="font-medium text-text-primary text-sm group-hover:text-primary transition-colors">{t.nomProduit}</span>
                   </div>
                   <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-md bg-surface-container border border-surface-border text-text-secondary">{t.statut}</span>
                </div>
                <div className="flex justify-between text-xs text-text-secondary pl-6">
                   <span>{t.typeAction}</span>
                   <span>{format(new Date(t.dateRealisation || t.datePrevue), 'dd/MM/yyyy')}</span>
                </div>
              </Link>
            ))}
            {traitements.length > 5 && (
              <Link to="/sante" className="text-center text-xs font-medium text-primary py-2 hover:underline print:hidden">
                Voir tout l'historique dans le module Santé
              </Link>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-4 pt-4 border-t border-surface-border print:hidden">
          <Link to={`/sante/new`} className="flex-1 bg-surface-container border border-surface-border flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium hover:bg-surface-variant transition-colors">
             <Plus className="w-4 h-4 text-primary" /> Nouveau
          </Link>
          <Link to={`/sante/fait`} className="flex-1 bg-surface-container border border-surface-border flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium hover:bg-surface-variant transition-colors">
             <CheckCircle className="w-4 h-4 text-status-success" /> Enregistrer fait
          </Link>
        </div>
      </div>
    </section>
  );
}
