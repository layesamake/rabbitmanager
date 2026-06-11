import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../../../lib/theme';
import { useSanteStore } from '../../../lib/santeStore';
import { useRabbitStore } from '../../../lib/rabbitStore';
import { useReproductionStore } from '../../../lib/reproductionStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import FormInput from '../../../components/FormInput';
import { ArrowLeft } from 'lucide-react-native';

const actionOptions = [
  { label: 'Prophylaxie', value: 'Prophylaxie' },
  { label: 'Déparasitage', value: 'Déparasitage' },
  { label: 'Prévention coccidiose', value: 'Prévention coccidiose' },
  { label: 'Vitamines', value: 'Vitamines' },
  { label: 'Vaccination', value: 'Vaccination' },
  { label: 'Traitement curatif', value: 'Traitement curatif' },
  { label: 'Soin local', value: 'Soin local' },
  { label: 'Nettoyage / désinfection', value: 'Nettoyage / désinfection' },
  { label: 'Autre', value: 'Autre' },
];

const subjectTypeOptions = [
  { label: 'Reproducteur', value: 'Reproducteur' },
  { label: 'Portée', value: 'Portee' },
  { label: 'Lot', value: 'Lot' },
  { label: 'Élevage', value: 'Elevage' },
  { label: 'Autre', value: 'Autre' },
];

const validationSchema = z.object({
  sujetType: z.enum(['Reproducteur', 'Portee', 'Lot', 'Elevage', 'Autre']),
  sujetId: z.string().optional(),
  sujetNom: z.string().optional(),
  typeAction: z.enum([
    'Prophylaxie', 'Déparasitage', 'Prévention coccidiose', 'Vitamines',
    'Vaccination', 'Traitement curatif', 'Soin local', 'Nettoyage / désinfection', 'Autre'
  ]),
  nomProduit: z.string().min(1, 'Le nom du produit ou traitement est requis'),
  objectif: z.string().optional(),
  datePrevue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise au format AAAA-MM-JJ'),
  dose: z.string().optional(),
  frequence: z.string().optional(),
  duree: z.string().optional(),
  prochainRappel: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (AAAA-MM-JJ)').optional().or(z.literal('')),
  responsable: z.string().optional(),
  observation: z.string().optional(),
});

type FormValues = z.infer<typeof validationSchema>;

