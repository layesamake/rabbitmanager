import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useSanteStore } from '../../lib/santeStore';
import { useRabbitStore } from '../../lib/rabbitStore';
import { useReproductionStore } from '../../lib/reproductionStore';
import { Calendar, Check, Edit3, ArrowRight } from 'lucide-react-native';
import { format, isToday, isPast, startOfMonth, endOfMonth } from 'date-fns';

type FilterType = 'toutes' | 'a_faire' | 'en_cours' | 'faits' | 'en_retard' | 'programmes' | 'prophylaxie' | 'curatif';

export default function SanteScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { traitements } = useSanteStore();
  const { reproducteurs } = useRabbitStore();
  const { portees } = useReproductionStore();
  const [filter, setFilter] = useState<FilterType>('toutes');

  // Stats sanitaire
  const stats = useMemo(() => {
    const now = new Date();
    const startM = startOfMonth(now);
    const endM = endOfMonth(now);

    const aFaireAjd = traitements.filter(t => {
      const d = new Date(t.datePrevue);
      d.setHours(0,0,0,0);
      return (t.statut === 'À faire' || t.statut === 'Programmé') && isToday(d);
    }).length;

    const enCours = traitements.filter(t => t.statut === 'En cours').length;
    const programmes = traitements.filter(t => {
      const d = new Date(t.datePrevue);
      return t.statut === 'Programmé' && d.getTime() > now.getTime();
    }).length;

    const faitsMois = traitements.filter(t => {
      if (t.statut !== 'Fait' || !t.dateRealisation) return false;
      const d = new Date(t.dateRealisation);
      return d >= startM && d <= endM;
    }).length;

    const animauxSet = new Set(traitements.filter(t => t.sujetType === 'Reproducteur').map(t => t.sujetId));
    const porteesSet = new Set(traitements.filter(t => t.sujetType === 'Portee').map(t => t.sujetId));

    return {
      aFaireAjd,
      enCours,
      programmes,
      faitsMois,
      animaux: animauxSet.size,
      portees: porteesSet.size,
    };
  }, [traitements]);

  // Tri par date (la plus proche d'abord)
  const sortedTraitements = useMemo(() => {
    return [...traitements].sort((a, b) => new Date(a.datePrevue).getTime() - new Date(b.datePrevue).getTime());
  }, [traitements]);

  // Filtrage
  const filteredTraitements = sortedTraitements.filter((t) => {
    const isTrtPast = isPast(new Date(t.datePrevue)) && !isToday(new Date(t.datePrevue));
    if (filter === 'a_faire') return t.statut === 'À faire' || t.statut === 'Programmé';
    if (filter === 'en_cours') return t.statut === 'En cours';
    if (filter === 'faits') return t.statut === 'Fait' || t.statut === 'Terminé';
    if (filter === 'en_retard') return t.statut === 'En retard' || ((t.statut === 'À faire' || t.statut === 'Programmé') && isTrtPast);
    if (filter === 'programmes') return t.statut === 'Programmé';
    if (filter === 'prophylaxie') return t.typeAction === 'Prophylaxie';
    if (filter === 'curatif') return t.typeAction === 'Traitement curatif';
    return true;
  });

  const getStatusBadgeStyles = (statut: string) => {
    switch (statut) {
      case 'Programmé':
        return { bg: colors.surfaceVariant, text: colors.textSecondary, border: colors.surfaceBorder };
      case 'À faire':
        return { bg: colors.statusBreeding + '20', text: colors.statusBreeding, border: colors.statusBreeding + '40' };
      case 'En cours':
        return { bg: colors.primary + '20', text: colors.primary, border: colors.primary + '40' };
      case 'Fait':
      case 'Terminé':
        return { bg: colors.secondary + '20', text: colors.secondary, border: colors.secondary + '40' };
      case 'En retard':
        return { bg: colors.error + '20', text: colors.error, border: colors.error + '40' };
      default:
        return { bg: colors.surfaceVariant, text: colors.textSecondary, border: colors.surfaceBorder };
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
      marginTop: 20,
      marginBottom: 16,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: 'bold',
    },
    statsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
      marginBottom: 16,
    },
    statItem: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 16,
      padding: 12,
      width: '31.33%',
      marginHorizontal: '1%',
      marginBottom: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    statLabel: {
      color: colors.textSecondary,
      fontSize: 9,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    statVal: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 4,
    },
    buttonRow: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 12,
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 10,
      height: 48,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryBtnText: {
      color: colors.onPrimary,
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 8,
    },
    secondaryBtn: {
      flex: 1,
      backgroundColor: colors.secondary,
      borderRadius: 10,
      height: 48,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    secondaryBtnText: {
      color: colors.onSecondary,
      fontSize: 13,
      fontWeight: '700',
      marginLeft: 8,
    },
    filterBar: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      backgroundColor: colors.surfaceCard,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    activeChip: {
      backgroundColor: colors.primary + '30',
      borderColor: colors.primary,
    },
    chipText: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    activeChipText: {
      color: colors.primary,
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 20,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    subjectText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
    },
    badge: {
      borderRadius: 4,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    productText: {
      color: colors.secondary,
      fontSize: 14,
      fontWeight: '600',
    },
    actionText: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    datesGrid: {
      flexDirection: 'row',
      marginTop: 10,
      paddingTop: 10,
      borderTopColor: colors.surfaceBorder,
      borderTopWidth: 1,
    },
    dateCol: {
      flex: 1,
    },
    dateColLabel: {
      color: colors.textSecondary,
      fontSize: 9,
      textTransform: 'uppercase',
    },
    dateColVal: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 2,
    },
    descContainer: {
      backgroundColor: colors.background,
      borderRadius: 6,
      padding: 8,
      marginTop: 8,
    },
    descText: {
      color: colors.textSecondary,
      fontSize: 11,
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

  const renderSanteItem = ({ item }: { item: any }) => {
    const badge = getStatusBadgeStyles(item.statut);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/sante/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.subjectText}>{item.sujetNom || item.sujetType}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{item.statut}</Text>
          </View>
        </View>

        <Text style={styles.productText}>
          {item.nomProduit}
          <Text style={styles.actionText}> • {item.typeAction}</Text>
        </Text>

        <View style={styles.datesGrid}>
          <View style={styles.dateCol}>
            <Text style={styles.dateColLabel}>Date Prévue</Text>
            <Text style={styles.dateColVal}>{format(new Date(item.datePrevue), 'dd/MM/yyyy')}</Text>
          </View>
          {item.prochainRappel && (
            <View style={styles.dateCol}>
              <Text style={styles.dateColLabel}>Prochain Rappel</Text>
              <Text style={styles.dateColVal}>{format(new Date(item.prochainRappel), 'dd/MM/yyyy')}</Text>
            </View>
          )}
        </View>

        {item.objectif && (
          <View style={styles.descContainer}>
            <Text style={styles.descText} numberOfLines={1}>
              {item.objectif}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Title */}
        <View style={styles.header}>
          <Text style={styles.title}>Santé & Prophylaxie</Text>
        </View>

        {/* Health Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>À faire ajd</Text>
            <Text style={[styles.statVal, { color: colors.statusBreeding }]}>{stats.aFaireAjd}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>En cours</Text>
            <Text style={[styles.statVal, { color: colors.primary }]}>{stats.enCours}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Programmés</Text>
            <Text style={styles.statVal}>{stats.programmes}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Faits (mois)</Text>
            <Text style={[styles.statVal, { color: colors.secondary }]}>{stats.faitsMois}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Animaux</Text>
            <Text style={styles.statVal}>{stats.animaux}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Portées</Text>
            <Text style={styles.statVal}>{stats.portees}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.push('/sante/new')}
            activeOpacity={0.7}
          >
            <Calendar size={18} color={colors.onPrimary} />
            <Text style={styles.primaryBtnText}>Nouveau prévu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/sante/fait')}
            activeOpacity={0.7}
          >
            <Check size={18} color={colors.onSecondary} />
            <Text style={styles.secondaryBtnText}>Enregistrer fait</Text>
          </TouchableOpacity>
        </View>

        {/* Filters bar */}
        <View style={{ height: 40 }}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { type: 'toutes', label: 'Tous' },
              { type: 'a_faire', label: 'À faire' },
              { type: 'en_cours', label: 'En cours' },
              { type: 'faits', label: 'Faits' },
              { type: 'en_retard', label: 'En retard' },
              { type: 'programmes', label: 'Programmés' },
              { type: 'prophylaxie', label: 'Prophylaxie' },
              { type: 'curatif', label: 'Curatifs' },
            ]}
            keyExtractor={(item) => item.type}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.chip, filter === item.type && styles.activeChip]}
                onPress={() => setFilter(item.type as FilterType)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, filter === item.type && styles.activeChipText]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            style={styles.filterBar}
          />
        </View>

        {/* Sante List */}
        <FlatList
          data={filteredTraitements}
          keyExtractor={(item) => item.id}
          renderItem={renderSanteItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun traitement trouvé.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
