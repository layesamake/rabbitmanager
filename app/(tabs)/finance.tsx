import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, SafeAreaView, Modal, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useFinanceStore } from '../../lib/financeStore';
import { Plus, Search, Filter, Trash2, Landmark, Wallet, TrendingUp } from 'lucide-react-native';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import FormInput from '../../components/FormInput';

type FinanceTab = 'depenses' | 'recettes';

const EXPENSE_CATEGORIES = [
  { label: 'Alimentation', value: 'alimentation' },
  { label: 'Soins & Frais Vétérinaires', value: 'soins' },
  { label: 'Achat Reproducteurs', value: 'reproducteurs' },
  { label: 'Équipement & Matériel', value: 'equipement' },
  { label: 'Autre', value: 'autre' },
];

const REVENUE_CATEGORIES = [
  { label: 'Vente de Lapins', value: 'vente_lapins' },
  { label: 'Vente de Viande', value: 'vente_viande' },
  { label: 'Vente d\'Engrais / Fumier', value: 'vente_engrais' },
  { label: 'Autre', value: 'autre' },
];

const transactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date requise au format AAAA-MM-JJ' }),
  montant: z.number({ message: 'Le montant doit être un nombre' }).min(1, { message: 'Le montant doit être supérieur à 0' }),
  categorie: z.string().min(1, { message: 'La catégorie est requise' }),
  description: z.string().min(1, { message: 'La description est requise' }),
});

