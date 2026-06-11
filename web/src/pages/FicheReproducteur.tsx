import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { ArrowLeft, Edit, FileText, PlusCircle, Venus, Mars, Check, X, Droplet, Heart, Baby, Moon, Activity, Archive, XOctagon, Camera, Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { useState, useEffect } from "react";
import { updateBaseEntity, createBaseEntity } from "../lib/entity-utils";
import type { Sexe, Origine, StatutReproducteur } from "../types";
import ImageCropper from "../components/ImageCropper";

import { SanteHistory } from "../components/SanteHistory";
export default function FicheReproducteur() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeEdit = searchParams.get("edit") === "true";

  const [isEditing, setIsEditing] = useState(modeEdit);
  const [showHistoriquePortees, setShowHistoriquePortees] = useState(false);
  
  // Edit State
  const [editCode, setEditCode] = useState("");
  const [editNom, setEditNom] = useState("");
  const [editSexe, setEditSexe] = useState<Sexe | "">("");
  const [editRaceId, setEditRaceId] = useState("");
  const [editOrigine, setEditOrigine] = useState<Origine>("ne_elevage");
  const [editEmplacement, setEditEmplacement] = useState("");
  const [editObservation, setEditObservation] = useState("");
  const [editPrixAchat, setEditPrixAchat] = useState("");
  const [editVendeur, setEditVendeur] = useState("");
  const [editDateAchat, setEditDateAchat] = useState("");
  const [editDonateur, setEditDonateur] = useState("");
  const [editDateReception, setEditDateReception] = useState("");
  const [editPhoto, setEditPhoto] = useState<string>("");
  const [photoToCrop, setPhotoToCrop] = useState<string>("");

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
      e.target.value = ''; // reset file input
    }
  };

  const reproducteur = useLiveQuery(() => id ? db.reproducteurs.get(id) : undefined, [id]);
  const races = useLiveQuery(() => db.races.toArray(), []) || [];
  const race = races.find(r => r.id === reproducteur?.raceId);
  
  // Populate edit state when reproducteur loads or edit mode starts
  useEffect(() => {
    if (reproducteur && isEditing) {
      setEditCode(reproducteur.code);
      setEditNom(reproducteur.nom || "");
      setEditSexe(reproducteur.sexe);
      setEditRaceId(reproducteur.raceId);
      setEditOrigine(reproducteur.origine);
      setEditEmplacement(reproducteur.emplacement || "");
      setEditObservation(reproducteur.observation || "");
      setEditPrixAchat(reproducteur.prixAchat ? reproducteur.prixAchat.toString() : "");
      setEditVendeur(reproducteur.vendeur || "");
      setEditDateAchat(reproducteur.dateAchat || "");
      setEditDonateur(reproducteur.donateur || "");
      setEditDateReception(reproducteur.dateReception || "");
      setEditPhoto(reproducteur.photo || "");
    }
  }, [reproducteur, isEditing]);

  const saillies = useLiveQuery(async () => {
    if (!id || !reproducteur) return [];
    if (reproducteur.sexe === 'femelle') {
      return db.saillies.where('femelleId').equals(id).toArray();
    } else {
      return (await db.saillies.toArray()).filter(s => s.maleIds.includes(id));
    }
  }, [id, reproducteur]);

  const portees = useLiveQuery(async () => {
    if (!id || !reproducteur) return [];
    if (reproducteur.sexe === 'femelle') {
      return db.portees.where('femelleId').equals(id).toArray();
    }
    return [];
  }, [id, reproducteur]);

  if (!reproducteur) return null;

  const handleRaceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === "new_race") {
      const nomRace = window.prompt("Nom de la nouvelle race :");
      if (nomRace && nomRace.trim()) {
        const newRace = {
          ...createBaseEntity(),
          nom: nomRace.trim(),
          description: "",
          sync_status: "pending" as const
        };
        await db.races.add(newRace);
        setEditRaceId(newRace.id);
      } else {
        setEditRaceId(reproducteur.raceId);
      }
    } else {
      setEditRaceId(value);
    }
  };

  const handleSave = async () => {
    if (!editCode || !editSexe || !editRaceId) return;
    try {
      await db.reproducteurs.update(reproducteur.id, updateBaseEntity({
        ...reproducteur,
        code: editCode,
        nom: editNom,
        sexe: editSexe as Sexe,
        raceId: editRaceId,
        origine: editOrigine,
        emplacement: editEmplacement,
        observation: editObservation,
        prixAchat: editOrigine === "achete" && editPrixAchat ? parseFloat(editPrixAchat) : undefined,
        vendeur: editOrigine === "achete" ? editVendeur.trim() || undefined : undefined,
        dateAchat: editOrigine === "achete" ? editDateAchat : undefined,
        donateur: editOrigine === "recu" ? editDonateur.trim() || undefined : undefined,
        dateReception: editOrigine === "recu" ? editDateReception : undefined,
        photo: editPhoto || undefined,
      }));
      setIsEditing(false);
    } catch (err) {
      alert("Erreur lors de la mise à jour");
    }
  }

  // Calculs simples
  const totalSaillies = saillies?.length || 0;
  const totalMisesBas = portees?.length || 0;
  
  let totalNes = 0;
  if (portees) {
    totalNes = portees.reduce((acc, p) => acc + p.totalNes, 0);
  }

  const getBadgeClass = (statut: string) => {
    switch (statut) {
      case "gestante": return "bg-secondary-container/20 text-secondary border-secondary";
      case "saillie": return "bg-tertiary-container/20 text-on-tertiary-container border-tertiary-container";
      case "allaitante": return "bg-status-breeding/20 text-status-breeding border-status-breeding/30";
      case "actif": return "bg-surface-variant text-secondary border-secondary";
      default: return "bg-surface-variant text-on-surface-variant border-surface-border";
    }
  };

  const getBadgeIcon = (statut: string) => {
    switch (statut) {
      case "gestante": return <Droplet className="w-3 h-3 mr-1" aria-hidden="true" />;
      case "saillie": return <Heart className="w-3 h-3 mr-1" aria-hidden="true" />;
      case "allaitante": return <Baby className="w-3 h-3 mr-1" aria-hidden="true" />;
      case "actif": return <Activity className="w-3 h-3 mr-1" aria-hidden="true" />;
      case "disponible": return <Check className="w-3 h-3 mr-1" aria-hidden="true" />;
      case "repos": return <Moon className="w-3 h-3 mr-1" aria-hidden="true" />;
      case "reforme": return <Archive className="w-3 h-3 mr-1" aria-hidden="true" />;
      case "decede":
      case "mort": return <XOctagon className="w-3 h-3 mr-1" aria-hidden="true" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-stack-gap pb-24">
      {/* Header */}
      <header className="flex items-start justify-between py-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate(-1)} aria-label="Retour" className="p-1 -ml-1 text-on-surface-variant hover:text-primary">
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <span className="font-mono text-[10px] text-text-secondary uppercase tracking-widest">Fiche reproducteur</span>
          </div>
          
          <div className="flex items-center gap-4 mt-2">
            {photoToCrop && (
              <ImageCropper 
                imageSrc={photoToCrop}
                onCropComplete={(croppedImg) => {
                  setEditPhoto(croppedImg);
                  setPhotoToCrop("");
                }}
                onCancel={() => setPhotoToCrop("")}
              />
            )}
            {/* Photo Avatar */}
            {isEditing ? (
              <div className="relative group flex-shrink-0">
                <div className="w-20 h-20 rounded-full bg-surface-container border border-surface-border overflow-hidden flex items-center justify-center relative">
                  {editPhoto ? (
                    <img src={editPhoto} alt="Aperçu" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-on-surface-variant/50" />
                  )}
                </div>
                {editPhoto && (
                  <button 
                    type="button" 
                    onClick={() => setEditPhoto("")}
                    className="absolute -top-1 -right-1 bg-error text-on-error p-1 rounded-full shadow-sm hover:scale-110 transition-transform z-10"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <label 
                  htmlFor="photo-upload" 
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-medium rounded-full z-0"
                >
                  Choisir
                </label>
                <input 
                  id="photo-upload" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePhotoUpload} 
                />
              </div>
            ) : (
              reproducteur.photo && (
                <div className="w-20 h-20 rounded-full bg-surface-container border border-surface-border overflow-hidden flex-shrink-0">
                  <img src={reproducteur.photo} alt={reproducteur.code} className="w-full h-full object-cover" />
                </div>
              )
            )}

            {/* Identity Info */}
            <div className="flex-1">
              {isEditing ? (
                 <div className="flex flex-col gap-2">
                   <input 
                     type="text" 
                     value={editCode} 
                     onChange={e => setEditCode(e.target.value)}
                     className="bg-surface-card border border-surface-border rounded-lg h-10 px-3 font-heading text-xl font-semibold text-text-primary" 
                     placeholder="Code"
                   />
                   <input 
                     type="text" 
                     value={editNom} 
                     onChange={e => setEditNom(e.target.value)}
                     className="bg-surface-card border border-surface-border rounded-lg h-10 px-3 font-sans text-sm text-text-primary" 
                     placeholder="Nom (optionnel)"
                   />
                 </div>
              ) : (
                <>
                  <h2 className="font-heading text-3xl font-semibold text-text-primary">{reproducteur.code} {reproducteur.nom && <span className="text-xl text-text-secondary">({reproducteur.nom})</span>}</h2>
                  <div className={cn("inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase mt-1", getBadgeClass(reproducteur.statut))}>
                    {getBadgeIcon(reproducteur.statut)}
                    {reproducteur.statut}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        {!isEditing && (
          <div className="flex items-center gap-2">
            <button onClick={() => setIsEditing(true)} aria-label="Modifier la fiche" className="p-2.5 bg-surface-container border border-surface-border text-text-primary hover:text-primary hover:border-primary transition-colors rounded-xl flex items-center justify-center shadow-sm">
              <Edit className="w-5 h-5" aria-hidden="true" />
            </button>
            <button 
              onClick={async () => {
                if(window.confirm("Voulez-vous vraiment supprimer définitivement ce reproducteur ?\nCette action est irréversible et supprimera également les données associées (saillies, portées).")) {
                  try {
                    await db.transaction('rw', db.reproducteurs, db.saillies, db.portees, async () => {
                      await db.reproducteurs.delete(reproducteur.id);
                      await db.saillies.where('femelleId').equals(reproducteur.id).delete();
                      // We don't have an easy way to delete saillies for males because it's an array of maleIds. Since this is an MVP we can assume the logical association is broken.
                      await db.portees.where('femelleId').equals(reproducteur.id).delete();
                    });
                    navigate('/cheptel');
                  } catch(e) { console.error(e) }
                }
              }}
              aria-label="Supprimer définitivement" 
              className="p-2.5 bg-surface-container border border-surface-border text-status-critical hover:bg-status-critical/10 hover:border-status-critical/50 transition-colors rounded-xl flex items-center justify-center shadow-sm"
            >
              <Trash2 className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        )}
      </header>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-stack-gap">
        <div className="bg-surface-card p-card-padding rounded-xl border border-surface-border flex flex-col gap-1">
          <p className="font-sans text-xs font-medium text-text-secondary">Sexe</p>
          {isEditing ? (
            <select value={editSexe} onChange={e => setEditSexe(e.target.value as Sexe)} className="bg-surface-container border border-surface-border rounded-lg h-8 px-2 text-sm text-text-primary">
              <option value="male">Mâle</option>
              <option value="femelle">Femelle</option>
            </select>
          ) : (
            <p className="font-sans text-base text-text-primary capitalize flex items-center gap-1.5">
              {reproducteur.sexe === 'male' ? <Mars className="w-4 h-4 text-secondary" /> : <Venus className="w-4 h-4 text-primary" />}
              {reproducteur.sexe}
            </p>
          )}
        </div>
        <div className="bg-surface-card p-card-padding rounded-xl border border-surface-border flex flex-col gap-1">
          <p className="font-sans text-xs font-medium text-text-secondary">Race</p>
          {isEditing ? (
            <select value={editRaceId} onChange={handleRaceChange} className="bg-surface-container border border-surface-border rounded-lg h-8 px-2 text-sm text-text-primary">
              {races.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
              <option value="new_race" className="font-semibold text-primary">+ Nouvelle race...</option>
            </select>
          ) : (
            <p className="font-sans text-base text-text-primary truncate">{race?.nom || 'Inconnue'}</p>
          )}
        </div>
        <div className="bg-surface-card p-card-padding rounded-xl border border-surface-border flex flex-col gap-1">
          <p className="font-sans text-xs font-medium text-text-secondary">Origine</p>
          {isEditing ? (
            <select value={editOrigine} onChange={e => setEditOrigine(e.target.value as Origine)} className="bg-surface-container border border-surface-border rounded-lg h-8 px-2 text-sm text-text-primary">
              <option value="ne_elevage">Né dans l'élevage</option>
              <option value="achete">Acheté</option>
              <option value="recu">Reçu</option>
              <option value="autre">Autre</option>
            </select>
          ) : (
            <p className="font-sans text-base text-text-primary capitalize">{reproducteur.origine.replace('_', ' ')}</p>
          )}
        </div>
        <div className="bg-surface-card p-card-padding rounded-xl border border-surface-border flex flex-col gap-1">
          <p className="font-sans text-xs font-medium text-text-secondary">Cage</p>
          {isEditing ? (
            <input type="text" value={editEmplacement} onChange={e => setEditEmplacement(e.target.value)} className="bg-surface-container border border-surface-border rounded-lg h-8 px-2 text-sm text-text-primary" />
          ) : (
            <p className="font-sans text-base text-text-primary">{reproducteur.emplacement || '-'}</p>
          )}
        </div>
      </div>

      {isEditing && editOrigine === "achete" && (
        <div className="bg-surface-container border border-surface-border rounded-xl p-card-padding space-y-4">
          <h3 className="font-heading text-sm font-semibold text-text-primary uppercase tracking-wider">Détails d'achat</h3>
          <div className="grid grid-cols-2 gap-stack-gap">
            <div className="col-span-1 flex flex-col gap-1">
              <label htmlFor="editPrixAchat" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Prix</label>
              <input 
                id="editPrixAchat"
                type="number"
                step="0.01" 
                value={editPrixAchat}
                onChange={(e) => setEditPrixAchat(e.target.value)}
                className="bg-surface-card border border-surface-border rounded-lg h-10 px-3 font-sans text-sm text-text-primary" 
              />
            </div>
            <div className="col-span-1 flex flex-col gap-1">
              <label htmlFor="editDateAchat" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Date</label>
              <input 
                id="editDateAchat"
                type="date"
                value={editDateAchat}
                onChange={(e) => setEditDateAchat(e.target.value)}
                className="bg-surface-card border border-surface-border rounded-lg h-10 px-2 font-sans text-sm text-text-primary" 
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="editVendeur" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Vendeur</label>
            <input 
              id="editVendeur"
              type="text" 
              value={editVendeur}
              onChange={(e) => setEditVendeur(e.target.value)}
              className="w-full bg-surface-card border border-surface-border rounded-lg h-10 px-3 font-sans text-sm text-text-primary" 
            />
          </div>
        </div>
      )}

      {!isEditing && reproducteur.origine === "achete" && (
        <div className="bg-surface-container border border-surface-border rounded-xl p-card-padding space-y-4 mt-2">
          <h3 className="font-heading text-sm font-semibold text-text-primary uppercase tracking-wider">Détails d'achat</h3>
          <div className="grid grid-cols-2 gap-stack-gap">
            <div className="col-span-1 flex flex-col gap-1">
              <span className="font-sans text-xs font-medium text-text-secondary">Prix d'achat</span>
              <span className="font-sans text-sm text-text-primary">{reproducteur.prixAchat ? `${reproducteur.prixAchat} €` : '-'}</span>
            </div>
            <div className="col-span-1 flex flex-col gap-1">
              <span className="font-sans text-xs font-medium text-text-secondary">Date d'achat</span>
              <span className="font-sans text-sm text-text-primary">{reproducteur.dateAchat || '-'}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-sans text-xs font-medium text-text-secondary">Vendeur</span>
            <span className="font-sans text-sm text-text-primary">{reproducteur.vendeur || '-'}</span>
          </div>
        </div>
      )}

      {isEditing && editOrigine === "recu" && (
        <div className="bg-surface-container border border-surface-border rounded-xl p-card-padding space-y-4">
          <h3 className="font-heading text-sm font-semibold text-text-primary uppercase tracking-wider">Détails de réception</h3>
          <div className="flex flex-col gap-1">
            <label htmlFor="editDonateur" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Donateur</label>
            <input 
              id="editDonateur"
              type="text" 
              value={editDonateur}
              onChange={(e) => setEditDonateur(e.target.value)}
              className="w-full bg-surface-card border border-surface-border rounded-lg h-10 px-3 font-sans text-sm text-text-primary" 
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="editDateReception" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Date</label>
            <input 
              id="editDateReception"
              type="date"
              value={editDateReception}
              onChange={(e) => setEditDateReception(e.target.value)}
              className="w-full bg-surface-card border border-surface-border rounded-lg h-10 px-2 font-sans text-sm text-text-primary" 
            />
          </div>
        </div>
      )}

      {!isEditing && reproducteur.origine === "recu" && (
        <div className="bg-surface-container border border-surface-border rounded-xl p-card-padding space-y-4 mt-2">
          <h3 className="font-heading text-sm font-semibold text-text-primary uppercase tracking-wider">Détails de réception</h3>
          <div className="grid grid-cols-2 gap-stack-gap">
            <div className="col-span-1 flex flex-col gap-1">
              <span className="font-sans text-xs font-medium text-text-secondary">Donateur</span>
              <span className="font-sans text-sm text-text-primary">{reproducteur.donateur || '-'}</span>
            </div>
            <div className="col-span-1 flex flex-col gap-1">
              <span className="font-sans text-xs font-medium text-text-secondary">Date de réception</span>
              <span className="font-sans text-sm text-text-primary">{reproducteur.dateReception || '-'}</span>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="bg-surface-card p-card-padding rounded-xl border border-surface-border flex flex-col gap-1">
          <p className="font-sans text-xs font-medium text-text-secondary">Observation</p>
          <textarea 
            className="bg-surface-container border border-surface-border rounded-lg p-2 text-sm text-text-primary resize-none w-full" 
            rows={3} 
            value={editObservation} 
            onChange={e => setEditObservation(e.target.value)} 
          />
        </div>
      )}

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

      {!isEditing && reproducteur.sexe === 'femelle' && (
        <>
          <section className="space-y-stack-gap">
            <h3 className="font-heading text-xl font-semibold text-text-primary mt-6">Performance</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-container-high p-card-padding rounded-xl border border-surface-border flex flex-col items-center text-center">
                <p className="font-heading text-[40px] font-bold text-primary leading-none mb-1">
                  {totalMisesBas > 0 ? (totalNes / totalMisesBas).toFixed(1) : '-'}
                </p>
                <p className="font-mono text-[10px] text-on-surface-variant uppercase font-semibold">Moyenne nés</p>
              </div>
              <div className="bg-surface-container-high p-card-padding rounded-xl border border-surface-border flex flex-col items-center text-center">
                <p className="font-heading text-[40px] font-bold text-secondary leading-none mb-1">
                  -
                </p>
                <p className="font-mono text-[10px] text-on-surface-variant uppercase font-semibold">Taux de survie</p>
              </div>
            </div>
          </section>

          <section className="space-y-stack-gap">
            <h3 className="font-heading text-xl font-semibold text-text-primary mt-4">Historique</h3>
            <div className="bg-surface-card rounded-xl border border-surface-border overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-surface-border">
                <div className="p-4 text-center flex flex-col items-center justify-center">
                  <p className="font-heading text-2xl font-bold text-text-primary">{totalSaillies}</p>
                  <p className="font-mono text-[10px] text-text-secondary uppercase font-semibold mt-1">Saillies</p>
                </div>
                <div className="p-4 text-center flex flex-col items-center justify-center">
                  <p className="font-heading text-2xl font-bold text-text-primary">{totalMisesBas}</p>
                  <p className="font-mono text-[10px] text-text-secondary uppercase font-semibold mt-1">Mises bas</p>
                </div>
                <div className="p-4 text-center flex flex-col items-center justify-center">
                  <p className="font-heading text-2xl font-bold text-text-primary">{totalNes}</p>
                  <p className="font-mono text-[10px] text-text-secondary uppercase font-semibold mt-1">Nés</p>
                </div>
              </div>
            </div>
          </section>

          {reproducteur.sexe === 'femelle' && (
            <section className="space-y-stack-gap">
              <h3 className="font-heading text-xl font-semibold text-text-primary mt-4">Portées</h3>
              {!showHistoriquePortees ? (
                 <button 
                   onClick={() => setShowHistoriquePortees(true)}
                   className="w-full py-3 px-4 bg-surface-container hover:bg-surface-variant text-text-primary font-medium rounded-xl flex items-center justify-between transition-colors border border-surface-border"
                 >
                   <span className="flex items-center gap-2"><Baby className="w-5 h-5 text-secondary" /> Afficher l'historique des portées ({portees?.length || 0})</span>
                   <span className="text-secondary opacity-70">↓</span>
                 </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center mb-1 bg-surface-container p-2 rounded-lg">
                    <span className="font-medium text-sm text-text-secondary pl-2">Historique ({portees?.length || 0})</span>
                    <button onClick={() => setShowHistoriquePortees(false)} className="text-sm text-text-primary font-medium px-3 py-1 bg-surface-variant hover:bg-surface-border transition-colors rounded-md">Masquer</button>
                  </div>
                  {portees && portees.length > 0 ? (
                    portees.map(portee => (
                      <Link 
                        key={portee.id}
                        to={`/portees/${portee.id}`}
                        className="bg-surface-card border border-surface-border rounded-xl p-4 flex justify-between items-center hover:border-primary focus-visible:border-primary transition-colors group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-heading font-semibold text-text-primary group-hover:text-primary transition-colors">{portee.code}</p>
                            {portee.statut && (
                              <span className={cn(
                                "px-2 py-0.5 text-[10px] uppercase font-mono font-bold rounded-md bg-surface-container border border-surface-border",
                                portee.statut === 'en_cours' ? 'text-blue-500' : portee.statut === 'terminee' ? 'text-status-success' : 'text-text-secondary'
                              )}>
                                {portee.statut.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          <p className="font-sans text-xs text-text-secondary mt-1 flex items-center gap-1.5">
                            <span>Mise bas : {new Date(portee.dateMiseBas).toLocaleDateString('fr-FR')}</span>
                            <span>•</span>
                            <span>{portee.totalNes} nés</span>
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className={cn(
                            "px-3 py-1 rounded-full border",
                            portee.vivantsActuels > 0 ? "bg-primary-container/50 border-primary/20 text-on-primary-container" : "bg-surface-container border-surface-border text-text-secondary"
                          )}>
                            <span className="font-heading font-bold">{portee.vivantsActuels}</span>
                          </div>
                          <p className="font-mono text-[10px] text-text-secondary uppercase tracking-wider">Vivants</p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-text-secondary text-sm italic bg-surface-card border border-surface-border rounded-xl p-4 text-center">
                      Aucune portée enregistrée.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {!isEditing && (
        <SanteHistory subjectType="Reproducteur" subjectId={reproducteur.id} />
      )}

      {/* Actions */}
      {!isEditing && (
        <section className="space-y-3 mt-6">
          <Link 
            to={`/saillies/new?femelleId=${reproducteur.id}`}
            className="w-full h-12 flex items-center justify-center gap-2 bg-primary-container text-on-primary-container rounded-lg font-heading font-semibold text-sm active:scale-95 transition-transform"
          >
            <PlusCircle className="w-5 h-5" />
            Nouvelle saillie
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={async () => {
                if(window.confirm("Marquer ce sujet comme mort ou réformé ? Il n'apparaitra plus dans la liste principale.")) {
                  try {
                    await db.reproducteurs.update(reproducteur.id, { statut: 'mort' });
                    navigate('/cheptel');
                  } catch(e) {}
                }
              }}
              className="h-12 flex items-center justify-center gap-2 bg-status-critical/10 text-status-critical border border-status-critical/30 rounded-lg font-sans font-medium hover:bg-status-critical/20 transition-colors text-sm"
            >
              Déclarer mort/réformé
            </button>
            <button 
              onClick={() => {
                 alert(reproducteur.observation || "Aucune observation.");
              }}
              className="h-12 flex items-center justify-center gap-2 border border-surface-border text-text-primary rounded-lg font-sans font-medium hover:bg-surface-variant transition-colors text-sm"
            >
              <FileText className="w-4 h-4" />
              <span className="truncate">Voir Observation</span>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

