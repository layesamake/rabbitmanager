import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { ArrowLeft, Check, X, Edit, Calendar, Info, Trash2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "../lib/utils";
import { updateBaseEntity } from "../lib/entity-utils";
import { useState, useEffect } from "react";
import type { TypeSaillie } from "../types";
import { CalendarSyncButton } from "../components/CalendarSyncButton";

export default function FicheSaillie() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeEdit = searchParams.get("edit") === "true";

  const [isEditing, setIsEditing] = useState(modeEdit);
  
  // Edit State
  const [editDateSaillie, setEditDateSaillie] = useState("");
  const [editType, setEditType] = useState<TypeSaillie | "">("");
  const [editObservation, setEditObservation] = useState("");
  const [editMaleId, setEditMaleId] = useState("");

  const saillie = useLiveQuery(() => id ? db.saillies.get(id) : undefined, [id]);
  const femelle = useLiveQuery(() => saillie?.femelleId ? db.reproducteurs.get(saillie.femelleId) : undefined, [saillie?.femelleId]);
  
  const allMales = useLiveQuery(async () => {
    return (await db.reproducteurs.toArray()).filter(r => r.sexe === 'male' && r.statut !== 'mort' && r.statut !== 'reforme');
  });

  const males = useLiveQuery(async () => {
    if (!saillie || !saillie.maleIds || saillie.maleIds.length === 0) return [];
    return await Promise.all(saillie.maleIds.map(mId => db.reproducteurs.get(mId)));
  }, [saillie?.maleIds]) || [];

  useEffect(() => {
    if (saillie && isEditing) {
      setEditDateSaillie(saillie.dateSaillie);
      setEditType(saillie.type);
      setEditObservation(saillie.observation || "");
      setEditMaleId(saillie.maleIds && saillie.maleIds.length > 0 ? saillie.maleIds[0] : "");
    }
  }, [saillie, isEditing]);

  if (!saillie) return null;

  const validMales = males.filter(m => m !== undefined) as NonNullable<typeof males[0]>[];

  const handleConfirmer = async (confirmer: boolean) => {
    try {
      await db.transaction('rw', db.saillies, db.reproducteurs, async () => {
        saillie.statut = confirmer ? 'confirmee' : 'non_confirmee';
        await db.saillies.put(updateBaseEntity(saillie));

        if (femelle) {
          femelle.statut = confirmer ? 'gestante' : 'disponible';
          await db.reproducteurs.put(updateBaseEntity(femelle));
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!editDateSaillie || !editType || !editMaleId) return;
    try {
      // Recalculate dates if date changed
      const dSaillie = new Date(editDateSaillie);
      const dateControle = addDays(dSaillie, 14).toISOString().split('T')[0];
      const datePreparation = addDays(dSaillie, 28).toISOString().split('T')[0];
      const dateMiseBasPrevue = addDays(dSaillie, 31).toISOString().split('T')[0];

      await db.saillies.update(saillie.id, updateBaseEntity({
        ...saillie,
        dateSaillie: editDateSaillie,
        type: editType as TypeSaillie,
        observation: editObservation,
        maleIds: [editMaleId],
        dateControle,
        datePreparation,
        dateMiseBasPrevue
      }));
      setIsEditing(false);
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Voulez-vous vraiment supprimer définitivement cette saillie ?")) {
      try {
        await db.transaction('rw', db.saillies, db.reproducteurs, async () => {
          await db.saillies.delete(saillie.id);
          
          // Revert female status if it wasn't already updated by something else
          if (femelle && (femelle.statut === 'gestante' || femelle.statut === 'saillie_a_confirmer') && saillie.statut !== 'mise_bas') {
            femelle.statut = 'disponible';
            await db.reproducteurs.put(updateBaseEntity(femelle));
          }
        });
        navigate("/saillies");
      } catch (err) {
         console.error(err);
      }
    }
  };

  return (
    <div className="space-y-stack-gap pb-24">
      {/* Header */}
      <header className="flex items-start justify-between py-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate(-1)} aria-label="Retour" className="p-1 -ml-1 text-on-surface-variant hover:text-primary">
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <span className="font-mono text-[10px] text-text-secondary uppercase tracking-widest">Détail Saillie</span>
          </div>
          <h2 className="font-heading text-2xl font-semibold text-text-primary uppercase">
            {femelle?.code || 'Inconnue'} × {isEditing ? "..." : validMales.map(m => m.code).join(', ')}
          </h2>
          <div className={cn("inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase mt-2", 
            saillie.statut === 'confirmee' ? 'bg-secondary text-on-secondary-container border-secondary' : 
            (saillie.statut === 'enregistree' || saillie.statut === 'en_attente') ? 'bg-tertiary-container text-on-tertiary-container border-tertiary-container' : 
            saillie.statut === 'mise_bas' ? 'bg-primary-container text-on-primary-container border-primary' :
            'bg-surface-variant text-on-surface-variant border-surface-border'
          )}>
            {saillie.statut.replace("_", " ")}
          </div>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditing(true)} aria-label="Modifier la saillie" className="p-2.5 bg-surface-container border border-surface-border text-text-primary hover:text-primary hover:border-primary transition-colors rounded-xl flex items-center justify-center shadow-sm">
              <Edit className="w-5 h-5" aria-hidden="true" />
            </button>
            <button 
              onClick={handleDelete}
              aria-label="Supprimer la saillie" 
              className="p-2.5 bg-surface-container border border-surface-border text-status-critical hover:bg-status-critical/10 hover:border-status-critical/50 transition-colors rounded-xl flex items-center justify-center shadow-sm"
            >
              <Trash2 className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </header>

      {/* Infos */}
      <section className="bg-surface-card p-card-padding rounded-xl border border-surface-border">
        {isEditing ? (
          <div className="space-y-4">
             <div className="flex flex-col gap-1">
              <label className="font-sans text-xs font-medium text-text-secondary">Date de saillie</label>
              <input 
                type="date"
                value={editDateSaillie}
                onChange={e => setEditDateSaillie(e.target.value)}
                className="bg-surface-container border border-surface-border rounded-lg h-10 px-3 text-sm text-text-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-sans text-xs font-medium text-text-secondary">Mâle</label>
              <select value={editMaleId} onChange={e => setEditMaleId(e.target.value)} className="bg-surface-container border border-surface-border rounded-lg h-10 px-2 text-sm text-text-primary">
                <option value="">Sélectionner un mâle</option>
                {allMales?.map(m => <option key={m.id} value={m.id}>{m.code} {m.nom ? `(${m.nom})` : ''}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-sans text-xs font-medium text-text-secondary">Type</label>
              <select value={editType} onChange={e => setEditType(e.target.value as TypeSaillie)} className="bg-surface-container border border-surface-border rounded-lg h-10 px-2 text-sm text-text-primary">
                <option value="naturelle">Naturelle</option>
                <option value="controlee">Contrôlée</option>
                <option value="double">Double</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-sans text-xs font-medium text-text-secondary">Observation</label>
              <textarea 
                value={editObservation}
                onChange={e => setEditObservation(e.target.value)}
                className="bg-surface-container border border-surface-border rounded-lg p-2 text-sm text-text-primary resize-none w-full"
                rows={3}
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="font-sans text-xs text-text-secondary uppercase tracking-widest mb-1">Date</p>
                <p className="font-sans text-base text-text-primary">{format(new Date(saillie.dateSaillie), 'dd/MM/yyyy')}</p>
              </div>
              <div className="text-right">
                <p className="font-sans text-xs text-text-secondary uppercase tracking-widest mb-1">Type</p>
                <p className="font-sans text-base text-text-primary capitalize">{saillie.type.replace('_', ' ')}</p>
              </div>
            </div>
            
            {saillie.observation && (
              <div className="pt-4 border-t border-surface-border">
                <p className="font-sans text-xs text-text-secondary uppercase tracking-widest mb-2">Observation</p>
                <p className="font-sans text-base text-text-primary">{saillie.observation}</p>
              </div>
            )}
          </>
        )}
      </section>

      {isEditing && (
        <div className="flex gap-3 mt-4">
          <button onClick={handleSave} className="flex-1 h-12 bg-primary text-on-primary rounded-lg font-semibold flex items-center justify-center gap-2">
            <Check className="w-5 h-5" /> Enregistrer
          </button>
          <button onClick={() => setIsEditing(false)} className="flex-1 h-12 bg-surface-variant text-on-surface-variant rounded-lg font-semibold flex items-center justify-center gap-2">
            <X className="w-5 h-5" /> Annuler
          </button>
        </div>
      )}

      {/* Calendrier */}
      {!isEditing && (
        <section className="space-y-3 pt-2">
          <div className="flex justify-between items-center">
            <h3 className="font-mono text-xs font-semibold text-secondary uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Calendrier de gestation
            </h3>
            <CalendarSyncButton 
              title={`Mise bas : ${femelle?.code || 'Inconnue'}`}
              date={saillie.dateMiseBasPrevue}
              description={`Mise bas prévue pour la saillie du ${format(new Date(saillie.dateSaillie), 'dd/MM/yyyy')}\nMâle(s): ${validMales.map(m => m.code).join(', ')}`}
              className="px-3 py-1.5 text-xs bg-primary text-white hover:bg-primary/90"
            />
          </div>
          <div className="bg-surface-container p-card-padding rounded-xl border border-surface-border space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-surface-border">
              <span className="font-sans font-medium text-text-secondary">Palpation (Contrôle)</span>
              <span className="font-mono font-bold text-text-primary">{format(new Date(saillie.dateControle), 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-surface-border">
              <span className="font-sans font-medium text-text-secondary">Mise en place nid</span>
              <span className="font-mono font-bold text-text-primary">{format(new Date(saillie.datePreparation), 'dd/MM/yyyy')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-sans font-medium text-text-secondary">Mise bas prévue</span>
              <span className="font-mono font-bold text-secondary">{format(new Date(saillie.dateMiseBasPrevue), 'dd/MM/yyyy')}</span>
            </div>
          </div>
        </section>
      )}

      {/* Actions */}
      {!isEditing && (
        <section className="pt-4 space-y-3">
          {(saillie.statut === 'enregistree' || saillie.statut === 'en_attente') && (
            <div className="grid grid-cols-2 gap-3">
               <button 
                onClick={() => handleConfirmer(true)}
                className="h-12 bg-secondary text-on-secondary-container rounded-lg font-heading font-semibold text-sm flex items-center justify-center gap-2 hover:bg-secondary/90 transition-colors"
              >
                <Check className="w-4 h-4" /> Confirmer
              </button>
              <button 
                onClick={() => handleConfirmer(false)}
                className="h-12 bg-surface-variant text-on-surface-variant rounded-lg font-heading font-semibold text-sm flex items-center justify-center gap-2 hover:bg-surface-border transition-colors"
              >
                <X className="w-4 h-4" /> Non gestante
              </button>
            </div>
          )}
          
          {saillie.statut === 'confirmee' && (
            <Link 
              to={`/portees/new?saillieId=${saillie.id}`}
              className="w-full h-12 flex items-center justify-center bg-primary text-on-primary rounded-lg font-heading font-semibold text-sm active:scale-95 transition-transform"
            >
              Enregistrer la Mise bas
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
