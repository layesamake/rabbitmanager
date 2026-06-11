import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../lib/db";
import { ArrowLeft, Save, Shield } from "lucide-react";
import { cn } from "../lib/utils";
import type { SujetType, ActionType, StatutTraitement } from "../types";

export default function SanteNouveau() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [sujetType, setSujetType] = useState<SujetType>("Reproducteur");
  const [sujetId, setSujetId] = useState("");
  const [sujetNom, setSujetNom] = useState("");
  const [typeAction, setTypeAction] = useState<ActionType>("Prophylaxie");
  const [nomProduit, setNomProduit] = useState("");
  const [objectif, setObjectif] = useState("");
  const [datePrevue, setDatePrevue] = useState(new Date().toISOString().split("T")[0]);
  const [frequence, setFrequence] = useState("");
  const [duree, setDuree] = useState("");
  const [prochainRappel, setProchainRappel] = useState("");
  const [responsable, setResponsable] = useState("");
  const [observation, setObservation] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!nomProduit) return;

    setLoading(true);
    try {
      const now = new Date().toISOString();
      await db.traitements.add({
        id: crypto.randomUUID(),
        sujetType,
        sujetId,
        sujetNom: sujetNom || sujetId,
        typeAction,
        nomProduit,
        objectif,
        datePrevue,
        frequence,
        duree,
        prochainRappel: prochainRappel || undefined,
        responsable,
        observation,
        statut: "À faire" as StatutTraitement,
        created_at: now,
        updated_at: now,
        sync_status: "pending"
      });
      navigate("/sante");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-section pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-surface-variant transition-colors">
          <ArrowLeft className="w-6 h-6 text-on-surface" />
        </button>
        <div>
          <span className="font-mono text-[12px] font-semibold text-secondary uppercase tracking-widest">Santé</span>
          <h2 className="font-heading text-2xl font-semibold text-text-primary mt-1">Nouveau traitement prévu</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="space-y-4 bg-surface-card border border-surface-border p-card-padding rounded-xl">
          <h3 className="font-heading text-lg font-semibold text-text-primary flex items-center gap-2">
            <Shield className="w-5 h-5 text-secondary" /> Sujet
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
             {["Reproducteur", "Portee", "Lot", "Elevage", "Autre"].map(type => (
               <label key={type} className={cn(
                 "flex items-center justify-center py-2 px-3 border rounded-lg text-sm font-medium transition-colors cursor-pointer",
                 sujetType === type ? "bg-primary-container text-on-primary-container border-primary/50" : "bg-surface-container border-surface-border text-on-surface-variant"
               )}>
                 <input type="radio" className="sr-only" checked={sujetType === type} onChange={() => setSujetType(type as SujetType)} />
                 {type === 'Portee' ? 'Portée' : type === 'Elevage' ? 'Élevage' : type}
               </label>
             ))}
          </div>

          {(sujetType === 'Reproducteur' || sujetType === 'Portee' || sujetType === 'Lot' || sujetType === 'Autre') && (
            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">Identifiant / Nom {sujetType === 'Autre' && '*'}</label>
              <input
                type="text"
                value={sujetNom}
                onChange={e => {
                   setSujetNom(e.target.value);
                   setSujetId(e.target.value);
                }}
                className="w-full bg-surface-container border border-surface-border rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                placeholder={`Ex: ${sujetType === 'Reproducteur' ? 'F-012' : sujetType === 'Portee' ? 'P-014' : 'Lot engraissement 01'}`}
                required={sujetType === 'Autre'}
              />
            </div>
          )}
        </div>

        <div className="space-y-4 bg-surface-card border border-surface-border p-card-padding rounded-xl">
          <h3 className="font-heading text-lg font-semibold text-text-primary">Traitement</h3>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Type d'action *</label>
            <select
              value={typeAction}
              onChange={e => setTypeAction(e.target.value as ActionType)}
              className="w-full bg-surface-container border border-surface-border rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow appearance-none"
              required
            >
              <option value="Prophylaxie">Prophylaxie</option>
              <option value="Déparasitage">Déparasitage</option>
              <option value="Prévention coccidiose">Prévention coccidiose</option>
              <option value="Vitamines">Vitamines</option>
              <option value="Vaccination">Vaccination si applicable</option>
              <option value="Traitement curatif">Traitement curatif</option>
              <option value="Soin local">Soin local</option>
              <option value="Nettoyage / désinfection">Nettoyage / désinfection</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Nom du traitement / produit *</label>
            <input
              type="text"
              value={nomProduit}
              onChange={e => setNomProduit(e.target.value)}
              className="w-full bg-surface-container border border-surface-border rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ex: Vitamines sol, Ivermectine..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Objectif</label>
            <input
              type="text"
              value={objectif}
              onChange={e => setObjectif(e.target.value)}
              className="w-full bg-surface-container border border-surface-border rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ex: Prévention, Renforcement..."
            />
          </div>
        </div>

        <div className="space-y-4 bg-surface-card border border-surface-border p-card-padding rounded-xl">
          <h3 className="font-heading text-lg font-semibold text-text-primary">Planification</h3>
          
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Date prévue *</label>
            <input
              type="date"
              value={datePrevue}
              onChange={e => setDatePrevue(e.target.value)}
              className="w-full bg-surface-container border border-surface-border rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-on-surface mb-2">Fréquence</label>
               <input
                 type="text"
                 value={frequence}
                 onChange={e => setFrequence(e.target.value)}
                 className="w-full bg-surface-container border border-surface-border rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                 placeholder="Ex: 1 fois/jour"
               />
             </div>
             <div>
               <label className="block text-sm font-medium text-on-surface mb-2">Durée prévue</label>
               <input
                 type="text"
                 value={duree}
                 onChange={e => setDuree(e.target.value)}
                 className="w-full bg-surface-container border border-surface-border rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                 placeholder="Ex: 3 jours"
               />
             </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Prochain rappel (optionnel)</label>
            <input
              type="date"
              value={prochainRappel}
              onChange={e => setProchainRappel(e.target.value)}
              className="w-full bg-surface-container border border-surface-border rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="space-y-4 bg-surface-card border border-surface-border p-card-padding rounded-xl">
           <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Responsable</label>
            <input
              type="text"
              value={responsable}
              onChange={e => setResponsable(e.target.value)}
              className="w-full bg-surface-container border border-surface-border rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Observation</label>
            <textarea
              value={observation}
              onChange={e => setObservation(e.target.value)}
              className="w-full bg-surface-container border border-surface-border rounded-lg px-4 py-3 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={3}
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4 pb-12">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 py-3 rounded-lg font-heading font-semibold text-on-surface border border-surface-border hover:bg-surface-variant transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-on-primary py-3 rounded-lg font-heading font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Enregistrer prévu
          </button>
        </div>
      </form>
    </div>
  );
}
