import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useRabbitStore } from '../../lib/rabbitStore';
import { useReproductionStore } from '../../lib/reproductionStore';
import { useFinanceStore } from '../../lib/financeStore';
import { useSanteStore } from '../../lib/santeStore';
import { useAlerteStore } from '../../lib/alerteStore';
import StatCard from '../../components/StatCard';
import { Users, HeartPulse, Baby, ClipboardPlus, ShieldAlert, Plus, Layers, Settings, CalendarRange } from 'lucide-react-native';
import { differenceInDays, isPast, isToday, isTomorrow } from 'date-fns';

export default function Dashboard() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { reproducteurs } = useRabbitStore();
  const { saillies, portees } = useReproductionStore();
  const { depenses, recettes } = useFinanceStore();
  const { traitements } = useSanteStore();
  const { alertes } = useAlerteStore();

  // Comptages rapides
  const totalCheptel = reproducteurs.length;
  const malesCount = reproducteurs.filter(r => r.sexe === 'male' && r.statut !== 'reforme' && r.statut !== 'decede').length;
  const femellesCount = reproducteurs.filter(r => r.sexe === 'femelle' && r.statut !== 'reforme' && r.statut !== 'decede').length;

  const sailliesEnAttente = saillies.filter(s => s.statut === 'enregistree' || s.statut === 'en_attente').length;
  const porteesEnCours = portees.filter(p => p.statut === 'nee' || p.statut === 'en_cours' || p.statut === 'a_surveiller' || p.statut === 'a_sevrer').length;

  // Calculs finance
  const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);
  const totalRecettes = recettes.reduce((sum, r) => sum + r.montant, 0);
  const solde = totalRecettes - totalDepenses;

  // Suivi Sanitaire
  const statsSante = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      aFaire: traitements.filter(t => {
        const d = new Date(t.datePrevue);
        d.setHours(0,0,0,0);
        return (t.statut === 'À faire' || t.statut === 'Programmé') && isToday(d);
      }).length,
      enCours: traitements.filter(t => t.statut === 'En cours').length,
      enRetard: traitements.filter(t => {
        const d = new Date(t.datePrevue);
        d.setHours(0,0,0,0);
        return (t.statut === 'À faire' || t.statut === 'Programmé') && isPast(d) && !isToday(d);
      }).length,
    };
  }, [traitements]);

  // Tâches et alertes imminentes
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    date.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0,0,0,0);

    if (isToday(date)) return "Aujourd'hui";
    if (isTomorrow(date)) return "Demain";
    if (isPast(date)) {
      const diff = differenceInDays(today, date);
      return `En retard de ${diff}j`;
    }
    const diff = differenceInDays(date, today);
    return `Dans ${diff}j`;
  };

  const tasks = useMemo(() => {
    let list: { id: string; text: string; date: Date; type: string }[] = [];
    const getRabbitCode = (id: string) => reproducteurs.find(r => r.id === id)?.code || "Inconnu";

    saillies.forEach(s => {
      const codeFemelle = getRabbitCode(s.femelleId);
      if (s.statut === 'enregistree' || s.statut === 'en_attente') {
        list.push({ id: `ctrl-${s.id}`, text: `Palpation - ${codeFemelle}`, date: new Date(s.dateControle), type: 'controle' });
      }
      if (s.statut === 'confirmee') {
        list.push({ id: `prep-${s.id}`, text: `Boîte à nid - ${codeFemelle}`, date: new Date(s.datePreparation), type: 'preparation' });
        list.push({ id: `mb-${s.id}`, text: `Mise bas - ${codeFemelle}`, date: new Date(s.dateMiseBasPrevue), type: 'mise_bas' });
      }
    });

    portees.forEach(p => {
      if (p.statut !== 'sevree' && p.statut !== 'cloturee') {
        list.push({ id: `sev-${p.id}`, text: `Sevrage - Portée ${p.code}`, date: new Date(p.dateSevragePrevue), type: 'sevrage' });
      }
    });

    traitements.forEach(t => {
      if (t.statut === 'À faire' || t.statut === 'Programmé') {
        list.push({ id: `trt-${t.id}`, text: `${t.typeAction} - ${t.sujetNom || 'Sujet'}`, date: new Date(t.datePrevue), type: 'sante' });
      }
    });

    // Trier par date
    list.sort((a, b) => a.date.getTime() - b.date.getTime());
    return list.slice(0, 5);
  }, [saillies, portees, traitements, reproducteurs]);

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
      marginBottom: 24,
    },
    welcomeText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontFamily: 'System',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    titleText: {
      color: colors.textPrimary,
      fontSize: 26,
      fontWeight: 'bold',
      marginTop: 2,
    },
    kpiContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -6,
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      marginTop: 8,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontFamily: 'System',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    linkText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 12,
      height: 80,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 4,
    },
    actionText: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 8,
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 20,
      padding: 16,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    financeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    financeValue: {
      fontSize: 22,
      fontWeight: 'bold',
      marginTop: 4,
    },
    subFinanceContainer: {
      flexDirection: 'row',
      borderTopColor: colors.surfaceBorder,
      borderTopWidth: 1,
      marginTop: 12,
      paddingTop: 12,
    },
    subFinanceCol: {
      flex: 1,
    },
    subFinanceTitle: {
      color: colors.textSecondary,
      fontSize: 10,
      textTransform: 'uppercase',
      fontWeight: '600',
    },
    subFinanceValue: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: 'bold',
      marginTop: 2,
    },
    taskItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    taskIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    taskContent: {
      flex: 1,
    },
    taskTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    taskTime: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 13,
      textAlign: 'center',
      paddingVertical: 16,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Vue d'ensemble</Text>
            <Text style={styles.titleText}>Tableau de bord</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/parametres')} activeOpacity={0.7}>
            <Settings size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiContainer}>
          <StatCard
            title="Cheptel"
            value={totalCheptel}
            subtitle={`${malesCount} Mâles / ${femellesCount} Femelles`}
            icon={<Users size={18} color={colors.textSecondary} />}
            colorType="primary"
          />
          <StatCard
            title="Saillies en cours"
            value={sailliesEnAttente}
            icon={<HeartPulse size={18} color={colors.secondary} />}
            colorType="secondary"
          />
          <StatCard
            title="Portées actives"
            value={porteesEnCours}
            subtitle="Mises bas en suivi"
            icon={<Baby size={18} color={colors.tertiary} />}
            colorType="tertiary"
          />
        </View>


        {/* Suivi Sanitaire */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suivi sanitaire</Text>
          <TouchableOpacity onPress={() => router.push('/sante')} activeOpacity={0.7}>
            <Text style={styles.linkText}>Voir détails</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.kpiContainer, { marginBottom: 12 }]}>
          <StatCard
            title="À faire ajd"
            value={statsSante.aFaire}
            icon={<ClipboardPlus size={14} color={colors.primary} />}
            colorType="primary"
          />
          <StatCard
            title="En retard"
            value={statsSante.enRetard}
            icon={<ShieldAlert size={14} color={colors.error} />}
            colorType="tertiary"
          />
        </View>

        {/* Comptabilité */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Comptabilité</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.financeRow}>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Solde actuel</Text>
              <Text style={[styles.financeValue, { color: solde >= 0 ? colors.secondary : colors.error }]}>
                {solde >= 0 ? '+' : ''}{solde.toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          </View>
          <View style={styles.subFinanceContainer}>
            <View style={styles.subFinanceCol}>
              <Text style={styles.subFinanceTitle}>Recettes</Text>
              <Text style={[styles.subFinanceValue, { color: colors.secondary }]}>
                {totalRecettes.toLocaleString('fr-FR')} F
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.surfaceBorder, marginHorizontal: 12 }} />
            <View style={styles.subFinanceCol}>
              <Text style={styles.subFinanceTitle}>Dépenses</Text>
              <Text style={[styles.subFinanceValue, { color: colors.error }]}>
                {totalDepenses.toLocaleString('fr-FR')} F
              </Text>
            </View>
          </View>
        </View>

        {/* Tâches imminentes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tâches imminentes</Text>
          <TouchableOpacity onPress={() => router.push('/alertes')} activeOpacity={0.7}>
            <Text style={styles.linkText}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.card, { paddingVertical: 8, marginBottom: 40 }]}>
          {tasks.map((task) => (
            <View key={task.id} style={styles.taskItem}>
              <View style={styles.taskIconContainer}>
                {task.type === 'controle' ? (
                  <ClipboardPlus size={16} color={colors.primary} />
                ) : task.type === 'sevrage' ? (
                  <Baby size={16} color={colors.tertiary} />
                ) : task.type === 'sante' ? (
                  <Plus size={16} color={colors.primary} />
                ) : (
                  <HeartPulse size={16} color={colors.secondary} />
                )}
              </View>
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>{task.text}</Text>
                <Text style={styles.taskTime}>{getRelativeTime(task.date.toISOString())}</Text>
              </View>
            </View>
          ))}
          {tasks.length === 0 && (
            <Text style={styles.emptyText}>Aucune tâche imminente.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
