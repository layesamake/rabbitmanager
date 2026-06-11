import { Tabs } from 'expo-router';
import { useThemeStore } from '../../lib/theme';
import { Home, ClipboardList, Flame, HeartPulse, Landmark } from 'lucide-react-native';
import GlobalFAB from '../../components/GlobalFAB';

export default function TabsLayout() {
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surfaceCard,
            borderTopWidth: 0,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 10,
            height: 65,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'System',
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="cheptel"
          options={{
            title: 'Cheptel',
            tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="reproduction"
          options={{
            title: 'Repro',
            tabBarIcon: ({ color, size }) => <Flame color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="sante"
          options={{
            title: 'Santé',
            tabBarIcon: ({ color, size }) => <HeartPulse color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="finance"
          options={{
            title: 'Finance',
            tabBarIcon: ({ color, size }) => <Landmark color={color} size={size} />,
          }}
        />
      </Tabs>
      <GlobalFAB />
    </>
  );
}
