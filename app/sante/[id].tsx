import React, { useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useSanteStore } from '../../lib/santeStore';
import { ArrowLeft, Edit3, Trash2, CheckCircle, Calendar, Shield, Clock, AlertTriangle, ArrowRight } from 'lucide-react-native';
import { format } from 'date-fns';
import type { StatutTraitement, ResultatTraitement } from '../../types';

export default function FicheTraitementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { traitements, updateTraitement, deleteTraitement } = useSanteStore();

  const traitement = useMemo(() => {
    return traitements.find((t) => t.id === id);
  }, [traitements, id]);

  if (!traitement) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Traitement introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary }}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const handleStatutChange = async (statut: StatutTraitement) => {
    try {
      await updateTraitement(traitement.id, { statut });
      Alert.alert('Statut mis à jour', `Le statut du traitement est maintenant : ${statut}`);
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
    }
  };

  const handleMarkAsDone = async () => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await updateTraitement(traitement.id, {
        statut: 'Fait',
        dateRealisation: today,
        resultatObserve: 'Aucun changement observé',
      });
      Alert.alert('Succès', 'Le traitement a été marqué comme FAIT aujourd\'hui.');
    } catch (e) {
      console.error(e);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la réalisation.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le traitement',
      'Voulez-vous vraiment supprimer ce traitement de l\'historique ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteTraitement(traitement.id);
            router.back();
          },
        },
      ]
    );
  };

  const navigateToSubject = () => {
    if (!traitement.sujetId) return;
    if (traitement.sujetType === 'Reproducteur') {
      router.push(`/reproducteur/${traitement.sujetId}`);
    } else if (traitement.sujetType === 'Portee') {
      router.push(`/portee/${traitement.sujetId}`);
    }
  };

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
      case 'Annulé':
        return { bg: colors.surfaceVariant, text: colors.textSecondary, border: colors.surfaceBorder };
      default:
        return { bg: colors.surfaceVariant, text: colors.textSecondary, border: colors.surfaceBorder };
    }
  };

  const badge = getStatusBadgeStyles(traitement.statut);

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
      marginBottom: 20,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
    },
    headerActions: {
      flexDirection: 'row',
      gap: 12,
    },
    actionIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    cardHeader: {
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
      paddingBottom: 12,
      marginBottom: 12,
    },
    sujetTypeLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sujetNomRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    sujetNom: {
      color: colors.primary,
      fontSize: 22,
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
    actionTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: 'bold',
    },
    actionSubtitle: {
      color: colors.secondary,
      fontSize: 14,
      fontWeight: '600',
      marginTop: 2,
    },
    gridDates: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 16,
    },
    dateBox: {
      flex: 1,
      backgroundColor: colors.background,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
    },
    dateLabel: {
      color: colors.textSecondary,
      fontSize: 9,
      textTransform: 'uppercase',
      fontWeight: '600',
    },
    dateValue: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 4,
    },
    specsGrid: {
      flexDirection: 'row',
      borderTopColor: colors.surfaceBorder,
      borderTopWidth: 1,
      borderBottomColor: colors.surfaceBorder,
      borderBottomWidth: 1,
      paddingVertical: 12,
      marginTop: 16,
    },
    specCol: {
      flex: 1,
      alignItems: 'center',
    },
    specLabel: {
      color: colors.textSecondary,
      fontSize: 9,
      textTransform: 'uppercase',
    },
    specValue: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
      marginTop: 2,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
      textTransform: 'uppercase',
      marginTop: 16,
      marginBottom: 6,
    },
    sectionContent: {
      backgroundColor: colors.background,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      color: colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
    },
    rappelBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.statusBreeding + '15',
      borderColor: colors.statusBreeding + '40',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginTop: 16,
    },
    rappelLabel: {
      color: colors.statusBreeding,
      fontSize: 13,
      fontWeight: '600',
    },
    rappelDate: {
      color: colors.statusBreeding,
      fontSize: 13,
      fontWeight: '700',
    },
    bottomActions: {
      marginTop: 8,
      marginBottom: 40,
      gap: 12,
    },
    btnDone: {
      backgroundColor: colors.secondary,
      borderRadius: 10,
      height: 48,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnDoneText: {
      color: colors.onSecondary,
      fontWeight: 'bold',
      fontSize: 14,
      marginLeft: 8,
    },
    btnRenewal: {
      backgroundColor: colors.statusBreeding,
      borderRadius: 10,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnRenewalText: {
      color: '#382D00',
      fontWeight: 'bold',
      fontSize: 14,
    },
    rowButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    rowActionBtn: {
      flex: 1,
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 10,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    rowActionText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    subjectLinkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginTop: 8,
    },
    subjectLinkText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.backRow}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }} activeOpacity={0.7}>
              <ArrowLeft size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Fiche Santé</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => router.push(`/sante/edit/${traitement.id}`)}
              activeOpacity={0.7}
            >
              <Edit3 size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={handleDelete} activeOpacity={0.7}>
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Card principale */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sujetTypeLabel}>{traitement.sujetType}</Text>
              <View style={styles.sujetNomRow}>
                <Text style={styles.sujetNom}>{traitement.sujetNom || traitement.sujetId}</Text>
                <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{traitement.statut}</Text>
                </View>
              </View>

              {/* Lien vers le sujet si Reproducteur ou Portée */}
              {((traitement.sujetType === 'Reproducteur' || traitement.sujetType === 'Portee') && traitement.sujetId) && (
                <TouchableOpacity style={styles.subjectLinkBtn} onPress={navigateToSubject} activeOpacity={0.7}>
                  <Text style={styles.subjectLinkText}>
                    Consulter la fiche du sujet ({traitement.sujetType === 'Reproducteur' ? 'Reproducteur' : 'Portée'})
                  </Text>
                  <ArrowRight size={14} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Infos produit et type */}
            <View>
              <Text style={styles.actionTitle}>{traitement.nomProduit}</Text>
              <Text style={styles.actionSubtitle}>{traitement.typeAction}</Text>
            </View>

            {/* Dates prévues / réelles */}
            <View style={styles.gridDates}>
              <View style={styles.dateBox}>
                <Text style={styles.dateLabel}>Planifié pour le</Text>
                <Text style={styles.dateValue}>
                  {format(new Date(traitement.datePrevue), 'dd/MM/yyyy')}
                </Text>
              </View>
              <View style={styles.dateBox}>
                <Text style={styles.dateLabel}>Réalisé le</Text>
                {traitement.dateRealisation ? (
                  <Text style={[styles.dateValue, { color: colors.secondary }]}>
                    {format(new Date(traitement.dateRealisation), 'dd/MM/yyyy')}
                    {traitement.heure ? ` à ${traitement.heure}` : ''}
                  </Text>
                ) : (
                  <Text style={[styles.dateValue, { color: colors.textSecondary, fontStyle: 'italic', fontWeight: 'normal' }]}>
                    Non réalisé
                  </Text>
                )}
              </View>
            </View>

            {/* Specs: Dose, Frequence, Duree */}
            {(traitement.dose || traitement.frequence || traitement.duree) && (
              <View style={styles.specsGrid}>
                <View style={styles.specCol}>
                  <Text style={styles.specLabel}>Dose</Text>
                  <Text style={styles.specValue}>{traitement.dose || '-'}</Text>
                </View>
                <View style={[styles.specCol, { borderLeftWidth: 1, borderLeftColor: colors.surfaceBorder }]}>
                  <Text style={styles.specLabel}>Fréquence</Text>
                  <Text style={styles.specValue}>{traitement.frequence || '-'}</Text>
                </View>
                <View style={[styles.specCol, { borderLeftWidth: 1, borderLeftColor: colors.surfaceBorder }]}>
                  <Text style={styles.specLabel}>Durée</Text>
                  <Text style={styles.specValue}>{traitement.duree || '-'}</Text>
                </View>
              </View>
            )}

            {/* Prochain rappel */}
            {traitement.prochainRappel && (
              <View style={styles.rappelBox}>
                <Text style={styles.rappelLabel}>Prochain rappel prévu</Text>
                <Text style={styles.rappelDate}>
                  {format(new Date(traitement.prochainRappel), 'dd/MM/yyyy')}
                </Text>
              </View>
            )}

            {/* Objectif */}
            {traitement.objectif && (
              <View>
                <Text style={styles.sectionTitle}>Objectif</Text>
                <Text style={styles.sectionContent}>{traitement.objectif}</Text>
              </View>
            )}

            {/* Observations */}
            {traitement.observation && (
              <View>
                <Text style={styles.sectionTitle}>Observations</Text>
                <Text style={styles.sectionContent}>{traitement.observation}</Text>
              </View>
            )}

            {/* Résultat observé */}
            {(traitement.resultatObserve && traitement.dateRealisation) && (
              <View>
                <Text style={styles.sectionTitle}>Résultat observé</Text>
                <Text style={[styles.sectionContent, { fontWeight: '700', color: colors.secondary }]}>
                  {traitement.resultatObserve}
                </Text>
              </View>
            )}
          </View>

          {/* Actions de changement de statut */}
          <View style={styles.bottomActions}>
            {traitement.statut !== 'Fait' && traitement.statut !== 'Terminé' && (
              <TouchableOpacity style={styles.btnDone} onPress={handleMarkAsDone} activeOpacity={0.7}>
                <CheckCircle size={18} color={colors.onSecondary} />
                <Text style={styles.btnDoneText}>Marquer comme fait aujourd'hui</Text>
              </TouchableOpacity>
            )}

            {traitement.statut === 'Fait' && (
              <TouchableOpacity
                style={styles.btnRenewal}
                onPress={() => handleStatutChange('À renouveler')}
                activeOpacity={0.7}
              >
                <Text style={styles.btnRenewalText}>Indiquer à renouveler</Text>
              </TouchableOpacity>
            )}

            <View style={styles.rowButtons}>
              {traitement.statut !== 'En cours' && traitement.statut !== 'Programmé' && (
                <TouchableOpacity
                  style={styles.rowActionBtn}
                  onPress={() => handleStatutChange('En cours')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowActionText}>Passer "En cours"</Text>
                </TouchableOpacity>
              )}
              {traitement.statut !== 'Annulé' && (
                <TouchableOpacity
                  style={styles.rowActionBtn}
                  onPress={() => handleStatutChange('Annulé')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.rowActionText}>Annuler</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
