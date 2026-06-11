import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useReproductionStore } from '../../lib/reproductionStore';
import { useRabbitStore } from '../../lib/rabbitStore';
import { Plus, Calendar, Check, X, AlertCircle } from 'lucide-react-native';
import { format } from 'date-fns';

type SubTab = 'saillies' | 'portees';
type SaillieFilter = 'toutes' | 'en_attente' | 'confirmee' | 'echec';
type PorteeFilter = 'toutes' | 'en_cours' | 'sevree' | 'cloturee';

export default function ReproductionHub() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { reproducteurs } = useRabbitStore();
  const { saillies, portees } = useReproductionStore();

  const [activeTab, setActiveTab] = useState<SubTab>('saillies');
  const [saillieFilter, setSaillieFilter] = useState<SaillieFilter>('toutes');
  const [porteeFilter, setPorteeFilter] = useState<PorteeFilter>('toutes');

  const getRabbitCode = (id: string) => {
    const r = reproducteurs.find((x) => x.id === id);
    if (!r) return '?';
    return r.nom ? `${r.nom} (${r.code})` : r.code;
  };

  const getRabbitCodeShort = (id: string) => {
    const r = reproducteurs.find((x) => x.id === id);
    return r ? r.code : '?';
  };

  // Filtrer les saillies
  const filteredSaillies = saillies.filter((s) => {
    if (saillieFilter === 'en_attente' && s.statut !== 'en_attente' && s.statut !== 'enregistree') return false;
    if (saillieFilter === 'confirmee' && s.statut !== 'confirmee') return false;
    if (saillieFilter === 'echec' && s.statut !== 'echec' && s.statut !== 'non_confirmee' && s.statut !== 'annulee') return false;
    return true;
  });

  // Filtrer les portées
  const filteredPortees = portees.filter((p) => {
    if (porteeFilter === 'en_cours' && p.statut !== 'nee' && p.statut !== 'en_cours' && p.statut !== 'a_surveiller' && p.statut !== 'a_sevrer') return false;
    if (porteeFilter === 'sevree' && p.statut !== 'sevree') return false;
    if (porteeFilter === 'cloturee' && p.statut !== 'cloturee') return false;
    return true;
  });

  const getSaillieBadgeColors = (statut: string) => {
    switch (statut) {
      case 'confirmee':
        return { bg: colors.secondary + '20', text: colors.secondary };
      case 'enregistree':
      case 'en_attente':
        return { bg: colors.statusBreeding + '20', text: colors.statusBreeding };
      case 'echec':
      case 'non_confirmee':
      case 'annulee':
        return { bg: colors.error + '20', text: colors.error };
      default:
        return { bg: colors.surfaceVariant, text: colors.textSecondary };
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
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 4,
      marginBottom: 16,
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
      marginBottom: 12,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dateText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontFamily: 'System',
      fontWeight: '600',
      marginLeft: 6,
    },
    badge: {
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    reproRow: {
      marginVertical: 4,
    },
    reproLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    reproValue: {
      fontSize: 15,
      fontWeight: '700',
      marginTop: 2,
    },
    cardAlert: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.statusBreeding + '10',
      borderColor: colors.statusBreeding + '30',
      borderWidth: 1,
      borderRadius: 8,
      padding: 8,
      marginTop: 8,
    },
    cardAlertText: {
      color: colors.statusBreeding,
      fontSize: 11,
      fontWeight: '600',
      marginLeft: 6,
    },
    porteeAlert: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 10,
      borderTopColor: colors.surfaceBorder,
      borderTopWidth: 1,
      paddingTop: 8,
    },
    buttonRow: {
      flexDirection: 'row',
      marginTop: 12,
      gap: 8,
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    primaryBtnText: {
      color: colors.onPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    secondaryBtn: {
      flex: 1,
      backgroundColor: colors.secondary,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    secondaryBtnText: {
      color: colors.onSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    outlineBtn: {
      flex: 1,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: 'center',
    },
    outlineBtnText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    porteeStatsGrid: {
      flexDirection: 'row',
      borderColor: colors.surfaceBorder,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      marginVertical: 10,
      paddingVertical: 10,
    },
    porteeStatCol: {
      flex: 1,
      alignItems: 'center',
    },
    porteeStatLabel: {
      color: colors.textSecondary,
      fontSize: 9,
      textTransform: 'uppercase',
    },
    porteeStatVal: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 2,
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

  const renderSaillieItem = ({ item }: { item: any }) => {
    const badge = getSaillieBadgeColors(item.statut);
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/saillie/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.dateRow}>
            <Calendar size={14} color={colors.textSecondary} />
            <Text style={styles.dateText}>
              {format(new Date(item.dateSaillie), 'dd/MM/yyyy')}
            </Text>
            {item.type && (
              <Text style={{ fontSize: 10, backgroundColor: colors.surfaceVariant, color: colors.textSecondary, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, marginLeft: 8, overflow: 'hidden' }}>
                {item.type}
              </Text>
            )}
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>
              {item.statut.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.reproRow}>
          <Text style={styles.reproLabel}>Femelle</Text>
          <Text style={[styles.reproValue, { color: colors.primary }]}>
            {getRabbitCode(item.femelleId)}
          </Text>
        </View>

        <View style={styles.reproRow}>
          <Text style={styles.reproLabel}>Mâle(s)</Text>
          <Text style={[styles.reproValue, { color: colors.secondary }]}>
            {item.maleIds.map(getRabbitCodeShort).join(', ')}
          </Text>
        </View>

        {item.statut === 'confirmee' && (
          <View style={[styles.cardAlert, { backgroundColor: colors.secondary + '10', borderColor: colors.secondary + '30' }]}>
            <Calendar size={14} color={colors.secondary} />
            <Text style={[styles.cardAlertText, { color: colors.secondary }]}>
              Mise bas prévue : {format(new Date(item.dateMiseBasPrevue), 'dd/MM/yyyy')}
            </Text>
          </View>
        )}

        {(item.statut === 'enregistree' || item.statut === 'en_attente') && (
          <View style={styles.cardAlert}>
            <AlertCircle size={14} color={colors.statusBreeding} />
            <Text style={styles.cardAlertText}>
              Contrôle palpation : {format(new Date(item.dateControle), 'dd/MM/yyyy')}
            </Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          {(item.statut === 'enregistree' || item.statut === 'en_attente') && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push(`/saillie/${item.id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryBtnText}>Palper</Text>
            </TouchableOpacity>
          )}
          {item.statut === 'confirmee' && (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push(`/portee/new?saillieId=${item.id}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryBtnText}>Mise bas</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => router.push(`/saillie/${item.id}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.outlineBtnText}>Détails</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPorteeItem = ({ item }: { item: any }) => {
    const isEnCours = item.statut !== 'sevree' && item.statut !== 'cloturee';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/portee/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' }}>
            <Text style={{ color: colors.secondary }}>{getRabbitCodeShort(item.femelleId)}</Text>
            <Text style={{ color: colors.textSecondary }}> / </Text>
            <Text style={{ fontFamily: 'System' }}>{item.code}</Text>
          </Text>
          <View style={[styles.badge, { backgroundColor: isEnCours ? colors.secondary + '20' : colors.primary + '20' }]}>
            <Text style={[styles.badgeText, { color: isEnCours ? colors.secondary : colors.primary }]}>
              {item.statut.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
          Née le {format(new Date(item.dateMiseBas), 'dd/MM/yyyy')}
        </Text>

        <View style={styles.porteeStatsGrid}>
          <View style={styles.porteeStatCol}>
            <Text style={styles.porteeStatLabel}>Nés</Text>
            <Text style={styles.porteeStatVal}>{item.totalNes}</Text>
          </View>
          <View style={[styles.porteeStatCol, { borderLeftColor: colors.surfaceBorder, borderLeftWidth: 1 }]}>
            <Text style={[styles.porteeStatLabel, { color: colors.secondary }]}>Vivants</Text>
            <Text style={[styles.porteeStatVal, { color: colors.secondary }]}>{item.vivantsActuels}</Text>
          </View>
          <View style={[styles.porteeStatCol, { borderLeftColor: colors.surfaceBorder, borderLeftWidth: 1 }]}>
            <Text style={[styles.porteeStatLabel, { color: colors.error }]}>Pertes</Text>
            <Text style={[styles.porteeStatVal, { color: colors.error }]}>
              {item.totalNes - item.vivantsActuels}
            </Text>
          </View>
        </View>

        {isEnCours && (
          <View style={styles.porteeAlert}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Sevrage prévu :</Text>
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>
              {format(new Date(item.dateSevragePrevue), 'dd/MM/yyyy')}
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
          <Text style={styles.title}>Reproduction</Text>
        </View>

        {/* Tab switch */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'saillies' && styles.activeTabButton]}
            onPress={() => setActiveTab('saillies')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'saillies' && styles.activeTabButtonText]}>
              Saillies
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'portees' && styles.activeTabButton]}
            onPress={() => setActiveTab('portees')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabButtonText, activeTab === 'portees' && styles.activeTabButtonText]}>
              Portées
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filters and List */}
        {activeTab === 'saillies' ? (
          <>
            <View style={{ height: 40 }}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[
                  { type: 'toutes', label: 'Toutes' },
                  { type: 'en_attente', label: 'En attente' },
                  { type: 'confirmee', label: 'Confirmées' },
                  { type: 'echec', label: 'Échecs' },
                ]}
                keyExtractor={(item) => item.type}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.chip, saillieFilter === item.type && styles.activeChip]}
                    onPress={() => setSaillieFilter(item.type as SaillieFilter)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, saillieFilter === item.type && styles.activeChipText]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.filterBar}
              />
            </View>

            <FlatList
              data={filteredSaillies}
              keyExtractor={(item) => item.id}
              renderItem={renderSaillieItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Aucune saillie trouvée.</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : (
          <>
            <View style={{ height: 40 }}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[
                  { type: 'toutes', label: 'Toutes' },
                  { type: 'en_cours', label: 'En cours' },
                  { type: 'sevree', label: 'Sevrées' },
                  { type: 'cloturee', label: 'Clôturées' },
                ]}
                keyExtractor={(item) => item.type}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.chip, porteeFilter === item.type && styles.activeChip]}
                    onPress={() => setPorteeFilter(item.type as PorteeFilter)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, porteeFilter === item.type && styles.activeChipText]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.filterBar}
              />
            </View>

            <FlatList
              data={filteredPortees}
              keyExtractor={(item) => item.id}
              renderItem={renderPorteeItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Aucune portée trouvée.</Text>
                </View>
              }
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}


      </View>
    </SafeAreaView>
  );
}