export default function FinanceScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { depenses, recettes, addDepense, deleteDepense, addRecette, deleteRecette } = useFinanceStore();

  const [activeTab, setActiveTab] = useState<FinanceTab>('depenses');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);

  // Formulaire de transaction
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      montant: undefined as any,
      categorie: activeTab === 'depenses' ? 'alimentation' : 'vente_lapins',
      description: '',
    }
  });

  const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);
  const totalRecettes = recettes.reduce((sum, r) => sum + r.montant, 0);
  const solde = totalRecettes - totalDepenses;

  // Filtrage
  const dataList = activeTab === 'depenses' ? depenses : recettes;
  
  const getCategoryLabel = (cat: string) => {
    const list = activeTab === 'depenses' ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES;
    return list.find((x) => x.value === cat)?.label || cat;
  };

  const filteredData = dataList.filter((item) => {
    const label = getCategoryLabel(item.categorie);
    const matchesSearch =
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      label.toLowerCase().includes(search.toLowerCase());
    
    const matchesCategory = filterCategory === 'all' || item.categorie === filterCategory;

    return matchesSearch && matchesCategory;
  });

  const totalFiltered = filteredData.reduce((sum, item) => sum + item.montant, 0);
  const isFiltered = search !== '' || filterCategory !== 'all';

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cette transaction ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            if (activeTab === 'depenses') {
              await deleteDepense(id);
            } else {
              await deleteRecette(id);
            }
          },
        },
      ]
    );
  };

  const onSubmit = async (data: any) => {
    try {
      const payload = {
        date: new Date(data.date).toISOString(),
        montant: Number(data.montant),
        categorie: data.categorie,
        description: data.description,
      };

      if (activeTab === 'depenses') {
        await addDepense(payload);
      } else {
        await addRecette(payload);
      }

      setModalVisible(false);
      reset({
        date: format(new Date(), 'yyyy-MM-dd'),
        montant: undefined as any,
        categorie: activeTab === 'depenses' ? 'alimentation' : 'vente_lapins',
        description: '',
      });
    } catch (e) {
      console.error('Failed to save transaction', e);
    }
  };

  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 16,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
    },
    headerBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: `${colors.primary}15`,
      borderRadius: 16,
    },
    headerBtnText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    soldeCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    soldeVal: {
      fontSize: 24,
      fontWeight: 'bold',
      marginTop: 4,
    },
    soldeIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 4,
      marginBottom: 12,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    activeTabButton: {
      backgroundColor: colors.primary,
    },
    tabButtonText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    activeTabButtonText: {
      color: colors.onPrimary,
    },
    filtersRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderRadius: 16,
      height: 44,
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    searchInput: {
      color: colors.textPrimary,
      fontSize: 13,
      marginLeft: 6,
      flex: 1,
    },
    catFilterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderRadius: 16,
      height: 44,
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    catFilterText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '600',
      marginRight: 6,
    },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    listHeaderText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    cardContent: {
      flex: 1,
    },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    cardDate: {
      color: colors.textSecondary,
      fontSize: 11,
      fontFamily: 'System',
    },
    cardCat: {
      color: colors.textSecondary,
      fontSize: 11,
      textTransform: 'capitalize',
    },
    cardVal: {
      fontSize: 15,
      fontWeight: 'bold',
      marginRight: 12,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: 16,
    },
    modalContent: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 10,
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    modalButtonsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    btnSubmit: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnCancel: {
      flex: 1,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      paddingVertical: 48,
      alignItems: 'center',
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderRadius: 12,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Comptabilité</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setModalVisible(true)} activeOpacity={0.7}>
            <Text style={styles.headerBtnText}>+ Ajouter</Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.soldeCard}>
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Solde Élevage
            </Text>
            <Text style={[styles.soldeVal, { color: solde >= 0 ? colors.secondary : colors.error }]}>
              {solde >= 0 ? '+' : ''}{solde.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
          <View style={[styles.soldeIcon, { backgroundColor: solde >= 0 ? colors.secondary + '20' : colors.error + '20' }]}>
            {activeTab === 'depenses' ? (
              <Wallet size={20} color={colors.error} />
            ) : (
              <TrendingUp size={20} color={colors.secondary} />
            )}
          </View>
        </View>

        {/* Tab switch */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'depenses' && styles.activeTabButton]}
            onPress={() => {
              setActiveTab('depenses');
              setFilterCategory('all');
              reset({
                date: format(new Date(), 'yyyy-MM-dd'),
                montant: undefined as any,
                categorie: 'alimentation',
                description: '',
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'depenses' && styles.activeTabButtonText]}>
              Dépenses
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'recettes' && styles.activeTabButton]}
            onPress={() => {
              setActiveTab('recettes');
              setFilterCategory('all');
              reset({
                date: format(new Date(), 'yyyy-MM-dd'),
                montant: undefined as any,
                categorie: 'vente_lapins',
                description: '',
              });
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'recettes' && styles.activeTabButtonText]}>
              Recettes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          <View style={styles.searchBox}>
            <Search size={14} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          
          <TouchableOpacity
            style={styles.catFilterBtn}
            onPress={() => {
              // Custom Dialog/Alert for category picking
              const cats = activeTab === 'depenses' ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES;
              const options = [{ label: 'Toutes', value: 'all' }, ...cats];
              Alert.alert(
                'Filtrer par catégorie',
                'Sélectionnez une catégorie à filtrer :',
                options.map((opt) => ({
                  text: opt.label,
                  onPress: () => setFilterCategory(opt.value),
                }))
              );
            }}
            activeOpacity={0.7}
          >
            <Filter size={14} color={colors.textSecondary} />
            <Text style={[styles.catFilterText, { marginLeft: 6 }]}>
              {filterCategory === 'all' ? 'Toutes' : getCategoryLabel(filterCategory)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderText}>
            {isFiltered ? 'Total Filtré' : 'Total'}
          </Text>
          <Text style={[styles.listHeaderText, { color: activeTab === 'depenses' ? colors.error : colors.secondary }]}>
            {activeTab === 'depenses' ? '-' : '+'}{totalFiltered.toLocaleString('fr-FR')} F
          </Text>
        </View>

        {/* Transaction list */}
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.description}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.cardDate}>
                    {format(new Date(item.date), 'dd/MM/yyyy')}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginHorizontal: 6 }}>•</Text>
                  <Text style={styles.cardCat} numberOfLines={1}>
                    {getCategoryLabel(item.categorie)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.cardVal, { color: activeTab === 'depenses' ? colors.error : colors.secondary }]}>
                {activeTab === 'depenses' ? '-' : '+'}{item.montant.toLocaleString('fr-FR')} F
              </Text>

              <TouchableOpacity
                onPress={() => handleDelete(item.id)}
                activeOpacity={0.7}
                style={{ padding: 6 }}
              >
                <Trash2 size={18} color={colors.error + '90'} />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune transaction enregistrée.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />


        {/* Add Transaction Modal */}
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                Nouvelle {activeTab === 'depenses' ? 'Dépense' : 'Recette'}
              </Text>

              <ScrollView showsVerticalScrollIndicator={false}>
                <FormInput
                  name="date"
                  label="Date"
                  control={control}
                  error={errors.date}
                  placeholder="AAAA-MM-JJ"
                  type="date"
                />

                <FormInput
                  name="montant"
                  label="Montant (FCFA)"
                  control={control}
                  error={errors.montant}
                  placeholder="Ex: 5000"
                  type="number"
                />

                <FormInput
                  name="categorie"
                  label="Catégorie"
                  control={control}
                  error={errors.categorie}
                  type="select"
                  options={activeTab === 'depenses' ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES}
                />

                <FormInput
                  name="description"
                  label="Description"
                  control={control}
                  error={errors.description}
                  placeholder="Ex: Sac de granulés 50kg, vente lapin male"
                  type="text"
                />

                <View style={styles.modalButtonsRow}>
                  <TouchableOpacity
                    style={styles.btnCancel}
                    onPress={() => setModalVisible(false)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnSubmit}
                    onPress={handleSubmit(onSubmit)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Enregistrer</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
