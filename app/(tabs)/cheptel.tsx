import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useRabbitStore } from '../../lib/rabbitStore';
import RabbitCard from '../../components/RabbitCard';
import { Search, Plus, Tag } from 'lucide-react-native';

type FilterType = 'tous' | 'males' | 'femelles' | 'gestantes' | 'inactifs';

export default function Cheptel() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { reproducteurs, races } = useRabbitStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('tous');

  const getRaceName = (id: string) => races.find((r) => r.id === id)?.nom || 'Inconnue';

  const filteredReproducteurs = reproducteurs.filter((r) => {
    // 1. Recherche textuelle (code ou nom)
    const matchesSearch =
      r.code.toLowerCase().includes(search.toLowerCase()) ||
      (r.nom?.toLowerCase() || '').includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const isActif = r.statut !== 'reforme' && r.statut !== 'decede';

    // 2. Filtres
    if (filter === 'inactifs') return !isActif;
    
    // Pour tous les autres filtres, on s'assure qu'ils sont actifs
    if (!isActif) return false;

    if (filter === 'males') return r.sexe === 'male';
    if (filter === 'femelles') return r.sexe === 'femelle';
    if (filter === 'gestantes') return r.statut === 'gestante';

    return true;
  });

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
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderRadius: 16,
      height: 48,
      paddingHorizontal: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    searchInput: {
      flex: 1,
      color: colors.textPrimary,
      fontSize: 14,
      marginLeft: 8,
    },
    filtersContainer: {
      flexDirection: 'row',
      marginBottom: 16,
      height: 38,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 8,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    activeChip: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    activeChipText: {
      color: colors.onPrimary,
    },
    listHeader: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
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

  const renderFilterChip = (type: FilterType, label: string) => {
    const isActive = filter === type;
    return (
      <TouchableOpacity
        style={[styles.chip, isActive && styles.activeChip]}
        onPress={() => setFilter(type)}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipText, isActive && styles.activeChipText]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Mon Cheptel</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/race/new')} activeOpacity={0.7}>
            <Text style={styles.headerBtnText}>+ Nouvelle Race</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Search size={18} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par code ou nom..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Horizontally scrollable filters */}
        <View style={{ height: 48 }}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { type: 'tous', label: 'Tous' },
              { type: 'males', label: 'Mâles' },
              { type: 'femelles', label: 'Femelles' },
              { type: 'gestantes', label: 'Gestantes' },
              { type: 'inactifs', label: 'Inactifs' },
            ]}
            keyExtractor={(item) => item.type}
            renderItem={({ item }) => renderFilterChip(item.type as FilterType, item.label)}
            style={styles.filtersContainer}
          />
        </View>

        {/* List */}
        <FlatList
          data={filteredReproducteurs}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <Text style={styles.listHeader}>
              Cheptel Actuel ({filteredReproducteurs.length})
            </Text>
          }
          renderItem={({ item }) => (
            <RabbitCard
              rabbit={item}
              raceName={getRaceName(item.raceId)}
              onPress={() => router.push(`/reproducteur/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun reproducteur trouvé.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />


      </View>
    </SafeAreaView>
  );
}