export default function ModifierTraitementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { traitements, updateTraitement } = useSanteStore();
  const { reproducteurs } = useRabbitStore();
  const { portees } = useReproductionStore();

  const activeReproducteurs = useMemo(() => {
    return reproducteurs.filter((r: any) => r.statut !== 'decede' && r.statut !== 'reforme');
  }, [reproducteurs]);

  const activePortees = useMemo(() => {
    return portees.filter((p: any) => p.statut !== 'cloturee');
  }, [portees]);

  const traitement = useMemo(() => {
    return traitements.find((t: any) => t.id === id);
  }, [traitements, id]);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(validationSchema),
  });

  const selectedSujetType = watch('sujetType');
  const selectedSujetId = watch('sujetId');

  // Charger les valeurs initiales du traitement
  useEffect(() => {
    if (traitement) {
      reset({
        sujetType: traitement.sujetType,
        sujetId: traitement.sujetId || '',
        sujetNom: traitement.sujetNom || '',
        typeAction: traitement.typeAction,
        nomProduit: traitement.nomProduit,
        objectif: traitement.objectif || '',
        datePrevue: traitement.datePrevue,
        dose: traitement.dose || '',
        frequence: traitement.frequence || '',
        duree: traitement.duree || '',
        prochainRappel: traitement.prochainRappel || '',
        responsable: traitement.responsable || '',
        observation: traitement.observation || '',
      });
    }
  }, [traitement]);

  // Met à jour sujetNom quand sujetId change pour Reproducteur ou Portee (si modifié par l'utilisateur)
  useEffect(() => {
    if (!traitement) return;
    if (selectedSujetType === 'Reproducteur') {
      const rep = activeReproducteurs.find((r: any) => r.id === selectedSujetId);
      if (rep) {
        setValue('sujetNom', rep.nom ? `${rep.code} (${rep.nom})` : rep.code);
      }
    } else if (selectedSujetType === 'Portee') {
      const p = activePortees.find((x: any) => x.id === selectedSujetId);
      if (p) {
        setValue('sujetNom', p.code);
      }
    }
  }, [selectedSujetId, selectedSujetType]);

  // Réinitialiser les champs spécifiques au sujet si le type de sujet change (et qu'il est différent du type initial)
  const initialSujetType = traitement?.sujetType;
  useEffect(() => {
    if (initialSujetType && selectedSujetType !== initialSujetType) {
      setValue('sujetId', '');
      setValue('sujetNom', '');
    }
  }, [selectedSujetType, initialSujetType]);

  const repOptions = activeReproducteurs.map((r: any) => ({
    label: r.nom ? `${r.code} - ${r.nom}` : r.code,
    value: r.id,
  }));

  const porteeOptions = activePortees.map((p: any) => ({
    label: p.code,
    value: p.id,
  }));

  const onSubmit = async (data: FormValues) => {
    if (!traitement) return;

    try {
      let finalSujetId = data.sujetId || '';
      let finalSujetNom = data.sujetNom || '';

      if (data.sujetType === 'Lot' || data.sujetType === 'Elevage' || data.sujetType === 'Autre') {
        finalSujetNom = finalSujetNom.trim();
        finalSujetId = finalSujetNom;
      }

      if ((data.sujetType === 'Reproducteur' || data.sujetType === 'Portee') && !finalSujetId) {
        Alert.alert('Erreur', 'Veuillez sélectionner un sujet.');
        return;
      }

      if (data.sujetType === 'Autre' && !finalSujetNom) {
        Alert.alert('Erreur', 'L\'identifiant ou nom du sujet est requis pour le type "Autre".');
        return;
      }

      await updateTraitement(traitement.id, {
        sujetType: data.sujetType,
        sujetId: finalSujetId || undefined,
        sujetNom: finalSujetNom || undefined,
        typeAction: data.typeAction,
        nomProduit: data.nomProduit.trim(),
        objectif: data.objectif?.trim() || undefined,
        datePrevue: data.datePrevue,
        dose: data.dose || undefined,
        frequence: data.frequence?.trim() || undefined,
        duree: data.duree?.trim() || undefined,
        prochainRappel: data.prochainRappel || undefined,
        responsable: data.responsable?.trim() || undefined,
        observation: data.observation?.trim() || undefined,
      });

      router.back();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de modifier le traitement.');
      console.error(e);
    }
  };

  if (!traitement) {
    return null; // Déjà géré au début du fichier
  }

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
    subtitle: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 12,
      marginBottom: 12,
      borderBottomColor: colors.surfaceBorder,
      borderBottomWidth: 1,
      paddingBottom: 4,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Modifier traitement</Text>
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          {/* Section 1: Sujet */}
          <Text style={styles.subtitle}>Sujet du traitement</Text>

          <FormInput
            name="sujetType"
            label="Type de sujet"
            control={control}
            error={errors.sujetType}
            type="select"
            options={subjectTypeOptions}
          />

          {selectedSujetType === 'Reproducteur' && (
            repOptions.length > 0 ? (
              <FormInput
                name="sujetId"
                label="Sélectionner le reproducteur"
                control={control}
                error={errors.sujetId}
                type="select"
                options={repOptions}
              />
            ) : (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>
                  Aucun reproducteur actif disponible.
                </Text>
              </View>
            )
          )}

          {selectedSujetType === 'Portee' && (
            porteeOptions.length > 0 ? (
              <FormInput
                name="sujetId"
                label="Sélectionner la portée"
                control={control}
                error={errors.sujetId}
                type="select"
                options={porteeOptions}
              />
            ) : (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>
                  Aucune portée active disponible.
                </Text>
              </View>
            )
          )}

          {(selectedSujetType === 'Lot' || selectedSujetType === 'Elevage' || selectedSujetType === 'Autre') && (
            <FormInput
              name="sujetNom"
              label={selectedSujetType === 'Autre' ? "Identifiant / Nom *" : "Identifiant / Nom"}
              control={control}
              error={errors.sujetNom}
              placeholder={
                selectedSujetType === 'Lot' ? "Ex: Lot d'engraissement 01" :
                selectedSujetType === 'Elevage' ? "Ex: Élevage complet" : "Ex: Lapereau blessé"
              }
              type="text"
            />
          )}

          {/* Section 2: Détails Traitement */}
          <Text style={styles.subtitle}>Traitement</Text>

          <FormInput
            name="typeAction"
            label="Type d'action"
            control={control}
            error={errors.typeAction}
            type="select"
            options={actionOptions}
          />

          <FormInput
            name="nomProduit"
            label="Nom du traitement / produit"
            control={control}
            error={errors.nomProduit}
            placeholder="Ex: Vitamines, Ivermectine..."
            type="text"
          />

          <FormInput
            name="objectif"
            label="Objectif"
            control={control}
            error={errors.objectif}
            placeholder="Ex: Prévention, Croissance, Cure gale..."
            type="text"
          />

          {/* Section 3: Planification */}
          <Text style={styles.subtitle}>Planification & Dose</Text>

          <FormInput
            name="datePrevue"
            label="Date prévue"
            control={control}
            error={errors.datePrevue}
            placeholder="AAAA-MM-JJ"
            type="date"
          />

          <FormInput
            name="dose"
            label="Dose / Quantité"
            control={control}
            error={errors.dose}
            placeholder="Ex: 2ml, 1 comprimé..."
            type="text"
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FormInput
                name="frequence"
                label="Fréquence"
                control={control}
                error={errors.frequence}
                placeholder="Ex: 1 fois/jour"
                type="text"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormInput
                name="duree"
                label="Durée"
                control={control}
                error={errors.duree}
                placeholder="Ex: 3 jours"
                type="text"
              />
            </View>
          </View>

          <FormInput
            name="prochainRappel"
            label="Prochain rappel (optionnel)"
            control={control}
            error={errors.prochainRappel}
            placeholder="AAAA-MM-JJ"
            type="date"
          />

          <FormInput
            name="responsable"
            label="Responsable"
            control={control}
            error={errors.responsable}
            placeholder="Nom de l'administrateur"
            type="text"
          />

          <FormInput
            name="observation"
            label="Observation / Remarque"
            control={control}
            error={errors.observation}
            placeholder="Informations supplémentaires..."
            type="text"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.btnCancel} onPress={() => router.back()} activeOpacity={0.7}>
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
