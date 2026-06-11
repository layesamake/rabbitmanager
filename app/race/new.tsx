import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useRabbitStore } from '../../lib/rabbitStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import FormInput from '../../components/FormInput';
import { ArrowLeft } from 'lucide-react-native';

const raceSchema = z.object({
  nom: z.string().min(1, { message: 'Le nom de la race est requis' }),
  description: z.string().optional(),
  poidsMoyenAdulte: z.number().nullable().optional(),
  remarques: z.string().optional(),
});

type RaceFormValues = z.infer<typeof raceSchema>;

export default function NouvelleRaceScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { addRace } = useRabbitStore();

  const { control, handleSubmit, formState: { errors } } = useForm<RaceFormValues>({
    resolver: zodResolver(raceSchema),
    defaultValues: {
      nom: '',
      description: '',
      poidsMoyenAdulte: null,
      remarques: '',
    }
  });

  const onSubmit = async (data: RaceFormValues) => {
    try {
      await addRace({
        nom: data.nom,
        description: data.description,
        poidsMoyenAdulte: data.poidsMoyenAdulte || undefined,
        remarques: data.remarques,
      });
      router.back();
    } catch (e) {
      Alert.alert('Erreur', "Impossible d'enregistrer la race.");
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
      marginBottom: 24,
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
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
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
          <Text style={styles.title}>Nouvelle Race</Text>
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          <FormInput
            name="nom"
            label="Nom de la race"
            control={control}
            error={errors.nom}
            placeholder="Ex: Néo-Zélandais, Papillon..."
            type="text"
          />

          <FormInput
            name="poidsMoyenAdulte"
            label="Poids Moyen Adulte (kg)"
            control={control}
            error={errors.poidsMoyenAdulte}
            placeholder="Ex: 4.5"
            type="number"
          />

          <FormInput
            name="description"
            label="Description"
            control={control}
            error={errors.description}
            placeholder="Origine, couleur..."
            type="text"
          />

          <FormInput
            name="remarques"
            label="Remarques"
            control={control}
            error={errors.remarques}
            placeholder="Particularités d'élevage..."
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
