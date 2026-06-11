import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useRabbitStore } from '../../lib/rabbitStore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import FormInput from '../../components/FormInput';
import { ArrowLeft, Camera, Image as ImageIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';

const reproducteurSchema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  nom: z.string().optional(),
  sexe: z.enum(['male', 'femelle']),
  raceId: z.string().min(1, 'La race est requise'),
  dateNaissance: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide').optional().or(z.literal('')),
  origine: z.enum(['ne_elevage', 'achete', 'recu', 'autre']),
  statut: z.enum(['disponible', 'saillie', 'gestante', 'allaitante', 'repos', 'reforme', 'decede', 'actif']),
  emplacement: z.string().optional(),
  poids: z.number().nullable().optional(),
  observation: z.string().optional(),
  prixAchat: z.number().nullable().optional(),
  vendeur: z.string().optional(),
  dateAchat: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide').optional().or(z.literal('')),
  donateur: z.string().optional(),
  dateReception: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide').optional().or(z.literal('')),
});

type RepFormValues = z.infer<typeof reproducteurSchema>;

export default function NouveauReproducteurScreen() {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { races, addReproducteur } = useRabbitStore();
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<RepFormValues>({
    resolver: zodResolver(reproducteurSchema),
    defaultValues: {
      code: '',
      nom: '',
      sexe: 'femelle',
      raceId: races.length > 0 ? races[0].id : '',
      dateNaissance: '',
      origine: 'ne_elevage',
      statut: 'disponible',
      emplacement: '',
      poids: null,
      observation: '',
      prixAchat: null,
      vendeur: '',
      dateAchat: '',
      donateur: '',
      dateReception: '',
    }
  });

  const selectedOrigine = watch('origine');
  const selectedSexe = watch('sexe');

  const raceOptions = races.map((r) => ({ label: r.nom, value: r.id }));
  
  const origineOptions = [
    { label: 'Né à l\'élevage', value: 'ne_elevage' },
    { label: 'Acheté', value: 'achete' },
    { label: 'Reçu (Don)', value: 'recu' },
    { label: 'Autre', value: 'autre' },
  ];

  const sexeOptions = [
    { label: 'Femelle', value: 'femelle' },
    { label: 'Mâle', value: 'male' },
  ];

  // Le statut dépend du sexe
  const statutOptions = selectedSexe === 'male' 
    ? [
        { label: 'Actif (Disponible)', value: 'actif' },
        { label: 'Réformé', value: 'reforme' },
        { label: 'Décédé', value: 'decede' },
      ]
    : [
        { label: 'Disponible', value: 'disponible' },
        { label: 'En Saillie', value: 'saillie' },
        { label: 'Gestante', value: 'gestante' },
        { label: 'Allaitante', value: 'allaitante' },
        { label: 'En repos', value: 'repos' },
        { label: 'Réformée', value: 'reforme' },
        { label: 'Décédée', value: 'decede' },
      ];

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à votre galerie pour ajouter une photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleCaptureImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin d\'accéder à l\'appareil photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const onSubmit = async (data: RepFormValues) => {
    if (races.length === 0) {
      Alert.alert('Aucune race', 'Veuillez d\'abord ajouter une race d\'élevage dans les paramètres ou sur le cheptel.');
      return;
    }

    try {
      const cleanData: any = {
        code: data.code.trim(),
        nom: data.nom?.trim() || undefined,
        sexe: data.sexe,
        raceId: data.raceId,
        dateNaissance: data.dateNaissance || undefined,
        origine: data.origine,
        statut: data.sexe === 'male' && data.statut === 'disponible' ? 'actif' : data.statut,
        emplacement: data.emplacement?.trim() || undefined,
        poids: data.poids || undefined,
        observation: data.observation?.trim() || undefined,
        photo: photoUri || undefined,
      };

      if (data.origine === 'achete') {
        cleanData.prixAchat = data.prixAchat || undefined;
        cleanData.vendeur = data.vendeur?.trim() || undefined;
        cleanData.dateAchat = data.dateAchat || undefined;
      } else if (data.origine === 'recu') {
        cleanData.donateur = data.donateur?.trim() || undefined;
        cleanData.dateReception = data.dateReception || undefined;
      }

      await addReproducteur(cleanData);
      router.back();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer le reproducteur.');
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
    photoContainer: {
      alignItems: 'center',
      marginBottom: 20,
    },
    photoFrame: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    photoButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
    },
    photoBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceVariant,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
    },
    photoBtnText: {
      color: colors.textPrimary,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginLeft: 4,
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
          <Text style={styles.title}>Nouveau Reproducteur</Text>
        </View>

        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
          {/* Photo upload section */}
          <View style={styles.photoContainer}>
            <View style={styles.photoFrame}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Camera size={36} color={colors.textSecondary} />
              )}
            </View>
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage} activeOpacity={0.7}>
                <ImageIcon size={12} color={colors.textPrimary} />
                <Text style={styles.photoBtnText}>Galerie</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handleCaptureImage} activeOpacity={0.7}>
                <Camera size={12} color={colors.textPrimary} />
                <Text style={styles.photoBtnText}>Photo</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 1: Informations principales */}
          <Text style={styles.subtitle}>Informations principales</Text>

          <FormInput
            name="code"
            label="Code (Identifiant unique)"
            control={control}
            error={errors.code}
            placeholder="Ex: L-01, M-04..."
            type="text"
          />

          <FormInput
            name="nom"
            label="Nom (Surnom)"
            control={control}
            error={errors.nom}
            placeholder="Ex: Blanche, Gribouille..."
            type="text"
          />

          <FormInput
            name="sexe"
            label="Sexe"
            control={control}
            error={errors.sexe}
            type="select"
            options={sexeOptions}
          />

          {races.length > 0 ? (
            <FormInput
              name="raceId"
              label="Race"
              control={control}
              error={errors.raceId}
              type="select"
              options={raceOptions}
            />
          ) : (
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.error, fontSize: 13, fontWeight: '600' }}>
                Aucune race disponible. Veuillez d'abord en ajouter une.
              </Text>
            </View>
          )}

          <FormInput
            name="statut"
            label="Statut initial"
            control={control}
            error={errors.statut}
            type="select"
            options={statutOptions}
          />

          <FormInput
            name="emplacement"
            label="Emplacement (N° de cage)"
            control={control}
            error={errors.emplacement}
            placeholder="Ex: Cage 4, Batterie A..."
            type="text"
          />

          <FormInput
            name="poids"
            label="Poids Actuel (kg)"
            control={control}
            error={errors.poids}
            placeholder="Ex: 3.8"
            type="number"
          />

          <FormInput
            name="dateNaissance"
            label="Date de Naissance"
            control={control}
            error={errors.dateNaissance}
            placeholder="AAAA-MM-JJ"
            type="date"
          />

          {/* Section 2: Origine */}
          <Text style={styles.subtitle}>Origine du lapin</Text>

          <FormInput
            name="origine"
            label="Provenance"
            control={control}
            error={errors.origine}
            type="select"
            options={origineOptions}
          />

          {selectedOrigine === 'achete' && (
            <>
              <FormInput
                name="prixAchat"
                label="Prix d'achat (FCFA)"
                control={control}
                error={errors.prixAchat}
                placeholder="Ex: 10000"
                type="number"
              />
              <FormInput
                name="vendeur"
                label="Vendeur / Éleveur d'origine"
                control={control}
                error={errors.vendeur}
                placeholder="Nom du vendeur"
                type="text"
              />
              <FormInput
                name="dateAchat"
                label="Date d'achat"
                control={control}
                error={errors.dateAchat}
                placeholder="AAAA-MM-JJ"
                type="date"
              />
            </>
          )}

          {selectedOrigine === 'recu' && (
            <>
              <FormInput
                name="donateur"
                label="Donateur"
                control={control}
                error={errors.donateur}
                placeholder="Nom de la personne"
                type="text"
              />
              <FormInput
                name="dateReception"
                label="Date de réception"
                control={control}
                error={errors.dateReception}
                placeholder="AAAA-MM-JJ"
                type="date"
              />
            </>
          )}

          {/* Section 3: Observations */}
          <Text style={styles.subtitle}>Observations</Text>

          <FormInput
            name="observation"
            label="Remarques ou historique médical"
            control={control}
            error={errors.observation}
            placeholder="Observations diverses..."
            type="text"
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.btnCancel} onPress={() => router.back()} activeOpacity={0.7}>
              <Text style={styles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSubmit} onPress={handleSubmit(onSubmit)} activeOpacity={0.7}>
              <Text style={styles.btnSubmitText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
