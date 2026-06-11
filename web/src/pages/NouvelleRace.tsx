import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { createBaseEntity } from "../lib/entity-utils";
import type { Race } from "../types";
import { Trash2 } from "lucide-react";

export default function NouvelleRace() {
  const navigate = useNavigate();
  const [nom, setNom] = useState("");
  const [poids, setPoids] = useState("");
  const [description, setDescription] = useState("");
  const [remarques, setRemarques] = useState("");

  const existingRaces = useLiveQuery(() => db.races.toArray(), []);
  
  const allSuggestedRaces = Array.from(new Set([
    "Californien", 
    "Néo-Zélandais", 
    "Papillon",
    ...(existingRaces?.map(r => r.nom) || [])
  ])).filter(r => r.trim() !== "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim()) return;

    try {
      const newRace: Race = {
        ...createBaseEntity(),
        nom: nom.trim(),
        poidsMoyenAdulte: poids ? parseFloat(poids) : undefined,
        description: description.trim(),
        remarques: remarques.trim(),
      };
      
      await db.races.add(newRace);
      // Reset form instead of go back, because the user might want to add more or see the list
      setNom("");
      setPoids("");
      setDescription("");
      setRemarques("");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la race:", error);
    }
  };

  const handleDeleteRace = async (id: string, name: string) => {
    if (window.confirm(`Voulez-vous vraiment supprimer la race "${name}" ?\nAttention : Si des reproducteurs y sont associés, ils risquent de ne plus avoir de race valide.`)) {
      try {
        await db.races.delete(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-stack-gap">
      {/* Section Header */}
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-semibold text-text-primary mb-2">Ajouter une Race</h2>
        <p className="text-text-secondary font-sans text-sm">Configurez une nouvelle race pour votre cheptel de lapins.</p>
      </div>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="space-y-stack-gap">
        {/* Nom de la race */}
        <div className="space-y-2">
          <label className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider block">Nom de la race</label>
          <input 
            type="text" 
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="w-full h-12 bg-surface-container border border-surface-border rounded-lg px-4 text-text-primary placeholder:text-outline focus:border-primary focus:ring-0 transition-all font-sans text-base" 
            placeholder="Ex: Californien"
            required
          />
        </div>

        {/* Suggestion Grid */}
        <div className="flex flex-wrap gap-2 py-2">
          <span className="text-[10px] font-mono font-semibold text-outline uppercase flex items-center">Suggestions:</span>
          {allSuggestedRaces.map(raceName => (
            <button 
              key={raceName}
              type="button" 
              onClick={() => setNom(raceName)}
              className="text-[11px] font-mono font-semibold bg-surface-variant text-primary px-3 py-1 rounded-full border border-surface-border hover:border-primary transition-colors whitespace-nowrap"
            >
              {raceName}
            </button>
          ))}
        </div>

        {/* Poids moyen adulte */}
        <div className="space-y-2">
          <label className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider block">Poids moyen adulte (kg)</label>
          <div className="relative">
            <input 
              type="number" 
              step="0.1"
              value={poids}
              onChange={(e) => setPoids(e.target.value)}
              className="w-full h-12 bg-surface-container border border-surface-border rounded-lg px-4 text-text-primary placeholder:text-outline focus:border-primary focus:ring-0 transition-all font-sans text-base" 
              placeholder="0.0" 
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider block">Description</label>
          <textarea 
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-surface-container border border-surface-border rounded-lg p-4 text-text-primary placeholder:text-outline focus:border-primary focus:ring-0 transition-all font-sans text-base resize-none" 
            placeholder="Caractéristiques physiques, origine..." 
          />
        </div>

        {/* Remarques */}
        <div className="space-y-2">
          <label className="font-sans font-medium text-xs text-text-secondary uppercase tracking-wider block">Remarques particulières</label>
          <textarea 
            rows={2}
            value={remarques}
            onChange={(e) => setRemarques(e.target.value)}
            className="w-full bg-surface-container border border-surface-border rounded-lg p-4 text-text-primary placeholder:text-outline focus:border-primary focus:ring-0 transition-all font-sans text-base resize-none" 
            placeholder="Notes additionnelles sur le comportement ou l'élevage..." 
          />
        </div>

        {/* Form Actions */}
        <div className="grid grid-cols-2 gap-4 pt-6">
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="h-12 border border-surface-border text-text-primary font-heading font-semibold text-sm rounded-lg hover:bg-surface-variant transition-colors"
          >
            Fermer
          </button>
          <button 
            type="submit"
            className="h-12 bg-primary-container text-on-primary-container font-heading font-semibold text-sm rounded-lg hover:bg-surface-tint transition-colors shadow-lg shadow-primary-container/10"
          >
            Enregistrer
          </button>
        </div>
      </form>

      {/* Existing Races List */}
      {existingRaces && existingRaces.length > 0 && (
        <div className="mt-section space-y-4">
          <h3 className="font-heading font-semibold text-xl text-text-primary">Races existantes</h3>
          <div className="space-y-2">
            {existingRaces.map(race => (
              <div key={race.id} className="bg-surface-card p-4 rounded-xl border border-surface-border flex items-center justify-between">
                <div>
                  <p className="font-heading font-semibold text-primary">{race.nom}</p>
                  {race.poidsMoyenAdulte && <p className="font-sans text-xs text-text-secondary">Poids moyen: {race.poidsMoyenAdulte} kg</p>}
                </div>
                <button 
                  type="button"
                  onClick={() => handleDeleteRace(race.id, race.nom)}
                  className="p-2 text-status-critical hover:bg-status-critical/10 rounded-lg transition-colors"
                  aria-label="Supprimer la race"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aesthetic Card */}
      <div className="mt-section p-card-padding bg-surface-card border border-surface-border rounded-xl overflow-hidden relative group">
        <div className="relative z-10">
          <h3 className="font-heading font-semibold text-xl text-primary mb-1">Standard de Race</h3>
          <p className="text-text-secondary font-sans text-sm">L'enregistrement correct des données permet un suivi statistique précis de la croissance par lignée.</p>
        </div>
        <div className="mt-4 rounded-lg overflow-hidden border border-surface-border aspect-video">
          <img 
            alt="Standard Race" 
            src="https://images.unsplash.com/photo-1585110396000-c9fd4e4e320c?auto=format&fit=crop&q=80&w=600&h=400" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
        </div>
      </div>
    </div>
  );
}
