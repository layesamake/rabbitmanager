import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore, defaultThemes } from '../lib/theme';
import { useAlerteStore } from '../lib/alerteStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import FormInput from '../components/FormInput';
import { ArrowLeft, Palette, Settings } from 'lucide-react-native';

const parametresSchema = z.object({
  joursAvantControle: z.number().min(1, 'Doit être supérieur à 0'),
  joursAvantPreparation: z.number().min(1, 'Doit être supérieur à 0'),
  dureeGestation: z.number().min(1, 'Doit être supérieur à 0'),
  ageSevrage: z.number().min(1, 'Doit être supérieur à 0'),
});

type ParametresFormValues = z.infer<typeof parametresSchema>;

export default function ParametresScreen() {
  const router = useRouter();
  const { currentTheme, setTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { parametres, loadParametres, updateParametres } = useAlerteStore();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ParametresFormValues>({
    resolver: zodResolver(parametresSchema),
    defaultValues: {
      joursAvantControle: 14,
      joursAvantPreparation: 27,
      dureeGestation: 31,
      ageSevrage: 35,
    }
  });

  useEffect(() => {
    loadParametres();
  }, []);

  useEffect(() => {
    if (parametres) {
      reset({
        joursAvantControle: parametres.joursAvantControle,
        joursAvantPreparation: parametres.joursAvantPreparation,
        dureeGestation: parametres.dureeGestation,
        ageSevrage: parametres.ageSevrage,
      });
    }
  }, [parametres]);

  const onSubmit = async (data: ParametresFormValues) => {
    try {
      await updateParametres(data);
      Alert.alert('Succès', 'Paramètres d\'élevage mis à jour !');
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres.');
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
    sectionTitle: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 16,
      marginTop: 8,
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    themeSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 8,
    },
    themeOption: {
      flex: 1,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    themeName: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 6,
    },
    btnSave: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 40,
    },
    btnSaveText: {
      color: colors.onPrimary,
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
          <Text style={styles.title}>Paramètres</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Section Thème */}
          <Text style={styles.sectionTitle}>Apparence & Thèmes</Text>
          <View style={styles.card}>
            <View style={styles.themeSelector}>
              {defaultThemes.map((theme) => {
                const isSelected = theme.id === currentTheme.id;
                return (
                  <TouchableOpacity
                    key={theme.id}
                    style={[
                      styles.themeOption,
                      {
                        borderColor: isSelected ? colors.primary : colors.surfaceBorder,
                        backgroundColor: isSelected ? colors.primary + '10' : colors.surfaceVariant,
                      }
                    ]}
                    onPress={() => setTheme(theme.id)}
                    activeOpacity={0.7}
                  >
                    <Palette size={20} color={isSelected ? colors.primary : colors.textSecondary} />
                    <Text
                      style={[
                        styles.themeName,
                        { color: isSelected ? colors.primary : colors.textSecondary }
                      ]}
                    >
                      {theme.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section Cycle d'élevage */}
          <Text style={styles.sectionTitle}>Cycle d'Élevage (Jours)</Text>
          <View style={styles.card}>
            <FormInput
              name="joursAvantControle"
              label="Palpation / Contrôle (jours)"
              control={control}
              error={errors.joursAvantControle}
              type="number"
            />

            <FormInput
              name="joursAvantPreparation"
              label="Installation boîte à nid (jours)"
              control={control}
              error={errors.joursAvantPreparation}
              type="number"
            />

            <FormInput
              name="dureeGestation"
              label="Durée Gestation standard (jours)"
              control={control}
              error={errors.dureeGestation}
              type="number"
            />

            <FormInput
              name="ageSevrage"
              label="Âge au sevrage (jours)"
              control={control}
              error={errors.ageSevrage}
              type="number"
            />
          </View>

          <TouchableOpacity style={styles.btnSave} onPress={handleSubmit(onSubmit)} activeOpacity={0.7}>
            <Text style={styles.btnSaveText}>Sauvegarder les Paramètres</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
