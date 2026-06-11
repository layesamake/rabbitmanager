import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../lib/db";
import { ArrowLeft, Trash2, Edit2, Calendar, FileText, CheckCircle, Clock } from "lucide-react";
import type { Traitement, StatutTraitement } from "../types";
import { format } from "date-fns";

export default function FicheSante() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [traitement, setTraitement] = useState<Traitement | null>(null);

  useEffect(() => {
    if (id) {
      db.traitements.get(id).then(t => setTraitement(t || null));
    }
  }, [id]);

  if (!traitement) return null;

  const handleStatutChange = async (statut: StatutTraitement) => {
    await db.traitements.update(traitement.id, { 
      statut, 
      updated_at: new Date().toISOString(),
      sync_status: 'pending' 
    });
    setTraitement({ ...traitement, statut });
  };

  const handleMarkAsDone = async () => {
    const today = new Date().toISOString().split('T')[0];
    await db.traitements.update(traitement.id, { 
      statut: "Fait" as StatutTraitement, 
      dateRealisation: today,
      updated_at: new Date().toISOString(),
      sync_status: 'pending' 
    });
    setTraitement({ ...traitement, statut: "Fait", dateRealisation: today });
  };

  const handleDelete = async () => {
    if (window.confirm("Voulez-vous vraiment supprimer ce traitement ?")) {
      await db.traitements.delete(traitement.id);
      navigate("/sante");
    }
  };

  return (
    <div className="space-y-section pb-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/sante")} className="p-2 -ml-2 rounded-full hover:bg-surface-variant transition-colors">
            <ArrowLeft className="w-6 h-6 text-on-surface" />
          </button>
          <div>
            <span className="font-mono text-[12px] font-semibold text-secondary uppercase tracking-widest">Traitement</span>
            <h2 className="font-heading text-2xl font-semibold text-text-primary mt-1">Fiche santé</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/sante/edit/${traitement.id}`)} className="p-2 rounded-full hover:bg-surface-variant text-text-secondary transition-colors">
            <Edit2 className="w-5 h-5" />
          </button>
          <button onClick={handleDelete} className="p-2 rounded-full hover:bg-error/10 text-error transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-surface-card border border-surface-border rounded-xl flex flex-col overflow-hidden">
        <div className="p-card-padding flex justify-between items-start border-b border-surface-border">
          <div>
            <p className="font-mono text-sm text-text-secondary uppercase">{traitement.sujetType}</p>
            <h3 className="font-heading text-2xl font-bold text-primary mt-1">{traitement.sujetNom || traitement.sujetId}</h3>
          </div>
          <span className="px-3 py-1 font-mono text-[10px] uppercase font-bold rounded-full bg-surface-variant text-on-surface-variant border border-surface-border">
            {traitement.statut}
          </span>
        </div>

        <div className="p-card-padding flex flex-col gap-4">
          <div>
            <h4 className="font-heading text-lg font-semibold">{traitement.nomProduit}</h4>
            <span className="text-secondary text-sm">{traitement.typeAction}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-secondary flex items-center gap-1"><Calendar className="w-3 h-3"/> Prévu le</span>
              <span className="font-medium">{format(new Date(traitement.datePrevue), 'dd/MM/yyyy')}</span>
            </div>
            {traitement.dateRealisation ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-text-secondary flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Réalisé le</span>
                <span className="font-medium text-status-success">{format(new Date(traitement.dateRealisation), 'dd/MM/yyyy')}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-text-secondary flex items-center gap-1"><Clock className="w-3 h-3"/> Réalisé le</span>
                <span className="font-medium text-on-surface-variant italic">Pas encore</span>
              </div>
            )}
          </div>

          {(traitement.frequence || traitement.duree || traitement.dose) && (
            <div className="grid grid-cols-3 gap-2 py-3 border-y border-surface-border">
              <div className="flex flex-col">
                <span className="text-xs text-text-secondary">Dose</span>
                <span className="font-medium">{traitement.dose || '-'}</span>
              </div>
              <div className="flex flex-col border-l border-surface-border pl-2">
                <span className="text-xs text-text-secondary">Fréq.</span>
                <span className="font-medium">{traitement.frequence || '-'}</span>
              </div>
              <div className="flex flex-col border-l border-surface-border pl-2">
                <span className="text-xs text-text-secondary">Durée</span>
                <span className="font-medium">{traitement.duree || '-'}</span>
              </div>
            </div>
          )}

          {traitement.prochainRappel && (
             <div className="bg-warning/10 border border-warning/30 p-3 rounded-lg flex items-center justify-between">
               <span className="text-sm font-medium text-warning-strong">Prochain rappel</span>
               <span className="font-mono font-bold text-warning-strong">{format(new Date(traitement.prochainRappel), 'dd/MM/yyyy')}</span>
             </div>
          )}

          {traitement.objectif && (
            <div className="flex flex-col mt-2">
              <span className="text-xs text-text-secondary mb-1">Objectif</span>
              <p className="text-sm bg-surface-container p-3 rounded-lg border border-surface-border">
                {traitement.objectif}
              </p>
            </div>
          )}

          {traitement.observation && (
            <div className="flex flex-col mt-2">
              <span className="text-xs text-text-secondary mb-1 flex items-center gap-1"><FileText className="w-3 h-3"/>Observation</span>
              <p className="text-sm bg-surface-container p-3 rounded-lg border border-surface-border whitespace-pre-wrap">
                {traitement.observation}
              </p>
            </div>
          )}

          {traitement.resultatObserve && traitement.dateRealisation && (
            <div className="flex flex-col mt-2">
              <span className="text-xs text-text-secondary mb-1">Résultat</span>
              <p className="text-sm font-medium">
                {traitement.resultatObserve}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {traitement.statut !== "Fait" && traitement.statut !== "Terminé" && (
          <button 
            onClick={handleMarkAsDone}
            className="w-full bg-secondary text-on-secondary-container py-3.5 rounded-xl font-heading font-semibold hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Marquer comme fait aujourd'hui
          </button>
        )}
        
        {traitement.statut === "Fait" && (
          <button 
            onClick={() => handleStatutChange("À renouveler")}
            className="w-full bg-warning text-on-warning py-3.5 rounded-xl font-heading font-semibold hover:bg-warning/90 transition-colors flex items-center justify-center gap-2"
          >
            Indiquer à renouveler
          </button>
        )}
        
        <div className="grid grid-cols-2 gap-3 mt-2">
          {traitement.statut !== "En cours" && traitement.statut !== "Programmé" && (
            <button onClick={() => handleStatutChange("En cours")} className="w-full bg-surface-container border border-surface-border py-3 rounded-xl font-medium text-sm hover:bg-surface-variant transition-colors">
              Passer "En cours"
            </button>
          )}
          {traitement.statut !== "Annulé" && (
            <button onClick={() => handleStatutChange("Annulé")} className="w-full bg-surface-container border border-surface-border py-3 rounded-xl font-medium text-sm hover:bg-surface-variant transition-colors">
              Annuler
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
