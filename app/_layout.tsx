import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { initDatabase } from '../lib/db';
import { useThemeStore } from '../lib/theme';
import { useRabbitStore } from '../lib/rabbitStore';
import { useReproductionStore } from '../lib/reproductionStore';
import { useFinanceStore } from '../lib/financeStore';
import { useSanteStore } from '../lib/santeStore';
import { useAlerteStore } from '../lib/alerteStore';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const { currentTheme, loadTheme } = useThemeStore();
  const loadRaces = useRabbitStore((state) => state.loadRaces);
  const loadReproducteurs = useRabbitStore((state) => state.loadReproducteurs);
  const loadSaillies = useReproductionStore((state) => state.loadSaillies);
  const loadPortees = useReproductionStore((state) => state.loadPortees);
  const loadMortalites = useReproductionStore((state) => state.loadMortalites);
  const loadDepenses = useFinanceStore((state) => state.loadDepenses);
  const loadRecettes = useFinanceStore((state) => state.loadRecettes);
  const loadDepensesRecurrentes = useFinanceStore((state) => state.loadDepensesRecurrentes);
  const processRecurrences = useFinanceStore((state) => state.processRecurrences);
  const loadTraitements = useSanteStore((state) => state.loadTraitements);
  const loadAlertes = useAlerteStore((state) => state.loadAlertes);
  const loadRappels = useAlerteStore((state) => state.loadRappels);
  const loadParametres = useAlerteStore((state) => state.loadParametres);

  useEffect(() => {
    async function prepare() {
      try {
        await loadTheme();
        await initDatabase();
        
        // Charger toutes les données SQLite en mémoire dans nos stores Zustand
        await Promise.all([
          loadRaces(),
          loadReproducteurs(),
          loadSaillies(),
          loadPortees(),
          loadMortalites(),
          loadDepenses(),
          loadRecettes(),
          loadDepensesRecurrentes(),
          loadTraitements(),
          loadAlertes(),
          loadRappels(),
          loadParametres(),
        ]);
        
        // Traiter les dépenses récurrentes en arrière-plan
        await processRecurrences();
      } catch (e) {
        console.error("Erreur lors de l'initialisation de l'application", e);
      } finally {
        setDbReady(true);
      }
    }

    prepare();
  }, []);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: currentTheme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="reproducteur/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="reproducteur/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="saillie/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="saillie/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="portee/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="portee/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="sante/[id]" options={{ presentation: 'card' }} />
      <Stack.Screen name="sante/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="sante/edit/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="sante/fait" options={{ presentation: 'card' }} />
      <Stack.Screen name="race/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="parametres" options={{ presentation: 'card' }} />
      <Stack.Screen name="alertes" options={{ presentation: 'card' }} />
    </Stack>
  );
}
