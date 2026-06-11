import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { createBaseEntity, updateBaseEntity } from "../lib/entity-utils";
import type { Saillie, Sexe, TypeSaillie, Reproducteur } from "../types";
import { addDays, format } from "date-fns";
import { SearchCheck, Flame, HeartPulse, Check, Calendar } from "lucide-react";
import { CalendarSyncButton } from "../components/CalendarSyncButton";

export default function NouvelleSaillie() {
  const navigate = useNavigate();

  // Fetch data
  const femelles = useLiveQuery(() => 
    db.reproducteurs
      .filter(r => r.sexe === 'femelle' && !['decede', 'reforme'].includes(r.statut))
      .toArray()
  ) || [];

  const malesList = useLiveQuery(() => 
    db.reproducteurs
      .filter(r => r.sexe === 'male' && !['decede', 'reforme'].includes(r.statut))
      .toArray()
  ) || [];

  const params = useLiveQuery(() => db.parametres.toArray().then(p => p[0])) || {
    joursAvantControle: 14,
    joursAvantPreparation: 27,
    dureeGestation: 31,
    ageSevrage: 35
  };

  const [femelleId, setFemelleId] = useState("");
  const [maleIds, setMaleIds] = useState<string[]>([]);
  const [dateSaillie, setDateSaillie] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<TypeSaillie>("naturelle");
  const [observation, setObservation] = useState("");
  const [savedSaillie, setSavedSaillie] = useState<Saillie | null>(null);

  const handleMaleToggle = (id: string) => {
    setMaleIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!femelleId || maleIds.length === 0 || !dateSaillie) return;

    try {
      const saillieDate = new Date(dateSaillie);
      
      const newSaillie: Saillie = {
        ...createBaseEntity(),
        femelleId,
        maleIds,
        dateSaillie,
        type,
        observation: observation.trim() || undefined,
        statut: 'enregistree',
        dateControle: format(addDays(saillieDate, params.joursAvantControle), 'yyyy-MM-dd'),
        datePreparation: format(addDays(saillieDate, params.joursAvantPreparation), 'yyyy-MM-dd'),
        dateMiseBasPrevue: format(addDays(saillieDate, params.dureeGestation), 'yyyy-MM-dd'),
      };

      await db.transaction('rw', db.saillies, db.reproducteurs, async () => {
        await db.saillies.add(newSaillie);
        const femelle = await db.reproducteurs.get(femelleId);
        if (femelle) {
          femelle.statut = 'saillie';
          await db.reproducteurs.put(updateBaseEntity(femelle));
        }
      });

      setSavedSaillie(newSaillie);
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la saillie:", error);
    }
  };

  // Preview dates
  const baseDate = dateSaillie ? new Date(dateSaillie) : new Date();
  const prevControle = format(addDays(baseDate, params.joursAvantControle), 'dd/MM');
  const prevNid = format(addDays(baseDate, params.joursAvantPreparation), 'dd/MM');
  const prevMiseBas = format(addDays(baseDate, params.dureeGestation), 'dd/MM');

  if (savedSaillie) {
    const femelle = femelles.find(f => f.id === savedSaillie.femelleId);
    return (
      <div className="space-y-stack-gap pb-24">
        <header className="mb-6 text-center pt-8">
          <div className="w-16 h-16 bg-status-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-status-success" />
          </div>
          <h2 className="font-heading text-2xl font-semibold text-text-primary mb-2">Saillie enregistrée !</h2>
          <p className="font-sans text-sm text-text-secondary">
            La saillie de {femelle?.code || 'la femelle'} a été enregistrée avec succès.
          </p>
        </header>

        <section className="bg-surface-card p-card-padding rounded-xl border border-surface-border space-y-4">
          <h3 className="font-mono text-xs font-semibold text-text-secondary uppercase tracking-widest text-center mb-6">
             <Calendar className="w-4 h-4 inline-block mr-2 translate-y-[-2px]" />
             Agenda Google
          </h3>
          
          <div className="space-y-3">
             <CalendarSyncButton 
              title={`Contrôle palpation: ${femelle?.code || ''}`}
              date={savedSaillie.dateControle}
              description={`Contrôle palpation prévu pour la saillie du ${format(new Date(savedSaillie.dateSaillie), 'dd/MM/yyyy')}`}
              className="w-full justify-between px-4 py-3 bg-status-breeding text-white border-status-breeding/20 hover:bg-status-breeding/90"
            />
            <CalendarSyncButton 
              title={`Mise en place nid: ${femelle?.code || ''}`}
              date={savedSaillie.datePreparation}
              description={`Mise en place de la boite à nid pour la saillie du ${format(new Date(savedSaillie.dateSaillie), 'dd/MM/yyyy')}`}
              className="w-full justify-between px-4 py-3 bg-secondary text-white border-secondary/20 hover:bg-secondary/90"
            />
            <CalendarSyncButton 
              title={`Mise bas prévue: ${femelle?.code || ''}`}
              date={savedSaillie.dateMiseBasPrevue}
              description={`Mise bas prévue pour la saillie du ${format(new Date(savedSaillie.dateSaillie), 'dd/MM/yyyy')}`}
              className="w-full justify-between px-4 py-3 bg-primary text-white border-primary/20 hover:bg-primary/90"
            />
          </div>
        </section>

        <div className="pt-6 flex gap-3">
          <button 
            onClick={() => navigate('/saillies')}
            className="flex-1 h-12 bg-surface-container-high text-on-surface rounded-lg font-heading font-semibold text-sm transition-colors hover:bg-surface-variant flex items-center justify-center gap-2 border border-surface-border"
          >
            Retour aux saillies
          </button>
          <button 
            onClick={() => {
              setSavedSaillie(null);
              setMaleIds([]);
              setFemelleId('');
              setObservation('');
            }}
            className="flex-1 h-12 bg-primary text-on-primary rounded-lg font-heading font-semibold text-sm transition-colors hover:bg-primary/90 flex items-center justify-center gap-2"
          >
            Nouvelle saillie
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-stack-gap">
      <header className="mb-6">
        <h2 className="font-heading text-3xl font-semibold text-text-primary mb-1">Nouvelle Saillie</h2>
        <p className="font-sans text-sm text-text-secondary">Enregistrez un nouvel accouplement dans votre cheptel.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-gap">
        {/* Femelle */}
        <div className="flex flex-col gap-2">
          <label htmlFor="femelleId" className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider">Femelle *</label>
          <select 
            id="femelleId"
            required
            aria-required="true"
            value={femelleId}
            onChange={(e) => setFemelleId(e.target.value)}
            className="w-full h-12 bg-surface-card border border-surface-border rounded-lg px-4 text-on-surface appearance-none focus:border-secondary focus:ring-0 transition-colors font-sans text-base"
          >
            <option value="" disabled>Choisir une femelle</option>
            {femelles.map(f => (
              <option key={f.id} value={f.id}>{f.code} {f.nom ? `(${f.nom})` : ''}</option>
            ))}
          </select>
        </div>

        {/* Mâles */}
        <div className="flex flex-col gap-2" role="group" aria-labelledby="males-label">
          <label id="males-label" className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider">Mâle(s) *</label>
          <div className="grid grid-cols-2 gap-2">
            {malesList.map(m => {
              const isSelected = maleIds.includes(m.id);
              return (
                <button
                  type="button"
                  key={m.id}
                  aria-pressed={isSelected}
                  onClick={() => handleMaleToggle(m.id)}
                  className={`flex items-center justify-center p-3 rounded-lg border transition-colors ${
                    isSelected 
                      ? 'bg-secondary-container/20 border-secondary-container text-secondary font-bold' 
                      : 'bg-surface-card border-surface-border text-on-surface-variant hover:bg-surface-variant'
                  }`}
                >
                  {m.code}
                </button>
              );
            })}
            {malesList.length === 0 && (
              <div className="col-span-2 text-sm text-text-secondary italic">Aucun mâle disponible.</div>
            )}
          </div>
        </div>

        {/* Date & Type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="dateSaillie" className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider">Date *</label>
            <input 
              id="dateSaillie"
              required
              aria-required="true"
              type="date" 
              value={dateSaillie}
              onChange={(e) => setDateSaillie(e.target.value)}
              className="w-full h-12 bg-surface-card border border-surface-border rounded-lg px-4 text-on-surface focus:border-secondary focus:ring-0 transition-colors font-sans text-base" 
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="typeSaillie" className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider">Type *</label>
            <select 
              id="typeSaillie"
              required
              aria-required="true"
              value={type}
              onChange={(e) => setType(e.target.value as TypeSaillie)}
              className="w-full h-12 bg-surface-card border border-surface-border rounded-lg px-4 text-on-surface appearance-none focus:border-secondary focus:ring-0 transition-colors font-sans text-base"
            >
              <option value="naturelle">Naturelle</option>
              <option value="controlee">Contrôlée</option>
              <option value="double">Double passage</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>

        {/* Observation */}
        <div className="flex flex-col gap-2">
          <label htmlFor="observation" className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider">Observation</label>
          <textarea 
            id="observation"
            rows={3}
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            className="w-full bg-surface-card border border-surface-border rounded-lg p-4 text-on-surface focus:border-secondary focus:ring-0 transition-colors resize-none font-sans text-base" 
            placeholder="Notes éventuelles..."
          />
        </div>

        {/* Auto Dates Section */}
        <section className="mt-4 p-card-padding bg-surface-container-low border border-surface-border rounded-xl">
          <h3 className="font-mono text-xs font-semibold text-secondary mb-4 tracking-widest uppercase">Dates Automatiques Estimées</h3>
          <div className="flex flex-col gap-4">
            
            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center">
                  <SearchCheck className="text-primary-container w-5 h-5" />
                </div>
                <div>
                  <p className="font-sans text-base text-text-primary">Contrôle (Palpation)</p>
                  <p className="font-sans text-xs text-text-secondary">J+{params.joursAvantControle}</p>
                </div>
              </div>
              <p className="font-heading font-semibold text-lg text-primary">{prevControle}</p>
            </div>

            <div className="flex items-center justify-between border-b border-surface-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center">
                  <Flame className="text-status-breeding w-5 h-5" />
                </div>
                <div>
                  <p className="font-sans text-base text-text-primary">Préparation (Nid)</p>
                  <p className="font-sans text-xs text-text-secondary">J+{params.joursAvantPreparation}</p>
                </div>
              </div>
              <p className="font-heading font-semibold text-lg text-primary">{prevNid}</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center">
                  <HeartPulse className="text-secondary w-5 h-5" />
                </div>
                <div>
                  <p className="font-sans text-base text-text-primary">Mise bas prévue</p>
                  <p className="font-sans text-xs text-text-secondary">J+{params.dureeGestation}</p>
                </div>
              </div>
              <p className="font-heading font-semibold text-lg text-secondary">{prevMiseBas}</p>
            </div>

          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 mt-6 mb-12">
          <button 
            type="submit"
            className="w-full h-12 bg-primary-container text-on-primary-container font-heading font-semibold text-base rounded-lg flex items-center justify-center active:scale-95 transition-transform"
          >
            Enregistrer la saillie
          </button>
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="w-full h-12 border border-surface-border text-on-surface font-sans text-base rounded-lg flex items-center justify-center hover:bg-surface-variant transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
