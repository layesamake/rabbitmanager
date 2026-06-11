import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { pushToSupabase, pullFromSupabase, exportLocalData, importLocalData } from "../lib/sync";
import { getEnv, setEnv } from "../lib/env";
import { requestNotificationPermission } from "../lib/notifications";
import {
  CloudUpload,
  CloudDownload,
  Download,
  Upload,
  LogIn,
  LogOut,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Bell,
  BellRing,
  Wallet,
  Trash2,
  Settings
} from "lucide-react";
import { db } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useGoogleLogin } from "@react-oauth/google";
import { authorizeGoogleAndSync } from "../lib/googleCalendar";
import { createBaseEntity } from "../lib/entity-utils";
import type { DepenseRecurrente, FrequenceDepense, CategorieDepense } from "../types";

function DepensesRecurrentes() {
  const [titre, setTitre] = useState("");
  const [montant, setMontant] = useState("");
  const [categorie, setCategorie] = useState<CategorieDepense>("alimentation");
  const [frequence, setFrequence] = useState<FrequenceDepense>("mois");
  const [dateDebut, setDateDebut] = useState("");

  const recurrentes = useLiveQuery(() => db.depensesRecurrentes.toArray(), []) || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre || !montant || isNaN(Number(montant)) || !dateDebut) return;
    try {
      const newRec: DepenseRecurrente = {
        ...createBaseEntity(),
        titre: titre.trim(),
        montant: Number(montant),
        categorie,
        frequence,
        dateDebut,
        derniereGeneration: null
      };
      await db.depensesRecurrentes.add(newRec);
      setTitre("");
      setMontant("");
      setDateDebut("");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout de la dépense récurrente");
    }
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Voulez-vous vraiment supprimer cette dépense récurrente ? (Les dépenses déjà générées ne seront pas supprimées)")) return;
    try {
      await db.depensesRecurrentes.delete(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-surface-card border border-surface-border p-card-padding rounded-xl space-y-6">
      <form onSubmit={handleAdd} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Titre de la dépense</label>
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)} required placeholder="Ex: Achat nourriture mensuelle" className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Montant (FCFA)</label>
            <input type="number" min="0" step="1" value={montant} onChange={e => setMontant(e.target.value)} required className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Catégorie</label>
            <select value={categorie} onChange={e => setCategorie(e.target.value)} className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary">
              <option value="alimentation">Alimentation</option>
              <option value="soins">Soins</option>
              <option value="equipement">Équipement</option>
              <option value="autre">Autre</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Fréquence</label>
            <select value={frequence} onChange={e => setFrequence(e.target.value as FrequenceDepense)} className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary">
              <option value="jour">Tous les jours</option>
              <option value="semaine">Toutes les semaines</option>
              <option value="mois">Tous les mois</option>
              <option value="annee">Tous les ans</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">Date de premier passage</label>
            <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} required className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary" />
          </div>
        </div>
        <button type="submit" className="w-full h-10 bg-error/10 text-error rounded-lg font-semibold hover:bg-error/20 transition-colors flex items-center justify-center gap-2">
          <Wallet className="w-4 h-4" /> Configurer la dépense récurrente
        </button>
      </form>

      {recurrentes.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t border-surface-border">
          <h4 className="font-semibold text-text-primary text-sm mb-3">Vos dépenses récurrentes</h4>
          {recurrentes.map(r => (
            <div key={r.id} className="p-3 bg-surface-container-low border border-surface-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-semibold text-text-primary">{r.titre}</span>
                  <span className="font-mono font-bold text-error">{r.montant.toLocaleString('fr-FR')} F</span>
                </div>
                <p className="font-sans text-xs text-text-secondary mt-1">
                  Tous les {r.frequence}{r.frequence === 'mois' ? '' : 's'} • Début: {new Date(r.dateDebut).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDelete(r.id)} className="px-3 h-8 text-xs font-medium border border-status-critical text-status-critical rounded-lg hover:bg-status-critical/10 transition-colors flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoogleCalendarSync({
  setMessage,
  setLoading,
  loading,
}: {
  setMessage: any;
  setLoading: any;
  loading: boolean;
}) {
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(
    null,
  );

  const loginGoogle = useGoogleLogin({
    onSuccess: (codeResponse) => {
      setGoogleAccessToken(codeResponse.access_token);
      setGoogleConnected(true);
      setMessage({
        text: "Connecté à Google Calendar. Vous pouvez maintenant synchroniser.",
        type: "success",
      });
    },
    onError: (error) =>
      setMessage({ text: `Erreur Google Login: ${error}`, type: "error" }),
    scope: "https://www.googleapis.com/auth/calendar.events",
  });

  const handleGoogleSync = async () => {
    if (!googleAccessToken) return;
    setLoading(true);
    setMessage({
      text: "Synchronisation vers Google Calendar...",
      type: "info",
    });
    try {
      const count = await authorizeGoogleAndSync(googleAccessToken);
      setMessage({
        text: `Succès : ${count} événements ajoutés à votre calendrier.`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({ text: `Erreur sync Google: ${err.message}`, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-card border border-surface-border p-card-padding rounded-xl space-y-4">
      <p className="text-sm text-text-secondary">
        Synchronisez vos saillies (contrôle palpation, mise bas) et vos portées
        (sevrage) directement dans votre Google Calendar.
      </p>

      {!googleConnected ? (
        <button
          onClick={() => loginGoogle()}
          className="w-full h-12 bg-white text-gray-900 border border-gray-300 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 48 48"
            aria-hidden="true"
            className="mr-2"
          >
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"
            ></path>
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            ></path>
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            ></path>
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            ></path>
          </svg>
          Se connecter avec Google
        </button>
      ) : (
        <button
          onClick={handleGoogleSync}
          disabled={loading}
          className="w-full h-12 bg-primary text-on-primary rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary-container transition-colors disabled:opacity-50"
        >
          Envoyer vers mon calendrier
        </button>
      )}
    </div>
  );
}

function CustomReminders() {
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [datePrevue, setDatePrevue] = useState("");
  const [type, setType] = useState<'vaccination' | 'vermifugation' | 'nettoyage' | 'autre'>('vaccination');

  const rappels = useLiveQuery(() => db.rappels.where('statut').equals('a_venir').sortBy('datePrevue')) || [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre || !datePrevue) return;
    try {
      await db.rappels.add({
        id: crypto.randomUUID(),
        titre,
        description,
        datePrevue,
        type,
        statut: 'a_venir',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'pending'
      });
      setTitre("");
      setDescription("");
      setDatePrevue("");
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'ajout du rappel");
    }
  };

  const handleDone = async (id: string) => {
    try {
      await db.rappels.update(id, { statut: 'fait', updated_at: new Date().toISOString(), sync_status: 'pending' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Supprimer ce rappel ?")) return;
    try {
      await db.rappels.update(id, { statut: 'annule', updated_at: new Date().toISOString(), sync_status: 'pending' });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-surface-card border border-surface-border p-card-padding rounded-xl space-y-6">
      <form onSubmit={handleAdd} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Titre</label>
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)} required className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Date</label>
          <input type="date" value={datePrevue} onChange={e => setDatePrevue(e.target.value)} required className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Type</label>
          <select value={type} onChange={e => setType(e.target.value as any)} className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary">
            <option value="vaccination">Vaccination</option>
            <option value="vermifugation">Vermifugation</option>
            <option value="nettoyage">Nettoyage</option>
            <option value="autre">Autre</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Description (optionnel)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full h-20 bg-surface-container border border-surface-border rounded-lg p-3 text-text-primary resize-none"></textarea>
        </div>
        <button type="submit" className="w-full h-10 bg-secondary text-primary-container rounded-lg font-semibold hover:bg-secondary/90 transition-colors">
          Ajouter le rappel
        </button>
      </form>

      {rappels.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t border-surface-border">
          <h4 className="font-semibold text-text-primary text-sm mb-3">Rappels à venir</h4>
          {rappels.map(r => (
            <div key={r.id} className="p-3 bg-surface-container-low border border-surface-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-heading font-semibold text-text-primary">{r.titre}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-primary/10 text-primary">{r.type}</span>
                </div>
                <p className="font-sans text-xs text-text-secondary mt-1">
                  Prévu le : {new Date(r.datePrevue).toLocaleDateString('fr-FR')}
                </p>
                {r.description && <p className="font-sans text-sm mt-1">{r.description}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDone(r.id)} className="px-3 h-8 text-xs font-medium bg-primary text-on-primary rounded-lg hover:bg-primary-container transition-colors">Fait</button>
                <button onClick={() => handleDelete(r.id)} className="px-3 h-8 text-xs font-medium border border-status-critical text-status-critical rounded-lg hover:bg-status-critical/10 transition-colors">Annuler</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PushNotificationsSettings() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
  }, []);

  const handleEnable = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? "granted" : "denied");
  };

  if (permission === "unsupported") return null;

  return (
    <div className="bg-surface-card border border-surface-border p-card-padding rounded-xl space-y-4">
      <p className="text-sm text-text-secondary">
        Soyez averti(e) directement par une notification sur cet appareil pour les événements majeurs, comme un sevrage prévu dans 2 jours ou aujourd'hui.
      </p>
      
      <div className="flex items-center justify-between mt-4">
        <div>
           <span className="font-semibold text-text-primary text-sm">Notifications PUSH</span>
           <p className="text-xs text-text-secondary">Statut : {permission === "granted" ? "Activées" : permission === "denied" ? "Bloquées" : "Non configurées"}</p>
        </div>
        
        {permission !== "granted" ? (
          <button
            onClick={handleEnable}
            className="h-10 px-4 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary-container transition-colors text-sm"
          >
            Activer
          </button>
        ) : (
          <div className="h-10 px-4 flex items-center justify-center bg-primary/20 text-primary border border-primary/30 rounded-lg text-sm font-semibold pointer-events-none">
            <CheckCircle className="w-4 h-4 mr-2" />
            Activées
          </div>
        )}
      </div>
      {permission === "denied" && (
        <p className="text-xs text-status-critical mt-2">
          Les notifications sont bloquées par votre navigateur. Vous devez les autoriser dans les paramètres de votre navigateur pour ce site.
        </p>
      )}
    </div>
  );
}

import { defaultThemes, applyThemeColors, ThemePalette } from "../lib/theme";
import { Palette, CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

function ThemeSettings() {
  const [activeTheme, setActiveTheme] = useState<string>(localStorage.getItem('app-theme-preset') || 'farm-dark');
  const [customColors, setCustomColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('app-theme-custom');
    return saved ? JSON.parse(saved) : {};
  });
  const [isCustom, setIsCustom] = useState<boolean>(!!localStorage.getItem('app-theme-custom'));

  const handleApplyPreset = (preset: ThemePalette) => {
    applyThemeColors(preset.colors);
    setActiveTheme(preset.id);
    setIsCustom(false);
    localStorage.setItem('app-theme-preset', preset.id);
    localStorage.removeItem('app-theme-custom');
  };

  const handleCustomColorChange = (key: string, value: string) => {
    const newColors = { ...customColors, [key]: value };
    setCustomColors(newColors);
    
    // Apply changes in real time for preview
    applyThemeColors({ ...defaultThemes.find(t => t.id === 'farm-dark')?.colors, ...newColors });
  };
  
  const saveCustomTheme = () => {
    const baseTheme = defaultThemes.find(t => t.id === 'farm-dark')?.colors || {};
    const fullColors = { ...baseTheme, ...customColors };
    
    setIsCustom(true);
    localStorage.setItem('app-theme-custom', JSON.stringify(fullColors));
    localStorage.removeItem('app-theme-preset');
    alert("Thème personnalisé enregistré !");
  };

  return (
    <div className="bg-surface-card border border-surface-border p-card-padding rounded-xl space-y-6">
      <div>
        <p className="text-sm font-medium text-text-primary mb-3">Thèmes prédéfinis</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {defaultThemes.map(theme => (
            <button
              key={theme.id}
              onClick={() => handleApplyPreset(theme)}
              className={cn(
                "p-3 rounded-lg border text-left transition-colors relative focus:outline-none flex flex-col gap-2",
                !isCustom && activeTheme === theme.id 
                  ? "border-primary bg-primary/10" 
                  : "border-surface-border bg-surface hover:border-surface-border/80"
              )}
            >
              <span className="font-semibold text-sm text-text-primary block">{theme.name}</span>
              <div className="flex gap-2">
                <div className="w-5 h-5 rounded-full border border-gray-500/20 shadow-sm" style={{ backgroundColor: theme.colors['--theme-background'] }} title="Fond"></div>
                <div className="w-5 h-5 rounded-full border border-gray-500/20 shadow-sm" style={{ backgroundColor: theme.colors['--theme-surface-card'] }} title="Carte"></div>
                <div className="w-5 h-5 rounded-full border border-gray-500/20 shadow-sm" style={{ backgroundColor: theme.colors['--theme-primary'] }} title="Primaire"></div>
              </div>
              {!isCustom && activeTheme === theme.id && (
                <CheckCircle2 className="w-4 h-4 text-primary absolute top-3 right-3" />
              )}
            </button>
          ))}
        </div>
      </div>
      
      <div className="pt-4 border-t border-surface-border space-y-4">
        <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-text-primary">Générateur (Personnalisé)</p>
            {isCustom && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-mono font-bold">ACTIF</span>}
        </div>
        <p className="text-xs text-text-secondary">Modifiez manuellement les couleurs principales pour générer votre propre style.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary font-mono">Fond (Background)</label>
            <div className="flex w-full h-10 border border-surface-border rounded-lg overflow-hidden focus-within:border-primary transition-colors">
              <input 
                type="color" 
                value={customColors['--theme-background'] || defaultThemes[0].colors['--theme-background']}
                onChange={(e) => handleCustomColorChange('--theme-background', e.target.value)}
                className="w-12 h-full cursor-pointer bg-transparent border-none p-0 focus:outline-none" 
              />
              <input 
                type="text" 
                value={customColors['--theme-background'] || defaultThemes[0].colors['--theme-background']}
                onChange={(e) => handleCustomColorChange('--theme-background', e.target.value)}
                className="flex-1 bg-surface-card text-on-surface px-2 focus:outline-none text-xs font-mono uppercase" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary font-mono">Surface (Cartes)</label>
            <div className="flex w-full h-10 border border-surface-border rounded-lg overflow-hidden focus-within:border-primary transition-colors">
              <input 
                type="color" 
                value={customColors['--theme-surface-card'] || defaultThemes[0].colors['--theme-surface-card']}
                onChange={(e) => handleCustomColorChange('--theme-surface-card', e.target.value)}
                className="w-12 h-full cursor-pointer bg-transparent border-none p-0 focus:outline-none" 
              />
              <input 
                type="text" 
                value={customColors['--theme-surface-card'] || defaultThemes[0].colors['--theme-surface-card']}
                onChange={(e) => handleCustomColorChange('--theme-surface-card', e.target.value)}
                className="flex-1 bg-surface-card text-on-surface px-2 focus:outline-none text-xs font-mono uppercase" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary font-mono">Primaire</label>
            <div className="flex w-full h-10 border border-surface-border rounded-lg overflow-hidden focus-within:border-primary transition-colors">
              <input 
                type="color" 
                value={customColors['--theme-primary'] || defaultThemes[0].colors['--theme-primary']}
                onChange={(e) => handleCustomColorChange('--theme-primary', e.target.value)}
                className="w-12 h-full cursor-pointer bg-transparent border-none p-0 focus:outline-none" 
              />
              <input 
                type="text" 
                value={customColors['--theme-primary'] || defaultThemes[0].colors['--theme-primary']}
                onChange={(e) => handleCustomColorChange('--theme-primary', e.target.value)}
                className="flex-1 bg-surface-card text-on-surface px-2 focus:outline-none text-xs font-mono uppercase" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-text-secondary font-mono">Texte Principal</label>
            <div className="flex w-full h-10 border border-surface-border rounded-lg overflow-hidden focus-within:border-primary transition-colors">
              <input 
                type="color" 
                value={customColors['--theme-text-primary'] || defaultThemes[0].colors['--theme-text-primary']}
                onChange={(e) => handleCustomColorChange('--theme-text-primary', e.target.value)}
                className="w-12 h-full cursor-pointer bg-transparent border-none p-0 focus:outline-none" 
              />
              <input 
                type="text" 
                value={customColors['--theme-text-primary'] || defaultThemes[0].colors['--theme-text-primary']}
                onChange={(e) => handleCustomColorChange('--theme-text-primary', e.target.value)}
                className="flex-1 bg-surface-card text-on-surface px-2 focus:outline-none text-xs font-mono uppercase" 
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-2">
            <button
                onClick={saveCustomTheme}
                className="px-4 py-2 bg-secondary text-secondary-on-container rounded-lg font-semibold text-sm hover:bg-secondary/90 transition-colors"
                style={{ backgroundColor: customColors['--theme-primary'] || defaultThemes[0].colors['--theme-primary'], color: customColors['--theme-on-primary'] || defaultThemes[0].colors['--theme-on-primary'] }}
            >
                Enregistrer mon thème
            </button>
        </div>
      </div>
    </div>
  );
}

function SettingsEnvVariables() {
  const [supabaseUrl, setSupabaseUrl] = useState(getEnv('VITE_SUPABASE_URL'));
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(getEnv('VITE_SUPABASE_ANON_KEY'));
  const [googleClientId, setGoogleClientId] = useState(getEnv('VITE_GOOGLE_CLIENT_ID'));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setEnv('VITE_SUPABASE_URL', supabaseUrl);
    setEnv('VITE_SUPABASE_ANON_KEY', supabaseAnonKey);
    setEnv('VITE_GOOGLE_CLIENT_ID', googleClientId);
    if (window.confirm("Les modifications vont recharger l'application. Continuer ?")) {
      window.location.reload();
    }
  };

  return (
    <div className="bg-surface-card border border-surface-border p-card-padding rounded-xl space-y-4">
      <p className="text-sm text-text-secondary">
        Modifiez les variables d'environnement directement ici. Les modifications sont sauvegardées localement sur cet appareil.
      </p>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">VITE_SUPABASE_URL</label>
          <input type="text" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">VITE_SUPABASE_ANON_KEY</label>
          <input type="password" value={supabaseAnonKey} onChange={e => setSupabaseAnonKey(e.target.value)} className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary font-mono text-xs" />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">VITE_GOOGLE_CLIENT_ID</label>
          <input type="text" value={googleClientId} onChange={e => setGoogleClientId(e.target.value)} className="w-full h-10 bg-surface-container border border-surface-border rounded-lg px-3 text-text-primary" />
        </div>
        <button type="submit" className="w-full h-10 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors">
          Enregistrer et recharger
        </button>
      </form>
    </div>
  );
}

export default function Parametres() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState({ text: "", type: "info" });

  // Compter le nombre de pending (non synchronisés)
  const pendingCount = useLiveQuery(async () => {
    let cp = 0;
    const tables = [
      "races",
      "reproducteurs",
      "saillies",
      "portees",
      "alertes",
      "parametres",
      "rappels",
    ] as const;
    for (const t of tables) {
      cp += await (db[t] as any)
        .where("sync_status")
        .anyOf(["pending", "error"])
        .count();
    }
    return cp;
  });

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleLogin = async (e: React.FormEvent, isSignUp: boolean = false) => {
    e.preventDefault();
    if (!supabase)
      return setMessage({
        text: "Erreur de configuration Supabase",
        type: "error",
      });

    setLoading(true);
    setMessage({ text: "", type: "info" });

    try {
      const { error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      if (isSignUp)
        setMessage({
          text: "Vérifiez vos emails pour confirmer l'inscription.",
          type: "info",
        });
    } catch (error: any) {
      setMessage({
        text: error.message || "Erreur de connexion",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase?.auth.signOut();
  };

  const handlePush = async () => {
    if (!user) return;
    setLoading(true);
    setMessage({ text: "Sauvegarde en cours...", type: "info" });
    try {
      const count = await pushToSupabase(user.id);
      setMessage({
        text: `Succès : ${count} éléments sauvegardés.`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!user) return;
    if (
      !window.confirm(
        "Attention : Restaurer va écraser les données locales actuelles (non sauvegardées). Continuer ?",
      )
    )
      return;

    setLoading(true);
    setMessage({ text: "Restauration en cours...", type: "info" });
    try {
      const count = await pullFromSupabase(user.id);
      setMessage({
        text: `Succès : ${count} éléments importés.`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportData = async () => {
    try {
      const data = await exportLocalData();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lapin_manager_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ text: "Sauvegarde locale (Fichier) téléchargée avec succès.", type: "success" });
    } catch (err: any) {
      setMessage({ text: "Erreur lors de l'exportation: " + err.message, type: "error" });
    }
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Attention : L'importation d'un fichier écrasera vos données locales actuelles. Continuer ?")) {
      e.target.value = '';
      return;
    }

    setLoading(true);
    setMessage({ text: "Importation en cours...", type: "info" });
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = event.target?.result as string;
        const count = await importLocalData(jsonData);
        setMessage({ text: `Succès : ${count} éléments importés.`, type: "success" });
      } catch (err: any) {
        setMessage({ text: "Erreur lors de l'importation: Le fichier est peut-être corrompu.", type: "error" });
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-section pb-24">
      <section>
        <span className="font-mono text-[12px] font-semibold text-secondary uppercase tracking-widest">
          Configuration
        </span>
        <h2 className="font-heading text-3xl font-semibold text-text-primary mt-1">
          Paramètres & Cloud
        </h2>
      </section>

      {message.text && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-start gap-2 ${
            message.type === "error"
              ? "bg-status-critical/10 text-status-critical"
              : message.type === "success"
                ? "bg-secondary/10 text-secondary"
                : "bg-surface-variant text-on-surface-variant"
          }`}
        >
          {message.type === "error" ? (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          ) : (
            <CheckCircle className="w-5 h-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Cloud Parameters */}
      {!supabase ? (
        <div className="bg-surface-card border border-status-critical/30 p-card-padding rounded-xl text-status-critical text-sm">
          ⚠️ Les identifiants Supabase (URL et clé) ne sont pas configurés. Veuillez les ajouter dans la section "Configuration Technique" ci-dessous.
        </div>
      ) : !user ? (
        <form className="bg-surface-card border border-surface-border p-card-padding rounded-xl space-y-4">
          <h3 className="font-heading text-xl font-semibold text-text-primary mb-4">
            Connexion Cloud
          </h3>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-surface-container border border-surface-border rounded-lg px-4 text-text-primary focus:border-primary outline-none transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-surface-container border border-surface-border rounded-lg px-4 text-text-primary focus:border-primary outline-none transition-colors"
              required
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={(e) => handleLogin(e, false)}
              disabled={loading}
              className="flex-1 h-12 bg-primary text-on-primary rounded-lg font-semibold hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogIn className="w-5 h-5" /> Connexion
            </button>
            <button
              type="button"
              onClick={(e) => handleLogin(e, true)}
              disabled={loading}
              className="flex-1 h-12 bg-surface-variant text-on-surface-variant rounded-lg font-semibold hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              Créer compte
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="bg-surface-card border border-surface-border p-card-padding rounded-xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-text-secondary">
                  Connecté en tant que
                </p>
                <p className="font-semibold text-text-primary">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-status-critical hover:bg-status-critical/10 rounded-lg transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-surface-border">
              <button
                onClick={handlePush}
                disabled={loading}
                className="w-full h-14 bg-primary text-on-primary rounded-xl font-semibold flex items-center justify-between px-6 hover:bg-primary/90 transition-colors disabled:opacity-50 group"
              >
                <div className="flex items-center gap-3">
                  <CloudUpload className="w-6 h-6 border-r border-on-primary/20 pr-3" />
                  <div className="text-left leading-tight">
                    <span className="block">Sauvegarder maintenant</span>
                    {pendingCount !== undefined && (
                      <span className="block text-xs font-normal opacity-80 mt-0.5">
                        {pendingCount} attente(s)
                      </span>
                    )}
                  </div>
                </div>
              </button>

              <button
                onClick={handlePull}
                disabled={loading}
                className="w-full h-14 bg-surface-variant border border-surface-border text-on-surface-variant rounded-xl font-semibold flex items-center justify-between px-6 hover:bg-surface-border transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <CloudDownload className="w-6 h-6 border-r border-on-surface-variant/20 pr-3" />
                  <span className="block">Restaurer mes données</span>
                </div>
              </button>
            </div>
            <p className="text-xs text-text-secondary mt-2">
              Privilégiez la sauvegarde (
              <strong className="font-semibold text-white">
                Sauvegarder maintenant
              </strong>
              ) pour mettre vos données récentes sur le Cloud. N'utilisez{" "}
              <strong>Restaurer</strong> que sur un nouvel appareil ou après une
              désinstallation de l'application.
            </p>
          </div>
        </>
      )}

      {/* Synchronisation Fichier Local */}
      <section className="mt-8 pt-8 border-t border-surface-border">
        <h3 className="font-heading text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-tertiary" />
          Sauvegarde Locale (Fichier)
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Vous pouvez exporter vos données dans un fichier et le réimporter plus tard. C'est idéal si vous ne souhaitez pas utiliser le Cloud ou comme sauvegarde de sécurité supplémentaire.
        </p>

        <div className="bg-surface-card border border-surface-border p-card-padding rounded-xl space-y-4">
          <button
            onClick={handleExportData}
            disabled={loading}
            className="w-full h-12 bg-surface-container text-text-primary border border-surface-border rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-surface-variant transition-colors disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            Exporter les données (JSON)
          </button>
          
          <div className="relative">
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              onChange={handleImportData} 
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              disabled={loading}
            />
            <button
              disabled={loading}
              className="w-full h-12 bg-surface-container text-text-primary border border-surface-border rounded-xl font-semibold flex items-center justify-center gap-3 hover:bg-surface-variant transition-colors disabled:opacity-50 pointer-events-none"
            >
              <Upload className="w-5 h-5" />
              Importer des données (JSON)
            </button>
          </div>
          <p className="text-xs text-text-secondary">
             Remarque : L'importation d'un fichier remplacera entièrement vos données locales non synchronisées.
          </p>
        </div>
      </section>

      <section className="mt-8 pt-8 border-t border-surface-border">
        <h3 className="font-heading text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5 text-secondary" />
          Rappels Personnalisés
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Ajoutez des rappels pour la vaccination, le nettoyage, et plus encore. Ces rappels seront inclus lors de la synchronisation avec Google Calendar.
        </p>
        <CustomReminders />
      </section>

      <section className="mt-8 pt-8 border-t border-surface-border">
        <h3 className="font-heading text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          Personnalisation du Thème
        </h3>
        <ThemeSettings />
      </section>

      <section className="mt-8 pt-8 border-t border-surface-border">
        <h3 className="font-heading text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <BellRing className="w-5 h-5 text-secondary" />
          Notifications Locales
        </h3>
        <PushNotificationsSettings />
      </section>

      <section className="mt-8 pt-8 border-t border-surface-border">
        <h3 className="font-heading text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-error" />
          Dépenses Récurrentes
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Configurez vos dépenses régulières (ex: achat de nourriture, frais périodiques) pour qu'elles s'ajoutent automatiquement à leur échéance.
        </p>
        <DepensesRecurrentes />
      </section>

      {/* Google Calendar Section */}
      <section className="mt-8 pt-8 border-t border-surface-border">
        <h3 className="font-heading text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Google Calendar
        </h3>

        {!getEnv('VITE_GOOGLE_CLIENT_ID') ? (
          <div className="bg-surface-card border border-status-critical/30 p-card-padding rounded-xl text-status-critical text-sm">
            ⚠️ Le VITE_GOOGLE_CLIENT_ID n'est pas configuré dans les paramètres techniques. L'intégration de Google Calendar est désactivée.
          </div>
        ) : (
          <GoogleCalendarSync
            setMessage={setMessage}
            setLoading={setLoading}
            loading={loading}
          />
        )}
      </section>

      {/* Parameter Techniques */}
      <section className="mt-8 pt-8 border-t border-surface-border">
        <h3 className="font-heading text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-secondary" />
          Configuration Technique (Variables d'environnement)
        </h3>
        <SettingsEnvVariables />
      </section>
    </div>
  );
}
