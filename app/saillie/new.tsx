import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useRabbitStore } from '../../lib/rabbitStore';
import { useReproductionStore } from '../../lib/reproductionStore';
import { useAlerteStore } from '../../lib/alerteStore';
import FormInput from '../../components/FormInput';
import { ArrowLeft, Calendar, Check, AlertCircle } from 'lucide-react-native';
import { addDays, format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { scheduleSaillieNotifications } from '../../lib/notifications';

const saillieSchema = z.object({
  femelleId: z.string().min(1, 'La femelle est requise'),
  dateSaillie: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise au format AAAA-MM-JJ'),
  type: z.enum(['naturelle', 'controlee', 'double', 'autre']),
  observation: z.string().optional(),
});

type SaillieFormValues = z.infer<typeof saillieSchema>;

export default function NouvelleSaillieScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { reproducteurs, updateReproducteur } = useRabbitStore();
  const { addSaillie } = useReproductionStore();
  const { parametres } = useAlerteStore();

  const [selectedMaleIds, setSelectedMaleIds] = useState<string[]>([]);
  const [successSaillie, setSuccessSaillie] = useState<any | null>(null);

  // Valeurs par défaut d'élevage
  const breedingParams = parametres || {
    joursAvantControle: 14,
    joursAvantPreparation: 27,
    dureeGestation: 31,
    ageSevrage: 35,
  };

  const { control, handleSubmit, watch, formState: { errors } } = useForm<SaillieFormValues>({
    resolver: zodResolver(saillieSchema),
    defaultValues: {
      femelleId: '',
      dateSaillie: format(new Date(), 'yyyy-MM-dd'),
      type: 'naturelle',
      observation: '',
    }
  });

  const selectedDateStr = watch('dateSaillie');

  // Filtrer les femelles et les mâles actifs
  const activeFemelles = useMemo(() => {
    return reproducteurs.filter(
      (r) => r.sexe === 'femelle' && r.statut !== 'reforme' && r.statut !== 'decede'
    );
  }, [reproducteurs]);

  const activeMales = useMemo(() => {
    return reproducteurs.filter(
      (r) => r.sexe === 'male' && r.statut !== 'reforme' && r.statut !== 'decede'
    );
  }, [reproducteurs]);

  const femelleOptions = activeFemelles.map((f) => ({
    label: f.nom ? `${f.nom} (${f.code})` : f.code,
    value: f.id,
  }));

  const typeOptions = [
    { label: 'Naturelle', value: 'naturelle' },
    { label: 'Contrôlée', value: 'controlee' },
    { label: 'Double Passage', value: 'double' },
    { label: 'Autre', value: 'autre' },
  ];

  // Calculer les dates prévues en direct
  const computedDates = useMemo(() => {
    try {
      const baseDate = selectedDateStr ? new Date(selectedDateStr) : new Date();
      if (isNaN(baseDate.getTime())) return null;

      return {
        controle: format(addDays(baseDate, breedingParams.joursAvantControle), 'dd/MM/yyyy'),
        prep: format(addDays(baseDate, breedingParams.joursAvantPreparation), 'dd/MM/yyyy'),
        miseBas: format(addDays(baseDate, breedingParams.dureeGestation), 'dd/MM/yyyy'),
      };
    } catch {
      return null;
    }
  }, [selectedDateStr, breedingParams]);

  const handleMaleToggle = (id: string) => {
    setSelectedMaleIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const onSubmit = async (data: SaillieFormValues) => {
    if (selectedMaleIds.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins un mâle pour la saillie.');
      return;
    }

    try {
      const saillieDate = new Date(data.dateSaillie);
      
      const dateControle = format(addDays(saillieDate, breedingParams.joursAvantControle), 'yyyy-MM-dd');
      const datePreparation = format(addDays(saillieDate, breedingParams.joursAvantPreparation), 'yyyy-MM-dd');
      const dateMiseBasPrevue = format(addDays(saillieDate, breedingParams.dureeGestation), 'yyyy-MM-dd');

      const saved = await addSaillie({
        femelleId: data.femelleId,
        maleIds: selectedMaleIds,
        dateSaillie: data.dateSaillie,
        type: data.type,
        observation: data.observation || undefined,
        statut: 'enregistree',
        dateControle,
        datePreparation,
        dateMiseBasPrevue,
      });

      // Mettre à jour le statut de la femelle
      await updateReproducteur(data.femelleId, { statut: 'saillie' });

      // Planifier les notifications locales
      const femelleCode = activeFemelles.find(f => f.id === data.femelleId)?.code || 'Lapine';
      await scheduleSaillieNotifications(
        saved.id,
        femelleCode,
        dateControle,
        datePreparation,
        dateMiseBasPrevue
      );

      setSuccessSaillie(saved);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la saillie.');
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
    form: {
      paddingBottom: 40,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    malesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    maleChip: {
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    dateSummaryCard: {
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginTop: 12,
      marginBottom: 20,
    },
    summaryTitle: {
      color: colors.secondary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    summaryRowLabel: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '500',
    },
    summaryRowDate: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: 'bold',
    },
    btnSubmit: {
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
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 10,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
    },
    btnCancelText: {
      color: colors.textPrimary,
      fontWeight: 'bold',
      fontSize: 14,
    },
    successContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    successIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.secondary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    successTitle: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    successDesc: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      marginBottom: 24,
    },
  });

  if (successSaillie) {
    const female = activeFemelles.find((f) => f.id === successSaillie.femelleId);
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Check size={36} color={colors.secondary} />
          </View>
          <Text style={styles.successTitle}>Saillie Enregistrée !</Text>
          <Text style={styles.successDesc}>
            La saillie de la femelle {female?.code || ''} a été enregistrée avec succès. Les rappels locaux ont été planifiés.
          </Text>
          
          <TouchableOpacity
            style={[styles.btnSubmit, { width: '100%' }]}
            onPress={() => router.replace('/reproduction')}
            activeOpacity={0.7}
          >
            <Text style={styles.btnSubmitText}>Retour à la reproduction</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Nouvelle Saillie</Text>
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          <FormInput
            name="femelleId"
            label="Femelle *"
            control={control}
            error={errors.femelleId}
            type="select"
            options={femelleOptions}
            placeholder="Choisir la lapine..."
          />

          {/* Mâles Selection Grid */}
          <Text style={styles.label}>Mâle(s) *</Text>
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
                  <Text
                    style={{
                      color: isSelected ? colors.secondary : colors.textPrimary,
                      fontWeight: isSelected ? 'bold' : 'normal',
                      fontSize: 13,
                    }}
                  >
                    {male.code}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {activeMales.length === 0 && (
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic' }}>
                Aucun mâle disponible.
              </Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FormInput
                name="dateSaillie"
                label="Date *"
                control={control}
                error={errors.dateSaillie}
                type="date"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput
                name="type"
                label="Type *"
                control={control}
                error={errors.type}
                type="select"
                options={typeOptions}
              />
            </View>
          </View>

          <FormInput
            name="observation"
            label="Observations"
            control={control}
            error={errors.observation}
            placeholder="Notes sur l'accouplement..."
            type="text"
          />

          {/* Computed Dates Summary */}
          {computedDates && (
            <View style={styles.dateSummaryCard}>
              <Text style={styles.summaryTitle}>Dates Automatiques Estimées</Text>
              
              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Palpation (J+{breedingParams.joursAvantControle})</Text>
                <Text style={styles.summaryRowDate}>{computedDates.controle}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryRowLabel}>Préparation Nid (J+{breedingParams.joursAvantPreparation})</Text>
                <Text style={styles.summaryRowDate}>{computedDates.prep}</Text>
              </View>

              <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.summaryRowLabel}>Mise bas attendue (J+{breedingParams.dureeGestation})</Text>
                <Text style={[styles.summaryRowDate, { color: colors.secondary }]}>{computedDates.miseBas}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit(onSubmit)} activeOpacity={0.7}>
            <Text style={styles.btnSubmitText}>Enregistrer la saillie</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.btnCancel} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.btnCancelText}>Annuler</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
