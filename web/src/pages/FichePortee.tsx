import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { ArrowLeft, Edit, AlertTriangle, CheckCircle, Rabbit, X, ArrowRightLeft, Trash2, Check, Printer } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { cn } from "../lib/utils";
import { updateBaseEntity, createBaseEntity } from "../lib/entity-utils";
import type { Mortalite } from "../types";
import { CalendarSyncButton } from "../components/CalendarSyncButton";
import { SanteHistory } from "../components/SanteHistory";

export default function FichePortee() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showPerte, setShowPerte] = useState(false);
  const [showSevrage, setShowSevrage] = useState(false);
  const [showAdoption, setShowAdoption] = useState(false);
  const [pertesCount, setPertesCount] = useState<number>(1);
  const [perteDate, setPerteDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [perteCause, setPerteCause] = useState<string>('');
  const [adoptionCount, setAdoptionCount] = useState<number>(1);
  const [adoptionType, setAdoptionType] = useState<'in' | 'out'>('in');
  const [vivantsSevres, setVivantsSevres] = useState<number>(0);
  const [destination, setDestination] = useState<'engraissement' | 'reproducteurs' | 'autre'>('engraissement');

  const [isEditing, setIsEditing] = useState(false);
  const [editDateMiseBas, setEditDateMiseBas] = useState('');
  const [editTotalNes, setEditTotalNes] = useState(0);
  const [editMortsNes, setEditMortsNes] = useState(0);
  const [editObservation, setEditObservation] = useState('');

  const portee = useLiveQuery(() => id ? db.portees.get(id) : undefined, [id]);
  const femelle = useLiveQuery(() => portee?.femelleId ? db.reproducteurs.get(portee.femelleId) : undefined, [portee?.femelleId]);
  const mortalites = useLiveQuery(() => id ? db.mortalites.where({ porteeId: id }).reverse().sortBy('date') : undefined, [id]);

  useEffect(() => {
    if (portee && isEditing) {
      setEditDateMiseBas(format(new Date(portee.dateMiseBas), 'yyyy-MM-dd'));
      setEditTotalNes(portee.totalNes);
      setEditMortsNes(portee.mortsNes);
      setEditObservation(portee.observation || '');
    }
  }, [portee, isEditing]);

  // Set initial default when portee loads
  if (portee && vivantsSevres === 0 && !showSevrage && portee.vivantsActuels > 0) {
    setVivantsSevres(portee.vivantsActuels);
  }

  if (!portee) return null;

  const handleSave = async () => {
    if (!portee) return;
    try {
      const diffTotal = editTotalNes - portee.totalNes;
      const diffMorts = editMortsNes - portee.mortsNes;
      
      portee.totalNes = editTotalNes;
      portee.mortsNes = editMortsNes;
      portee.vivantsNaissance = editTotalNes - editMortsNes;
      portee.vivantsActuels = Math.max(0, portee.vivantsActuels + diffTotal - diffMorts);
      
      portee.dateMiseBas = new Date(editDateMiseBas).toISOString();
      portee.observation = editObservation || undefined;
      
      await db.portees.put(updateBaseEntity(portee));
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    }
  };

  const ageJours = Math.max(0, differenceInDays(new Date(), new Date(portee.dateMiseBas)));
  const surviePercent = portee.totalNes > 0 ? Math.round((portee.vivantsActuels / portee.totalNes) * 100) : 0;

  const handleSevrage = async () => {
    try {
      await db.transaction('rw', db.portees, db.reproducteurs, async () => {
        portee.statut = "sevree";
        portee.dateSevrageReelle = new Date().toISOString();
        portee.vivantsSevres = vivantsSevres;
        portee.destination = destination;
        await db.portees.put(updateBaseEntity(portee));

        if (femelle && femelle.statut === 'allaitante') {
          femelle.statut = 'disponible';
          await db.reproducteurs.put(updateBaseEntity(femelle));
        }
      });
      setShowSevrage(false);
    } catch (err) {
      console.error(err);
    }
  };

  const declarerAdoption = async () => {
    if (adoptionCount <= 0) {
      alert("Nombre invalide");
      return;
    }
    if (adoptionType === 'out' && adoptionCount > portee.vivantsActuels) {
      alert("Impossible de donner plus de lapereaux que disponibles");
      return;
    }
    try {
      await db.transaction('rw', db.portees, async () => {
        if (adoptionType === 'in') {
          portee.vivantsActuels += adoptionCount;
          portee.adoptionsIn = (portee.adoptionsIn || 0) + adoptionCount;
        } else {
          portee.vivantsActuels -= adoptionCount;
          portee.adoptionsOut = (portee.adoptionsOut || 0) + adoptionCount;
        }
        await db.portees.put(updateBaseEntity(portee));
      });
      setShowAdoption(false);
      setAdoptionCount(1);
    } catch (err) {
      console.error(err);
    }
  };

  const declarerPertes = async () => {
    if (pertesCount <= 0 || pertesCount > portee.vivantsActuels || !id) {
      alert("Nombre invalide");
      return;
    }
    try {
      await db.transaction('rw', db.portees, db.mortalites, async () => {
        const newMortalite: Mortalite = {
          ...createBaseEntity(),
          porteeId: id,
          date: new Date(perteDate).toISOString(),
          quantite: pertesCount,
          cause: perteCause.trim() || undefined
        };
        await db.mortalites.add(newMortalite);

        portee.vivantsActuels -= pertesCount;
        await db.portees.put(updateBaseEntity(portee));
      });
      setShowPerte(false);
      setPertesCount(1);
      setPerteDate(format(new Date(), 'yyyy-MM-dd'));
      setPerteCause('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-stack-gap pb-24 print:pb-0 print:space-y-4">
      {/* Header */}
      <header className="flex items-start justify-between py-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate(-1)} aria-label="Retour" className="p-1 -ml-1 text-on-surface-variant hover:text-primary print:hidden">
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <span className="font-mono text-[10px] text-text-secondary uppercase tracking-widest">Fiche portée</span>
          </div>
          <h2 className="font-heading text-3xl font-semibold text-text-primary">{portee.code}</h2>
          <div className={cn("inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase", 
            portee.statut === 'sevree' ? 'bg-primary-container text-on-primary-container border-primary-container print:border-gray-300 print:text-black print:bg-gray-100' : 
            'bg-secondary-container text-on-secondary-container border-secondary-container print:border-gray-300 print:text-black print:bg-gray-100'
          )}>
            {portee.statut.replace("_", " ")}
          </div>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2 print:hidden">
            <button onClick={() => window.print()} aria-label="Imprimer le rapport" className="p-2.5 bg-surface-container border border-surface-border text-text-primary hover:text-primary hover:border-primary transition-colors rounded-xl flex items-center justify-center shadow-sm">
              <Printer className="w-5 h-5" aria-hidden="true" />
            </button>
            <button onClick={() => setIsEditing(true)} aria-label="Modifier la portée" className="p-2.5 bg-surface-container border border-surface-border text-text-primary hover:text-primary hover:border-primary transition-colors rounded-xl flex items-center justify-center shadow-sm">
              <Edit className="w-5 h-5" aria-hidden="true" />
            </button>
            <button 
              onClick={async () => {
                if (window.confirm("Voulez-vous vraiment supprimer définitivement cette portée ?")) {
                  try {
                    await db.portees.delete(portee.id);
                    navigate(-1);
                  } catch (e) { console.error(e) }
                }
              }}
              aria-label="Supprimer la portée" 
              className="p-2.5 bg-surface-container border border-surface-border text-status-critical hover:bg-status-critical/10 hover:border-status-critical/50 transition-colors rounded-xl flex items-center justify-center shadow-sm"
            >
              <Trash2 className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </header>

      {isEditing ? (
        <section className="bg-surface-card p-card-padding rounded-xl border border-surface-border space-y-4">
          <div className="flex flex-col gap-1">
            <label className="font-sans text-xs font-medium text-text-secondary">Date de mise bas</label>
            <input 
              type="date"
              value={editDateMiseBas}
              onChange={e => setEditDateMiseBas(e.target.value)}
              className="bg-surface-container border border-surface-border rounded-lg h-10 px-3 text-sm text-text-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-sans text-xs font-medium text-text-secondary">Total nés</label>
            <input 
              type="number"
              min="0"
              value={editTotalNes}
              onChange={e => setEditTotalNes(parseInt(e.target.value) || 0)}
              className="bg-surface-container border border-surface-border rounded-lg h-10 px-3 text-sm text-text-primary"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-sans text-xs font-medium text-text-secondary">Dont morts-nés</label>
            <input 
              type="number"
              min="0"
              value={editMortsNes}
              onChange={e => setEditMortsNes(parseInt(e.target.value) || 0)}
              className="bg-surface-container border border-surface-border rounded-lg h-10 px-3 text-sm text-text-primary"
            />
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
          <div className="flex gap-3 pt-2 border-t border-surface-border">
            <button onClick={handleSave} className="flex-1 h-12 bg-primary text-on-primary rounded-lg font-semibold flex items-center justify-center gap-2">
              <Check className="w-5 h-5" /> Enregistrer
            </button>
            <button onClick={() => setIsEditing(false)} className="flex-1 h-12 bg-surface-variant text-on-surface-variant rounded-lg font-semibold flex items-center justify-center gap-2">
              <X className="w-5 h-5" /> Annuler
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Parents */}
          <section className="bg-surface-card p-card-padding rounded-xl border border-surface-border">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-sans text-xs text-text-secondary uppercase tracking-widest mb-1">Mère</p>
                <p className="font-heading font-semibold text-lg text-secondary">{femelle?.code || 'Inconnue'}</p>
              </div>
              <div className="text-right">
                <p className="font-sans text-xs text-text-secondary uppercase tracking-widest mb-1">Née le</p>
                <p className="font-sans text-base text-text-primary">{format(new Date(portee.dateMiseBas), 'dd/MM/yyyy')}</p>
              </div>
            </div>
            {portee.observation && (
              <div className="pt-4 mt-4 border-t border-surface-border">
                <p className="font-sans text-xs text-text-secondary uppercase tracking-widest mb-1">Observation</p>
                <p className="font-sans text-sm text-text-primary">{portee.observation}</p>
              </div>
            )}
          </section>

          {/* Stats KPI */}
          <section className="grid grid-cols-2 gap-stack-gap">
            <div className="bg-surface-container-high p-card-padding rounded-xl border border-surface-border flex flex-col items-center justify-center text-center">
              <span className="font-sans text-xs text-text-secondary uppercase tracking-widest mb-2">Âge actuel</span>
              <span className="font-heading text-[40px] font-bold text-text-primary leading-none">{ageJours}</span>
              <span className="font-mono text-[10px] text-on-surface-variant uppercase mt-1">Jours</span>
            </div>
            <div className="bg-surface-container-high p-card-padding rounded-xl border border-surface-border flex flex-col items-center justify-center text-center">
              <span className="font-sans text-xs text-text-secondary uppercase tracking-widest mb-2">Taux Survie</span>
              <span className={cn("font-heading text-[40px] font-bold leading-none", surviePercent >= 80 ? "text-secondary" : surviePercent >= 50 ? "text-tertiary-container" : "text-status-critical")}>
                {surviePercent}%
              </span>
              <span className="font-mono text-[10px] text-on-surface-variant uppercase mt-1">{portee.vivantsActuels}/{portee.totalNes} vivants</span>
            </div>
          </section>

          {(portee.adoptionsIn || portee.adoptionsOut) ? (
            <section className="bg-surface-card p-card-padding rounded-xl border border-surface-border space-y-2">
               <h3 className="font-sans text-sm font-medium text-text-primary mb-1 text-center">Adoptions (mouvements)</h3>
               <div className="flex bg-surface-container-low rounded-lg divide-x divide-surface-border overflow-hidden border border-surface-border">
                 {portee.adoptionsIn ? (
                    <div className="flex-1 py-2 px-3 text-center">
                      <span className="block font-mono text-[10px] text-text-secondary uppercase tracking-wider mb-1">Reçus</span>
                      <span className="font-heading font-semibold text-primary">+{portee.adoptionsIn}</span>
                    </div>
                 ) : null}
                 {portee.adoptionsOut ? (
                    <div className="flex-1 py-2 px-3 text-center">
                      <span className="block font-mono text-[10px] text-text-secondary uppercase tracking-wider mb-1">Donnés</span>
                      <span className="font-heading font-semibold text-status-critical">-{portee.adoptionsOut}</span>
                    </div>
                 ) : null}
               </div>
            </section>
          ) : null}

          {mortalites && mortalites.length > 0 && (
            <section className="bg-surface-card p-card-padding rounded-xl border border-surface-border space-y-2">
              <h3 className="font-sans text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-critical" /> Historique des pertes
          </h3>
          <div className="space-y-2">
            {mortalites.map(perte => (
              <div key={perte.id} className="flex justify-between items-center bg-surface-container-low px-3 py-2 rounded-lg border border-surface-border">
                <div className="flex flex-col">
                  <span className="font-sans text-sm font-medium text-text-primary">
                    {format(new Date(perte.date), 'dd/MM/yyyy')}
                  </span>
                  {perte.cause && (
                    <span className="font-sans text-xs text-text-secondary">
                      {perte.cause}
                    </span>
                  )}
                </div>
                <span className="font-heading font-semibold text-status-critical">
                  -{perte.quantite}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Progress & actions */}
      <section className="bg-surface-card p-card-padding rounded-xl border border-surface-border space-y-4">
        <div>
          <div className="flex justify-between items-end mb-2">
            <h3 className="font-sans text-sm font-medium text-text-primary">Croissance vers sevrage</h3>
            <span className="font-mono text-xs text-text-secondary">{format(new Date(portee.dateSevragePrevue), 'dd/MM/yyyy')}</span>
          </div>
          <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden mb-3 print:hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000" 
              style={{ width: `${Math.min(100, Math.max(0, (ageJours / 35) * 100))}%` }} 
            />
          </div>
          <div className="flex justify-end print:hidden">
            <CalendarSyncButton 
              title={`Sevrage : Portée ${portee.code}`}
              date={portee.dateSevragePrevue}
              description={`Sevrage prévu pour la portée de ${femelle?.code || 'Inconnue'}.\nNombre de lapereaux prévus : ${portee.vivantsActuels}`}
              className="w-full sm:w-auto"
            />
          </div>
        </div>

        {portee.statut !== 'sevree' && portee.statut !== 'cloturee' && (
          <div className="pt-2 border-t border-surface-border mt-4 print:hidden">
            {!showPerte && !showSevrage && !showAdoption ? (
              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => setShowPerte(true)} className="h-10 border border-status-critical text-status-critical rounded-lg font-sans font-medium hover:bg-status-critical/10 transition-colors text-sm flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Perte
                </button>
                <button onClick={() => setShowAdoption(true)} className="h-10 border border-on-surface-variant text-on-surface-variant rounded-lg font-sans font-medium hover:bg-surface-container-high transition-colors text-sm flex items-center justify-center gap-1">
                  <ArrowRightLeft className="w-4 h-4" /> Adoption
                </button>
                <button onClick={() => setShowSevrage(true)} className="h-10 bg-primary text-on-primary rounded-lg font-sans font-semibold hover:bg-primary-container transition-colors text-sm flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Sevrer
                </button>
              </div>
            ) : showPerte ? (
              <div className="bg-status-critical/10 p-3 rounded-lg border border-status-critical/30 space-y-3">
                <div className="flex justify-between items-center text-status-critical">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" aria-hidden="true" /> Déclarer des pertes</h4>
                  <button onClick={() => setShowPerte(false)} aria-label="Annuler la déclaration de perte"><X className="w-5 h-5" aria-hidden="true" /></button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Nombre de pertes</label>
                    <input 
                      type="number"
                      min={1}
                      max={portee.vivantsActuels}
                      value={pertesCount}
                      onChange={(e) => setPertesCount(parseInt(e.target.value) || 0)}
                      className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-status-critical"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Date</label>
                    <input 
                      type="date"
                      max={format(new Date(), 'yyyy-MM-dd')}
                      value={perteDate}
                      onChange={(e) => setPerteDate(e.target.value)}
                      className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-status-critical"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Cause (optionnel)</label>
                    <input 
                      type="text"
                      placeholder="Maladie, accident, etc."
                      value={perteCause}
                      onChange={(e) => setPerteCause(e.target.value)}
                      className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-status-critical"
                    />
                  </div>
                </div>
                <button onClick={declarerPertes} disabled={pertesCount <= 0 || pertesCount > portee.vivantsActuels || !perteDate} className="w-full h-10 bg-status-critical text-on-error rounded-lg font-semibold text-sm disabled:opacity-50 transition-opacity mt-2">
                   Enregistrer la perte ({pertesCount})
                </button>
              </div>
            ) : showAdoption ? (
              <div className="bg-surface-container-low p-3 rounded-lg border border-surface-border space-y-3">
                <div className="flex justify-between items-center text-text-primary">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" aria-hidden="true" /> Gérer les adoptions</h4>
                  <button onClick={() => setShowAdoption(false)} aria-label="Annuler l'adoption"><X className="w-5 h-5" aria-hidden="true" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdoptionType('in')}
                    className={cn(
                      "h-10 rounded-lg text-sm font-medium transition-colors border",
                      adoptionType === 'in' 
                        ? "bg-primary text-on-primary border-primary" 
                        : "bg-surface text-text-secondary border-surface-border hover:bg-surface-container"
                    )}
                  >
                    Recevoir (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdoptionType('out')}
                    className={cn(
                      "h-10 rounded-lg text-sm font-medium transition-colors border",
                      adoptionType === 'out' 
                        ? "bg-primary text-on-primary border-primary" 
                        : "bg-surface text-text-secondary border-surface-border hover:bg-surface-container"
                    )}
                  >
                    Donner (-)
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Nombre de lapereaux</label>
                  <input 
                    type="number"
                    min={1}
                    max={adoptionType === 'out' ? portee.vivantsActuels : undefined}
                    value={adoptionCount}
                    onChange={(e) => setAdoptionCount(parseInt(e.target.value) || 0)}
                    className="w-full h-10 bg-surface border border-surface-border rounded-lg px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button 
                  onClick={declarerAdoption} 
                  disabled={adoptionCount <= 0 || (adoptionType === 'out' && adoptionCount > portee.vivantsActuels)} 
                  className="w-full h-10 bg-on-surface text-surface rounded-lg font-semibold text-sm disabled:opacity-50 transition-opacity"
                >
                   Confirmer {adoptionType === 'in' ? 'la réception' : 'le don'} de {adoptionCount} lapereau(x)
                </button>
              </div>
            ) : (
              <div className="bg-primary/10 p-3 rounded-lg border border-primary/30 space-y-3">
                <div className="flex justify-between items-center text-primary">
                  <h4 className="font-semibold text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" aria-hidden="true" /> Sevrage</h4>
                  <button onClick={() => setShowSevrage(false)} aria-label="Annuler le sevrage"><X className="w-5 h-5" aria-hidden="true" /></button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Lapereaux sevrés</label>
                    <input 
                      type="number"
                      min={0}
                      max={portee.vivantsActuels}
                      value={vivantsSevres}
                      onChange={(e) => setVivantsSevres(parseInt(e.target.value))}
                      className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Destination</label>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value as 'engraissement' | 'reproducteurs' | 'autre')}
                      className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary"
                    >
                      <option value="engraissement">Engraissement</option>
                      <option value="reproducteurs">Futurs reproducteurs</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleSevrage} disabled={vivantsSevres < 0} className="w-full h-10 bg-primary text-on-primary rounded-lg font-semibold text-sm disabled:opacity-50 mt-2">
                   Confirmer le sevrage
                </button>
              </div>
            )}
          </div>
        )}

        {(portee.statut === 'sevree' || portee.statut === 'cloturee') && (
          <div className="pt-3 border-t border-surface-border mt-4">
            <h3 className="font-sans text-sm font-medium text-text-primary mb-2">Bilan du sevrage</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center bg-surface-container-low px-3 py-2 rounded-lg border border-surface-border">
                <span className="font-sans text-xs font-medium text-text-secondary">Lapereaux sevrés</span>
                <span className="font-heading font-medium text-text-primary">{portee.vivantsSevres ?? portee.vivantsActuels}</span>
              </div>
              {portee.destination && (
                <div className="flex justify-between items-center bg-surface-container-low px-3 py-2 rounded-lg border border-surface-border">
                  <span className="font-sans text-xs font-medium text-text-secondary">Destination</span>
                  <span className="font-sans text-sm font-medium text-text-primary capitalize">{
                    portee.destination === 'reproducteurs' ? 'Futurs reproducteurs' : portee.destination
                  }</span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <SanteHistory subjectType="Portee" subjectId={portee.id} />
        </>
      )}
    </div>
  );
}
