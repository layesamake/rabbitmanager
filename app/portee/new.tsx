import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useRabbitStore } from '../../lib/rabbitStore';
import { useReproductionStore } from '../../lib/reproductionStore';
import { useAlerteStore } from '../../lib/alerteStore';
import FormInput from '../../components/FormInput';
import { ArrowLeft, Check, Calendar } from 'lucide-react-native';
import { format, addDays } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { schedulePorteeSevrageNotification } from '../../lib/notifications';

const porteeSchema = z.object({
  femelleId: z.string().min(1, 'La femelle est requise'),
  saillieId: z.string().optional(),
  dateMiseBas: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise au format AAAA-MM-JJ'),
  totalNes: z.number().min(0, 'Le nombre de nés doit être positif'),
  vivantsNaissance: z.number().min(0, 'Le nombre de vivants doit être positif'),
  mortsNes: z.number().min(0, 'Le nombre de morts-nés doit être positif'),
  emplacement: z.string().optional(),
  observation: z.string().optional(),
});

type PorteeFormValues = z.infer<typeof porteeSchema>;

export default function NouvellePorteeScreen() {
  const router = useRouter();
  const { saillieId: fromSaillieId } = useLocalSearchParams<{ saillieId?: string }>();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { reproducteurs, updateReproducteur } = useRabbitStore();
  const { saillies, addPortee, updateSaillie } = useReproductionStore();
  const { parametres } = useAlerteStore();

  const breedingParams = parametres || {
    joursAvantControle: 14,
    joursAvantPreparation: 27,
    dureeGestation: 31,
    ageSevrage: 35,
  };

  const activeFemelles = useMemo(() => {
    return reproducteurs.filter((r) => r.sexe === 'femelle');
  }, [reproducteurs]);

  const activeSaillies = useMemo(() => {
    return saillies.filter((s) => s.statut === 'confirmee');
  }, [saillies]);

  const femelleOptions = activeFemelles.map((f) => ({
    label: f.nom ? `${f.nom} (${f.code})` : f.code,
    value: f.id,
  }));

  const saillieOptions = [
    { label: 'Aucune saillie liée', value: '' },
    ...activeSaillies.map((s) => {
      const f = activeFemelles.find((x) => x.id === s.femelleId);
      return {
        label: `Saillie du ${format(new Date(s.dateSaillie), 'dd/MM')} (Femelle: ${f?.code || '?'})`,
        value: s.id,
      };
    }),
  ];

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<PorteeFormValues>({
    resolver: zodResolver(porteeSchema),
    defaultValues: {
      femelleId: '',
      saillieId: '',
      dateMiseBas: format(new Date(), 'yyyy-MM-dd'),
      totalNes: 0,
      vivantsNaissance: 0,
      mortsNes: 0,
      emplacement: '',
      observation: '',
    }
  });

  const selectedSaillieId = watch('saillieId');
  const selectedDateStr = watch('dateMiseBas');

  // Synchroniser la sélection de saillie avec la femelle
  useEffect(() => {
    if (selectedSaillieId) {
      const s = saillies.find((x) => x.id === selectedSaillieId);
      if (s) {
        setValue('femelleId', s.femelleId);
      }
    }
  }, [selectedSaillieId]);

  useEffect(() => {
    if (fromSaillieId) {
      setValue('saillieId', fromSaillieId);
      const s = saillies.find((x) => x.id === fromSaillieId);
      if (s) {
        setValue('femelleId', s.femelleId);
      }
    }
  }, [fromSaillieId, saillies]);

  const computedWeaningDate = useMemo(() => {
    try {
      const baseDate = selectedDateStr ? new Date(selectedDateStr) : new Date();
      if (isNaN(baseDate.getTime())) return null;
      return format(addDays(baseDate, breedingParams.ageSevrage), 'dd/MM/yyyy');
    } catch {
      return null;
    }
  }, [selectedDateStr, breedingParams]);

  const onSubmit = async (data: PorteeFormValues) => {
    if (data.vivantsNaissance + data.mortsNes > data.totalNes) {
      Alert.alert('Erreur de quantité', 'Le nombre de vivants et de morts-nés ne peut pas dépasser le total de nés.');
      return;
    }

    try {
      const femelle = reproducteurs.find((r) => r.id === data.femelleId);
      const shortFemelleCode = femelle ? femelle.code.slice(0, 3) : '';
      const dateMiseBasDate = new Date(data.dateMiseBas);
      
      const codePortee = `P-${format(dateMiseBasDate, 'yyMMdd')}-${shortFemelleCode}`;
      const dateSevragePrevue = format(addDays(dateMiseBasDate, breedingParams.ageSevrage), 'yyyy-MM-dd');

      const saved = await addPortee({
        code: codePortee,
        femelleId: data.femelleId,
        saillieId: data.saillieId || undefined,
        dateMiseBas: data.dateMiseBas,
        totalNes: data.totalNes,
        vivantsNaissance: data.vivantsNaissance,
        mortsNes: data.mortsNes,
        vivantsActuels: data.vivantsNaissance,
        emplacement: data.emplacement || undefined,
        observation: data.observation || undefined,
        dateSevragePrevue,
        statut: 'en_cours',
      });

      // Mettre à jour le statut de la femelle en allaitante
      await updateReproducteur(data.femelleId, { statut: 'allaitante' });

      // Mettre à jour le statut de la saillie si présente
      if (data.saillieId) {
        await updateSaillie(data.saillieId, { statut: 'mise_bas' });
      }

      // Planifier les rappels système
      await schedulePorteeSevrageNotification(saved.id, codePortee, dateSevragePrevue);

      Alert.alert('Succès', `La portée ${codePortee} a été enregistrée avec succès !`);
      router.replace('/reproduction');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la portée.');
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
    sectionCard: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    gridQuantities: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    quantityItem: {
      flex: 1,
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    quantityLabel: {
      color: colors.textSecondary,
      fontSize: 9,
      fontWeight: '600',
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    dateEstimateCard: {
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    estimateTitle: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    estimateRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Nouvelle Portée</Text>
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionCard}>
            <FormInput
              name="saillieId"
              label="Saillie associée (optionnel)"
              control={control}
              error={errors.saillieId}
              type="select"
              options={saillieOptions}
            />

            <FormInput
              name="femelleId"
              label="Mère *"
              control={control}
              error={errors.femelleId}
              type="select"
              options={femelleOptions}
              placeholder="Sélectionner la lapine..."
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FormInput
                name="dateMiseBas"
                label="Date *"
                control={control}
                error={errors.dateMiseBas}
                type="date"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput
                name="emplacement"
                label="Cage"
                control={control}
                error={errors.emplacement}
                placeholder="Ex: B-12"
                type="text"
              />
            </View>
          </View>

          {/* Quantities Form Inputs */}
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>
            Quantités de nés
          </Text>
          <View style={styles.gridQuantities}>
            <View style={styles.quantityItem}>
              <Text style={styles.quantityLabel}>Total Nés</Text>
              <FormInput
                name="totalNes"
                label=""
                control={control}
                error={errors.totalNes}
                type="number"
              />
            </View>
            <View style={[styles.quantityItem, { borderColor: colors.secondary + '40' }]}>
              <Text style={[styles.quantityLabel, { color: colors.secondary }]}>Vivants</Text>
              <FormInput
                name="vivantsNaissance"
                label=""
                control={control}
                error={errors.vivantsNaissance}
                type="number"
              />
            </View>
            <View style={[styles.quantityItem, { borderColor: colors.error + '40' }]}>
              <Text style={[styles.quantityLabel, { color: colors.error }]}>Morts-nés</Text>
              <FormInput
                name="mortsNes"
                label=""
                control={control}
                error={errors.mortsNes}
                type="number"
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <FormInput
              name="observation"
              label="Observation"
              control={control}
              error={errors.observation}
              placeholder="Remarques particulières..."
              type="text"
            />
          </View>

          {/* Date estimate box */}
          {computedWeaningDate && (
            <View style={styles.dateEstimateCard}>
              <Text style={styles.estimateTitle}>Suivi Sevrage</Text>
              <View style={styles.estimateRow}>
                <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>Sevrage prévu (J+{breedingParams.ageSevrage})</Text>
                <Text style={{ color: colors.primary, fontSize: 15, fontWeight: 'bold' }}>{computedWeaningDate}</Text>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit(onSubmit)} activeOpacity={0.7}>
            <Text style={styles.btnSubmitText}>Enregistrer la portée</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.btnCancel} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.btnCancelText}>Annuler</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
