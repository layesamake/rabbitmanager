import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useReproductionStore } from '../../lib/reproductionStore';
import { useRabbitStore } from '../../lib/rabbitStore';
import { useAlerteStore } from '../../lib/alerteStore';
import FormInput from '../../components/FormInput';
import { ArrowLeft, Edit3, Trash2, Check, X, Calendar, AlertCircle } from 'lucide-react-native';
import { format, addDays } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const saillieEditSchema = z.object({
  dateSaillie: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise au format AAAA-MM-JJ'),
  type: z.enum(['naturelle', 'controlee', 'double', 'autre']),
  observation: z.string().optional(),
});

type SaillieEditFormValues = z.infer<typeof saillieEditSchema>;

export default function FicheSaillieScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { saillies, updateSaillie, deleteSaillie } = useReproductionStore();
  const { reproducteurs, updateReproducteur } = useRabbitStore();
  const { parametres } = useAlerteStore();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedMaleIds, setSelectedMaleIds] = useState<string[]>([]);

  const breedingParams = parametres || {
    joursAvantControle: 14,
    joursAvantPreparation: 27,
    dureeGestation: 31,
    ageSevrage: 35,
  };

  const saillie = useMemo(() => {
    return saillies.find((s) => s.id === id);
  }, [saillies, id]);

  const femelle = useMemo(() => {
    return saillie ? reproducteurs.find((r) => r.id === saillie.femelleId) : null;
  }, [reproducteurs, saillie]);

  const activeMales = useMemo(() => {
    return reproducteurs.filter(
      (r) => r.sexe === 'male' && r.statut !== 'reforme' && r.statut !== 'decede'
    );
  }, [reproducteurs]);

  // Formulaire d'édition
  const { control, handleSubmit, reset, formState: { errors } } = useForm<SaillieEditFormValues>({
    resolver: zodResolver(saillieEditSchema),
  });

  useEffect(() => {
    if (saillie) {
      reset({
        dateSaillie: saillie.dateSaillie,
        type: saillie.type,
        observation: saillie.observation || '',
      });
      setSelectedMaleIds(saillie.maleIds || []);
    }
  }, [saillie, isEditing]);

  if (!saillie) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Saillie introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary }}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const getRabbitCode = (id: string) => {
    const r = reproducteurs.find((x) => x.id === id);
    return r ? r.code : '?';
  };

  const handleMaleToggle = (id: string) => {
    setSelectedMaleIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const handleConfirmer = async (confirmer: boolean) => {
    try {
      const nextStatut = confirmer ? 'confirmee' : 'non_confirmee';
      await updateSaillie(saillie.id, { statut: nextStatut });

      if (femelle) {
        await updateReproducteur(femelle.id, { statut: confirmer ? 'gestante' : 'disponible' });
      }

      Alert.alert(
        confirmer ? 'Gestation Confirmée' : 'Gestation Échouée',
        confirmer
          ? 'La lapine est maintenant marquée comme GESTANTE.'
          : 'La lapine est maintenant libre et disponible pour une nouvelle saillie.'
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer la saillie',
      'Voulez-vous vraiment supprimer cette saillie ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteSaillie(saillie.id);
            if (femelle && femelle.statut === 'saillie') {
              await updateReproducteur(femelle.id, { statut: 'disponible' });
            }
            router.back();
          },
        },
      ]
    );
  };

  const onSubmit = async (data: SaillieEditFormValues) => {
    if (selectedMaleIds.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un mâle.');
      return;
    }

    try {
      const saillieDate = new Date(data.dateSaillie);
      const dateControle = format(addDays(saillieDate, breedingParams.joursAvantControle), 'yyyy-MM-dd');
      const datePreparation = format(addDays(saillieDate, breedingParams.joursAvantPreparation), 'yyyy-MM-dd');
      const dateMiseBasPrevue = format(addDays(saillieDate, breedingParams.dureeGestation), 'yyyy-MM-dd');

      await updateSaillie(saillie.id, {
        dateSaillie: data.dateSaillie,
        type: data.type,
        observation: data.observation || '',
        maleIds: selectedMaleIds,
        dateControle,
        datePreparation,
        dateMiseBasPrevue,
      });

      setIsEditing(false);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la saillie.');
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
      marginBottom: 16,
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
    malesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginVertical: 8,
    },
    maleChip: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    bottomActions: {
      marginTop: 12,
      marginBottom: 40,
      gap: 12,
    },
    btnConfirm: {
      flex: 1,
      backgroundColor: colors.secondary,
      borderRadius: 10,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    btnConfirmText: {
      color: colors.onSecondary,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    btnFail: {
      flex: 1,
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 10,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
    },
    btnFailText: {
      color: colors.textPrimary,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    btnMiseBas: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnMiseBasText: {
      color: colors.onPrimary,
      fontWeight: 'bold',
      fontSize: 14,
    },
    btnSubmit: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 10,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnSubmitText: {
      color: colors.onPrimary,
      fontWeight: 'bold',
      fontSize: 14,
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
    btnCancelText: {
      color: colors.textPrimary,
      fontWeight: 'bold',
      fontSize: 14,
    },
  });

  const getStatusBadgeColors = (statut: string) => {
    switch (statut) {
      case 'confirmee':
      case 'mise_bas':
        return { bg: colors.secondary + '20', text: colors.secondary };
      case 'enregistree':
      case 'en_attente':
        return { bg: colors.primary + '20', text: colors.primary };
      case 'non_confirmee':
      case 'echec':
      case 'annulee':
        return { bg: colors.error + '20', text: colors.error };
      default:
        return { bg: colors.surfaceVariant, text: colors.textSecondary };
    }
  };

  const saillieBadge = getStatusBadgeColors(saillie.statut);

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
              <Text style={styles.title}>Modifier Saillie</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            <FormInput name="dateSaillie" label="Date de saillie" control={control} error={errors.dateSaillie} type="date" />
            
            <FormInput
              name="type"
              label="Type"
              control={control}
              error={errors.type}
              type="select"
              options={[
                { label: 'Naturelle', value: 'naturelle' },
                { label: 'Contrôlée', value: 'controlee' },
                { label: 'Double Passage', value: 'double' },
                { label: 'Autre', value: 'autre' },
              ]}
            />

            {/* Mâles selector */}
            <Text style={[styles.infoLabel, { fontWeight: '600', textTransform: 'uppercase', fontSize: 11, marginBottom: 8 }]}>
              Sélection Mâles
            </Text>
            <View style={styles.malesGrid}>
              {activeMales.map((male) => {
                const isSelected = selectedMaleIds.includes(male.id);
                return (
                  <TouchableOpacity
                    key={male.id}
                    style={[
                      styles.maleChip,
                      {
                        borderColor: isSelected ? colors.secondary : colors.surfaceBorder,
                        backgroundColor: isSelected ? colors.secondary + '20' : colors.surfaceCard,
                      }
                    ]}
                    onPress={() => handleMaleToggle(male.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: isSelected ? colors.secondary : colors.textPrimary, fontWeight: isSelected ? 'bold' : 'normal' }}>
                      {male.code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <FormInput name="observation" label="Observations" control={control} error={errors.observation} type="text" />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setIsEditing(false)} activeOpacity={0.7}>
                <Text style={styles.btnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit(onSubmit)} activeOpacity={0.7}>
                <Text style={styles.btnSubmitText}>Enregistrer</Text>
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
            <Text style={styles.title}>Détails de Saillie</Text>
          </View>
          <View style={styles.headerActions}>
            {saillie.statut !== 'mise_bas' && (
              <TouchableOpacity style={styles.actionIconBtn} onPress={() => setIsEditing(true)} activeOpacity={0.7}>
                <Edit3 size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionIconBtn} onPress={handleDelete} activeOpacity={0.7}>
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Main Card */}
          <View style={styles.card}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: 'bold' }}>
              {femelle ? femelle.code : 'Lapine'} × {saillie.maleIds.map(getRabbitCode).join(', ')}
            </Text>
            <View style={[styles.badge, { backgroundColor: saillieBadge.bg }]}>
              <Text style={[styles.badgeText, { color: saillieBadge.text }]}>
                {saillie.statut.replace('_', ' ')}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>{format(new Date(saillie.dateSaillie), 'dd/MM/yyyy')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Type d'accouplement</Text>
              <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>{saillie.type}</Text>
            </View>
            {saillie.observation && (
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Observations</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, marginTop: 4 }}>
                    {saillie.observation}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Gestation Agenda */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Calendrier de gestation</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Palpation (Contrôle)</Text>
              <Text style={styles.infoValue}>{format(new Date(saillie.dateControle), 'dd/MM/yyyy')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Installation boîte à nid</Text>
              <Text style={styles.infoValue}>{format(new Date(saillie.datePreparation), 'dd/MM/yyyy')}</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>Mise bas attendue</Text>
              <Text style={[styles.infoValue, { color: colors.secondary }]}>
                {format(new Date(saillie.dateMiseBasPrevue), 'dd/MM/yyyy')}
              </Text>
            </View>
          </View>

          {/* Actions depending on status */}
          <View style={styles.bottomActions}>
            {(saillie.statut === 'enregistree' || saillie.statut === 'en_attente') && (
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={styles.btnConfirm} onPress={() => handleConfirmer(true)} activeOpacity={0.7}>
                  <Check size={16} color={colors.onSecondary} />
                  <Text style={styles.btnConfirmText}>Gestation confirmée</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnFail} onPress={() => handleConfirmer(false)} activeOpacity={0.7}>
                  <X size={16} color={colors.textPrimary} />
                  <Text style={styles.btnFailText}>Échec palpation</Text>
                </TouchableOpacity>
              </View>
            )}

            {saillie.statut === 'confirmee' && (
              <TouchableOpacity
                style={styles.btnMiseBas}
                onPress={() => router.push(`/portee/new?saillieId=${saillie.id}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.btnMiseBasText}>Enregistrer la Mise bas</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
