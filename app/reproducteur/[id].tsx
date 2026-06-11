import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { useRabbitStore } from '../../lib/rabbitStore';
import { useReproductionStore } from '../../lib/reproductionStore';
import SanteHistory from '../../components/SanteHistory';
import FormInput from '../../components/FormInput';
import { ArrowLeft, Edit3, Trash2, Check, X, Camera, Image as ImageIcon, Mars, Venus, Tag, Calendar, Shield, Baby, Landmark } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';

const reproducteurEditSchema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  nom: z.string().optional(),
  sexe: z.enum(['male', 'femelle']),
  raceId: z.string().min(1, 'La race est requise'),
  dateNaissance: z.string().optional().or(z.literal('')),
  origine: z.enum(['ne_elevage', 'achete', 'recu', 'autre']),
  statut: z.enum(['disponible', 'saillie', 'gestante', 'allaitante', 'repos', 'reforme', 'decede', 'actif']),
  emplacement: z.string().optional(),
  poids: z.number().nullable().optional(),
  observation: z.string().optional(),
  prixAchat: z.number().nullable().optional(),
  vendeur: z.string().optional(),
  dateAchat: z.string().optional().or(z.literal('')),
  donateur: z.string().optional(),
  dateReception: z.string().optional().or(z.literal('')),
});

type RepEditFormValues = z.infer<typeof reproducteurEditSchema>;

