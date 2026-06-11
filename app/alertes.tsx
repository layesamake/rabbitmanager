import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../lib/theme';
import { useReproductionStore } from '../lib/reproductionStore';
import { useRabbitStore } from '../lib/rabbitStore';
import { useSanteStore } from '../lib/santeStore';
import { ArrowLeft, ClipboardPlus, Flame, HeartPulse, Baby, Info, Plus } from 'lucide-react-native';
import { format, isPast, isToday, isTomorrow, addDays, differenceInDays } from 'date-fns';

type AlerteUi = {
  id: string;
  titre: string;
  type: 'controle' | 'preparation' | 'mise_bas' | 'sevrage' | 'sante';
  date: Date;
  url: string;
  criticite: 'haute' | 'moyenne';
};

export default function AlertesScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { reproducteurs } = useRabbitStore();
  const { saillies, portees } = useReproductionStore();
  const { traitements } = useSanteStore();

  const [filterCriticite, setFilterCriticite] = useState<string>('toutes');
  const [filterType, setFilterType] = useState<string>('tous');

  const getRabbitCode = (id: string) => reproducteurs.find((r) => r.id === id)?.code || 'Inconnu';

  // Calculer la liste des alertes
  const alertes: AlerteUi[] = useMemo(() => {
    let list: AlerteUi[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    // 1. Saillies
    saillies.forEach((s) => {
      const codeFemelle = getRabbitCode(s.femelleId);
      if (s.statut === 'enregistree' || s.statut === 'en_attente') {
        const d = new Date(s.dateControle);
        d.setHours(0,0,0,0);
        list.push({
          id: `controle-${s.id}`,
          titre: `Contrôle palpation - ${codeFemelle}`,
          type: 'controle',
          date: new Date(s.dateControle),
          url: `/saillie/${s.id}`,
          criticite: isPast(d) ? 'haute' : 'moyenne',
        });
      }
      if (s.statut === 'confirmee') {
        const dPrep = new Date(s.datePreparation);
        dPrep.setHours(0,0,0,0);
        list.push({
          id: `prepa-${s.id}`,
          titre: `Mise en place nid - ${codeFemelle}`,
          type: 'preparation',
          date: new Date(s.datePreparation),
          url: `/saillie/${s.id}`,
          criticite: isPast(dPrep) ? 'haute' : 'moyenne',
        });

        const dMB = new Date(s.dateMiseBasPrevue);
        dMB.setHours(0,0,0,0);
        list.push({
          id: `misebas-${s.id}`,
          titre: `Mise bas prévue - ${codeFemelle}`,
          type: 'mise_bas',
          date: new Date(s.dateMiseBasPrevue),
          url: `/saillie/${s.id}`,
          criticite: isPast(dMB) ? 'haute' : 'moyenne',
        });
      }
    });

    // 2. Portées (Sevrage)
    portees.forEach((p) => {
      if (p.statut !== 'sevree' && p.statut !== 'cloturee') {
        const dSev = new Date(p.dateSevragePrevue);
        dSev.setHours(0,0,0,0);
        list.push({
          id: `sevrage-${p.id}`,
          titre: `Sevrage portée ${p.code}`,
          type: 'sevrage',
          date: new Date(p.dateSevragePrevue),
          url: `/portee/${p.id}`,
          criticite: isPast(dSev) ? 'haute' : 'moyenne',
        });
      }
    });

    // 3. Traitements (Santé)
    traitements.forEach((t) => {
      if (t.statut === 'À faire' || t.statut === 'Programmé') {
        const dPrev = new Date(t.datePrevue);
        dPrev.setHours(0,0,0,0);
        list.push({
          id: `sante-${t.id}`,
          titre: `${t.typeAction} - ${t.sujetNom || 'Sujet'}`,
          type: 'sante',
          date: new Date(t.datePrevue),
          url: `/sante/${t.id}`,
          criticite: isPast(dPrev) && !isToday(dPrev) ? 'haute' : 'moyenne',
        });
      }
    });

    // Trier par date
    list.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Garder seulement les alertes passées ou dans les 7 prochains jours
    const in7Days = addDays(new Date(), 7);
    return list.filter((a) => a.date <= in7Days);
  }, [saillies, portees, reproducteurs, traitements]);

  // Filtrage
  const filteredAlertes = useMemo(() => {
    let copy = [...alertes];
    if (filterCriticite !== 'toutes') {
      copy = copy.filter((a) => a.criticite === filterCriticite);
    }
    if (filterType !== 'tous') {
      copy = copy.filter((a) => a.type === filterType);
    }
    return copy;
  }, [alertes, filterCriticite, filterType]);

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'controle':
        return <ClipboardPlus size={18} color={colors.primary} />;
      case 'preparation':
        return <Flame size={18} color={colors.secondary} />;
      case 'mise_bas':
        return <HeartPulse size={18} color={colors.tertiary} />;
      case 'sevrage':
        return <Baby size={18} color={colors.primary} />;
      case 'sante':
        return <Plus size={18} color={colors.primary} />;
      default:
        return <Info size={18} color={colors.textSecondary} />;
    }
  };

  const getRelativeTime = (date: Date) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const d = new Date(date);
    d.setHours(0,0,0,0);

    if (isToday(d)) return "Aujourd'hui";
    if (isTomorrow(d)) return 'Demain';
    if (isPast(d)) {
      const diff = differenceInDays(today, d);
      return `En retard de ${diff}j`;
    }
    const diff = differenceInDays(d, today);
    return `Dans ${diff}j`;
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
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 20,
    },
    backButton: {
      marginRight: 16,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
    },
    filtersRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    filterBtn: {
      flex: 1,
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterBtnText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    highPriorityCard: {
      backgroundColor: colors.error + '10',
      borderColor: colors.error + '30',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    cardContent: {
      flex: 1,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      flex: 1,
      marginRight: 8,
    },
    relativeTime: {
      fontSize: 9,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      borderRadius: 4,
      borderWidth: 1,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    cardDate: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 4,
      fontFamily: 'System',
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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Tâches Planifiées</Text>
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => {
              Alert.alert(
                'Filtrer par urgence',
                'Sélectionnez une priorité :',
                [
                  { text: 'Toutes', onPress: () => setFilterCriticite('toutes') },
                  { text: 'Haute (En retard)', onPress: () => setFilterCriticite('haute') },
                  { text: 'Moyenne (À venir)', onPress: () => setFilterCriticite('moyenne') },
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.filterBtnText}>
              Priorité: {filterCriticite === 'toutes' ? 'Toutes' : filterCriticite}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => {
              Alert.alert(
                'Filtrer par type',
                'Sélectionnez un type de tâche :',
                [
                  { text: 'Tous', onPress: () => setFilterType('tous') },
                  { text: 'Contrôle palpation', onPress: () => setFilterType('controle') },
                  { text: 'Préparation nid', onPress: () => setFilterType('preparation') },
                  { text: 'Mise bas', onPress: () => setFilterType('mise_bas') },
                  { text: 'Sevrage', onPress: () => setFilterType('sevrage') },
                  { text: 'Santé', onPress: () => setFilterType('sante') },
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.filterBtnText}>
              Type: {filterType === 'tous' ? 'Tous' : filterType.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Alert List */}
        <FlatList
          data={filteredAlertes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isHigh = item.criticite === 'haute';
            return (
              <TouchableOpacity
                style={[styles.card, isHigh && styles.highPriorityCard]}
                onPress={() => router.push(item.url as any)}
                activeOpacity={0.7}
              >
                <View style={styles.iconContainer}>{getAlertIcon(item.type)}</View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.titre}
                    </Text>
                    <Text
                      style={[
                        styles.relativeTime,
                        {
                          color: isHigh ? colors.error : colors.textSecondary,
                          borderColor: isHigh ? colors.error + '40' : colors.surfaceBorder,
                          backgroundColor: isHigh ? colors.error + '10' : colors.surfaceVariant,
                        }
                      ]}
                    >
                      {getRelativeTime(item.date)}
                    </Text>
                  </View>
                  <Text style={styles.cardDate}>
                    Date d'échéance : {format(item.date, 'dd/MM/yyyy')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune tâche pour les critères sélectionnés.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}
