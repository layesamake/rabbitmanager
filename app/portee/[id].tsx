import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useReproductionStore } from '../../lib/reproductionStore';
import { useRabbitStore } from '../../lib/rabbitStore';
import { useAlerteStore } from '../../lib/alerteStore';
import SanteHistory from '../../components/SanteHistory';
import FormInput from '../../components/FormInput';
import { ArrowLeft, Edit3, Trash2, Check, X, AlertTriangle, CheckCircle, ArrowLeftRight, Calendar, Baby, Tag } from 'lucide-react-native';
import { format, differenceInDays } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const porteeEditSchema = z.object({
  dateMiseBas: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise au format AAAA-MM-JJ'),
  totalNes: z.number().min(0),
  mortsNes: z.number().min(0),
  observation: z.string().optional(),
});

type PorteeEditFormValues = z.infer<typeof porteeEditSchema>;

export default function FichePorteeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { portees, updatePortee, deletePortee, mortalites, addMortalite, deleteMortalite } = useReproductionStore();
  const { reproducteurs, updateReproducteur } = useRabbitStore();
  const { parametres } = useAlerteStore();

  const breedingParams = parametres || {
    joursAvantControle: 14,
    joursAvantPreparation: 27,
    dureeGestation: 31,
    ageSevrage: 35,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [actionPane, setActionPane] = useState<'none' | 'perte' | 'adoption' | 'sevrage'>('none');

  // États des formulaires d'actions rapides
  const [pertesCount, setPertesCount] = useState('1');
  const [perteCause, setPerteCause] = useState('');
  const [perteDate, setPerteDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [adoptionCount, setAdoptionCount] = useState('1');
  const [adoptionType, setAdoptionType] = useState<'in' | 'out'>('in');

  const [vivantsSevres, setVivantsSevres] = useState('0');
  const [destination, setDestination] = useState<'engraissement' | 'reproducteurs' | 'autre'>('engraissement');

  const portee = useMemo(() => {
    return portees.find((p) => p.id === id);
  }, [portees, id]);

  const femelle = useMemo(() => {
    return portee ? reproducteurs.find((r) => r.id === portee.femelleId) : null;
  }, [reproducteurs, portee]);

  const porteeMortalites = useMemo(() => {
    return mortalites.filter((m) => m.porteeId === id);
  }, [mortalites, id]);

  // Formulaire d'édition principale
  const { control, handleSubmit, reset, formState: { errors } } = useForm<PorteeEditFormValues>({
    resolver: zodResolver(porteeEditSchema),
  });

  useEffect(() => {
    if (portee) {
      reset({
        dateMiseBas: portee.dateMiseBas,
        totalNes: portee.totalNes,
        mortsNes: portee.mortsNes,
        observation: portee.observation || '',
      });
      setVivantsSevres(String(portee.vivantsActuels));
    }
  }, [portee, isEditing]);

  if (!portee) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Portée introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary }}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const ageJours = Math.max(0, differenceInDays(new Date(), new Date(portee.dateMiseBas)));
  const surviePercent = portee.totalNes > 0 ? Math.round((portee.vivantsActuels / portee.totalNes) * 100) : 0;
  const isEnCours = portee.statut !== 'sevree' && portee.statut !== 'cloturee';

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la portée',
      'Voulez-vous vraiment supprimer cette portée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deletePortee(portee.id);
            if (femelle && femelle.statut === 'allaitante') {
              await updateReproducteur(femelle.id, { statut: 'disponible' });
            }
            router.back();
          },
        },
      ]
    );
  };

  const handleSave = async (data: PorteeEditFormValues) => {
    try {
      const diffTotal = data.totalNes - portee.totalNes;
      const diffMorts = data.mortsNes - portee.mortsNes;
      const newVivants = Math.max(0, portee.vivantsActuels + diffTotal - diffMorts);

      await updatePortee(portee.id, {
        dateMiseBas: data.dateMiseBas,
        totalNes: data.totalNes,
        mortsNes: data.mortsNes,
        vivantsNaissance: data.totalNes - data.mortsNes,
        vivantsActuels: newVivants,
        observation: data.observation || '',
      });

      setIsEditing(false);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la portée.');
      console.error(e);
    }
  };

  const handleActionPerte = async () => {
    const qty = parseInt(pertesCount) || 0;
    if (qty <= 0 || qty > portee.vivantsActuels) {
      Alert.alert('Quantité invalide', 'Le nombre de pertes doit être entre 1 et ' + portee.vivantsActuels);
      return;
    }

    try {
      await addMortalite({
        porteeId: portee.id,
        date: perteDate,
        quantite: qty,
        cause: perteCause.trim() || undefined,
      });

      await updatePortee(portee.id, {
        vivantsActuels: portee.vivantsActuels - qty,
      });

      setActionPane('none');
      setPertesCount('1');
      setPerteCause('');
      Alert.alert('Succès', 'Pertes enregistrées.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleActionAdoption = async () => {
    const qty = parseInt(adoptionCount) || 0;
    if (qty <= 0) {
      Alert.alert('Quantité invalide', 'Le nombre de lapereaux doit être supérieur à 0.');
      return;
    }
    if (adoptionType === 'out' && qty > portee.vivantsActuels) {
      Alert.alert('Quantité invalide', 'Impossible de donner plus de lapereaux que disponibles.');
      return;
    }

    try {
      if (adoptionType === 'in') {
        await updatePortee(portee.id, {
          vivantsActuels: portee.vivantsActuels + qty,
          adoptionsIn: (portee.adoptionsIn || 0) + qty,
        });
      } else {
        await updatePortee(portee.id, {
          vivantsActuels: portee.vivantsActuels - qty,
          adoptionsOut: (portee.adoptionsOut || 0) + qty,
        });
      }

      setActionPane('none');
      setAdoptionCount('1');
      Alert.alert('Succès', 'Mouvement d\'adoption enregistré.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleActionSevrage = async () => {
    const qty = parseInt(vivantsSevres) || 0;
    if (qty < 0 || qty > portee.vivantsActuels) {
      Alert.alert('Quantité invalide', 'Le nombre de sevrés doit être inférieur ou égal aux vivants actuels.');
      return;
    }

    try {
      await updatePortee(portee.id, {
        statut: 'sevree',
        dateSevrageReelle: new Date().toISOString().split('T')[0],
        vivantsSevres: qty,
        destination,
      });

      // Rendre la femelle disponible à nouveau
      if (femelle && femelle.statut === 'allaitante') {
        await updateReproducteur(femelle.id, { statut: 'disponible' });
      }

      setActionPane('none');
      Alert.alert('Portée sevrée', 'Le sevrage de la portée a bien été enregistré.');
    } catch (e) {
      console.error(e);
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
      marginBottom: 12,
    },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    badge: {
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      alignSelf: 'flex-start',
      marginTop: 6,
      marginBottom: 12,
    },
    badgeText: {
      fontSize: 9,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    infoLabel: {
      color: colors.textSecondary,
      fontSize: 13,
    },
    infoValue: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    kpiRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    kpiItem: {
      flex: 1,
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    kpiLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      textTransform: 'uppercase',
      fontWeight: '600',
      marginBottom: 4,
    },
    kpiVal: {
      fontSize: 26,
      fontWeight: 'bold',
    },
    kpiDetail: {
      color: colors.textSecondary,
      fontSize: 10,
      marginTop: 4,
    },
    progressContainer: {
      height: 6,
      backgroundColor: colors.surfaceVariant,
      borderRadius: 3,
      overflow: 'hidden',
      marginVertical: 10,
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.primary,
    },
    btnRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    actionBtn: {
      flex: 1,
      borderRadius: 8,
      height: 38,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
    },
    actionBtnText: {
      fontWeight: 'bold',
      fontSize: 12,
    },
    actionPanel: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 10,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      padding: 14,
      marginTop: 12,
    },
    panelTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    panelInput: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      height: 40,
      color: colors.textPrimary,
      paddingHorizontal: 12,
      marginBottom: 10,
      fontSize: 14,
    },
    panelButtonRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    panelBtnConfirm: {
      flex: 1,
      height: 38,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    panelBtnCancel: {
      flex: 1,
      height: 38,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnSubmit: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 10,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnCancel: {
      flex: 1,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 10,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    perteRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
  });

  if (isEditing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.backRow}>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={{ marginRight: 16 }} activeOpacity={0.7}>
                <X size={22} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.title}>Modifier Portée</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <FormInput name="dateMiseBas" label="Date de mise bas" control={control} error={errors.dateMiseBas} type="date" />
            <FormInput name="totalNes" label="Total Nés" control={control} error={errors.totalNes} type="number" />
            <FormInput name="mortsNes" label="Dont Morts-nés" control={control} error={errors.mortsNes} type="number" />
            <FormInput name="observation" label="Observations" control={control} error={errors.observation} type="text" />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setIsEditing(false)} activeOpacity={0.7}>
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit(handleSave)} activeOpacity={0.7}>
                <Text style={{ color: colors.onPrimary, fontWeight: 'bold' }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.backRow}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }} activeOpacity={0.7}>
              <ArrowLeft size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Détails Portée</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionIconBtn} onPress={() => setIsEditing(true)} activeOpacity={0.7}>
              <Edit3 size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIconBtn} onPress={handleDelete} activeOpacity={0.7}>
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Main Card */}
          <View style={styles.card}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>
              {portee.code}
            </Text>
            <View style={[styles.badge, { backgroundColor: isEnCours ? colors.secondary + '20' : colors.primary + '20' }]}>
              <Text style={[styles.badgeText, { color: isEnCours ? colors.secondary : colors.primary }]}>
                {portee.statut.replace('_', ' ')}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.infoRow}
              onPress={() => {
                if (femelle) router.push(`/reproducteur/${femelle.id}`);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.infoLabel}>Mère</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>
                {femelle ? femelle.code : 'Inconnue'} →
              </Text>
            </TouchableOpacity>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mise bas le</Text>
              <Text style={styles.infoValue}>{format(new Date(portee.dateMiseBas), 'dd/MM/yyyy')}</Text>
            </View>

            {portee.emplacement && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Emplacement</Text>
                <Text style={styles.infoValue}>Cage {portee.emplacement}</Text>
              </View>
            )}

            {portee.observation && (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Observations</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, marginTop: 4 }}>
                    {portee.observation}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* KPI Stats */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiLabel}>Âge actuel</Text>
              <Text style={[styles.kpiVal, { color: colors.textPrimary }]}>{ageJours}</Text>
              <Text style={styles.kpiDetail}>Jours</Text>
            </View>
            <View style={styles.kpiItem}>
              <Text style={styles.kpiLabel}>Taux Survie</Text>
              <Text style={[styles.kpiVal, { color: surviePercent >= 85 ? colors.secondary : colors.error }]}>
                {surviePercent}%
              </Text>
              <Text style={styles.kpiDetail}>
                {portee.vivantsActuels} / {portee.totalNes} vivants
              </Text>
            </View>
          </View>

          {/* Adoptions */}
          {(portee.adoptionsIn || portee.adoptionsOut) ? (
            <View style={styles.card}>
              <Text style={[styles.cardTitle, { marginBottom: 6 }]}>Adoptions (Mouvements)</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {portee.adoptionsIn && (
                  <View style={{ flex: 1, backgroundColor: colors.surfaceVariant, padding: 8, borderRadius: 8 }}>
                    <Text style={{ fontSize: 9, color: colors.textSecondary, textTransform: 'uppercase' }}>Reçus (+)</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary }}>+{portee.adoptionsIn}</Text>
                  </View>
                )}
                {portee.adoptionsOut && (
                  <View style={{ flex: 1, backgroundColor: colors.surfaceVariant, padding: 8, borderRadius: 8 }}>
                    <Text style={{ fontSize: 9, color: colors.textSecondary, textTransform: 'uppercase' }}>Donnés (-)</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.error }}>-{portee.adoptionsOut}</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* Losses (Mortalites) */}
          {porteeMortalites.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Pertes</Text>
              {porteeMortalites.map((m) => (
                <View key={m.id} style={styles.perteRow}>
                  <View>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
                      {format(new Date(m.date), 'dd/MM/yyyy')}
                    </Text>
                    {m.cause && (
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{m.cause}</Text>
                    )}
                  </View>
                  <Text style={{ color: colors.error, fontSize: 14, fontWeight: 'bold' }}>
                    -{m.quantite}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Growth & Actions */}
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' }}>Sevrage</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Prévu le : {format(new Date(portee.dateSevragePrevue), 'dd/MM/yyyy')}
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: `${Math.min(100, Math.max(0, (ageJours / breedingParams.ageSevrage) * 100))}%` }]} />
            </View>

            {isEnCours ? (
              <View>
                {actionPane === 'none' ? (
                  <View style={styles.btnRow}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: colors.error, backgroundColor: colors.error + '10' }]}
                      onPress={() => setActionPane('perte')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.error }]}>Perte</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: colors.textSecondary, backgroundColor: colors.surfaceVariant }]}
                      onPress={() => setActionPane('adoption')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>Adoption</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { borderColor: colors.secondary, backgroundColor: colors.secondary + '20' }]}
                      onPress={() => setActionPane('sevrage')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.secondary }]}>Sevrer</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Perte Panel */}
                {actionPane === 'perte' && (
                  <View style={styles.actionPanel}>
                    <Text style={styles.panelTitle}>Déclarer Perte</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Nombre de pertes</Text>
                    <TextInput
                      style={styles.panelInput}
                      keyboardType="numeric"
                      value={pertesCount}
                      onChangeText={setPertesCount}
                    />
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Cause (optionnel)</Text>
                    <TextInput
                      style={styles.panelInput}
                      placeholder="Ex: Froid, piétiné..."
                      placeholderTextColor={colors.textSecondary}
                      value={perteCause}
                      onChangeText={setPerteCause}
                    />
                    <View style={styles.panelButtonRow}>
                      <TouchableOpacity style={styles.panelBtnCancel} onPress={() => setActionPane('none')} activeOpacity={0.7}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.panelBtnConfirm, { backgroundColor: colors.error }]}
                        onPress={handleActionPerte}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: colors.onBackground, fontWeight: '700' }}>Confirmer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Adoption Panel */}
                {actionPane === 'adoption' && (
                  <View style={styles.actionPanel}>
                    <Text style={styles.panelTitle}>Gérer Adoptions</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { flex: 1, backgroundColor: adoptionType === 'in' ? colors.primary : colors.surfaceCard }]}
                        onPress={() => setAdoptionType('in')}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: adoptionType === 'in' ? colors.onPrimary : colors.textPrimary, fontWeight: '700' }}>Recevoir (+)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { flex: 1, backgroundColor: adoptionType === 'out' ? colors.primary : colors.surfaceCard }]}
                        onPress={() => setAdoptionType('out')}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: adoptionType === 'out' ? colors.onPrimary : colors.textPrimary, fontWeight: '700' }}>Donner (-)</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Nombre de lapereaux</Text>
                    <TextInput
                      style={styles.panelInput}
                      keyboardType="numeric"
                      value={adoptionCount}
                      onChangeText={setAdoptionCount}
                    />
                    <View style={styles.panelButtonRow}>
                      <TouchableOpacity style={styles.panelBtnCancel} onPress={() => setActionPane('none')} activeOpacity={0.7}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.panelBtnConfirm, { backgroundColor: colors.primary }]}
                        onPress={handleActionAdoption}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>Confirmer</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Sevrage Panel */}
                {actionPane === 'sevrage' && (
                  <View style={styles.actionPanel}>
                    <Text style={styles.panelTitle}>Confirmer Sevrage</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Lapereaux sevrés</Text>
                    <TextInput
                      style={styles.panelInput}
                      keyboardType="numeric"
                      value={vivantsSevres}
                      onChangeText={setVivantsSevres}
                    />
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Destination</Text>
                    <TouchableOpacity
                      style={[styles.panelInput, { justifyContent: 'center' }]}
                      onPress={() => {
                        Alert.alert('Destination', 'Choisir la destination des lapereaux sevrés :', [
                          { text: 'Engraissement', onPress: () => setDestination('engraissement') },
                          { text: 'Futurs reproducteurs', onPress: () => setDestination('reproducteurs') },
                          { text: 'Autre', onPress: () => setDestination('autre') },
                        ]);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: colors.textPrimary, textTransform: 'capitalize' }}>
                        {destination === 'reproducteurs' ? 'Futurs reproducteurs' : destination}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.panelButtonRow}>
                      <TouchableOpacity style={styles.panelBtnCancel} onPress={() => setActionPane('none')} activeOpacity={0.7}>
                        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.panelBtnConfirm, { backgroundColor: colors.secondary }]}
                        onPress={handleActionSevrage}
                        activeOpacity={0.7}
                      >
                        <Text style={{ color: colors.onSecondary, fontWeight: '700' }}>Confirmer Sevrage</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ borderTopWidth: 1, borderTopColor: colors.surfaceBorder, marginTop: 12, paddingTop: 12 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 13, marginBottom: 6 }}>Bilan du Sevrage</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Lapereaux sevrés</Text>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 12 }}>
                    {portee.vivantsSevres ?? portee.vivantsActuels}
                  </Text>
                </View>
                {portee.destination && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Destination</Text>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' }}>
                      {portee.destination === 'reproducteurs' ? 'Futurs reproducteurs' : portee.destination}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Sante history for litters */}
          <SanteHistory subjectType="Portee" subjectId={portee.id} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
