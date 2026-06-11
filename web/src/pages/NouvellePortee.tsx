import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { createBaseEntity, updateBaseEntity } from "../lib/entity-utils";
import type { Portee, StatutPortee } from "../types";
import { format, addDays } from "date-fns";

export default function NouvellePortee() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const fromSaillieId = searchParams.get("saillieId");

  const femelles = useLiveQuery(() => 
    db.reproducteurs.filter(r => r.sexe === 'femelle').toArray()
  ) || [];

  const saillies = useLiveQuery(() => 
    db.saillies.filter(s => s.statut === 'confirmee').toArray()
  ) || [];

  const params = useLiveQuery(() => db.parametres.toArray().then(p => p[0])) || {
    joursAvantControle: 14,
    joursAvantPreparation: 27,
    dureeGestation: 31,
    ageSevrage: 35
  };

  const initialSaillie = saillies.find(s => s.id === fromSaillieId);

  const [femelleId, setFemelleId] = useState(initialSaillie?.femelleId || "");
  const [saillieId, setSaillieId] = useState(fromSaillieId || "");
  const [dateMiseBas, setDateMiseBas] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [emplacement, setEmplacement] = useState("");
  const [totalNes, setTotalNes] = useState("0");
  const [vivants, setVivants] = useState("0");
  const [mortsNes, setMortsNes] = useState("0");
  const [observation, setObservation] = useState("");

  // Sync Saillie selection with Femelle selection
  useEffect(() => {
    if (saillieId) {
      const saillie = saillies.find(s => s.id === saillieId);
      if (saillie) {
        setFemelleId(saillie.femelleId);
        setDateMiseBas(format(new Date(), 'yyyy-MM-dd')); // or saillie.dateMiseBasPrevue if close
      }
    }
  }, [saillieId, saillies]);

  useEffect(() => {
    if (fromSaillieId) {
      setSaillieId(fromSaillieId);
      const s = saillies.find(s => s.id === fromSaillieId);
      if (s) setFemelleId(s.femelleId);
    }
  }, [fromSaillieId, saillies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tNes = parseInt(totalNes) || 0;
    const vNais = parseInt(vivants) || 0;
    const mNes = parseInt(mortsNes) || 0;

    if (!femelleId || !dateMiseBas) return;

    if (vNais + mNes > tNes && tNes > 0) {
      alert("Le nombre de vivants et morts-nés ne peut dépasser le total de nés.");
      return;
    }

    try {
      const parentFemelle = femelles.find(f => f.id === femelleId);
      const codePortee = `P-${format(new Date(dateMiseBas), 'yyMMdd')}-${parentFemelle?.code.slice(0,3) || ''}`;

      const dateMiseBasDate = new Date(dateMiseBas);

      const newPortee: Portee = {
        ...createBaseEntity(),
        code: codePortee,
        femelleId,
        saillieId: saillieId || undefined,
        dateMiseBas,
        totalNes: tNes,
        vivantsNaissance: vNais,
        mortsNes: mNes,
        vivantsActuels: vNais,
        emplacement: emplacement.trim() || undefined,
        observation: observation.trim() || undefined,
        dateSevragePrevue: format(addDays(dateMiseBasDate, params.ageSevrage), 'yyyy-MM-dd'),
        statut: 'en_cours'
      };

      await db.transaction('rw', db.portees, db.saillies, db.reproducteurs, async () => {
        await db.portees.add(newPortee);
        
        // Update femelle status
        const femelle = await db.reproducteurs.get(femelleId);
        if (femelle) {
          femelle.statut = 'allaitante';
          await db.reproducteurs.put(updateBaseEntity(femelle));
        }

        // Update saillie status
        if (saillieId) {
          const saillie = await db.saillies.get(saillieId);
          if (saillie) {
            saillie.statut = 'mise_bas';
            await db.saillies.put(updateBaseEntity(saillie));
          }
        }
      });

      navigate("/portees");
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de la portée:", error);
    }
  };

  const prevSevrage = format(addDays(new Date(dateMiseBas), params.ageSevrage), 'dd/MM/yyyy');

  return (
    <div className="space-y-stack-gap pb-24">
      <div className="mb-section-spacing">
        <div className="flex items-center gap-2 text-text-secondary mb-1">
          <span className="font-mono text-xs uppercase tracking-widest text-secondary">Portées</span>
        </div>
        <h2 className="font-heading text-3xl font-semibold text-text-primary">Nouvelle Portée</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-stack-gap">
        <div className="grid grid-cols-1 gap-stack-gap">
          <div className="bg-surface-card border border-surface-border p-card-padding rounded-lg">
            <label htmlFor="femelleId" className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider block mb-2">Femelle *</label>
            <div className="relative">
              <select 
                id="femelleId"
                required
                aria-required="true"
                value={femelleId}
                onChange={(e) => setFemelleId(e.target.value)}
                className="w-full bg-surface-container border-none rounded-lg p-3 text-text-primary appearance-none focus:ring-1 focus:ring-secondary font-sans"
              >
                <option value="" disabled>Sélectionner une femelle...</option>
                {femelles.map(f => (
                  <option key={f.id} value={f.id}>{f.code}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="bg-surface-card border border-surface-border p-card-padding rounded-lg">
            <label htmlFor="saillieId" className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider block mb-2">Saillie liée</label>
            <div className="relative">
              <select 
                id="saillieId"
                value={saillieId}
                onChange={(e) => setSaillieId(e.target.value)}
                className="w-full bg-surface-container border-none rounded-lg p-3 text-text-primary appearance-none focus:ring-1 focus:ring-secondary font-sans"
              >
                <option value="">Aucune saillie enregistrée</option>
                {saillies.map(s => {
                  const fCode = f => f.id === s.femelleId ? f.code : '?';
                  return (
                    <option key={s.id} value={s.id}>
                      Saillie {s.id.slice(0, 5)} - {format(new Date(s.dateSaillie), 'dd/MM')} (M:{s.maleIds.length})
                    </option>
                  )
                })}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-stack-gap">
          <div className="bg-surface-card border border-surface-border p-card-padding rounded-lg">
            <label htmlFor="dateMiseBas" className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider block mb-2">Date de mise bas *</label>
            <input 
              id="dateMiseBas"
              required
              aria-required="true"
              type="date" 
              value={dateMiseBas}
              onChange={(e) => setDateMiseBas(e.target.value)}
              className="w-full bg-transparent border-b border-surface-border focus:border-secondary outline-none text-text-primary py-1 font-sans"
            />
          </div>
          <div className="bg-surface-card border border-surface-border p-card-padding rounded-lg">
            <label htmlFor="emplacement" className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider block mb-2">Cage</label>
            <input 
              id="emplacement"
              type="text" 
              value={emplacement}
              onChange={(e) => setEmplacement(e.target.value)}
              placeholder="B-12" 
              className="w-full bg-transparent border-b border-surface-border focus:border-secondary outline-none text-text-primary py-1 font-sans"
            />
          </div>
        </div>

        {/* Quantities */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-card border border-surface-border p-card-padding rounded-lg text-center">
            <label htmlFor="totalNes" className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider block mb-1">Total nés</label>
            <input 
              id="totalNes"
              type="number" 
              value={totalNes}
              onChange={e => setTotalNes(e.target.value)}
              className="w-full bg-transparent border-none text-center font-heading text-3xl font-bold text-primary outline-none focus:ring-0 p-0" 
            />
          </div>
          <div className="bg-surface-card border border-secondary-container/30 p-card-padding rounded-lg text-center">
            <label htmlFor="vivants" className="font-sans font-medium text-xs text-secondary uppercase tracking-wider block mb-1">Vivants</label>
            <input 
              id="vivants"
              type="number" 
              value={vivants}
              onChange={e => setVivants(e.target.value)}
              className="w-full bg-transparent border-none text-center font-heading text-3xl font-bold text-secondary outline-none focus:ring-0 p-0" 
            />
          </div>
          <div className="bg-surface-card border border-status-critical/30 p-card-padding rounded-lg text-center">
            <label htmlFor="mortsNes" className="font-sans font-medium text-xs text-status-critical uppercase tracking-wider block mb-1">Morts-nés</label>
            <input 
              id="mortsNes"
              type="number" 
              value={mortsNes}
              onChange={e => setMortsNes(e.target.value)}
              className="w-full bg-transparent border-none text-center font-heading text-3xl font-bold text-status-critical outline-none focus:ring-0 p-0" 
            />
          </div>
        </div>

        <div className="bg-surface-container-high border border-surface-border p-card-padding rounded-lg">
          <h3 className="font-mono text-xs font-semibold text-primary mb-4 tracking-widest uppercase">SECTION SUIVI</h3>
          <div className="grid grid-cols-2 gap-8 relative z-10">
            <div>
              <p className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider">Âge actuel</p>
              <p className="font-heading text-xl font-semibold text-text-primary">0 jours</p>
            </div>
            <div>
              <p className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider">Sevrage prévu</p>
              <p className="font-heading text-xl font-semibold text-text-primary">{prevSevrage}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-card border border-surface-border p-card-padding rounded-lg">
          <label htmlFor="observation" className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider block mb-2">Observation</label>
          <textarea 
            id="observation"
            rows={3} 
            value={observation}
            onChange={e => setObservation(e.target.value)}
            className="w-full bg-surface-container border-none rounded-lg p-3 text-text-primary focus:ring-1 focus:ring-secondary resize-none font-sans" 
            placeholder="Notes particulières..." 
          />
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button 
            type="submit" 
            className="w-full bg-primary-container text-on-primary-container h-12 font-heading font-semibold text-base rounded-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            Enregistrer la portée
          </button>
          <button 
            type="button" 
            onClick={() => navigate(-1)}
            className="w-full bg-transparent border border-surface-border text-text-primary h-12 font-heading font-semibold text-base rounded-lg active:scale-95 transition-transform"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
