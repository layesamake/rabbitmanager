import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import { PlusCircle, TrendingUp, Trash2, PieChart as PieChartIcon, List, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { Recette } from "../types";
import { createBaseEntity } from "../lib/entity-utils";

const CATEGORIES_LABELS: Record<string, string> = {
  vente_sujet: "Vente de Sujet",
  vente_viande: "Vente de Viande",
  saillie: "Saillie (Service)",
  fumier: "Vente de Fumier",
  autre: "Autre"
};

export default function Recettes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const recettes = useLiveQuery(() => db.recettes.orderBy('date').reverse().toArray(), []) || [];
  
  const customCategories = Array.from(new Set(recettes.map(r => r.categorie).filter(c => !(c in CATEGORIES_LABELS))));

  const [showAddForm, setShowAddForm] = useState(searchParams.get('new') === 'true');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [montant, setMontant] = useState("");
  const [categorie, setCategorie] = useState<string>("vente_sujet");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "stats">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const totalRecettes = recettes.reduce((sum, r) => sum + r.montant, 0);

  const filteredRecettes = recettes.filter(r => {
    const searchString = `${r.description || ''} ${CATEGORIES_LABELS[r.categorie] || r.categorie}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || r.categorie === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const totalFiltered = filteredRecettes.reduce((sum, r) => sum + r.montant, 0);
  
  const isFiltered = filterCategory !== "all" || searchQuery !== "";

  // Statistics calculation
  const statsByCategory = filteredRecettes.reduce((acc, current) => {
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

  const COLORS = ['#10b981', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16', '#ef4444'];

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

      const newRecette: Recette = {
        ...createBaseEntity(),
        date: new Date(date).toISOString(),
        montant: Number(montant),
        categorie: finalCategory,
        description: description.trim()
      };

      await db.recettes.add(newRecette);
      closeForm();
      setMontant("");
      setDescription("");
      setCategorie("vente_sujet");
      setIsNewCategory(false);
      setNewCategoryName("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Voulez-vous vraiment supprimer cette recette ?")) {
      try {
        await db.recettes.delete(id);
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
          <h2 className="font-heading text-2xl font-semibold text-text-primary">Recettes</h2>
          <p className="font-sans text-sm text-text-secondary mt-1">Revenus et rentrées d'argent</p>
        </div>
      </header>

      {/* Summary */}
      <div className="bg-surface-card border border-surface-border rounded-xl p-card-padding flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase font-semibold text-text-secondary">
            {isFiltered ? "Total Filtré" : "Total Recettes"}
          </p>
          <p className="font-heading text-2xl font-bold text-status-success">
            {isFiltered ? totalFiltered.toLocaleString('fr-FR') : totalRecettes.toLocaleString('fr-FR')} FCFA
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-status-success/10 flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-status-success" />
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
          <h3 className="font-heading text-lg font-semibold text-primary mb-4">Nouvelle Recette</h3>
          
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
              placeholder="Ex: 15000"
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
                placeholder="Ex: Prime, Remboursement..."
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
              placeholder="Ex: Vente 2 lapereaux"
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

          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-text-secondary" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
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

          {filteredRecettes.length === 0 ? (
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
                placeholder="Rechercher une recette..."
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

          {recettes.length === 0 ? (
            <div className="text-center py-12 bg-surface-card border border-surface-border rounded-xl">
              <p className="text-text-secondary font-sans text-sm">Aucune recette enregistrée.</p>
            </div>
          ) : filteredRecettes.length === 0 ? (
             <div className="text-center py-12 bg-surface-card border border-surface-border rounded-xl">
              <p className="text-text-secondary font-sans text-sm">Aucune recette ne correspond aux critères.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecettes.map(recette => (
                <div key={recette.id} className="bg-surface-card border border-surface-border rounded-xl p-4 flex gap-4 items-center group">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-heading font-semibold text-text-primary truncate">{recette.description}</span>
                      <span className="font-mono font-bold text-status-success whitespace-nowrap ml-2">
                        +{recette.montant.toLocaleString('fr-FR')} F
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <span className="font-mono">{format(new Date(recette.date), 'dd/MM/yyyy')}</span>
                      <span>•</span>
                      <span className="capitalize">{CATEGORIES_LABELS[recette.categorie] || recette.categorie}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(recette.id)}
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
          aria-label="Ajouter une recette"
        >
          <PlusCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
