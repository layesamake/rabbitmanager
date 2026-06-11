import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { PlusCircle, Wallet, Trash2, PieChart as PieChartIcon, List, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { Depense } from "../types";
import { createBaseEntity } from "../lib/entity-utils";

const CATEGORIES_LABELS: Record<string, string> = {
  alimentation: "Alimentation",
  soins: "Soins & Frais Vétérinaires",
  reproducteurs: "Achat Reproducteurs",
  equipement: "Équipement & Matériel",
  autre: "Autre"
};

export default function Depenses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const depenses = useLiveQuery(() => db.depenses.orderBy('date').reverse().toArray(), []) || [];
  
  const customCategories = Array.from(new Set(depenses.map(d => d.categorie).filter(c => !(c in CATEGORIES_LABELS))));

  const [showAddForm, setShowAddForm] = useState(searchParams.get('new') === 'true');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [montant, setMontant] = useState("");
  const [categorie, setCategorie] = useState<string>("alimentation");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "stats">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);

  const filteredDepenses = depenses.filter(d => {
    const searchString = `${d.description || ''} ${CATEGORIES_LABELS[d.categorie] || d.categorie}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || d.categorie === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalFiltered = filteredDepenses.reduce((sum, d) => sum + d.montant, 0);
  
  const isFiltered = filterCategory !== "all" || searchQuery !== "";

  // Statistics calculation
  const statsByCategory = filteredDepenses.reduce((acc, current) => {
    const cat = current.categorie;
    acc[cat] = (acc[cat] || 0) + current.montant;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(statsByCategory)
    .map(([name, value]) => ({
      name: CATEGORIES_LABELS[name] || name,
      value
    }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16'];

  const closeForm = () => {
    setShowAddForm(false);
    if (searchParams.get('new')) {
      searchParams.delete('new');
      setSearchParams(searchParams);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montant || isNaN(Number(montant))) return;

    try {
      const finalCategory = isNewCategory ? newCategoryName.trim() : categorie;
      if (!finalCategory) return;

      const newDepense: Depense = {
        ...createBaseEntity(),
        date: new Date(date).toISOString(),
        montant: Number(montant),
        categorie: finalCategory,
        description: description.trim()
      };

      await db.depenses.add(newDepense);
      closeForm();
      setMontant("");
      setDescription("");
      setCategorie("alimentation");
      setIsNewCategory(false);
      setNewCategoryName("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette dépense ?")) {
      try {
        await db.depenses.delete(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-section pb-24 relative min-h-[calc(100vh-80px)]">
      {/* Header */}
      <header className="flex items-center justify-between py-2">
        <div>
          <h2 className="font-heading text-2xl font-semibold text-text-primary">Dépenses</h2>
          <p className="font-sans text-sm text-text-secondary mt-1">Gestion financière</p>
        </div>
      </header>

      {/* Summary */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-card-padding flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase font-semibold text-text-secondary">
            {isFiltered ? "Total Filtré" : "Total Dépenses"}
          </p>
          <p className="font-heading text-2xl font-bold text-error">
            {isFiltered ? totalFiltered.toLocaleString('fr-FR') : totalDepenses.toLocaleString('fr-FR')} FCFA
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-error" />
        </div>
      </div>

      {!showAddForm && (
        <div className="flex bg-surface-container-highest p-1 rounded-lg">
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-sans text-sm font-medium transition-colors ${
              viewMode === "list" 
                ? "bg-surface-card text-text-primary shadow-sm" 
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <List className="w-4 h-4" />
            Historique
          </button>
          <button
            onClick={() => setViewMode("stats")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-sans text-sm font-medium transition-colors ${
              viewMode === "stats" 
                ? "bg-surface-card text-text-primary shadow-sm" 
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
            Statistiques
          </button>
        </div>
      )}

      {showAddForm ? (
        <form onSubmit={handleSubmit} className="bg-surface-card border border-surface-border rounded-xl p-card-padding space-y-4">
          <h3 className="font-heading text-lg font-semibold text-primary mb-4">Nouvelle Dépense</h3>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Date</label>
            <input 
              type="date" 
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full h-12 bg-surface-container border border-surface-border rounded-lg px-4 font-sans text-text-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Montant (FCFA)</label>
            <input 
              type="number" 
              required
              min="0"
              step="1"
              value={montant}
              onChange={e => setMontant(e.target.value)}
              className="w-full h-12 bg-surface-container border border-surface-border rounded-lg px-4 font-sans text-text-primary"
              placeholder="Ex: 5000"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Catégorie</label>
            <select
              value={isNewCategory ? "new" : categorie}
              onChange={e => {
                if (e.target.value === "new") {
                  setIsNewCategory(true);
                  setCategorie("");
                } else {
                  setIsNewCategory(false);
                  setCategorie(e.target.value);
                }
              }}
              className="w-full h-12 bg-surface-container border border-surface-border rounded-lg px-4 font-sans text-text-primary appearance-none"
            >
              <optgroup label="Catégories principales">
                {Object.entries(CATEGORIES_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </optgroup>
              {customCategories.length > 0 && (
                <optgroup label="Vos catégories">
                  {customCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </optgroup>
              )}
              <option value="new">+ Nouvelle catégorie...</option>
            </select>
          </div>

          {isNewCategory && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Nom de la nouvelle catégorie</label>
              <input 
                type="text" 
                required
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="w-full h-12 bg-surface-container border border-surface-border rounded-lg px-4 font-sans text-text-primary"
                placeholder="Ex: Vaccins, Transport..."
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary">Description</label>
            <input 
              type="text" 
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full h-12 bg-surface-container border border-surface-border rounded-lg px-4 font-sans text-text-primary"
              placeholder="Ex: Granulés 50kg"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={closeForm}
              className="flex-1 h-12 border border-surface-border text-text-primary font-heading font-semibold text-sm rounded-lg hover:bg-surface-variant transition-colors"
            >
              Annuler
            </button>
            <button 
              type="submit"
              className="flex-1 h-12 bg-primary text-on-primary font-heading font-semibold text-sm rounded-lg hover:bg-primary/90 transition-colors"
            >
              Ajouter
            </button>
          </div>
        </form>
      ) : viewMode === "stats" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-text-primary">Répartition</h3>
          </div>

          {depenses.length === 0 ? (
            <div className="text-center py-12 bg-surface-card border border-surface-border rounded-xl">
              <p className="text-text-secondary font-sans text-sm">Pas de données pour les statistiques.</p>
            </div>
          ) : (
            <div className="bg-surface-card border border-surface-border rounded-xl p-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={false}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value.toLocaleString('fr-FR')} FCFA`, 'Montant']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      wrapperStyle={{ fontSize: '12px', fontFamily: 'Inter' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-text-primary">Historique</h3>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-text-secondary" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une dépense..."
                className="block w-full pl-10 h-10 bg-surface-container border border-surface-border rounded-lg text-sm focus:ring-primary focus:border-primary text-text-primary placeholder:text-text-secondary"
              />
            </div>
            <div className="relative min-w-[130px] shrink-0">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-text-secondary" />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="block w-full h-10 pl-8 pr-3 bg-surface-container border border-surface-border rounded-lg text-sm text-text-primary appearance-none focus:ring-primary focus:border-primary text-ellipsis overflow-hidden truncate"
              >
                <option value="all">Toutes</option>
                {Object.entries(CATEGORIES_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
                {customCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {depenses.length === 0 ? (
            <div className="text-center py-12 bg-surface-card border border-surface-border rounded-xl">
              <p className="text-text-secondary font-sans text-sm">Aucune dépense enregistrée.</p>
            </div>
          ) : filteredDepenses.length === 0 ? (
             <div className="text-center py-12 bg-surface-card border border-surface-border rounded-xl">
              <p className="text-text-secondary font-sans text-sm">Aucune dépense ne correspond aux critères.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDepenses.map(depense => (
                <div key={depense.id} className="bg-surface-card border border-surface-border rounded-xl p-4 flex gap-4 items-center group">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-heading font-semibold text-text-primary truncate">{depense.description}</span>
                      <span className="font-mono font-bold text-error whitespace-nowrap ml-2">
                        -{depense.montant.toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="font-mono">{format(new Date(depense.date), 'dd/MM/yyyy')}</span>
                      <span>•</span>
                      <span className="capitalize">{CATEGORIES_LABELS[depense.categorie] || depense.categorie}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(depense.id)}
                    className="p-2 text-status-critical/60 hover:text-status-critical hover:bg-status-critical/10 rounded-lg transition-colors flex-shrink-0"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      {!showAddForm && (
        <button 
          onClick={() => setShowAddForm(true)}
          className="fixed bottom-20 right-4 lg:absolute lg:bottom-4 lg:right-4 w-14 h-14 bg-primary text-on-primary rounded-full shadow-elevation-3 flex items-center justify-center hover:bg-primary/90 transition-transform active:scale-95 z-40"
          aria-label="Ajouter une dépense"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