export default function FicheReproducteurScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { reproducteurs, races, updateReproducteur, deleteReproducteur } = useRabbitStore();
  const { saillies, portees } = useReproductionStore();

  const [isEditing, setIsEditing] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showLitters, setShowLitters] = useState(false);

  const reproducteur = useMemo(() => {
    return reproducteurs.find((r) => r.id === id);
  }, [reproducteurs, id]);

  const race = useMemo(() => {
    return reproducteur ? races.find((r) => r.id === reproducteur.raceId) : null;
  }, [races, reproducteur]);

  // Formulaire d'édition
  const { control, handleSubmit, watch, reset, formState: { errors } } = useForm<RepEditFormValues>({
    resolver: zodResolver(reproducteurEditSchema),
  });

  const selectedOrigine = watch('origine');
  const selectedSexe = watch('sexe');

  // Peupler le formulaire
  useEffect(() => {
    if (reproducteur) {
      reset({
        code: reproducteur.code,
        nom: reproducteur.nom || '',
        sexe: reproducteur.sexe,
        raceId: reproducteur.raceId,
        dateNaissance: reproducteur.dateNaissance || '',
        origine: reproducteur.origine,
        statut: reproducteur.statut,
        emplacement: reproducteur.emplacement || '',
        poids: reproducteur.poids || null,
        observation: reproducteur.observation || '',
        prixAchat: reproducteur.prixAchat || null,
        vendeur: reproducteur.vendeur || '',
        dateAchat: reproducteur.dateAchat || '',
        donateur: reproducteur.donateur || '',
        dateReception: reproducteur.dateReception || '',
      });
      setPhotoUri(reproducteur.photo || null);
    }
  }, [reproducteur, isEditing]);

  if (!reproducteur) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>Reproducteur introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 12 }}>
          <Text style={{ color: colors.primary }}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Filtrer saillies et portées associées
  const femaleSaillies = saillies.filter((s) => s.femelleId === reproducteur.id);
  const maleSaillies = saillies.filter((s) => s.maleIds.includes(reproducteur.id));
  const rabbitSaillies = reproducteur.sexe === 'femelle' ? femaleSaillies : maleSaillies;

  const femalePortees = portees.filter((p) => p.femelleId === reproducteur.id);
  const rabbitPortees = reproducteur.sexe === 'femelle' ? femalePortees : [];

  const totalSaillies = rabbitSaillies.length;
  const totalPortees = rabbitPortees.length;
  const totalNes = rabbitPortees.reduce((sum, p) => sum + p.totalNes, 0);
  const totalVivants = rabbitPortees.reduce((sum, p) => sum + p.vivantsActuels, 0);

  const averageBorn = totalPortees > 0 ? (totalNes / totalPortees).toFixed(1) : '-';
  const survivalRate = totalNes > 0 ? ((totalVivants / totalNes) * 100).toFixed(0) + '%' : '-';

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Accès à la galerie requis.');
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
      Alert.alert('Permission requise', 'Accès à l\'appareil photo requis.');
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

  const handleDelete = () => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer définitivement ce reproducteur ? Cela n\'affectera pas l\'historique des portées.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteReproducteur(reproducteur.id);
            router.replace('/cheptel');
          },
        },
      ]
    );
  };

  const handleArchive = () => {
    Alert.alert(
      'Déclarer mort / réformé',
      'Voulez-vous marquer ce lapin comme réformé ou décédé ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Réformé',
          onPress: async () => {
            await updateReproducteur(reproducteur.id, { statut: 'reforme' });
          },
        },
        {
          text: 'Décédé',
          style: 'destructive',
          onPress: async () => {
            await updateReproducteur(reproducteur.id, { statut: 'decede' });
          },
        },
      ]
    );
  };

  const onSubmit = async (data: RepEditFormValues) => {
    try {
      await updateReproducteur(reproducteur.id, {
        code: data.code.trim(),
        nom: data.nom?.trim() || '',
        sexe: data.sexe,
        raceId: data.raceId,
        dateNaissance: data.dateNaissance || '',
        origine: data.origine,
        statut: data.statut,
        emplacement: data.emplacement?.trim() || '',
        poids: data.poids || undefined,
        observation: data.observation?.trim() || '',
        prixAchat: data.origine === 'achete' ? (data.prixAchat || undefined) : undefined,
        vendeur: data.origine === 'achete' ? data.vendeur?.trim() : '',
        dateAchat: data.origine === 'achete' ? data.dateAchat : '',
        donateur: data.origine === 'recu' ? data.donateur?.trim() : '',
        dateReception: data.origine === 'recu' ? data.dateReception : '',
        photo: photoUri || '',
      });
      setIsEditing(false);
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le reproducteur.');
      console.error(e);
    }
  };

  const getStatusBadgeColors = (statut: string) => {
    switch (statut) {
      case 'gestante':
        return { bg: colors.secondary + '20', text: colors.secondary };
      case 'allaitante':
        return { bg: colors.statusBreeding + '20', text: colors.statusBreeding };
      case 'disponible':
        return { bg: colors.primary + '20', text: colors.primary };
      case 'saillie':
        return { bg: colors.tertiary + '20', text: colors.tertiary };
      case 'decede':
      case 'reforme':
        return { bg: colors.error + '20', text: colors.error };
      default:
        return { bg: colors.surfaceVariant, text: colors.textSecondary };
    }
  };

  const badge = getStatusBadgeColors(reproducteur.statut);

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
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    avatar: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 2,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      marginRight: 16,
    },
    avatarText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: reproducteur.sexe === 'male' ? colors.secondary : colors.primary,
    },
    badge: {
      backgroundColor: badge.bg,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      alignSelf: 'flex-start',
      marginTop: 6,
    },
    badgeText: {
      color: badge.text,
      fontSize: 9,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    detailGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
      marginBottom: 16,
    },
    detailItem: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      width: '48%',
      marginHorizontal: '1%',
      marginBottom: 8,
    },
    detailLabel: {
      color: colors.textSecondary,
      fontSize: 10,
      textTransform: 'uppercase',
      fontWeight: '600',
    },
    detailValue: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
      marginTop: 4,
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
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    statsContainer: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
    },
    statVal: {
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.primary,
    },
    statLabel: {
      color: colors.textSecondary,
      fontSize: 9,
      textTransform: 'uppercase',
      marginTop: 4,
      fontWeight: '600',
    },
    collapsibleBtn: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surfaceVariant,
      padding: 12,
      borderRadius: 8,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      marginTop: 12,
    },
    collapsibleText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    litterItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomColor: colors.surfaceBorder,
      borderBottomWidth: 1,
      paddingVertical: 10,
    },
    litterCode: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    litterDate: {
      color: colors.textSecondary,
      fontSize: 11,
      marginTop: 2,
    },
    bottomActions: {
      marginTop: 16,
      marginBottom: 40,
      gap: 12,
    },
    primaryActionBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryActionText: {
      color: colors.onPrimary,
      fontSize: 14,
      fontWeight: 'bold',
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
              <Text style={styles.title}>Modifier Fiche</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
            {/* Photo Avatar in edit mode */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={[styles.avatar, { width: 90, height: 90, borderRadius: 45, marginRight: 0 }]}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Camera size={30} color={colors.textSecondary} />
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surfaceVariant, borderRadius: 16 }} onPress={handlePickImage} activeOpacity={0.7}>
                  <Text style={{ color: colors.textPrimary, fontSize: 10, fontWeight: '700' }}>Galerie</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surfaceVariant, borderRadius: 16 }} onPress={handleCaptureImage} activeOpacity={0.7}>
                  <Text style={{ color: colors.textPrimary, fontSize: 10, fontWeight: '700' }}>Photo</Text>
                </TouchableOpacity>
              </View>
            </View>

            <FormInput name="code" label="Code" control={control} error={errors.code} type="text" />
            <FormInput name="nom" label="Nom" control={control} error={errors.nom} type="text" />
            
            <FormInput
              name="sexe"
              label="Sexe"
              control={control}
              error={errors.sexe}
              type="select"
              options={[
                { label: 'Femelle', value: 'femelle' },
                { label: 'Mâle', value: 'male' }
              ]}
            />

            <FormInput
              name="raceId"
              label="Race"
              control={control}
              error={errors.raceId}
              type="select"
              options={races.map((r) => ({ label: r.nom, value: r.id }))}
            />

            <FormInput
              name="statut"
              label="Statut"
              control={control}
              error={errors.statut}
              type="select"
              options={
                selectedSexe === 'male'
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
                    ]
              }
            />

            <FormInput name="emplacement" label="Emplacement (Cage)" control={control} error={errors.emplacement} type="text" />
            <FormInput name="poids" label="Poids Actuel (kg)" control={control} error={errors.poids} type="number" />
            <FormInput name="dateNaissance" label="Date de naissance" control={control} error={errors.dateNaissance} type="date" />

            <FormInput
              name="origine"
              label="Provenance"
              control={control}
              error={errors.origine}
              type="select"
              options={[
                { label: 'Né à l\'élevage', value: 'ne_elevage' },
                { label: 'Acheté', value: 'achete' },
                { label: 'Reçu (Don)', value: 'recu' },
                { label: 'Autre', value: 'autre' }
              ]}
            />

            {selectedOrigine === 'achete' && (
              <>
                <FormInput name="prixAchat" label="Prix d'achat (FCFA)" control={control} error={errors.prixAchat} type="number" />
                <FormInput name="vendeur" label="Vendeur" control={control} error={errors.vendeur} type="text" />
                <FormInput name="dateAchat" label="Date d'achat" control={control} error={errors.dateAchat} type="date" />
              </>
            )}

            {selectedOrigine === 'recu' && (
              <>
                <FormInput name="donateur" label="Donateur" control={control} error={errors.donateur} type="text" />
                <FormInput name="dateReception" label="Date de réception" control={control} error={errors.dateReception} type="date" />
              </>
            )}

            <FormInput name="observation" label="Observations" control={control} error={errors.observation} type="text" />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
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
            <Text style={styles.title}>Fiche Reproducteur</Text>
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
          {/* Identity Header */}
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              {reproducteur.photo ? (
                <Image source={{ uri: reproducteur.photo }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={styles.avatarText}>{reproducteur.code.slice(0, 2)}</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: 'bold' }}>
                {reproducteur.code}
              </Text>
              {reproducteur.nom && (
                <Text style={{ color: colors.textSecondary, fontSize: 15, fontWeight: '600' }}>
                  {reproducteur.nom}
                </Text>
              )}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{reproducteur.statut}</Text>
              </View>
            </View>
          </View>

          {/* Details Grid */}
          <View style={styles.detailGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Sexe</Text>
              <Text style={[styles.detailValue, { flex: 1 }]}>
                {reproducteur.sexe === 'male' ? (
                  <Mars size={14} color={colors.secondary} />
                ) : (
                  <Venus size={14} color={colors.primary} />
                )}
                {' '}{reproducteur.sexe === 'male' ? 'Mâle' : 'Femelle'}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Race</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{race ? race.nom : 'Inconnue'}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Provenance</Text>
              <Text style={styles.detailValue}>{reproducteur.origine.replace('_', ' ')}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Cage / Emplacement</Text>
              <Text style={styles.detailValue}>{reproducteur.emplacement || '-'}</Text>
            </View>
            {reproducteur.poids && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Poids (kg)</Text>
                <Text style={styles.detailValue}>{reproducteur.poids} kg</Text>
              </View>
            )}
            {reproducteur.dateNaissance && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Date de naissance</Text>
                <Text style={[styles.detailValue, { fontFamily: 'System' }]}>
                  {format(new Date(reproducteur.dateNaissance), 'dd/MM/yyyy')}
                </Text>
              </View>
            )}
          </View>

          {/* Details Achat / Reception */}
          {reproducteur.origine === 'achete' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Détails d'achat</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: colors.textSecondary }}>Prix d'achat</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {reproducteur.prixAchat ? `${reproducteur.prixAchat.toLocaleString('fr-FR')} F` : '-'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: colors.textSecondary }}>Date d'achat</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {reproducteur.dateAchat ? format(new Date(reproducteur.dateAchat), 'dd/MM/yyyy') : '-'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textSecondary }}>Vendeur</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{reproducteur.vendeur || '-'}</Text>
              </View>
            </View>
          )}

          {reproducteur.origine === 'recu' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Détails de réception</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: colors.textSecondary }}>Donateur</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{reproducteur.donateur || '-'}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textSecondary }}>Date de réception</Text>
                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                  {reproducteur.dateReception ? format(new Date(reproducteur.dateReception), 'dd/MM/yyyy') : '-'}
                </Text>
              </View>
            </View>
          )}

          {/* Performance if female */}
          {reproducteur.sexe === 'femelle' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Performances</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                  <Text style={styles.statVal}>{averageBorn}</Text>
                  <Text style={styles.statLabel}>Moyenne nés</Text>
                </View>
                <View style={[styles.statBox, { borderLeftColor: colors.surfaceBorder, borderLeftWidth: 1 }]}>
                  <Text style={[styles.statVal, { color: colors.secondary }]}>{survivalRate}</Text>
                  <Text style={styles.statLabel}>Taux de survie</Text>
                </View>
              </View>

              <View style={[styles.statsContainer, { borderTopColor: colors.surfaceBorder, borderTopWidth: 1, marginTop: 12, paddingTop: 12 }]}>
                <View style={styles.statBox}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' }}>{totalSaillies}</Text>
                  <Text style={styles.statLabel}>Saillies</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' }}>{totalPortees}</Text>
                  <Text style={styles.statLabel}>Mises bas</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' }}>{totalNes}</Text>
                  <Text style={styles.statLabel}>Nés total</Text>
                </View>
              </View>

              {/* Litters collapsible list */}
              <TouchableOpacity
                style={styles.collapsibleBtn}
                onPress={() => setShowLitters(!showLitters)}
                activeOpacity={0.7}
              >
                <Text style={styles.collapsibleText}>
                  Afficher l'historique des portées ({totalPortees})
                </Text>
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>{showLitters ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showLitters && (
                <View style={{ marginTop: 8 }}>
                  {rabbitPortees.map((portee) => (
                    <TouchableOpacity
                      key={portee.id}
                      style={styles.litterItem}
                      onPress={() => router.push(`/portee/${portee.id}`)}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text style={styles.litterCode}>{portee.code}</Text>
                        <Text style={styles.litterDate}>
                          Mise bas : {format(new Date(portee.dateMiseBas), 'dd/MM/yyyy')}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: colors.secondary, fontWeight: 'bold', fontSize: 15 }}>
                          {portee.vivantsActuels} / {portee.totalNes}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 9, textTransform: 'uppercase' }}>
                          Vivants / Nés
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {rabbitPortees.length === 0 && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', textAlign: 'center', marginTop: 12 }}>
                      Aucune portée enregistrée.
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Sante History */}
          <SanteHistory subjectType="Reproducteur" subjectId={reproducteur.id} />

          {/* Actions at the bottom */}
          <View style={styles.bottomActions}>
            {reproducteur.sexe === 'femelle' && (
              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={() => router.push(`/saillie/new?femelleId=${reproducteur.id}`)}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryActionText}>Enregistrer une Saillie</Text>
              </TouchableOpacity>
            )}

            <View style={styles.rowButtons}>
              <TouchableOpacity style={styles.rowActionBtn} onPress={handleArchive} activeOpacity={0.7}>
                <Text style={styles.rowActionText}>Marquer mort / réformé</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rowActionBtn}
                onPress={() => {
                  Alert.alert('Observations', reproducteur.observation || 'Aucune observation enregistrée.');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.rowActionText}>Voir Observation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
