import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, X } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { createBaseEntity } from "../lib/entity-utils";
import type { Reproducteur, Sexe, Origine, StatutReproducteur } from "../types";
import ImageCropper from "../components/ImageCropper";

export default function NouveauReproducteur() {
  const navigate = useNavigate();
  // Fetch races from DB
  const races = useLiveQuery(() => db.races.toArray(), []);

  const [code, setCode] = useState("");
  const [nom, setNom] = useState("");
  const [sexe, setSexe] = useState<Sexe | "">("");
  const [raceId, setRaceId] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [origine, setOrigine] = useState<Origine>("ne_elevage");
  const [prixAchat, setPrixAchat] = useState("");
  const [vendeur, setVendeur] = useState("");
  const [dateAchat, setDateAchat] = useState("");
  const [donateur, setDonateur] = useState("");
  const [dateReception, setDateReception] = useState("");
  const [statut, setStatut] = useState<StatutReproducteur>("actif");
  const [emplacement, setEmplacement] = useState("");
  const [poids, setPoids] = useState("");
  const [observation, setObservation] = useState("");
  const [photo, setPhoto] = useState<string>("");
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
        setRaceId(newRace.id);
      } else {
        setRaceId("");
      }
    } else {
      setRaceId(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !sexe || !raceId) return; // Basic validation

    try {
      const newRepro: Reproducteur = {
        ...createBaseEntity(),
        code: code.trim(),
        nom: nom.trim() || undefined,
        sexe: sexe as Sexe,
        raceId,
        dateNaissance: dateNaissance || undefined,
        origine,
        prixAchat: origine === "achete" && prixAchat ? parseFloat(prixAchat) : undefined,
        vendeur: origine === "achete" ? vendeur.trim() || undefined : undefined,
        dateAchat: origine === "achete" ? dateAchat || undefined : undefined,
        donateur: origine === "recu" ? donateur.trim() || undefined : undefined,
        dateReception: origine === "recu" ? dateReception || undefined : undefined,
        statut,
        emplacement: emplacement.trim() || undefined,
        poids: poids ? parseFloat(poids) : undefined,
        observation: observation.trim() || undefined,
        photo: photo || undefined,
      };

      await db.reproducteurs.add(newRepro);
      navigate("/cheptel");
    } catch (error) {
      console.error("Erreur lors de la création du reproducteur:", error);
      alert("Erreur: Le code doit être unique ou une autre erreur s'est produite.");
    }
  };

  // Met à jour les statuts possibles selon le sexe
  const getStatutsParSexe = () => {
    if (sexe === "male") {
      return [
        { value: "actif", label: "Actif" },
        { value: "repos", label: "Au repos" },
        { value: "reforme", label: "Réformé" },
        { value: "decede", label: "Décédé" },
      ];
    } else if (sexe === "femelle") {
      return [
        { value: "disponible", label: "Disponible" },
        { value: "saillie", label: "Saillie" },
        { value: "gestante", label: "Gestante" },
        { value: "allaitante", label: "Allaitante" },
        { value: "repos", label: "Au repos" },
        { value: "reforme", label: "Réformé" },
        { value: "decede", label: "Décédé" },
      ];
    }
    return [{ value: "actif", label: "Actif" }]; // Par défaut
  };

  return (
    <div className="space-y-stack-gap">
      {/* Page Title */}
      <header className="py-2">
        <h2 className="font-heading text-2xl font-semibold text-primary">Nouveau Reproducteur</h2>
        <p className="font-sans text-sm text-text-secondary mt-1">Saisissez les informations détaillées pour ajouter un nouveau sujet au cheptel.</p>
      </header>

      {/* Form Section */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-stack-gap">
        
        {/* Photo Upload Section */}
        <div className="flex justify-center mb-2">
          {photoToCrop && (
            <ImageCropper 
              imageSrc={photoToCrop} 
              onCropComplete={(croppedImg) => {
                setPhoto(croppedImg);
                setPhotoToCrop("");
              }}
              onCancel={() => setPhotoToCrop("")}
            />
          )}

          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-surface-container border border-surface-border overflow-hidden flex items-center justify-center relative">
              {photo ? (
                <img src={photo} alt="Aperçu" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-8 h-8 text-on-surface-variant/50" />
              )}
            </div>
            {photo && (
              <button 
                type="button" 
                onClick={() => setPhoto("")}
                className="absolute -top-2 -right-2 bg-error text-on-error p-1 rounded-full shadow-sm hover:scale-110 transition-transform"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <label 
              htmlFor="photo-upload" 
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-medium"
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
        </div>

        {/* Bento Section: Primary Identity */}
        <div className="grid grid-cols-2 gap-stack-gap">
          <div className="col-span-1 flex flex-col gap-1">
            <label htmlFor="code" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Code *</label>
            <input 
              id="code"
              required
              aria-required="true"
              type="text" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors font-mono font-semibold text-secondary text-sm" 
              placeholder="ex: FR-24-001" 
            />
          </div>
          <div className="col-span-1 flex flex-col gap-1">
            <label htmlFor="nom" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Nom</label>
            <input 
              id="nom"
              type="text" 
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors font-sans text-base" 
              placeholder="Nom du sujet" 
            />
          </div>
        </div>

        {/* Bento Section: Biological Details */}
        <div className="grid grid-cols-2 gap-stack-gap">
          <div className="col-span-1 flex flex-col gap-1">
            <label htmlFor="sexe" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Sexe *</label>
            <select 
              id="sexe"
              required
              aria-required="true"
              value={sexe}
              onChange={(e) => {
                setSexe(e.target.value as Sexe);
                // Reset/adjust status on sex change
                if (e.target.value === "male") setStatut("actif");
                else if (e.target.value === "femelle") setStatut("disponible");
              }}
              className="bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors appearance-none font-sans text-base"
            >
              <option value="" disabled>Choisir...</option>
              <option value="male">Mâle</option>
              <option value="femelle">Femelle</option>
            </select>
          </div>
          <div className="col-span-1 flex flex-col gap-1">
            <label htmlFor="raceId" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Race *</label>
            <select 
              id="raceId"
              required
              aria-required="true"
              value={raceId}
              onChange={handleRaceChange}
              className="bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors appearance-none font-sans text-base"
            >
              <option value="" disabled>Choisir...</option>
              {races?.map(r => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
              <option value="new_race" className="font-semibold text-primary">+ Nouvelle race...</option>
            </select>
          </div>
        </div>

        {/* Single Row: Date of Birth */}
        <div className="flex flex-col gap-1">
          <label htmlFor="dateNaissance" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Date de naissance</label>
          <input 
            id="dateNaissance"
            type="date"
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
            className="bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors text-on-surface font-sans text-base" 
          />
        </div>

        {/* Bento Section: Origin & Status */}
        <div className="grid grid-cols-2 gap-stack-gap">
          <div className="col-span-1 flex flex-col gap-1">
            <label htmlFor="origine" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Origine</label>
            <select 
              id="origine"
              value={origine}
              onChange={(e) => setOrigine(e.target.value as Origine)}
              className="bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors appearance-none font-sans text-base"
            >
              <option value="ne_elevage">Né dans l'élevage</option>
              <option value="achete">Acheté</option>
              <option value="recu">Reçu</option>
              <option value="autre">Autre</option>
            </select>
          </div>
          <div className="col-span-1 flex flex-col gap-1">
            <label htmlFor="statut" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Statut *</label>
            <select
              id="statut"
              required
              aria-required="true"
              value={statut}
              onChange={(e) => setStatut(e.target.value as StatutReproducteur)}
              className="bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors appearance-none font-sans text-base"
            >
              {getStatutsParSexe().map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {origine === "achete" && (
          <div className="bg-surface-container border border-surface-border rounded-xl p-card-padding space-y-4">
            <h3 className="font-heading text-sm font-semibold text-text-primary uppercase tracking-wider">Détails d'achat</h3>
            <div className="grid grid-cols-2 gap-stack-gap">
              <div className="col-span-1 flex flex-col gap-1">
                <label htmlFor="prixAchat" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Prix d'achat</label>
                <input 
                  id="prixAchat"
                  type="number"
                  step="0.01" 
                  value={prixAchat}
                  onChange={(e) => setPrixAchat(e.target.value)}
                  className="bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors font-sans text-base" 
                  placeholder="0.00" 
                />
              </div>
              <div className="col-span-1 flex flex-col gap-1">
                <label htmlFor="dateAchat" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Date d'achat</label>
                <input 
                  id="dateAchat"
                  type="date"
                  value={dateAchat}
                  onChange={(e) => setDateAchat(e.target.value)}
                  className="bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors font-sans text-base" 
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="vendeur" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Vendeur</label>
              <input 
                id="vendeur"
                type="text" 
                value={vendeur}
                onChange={(e) => setVendeur(e.target.value)}
                className="w-full bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors font-sans text-base" 
                placeholder="Nom du vendeur ou de l'élevage" 
              />
            </div>
          </div>
        )}

        {origine === "recu" && (
          <div className="bg-surface-container border border-surface-border rounded-xl p-card-padding space-y-4">
            <h3 className="font-heading text-sm font-semibold text-text-primary uppercase tracking-wider">Détails de réception</h3>
            <div className="flex flex-col gap-1">
              <label htmlFor="donateur" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Donateur</label>
              <input 
                id="donateur"
                type="text" 
                value={donateur}
                onChange={(e) => setDonateur(e.target.value)}
                className="w-full bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors font-sans text-base" 
                placeholder="Nom du donateur ou de l'élevage" 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="dateReception" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Date de réception</label>
              <input 
                id="dateReception"
                type="date"
                value={dateReception}
                onChange={(e) => setDateReception(e.target.value)}
                className="w-full bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors font-sans text-base" 
              />
            </div>
          </div>
        )}

        {/* Bento Section: Logistical */}
        <div className="grid grid-cols-2 gap-stack-gap">
          <div className="col-span-1 flex flex-col gap-1">
            <label htmlFor="emplacement" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Emplacement / Cage</label>
            <input 
              id="emplacement"
              type="text" 
              value={emplacement}
              onChange={(e) => setEmplacement(e.target.value)}
              className="w-full bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors font-sans text-base" 
              placeholder="C-12" 
            />
          </div>
          <div className="col-span-1 flex flex-col gap-1">
            <label htmlFor="poids" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Poids (kg)</label>
            <input 
              id="poids"
              type="number"
              step="0.1" 
              value={poids}
              onChange={(e) => setPoids(e.target.value)}
              className="bg-surface-card border border-surface-border rounded-lg h-12 px-4 focus:border-secondary focus:ring-0 transition-colors font-sans text-base" 
              placeholder="0.0" 
            />
          </div>
        </div>

        {/* Observation */}
        <div className="flex flex-col gap-1">
          <label htmlFor="observation" className="font-sans font-medium text-xs text-on-surface-variant uppercase tracking-wider px-1">Observation</label>
          <textarea 
            id="observation"
            rows={4}
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            className="bg-surface-card border border-surface-border rounded-lg p-4 focus:border-secondary focus:ring-0 transition-colors resize-none font-sans text-base" 
            placeholder="Notes complémentaires, particularités physiques..." 
          />
        </div>

        {/* Form Actions */}
        <div className="mt-4 flex flex-col gap-3">
          <button 
            type="submit"
            className="w-full h-14 bg-secondary-container text-on-secondary-container font-heading font-semibold text-lg rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            Enregistrer
          </button>
          <button 
            type="button"
            onClick={() => navigate(-1)}
            className="w-full h-14 bg-transparent border border-surface-border text-on-surface font-sans text-base font-medium rounded-xl flex items-center justify-center hover:bg-surface-variant transition-colors"
          >
            Annuler
          </button>
        </div>
      </form>

      {/* Aesthetic Visual Reference Card (Bento style) */}
      <div className="mt-8 p-card-padding bg-surface-container rounded-xl border border-surface-border border-dashed opacity-80">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-variant overflow-hidden flex-shrink-0 border border-surface-border">
            <img 
              alt="Lapin de race" 
              className="w-full h-full object-cover grayscale opacity-80" 
              src="https://images.unsplash.com/photo-1591382468307-e892c90c7cd7?auto=format&fit=crop&q=80&w=200&h=200" 
            />
          </div>
          <div>
            <span className="font-mono text-[10px] font-semibold text-secondary uppercase tracking-wider">CONSEIL D'ÉLEVAGE</span>
            <p className="font-sans text-sm text-on-surface-variant mt-1 leading-relaxed">
              Assurez-vous de vérifier le tatouage ou l'étiquette d'oreille avant de valider le code unique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
