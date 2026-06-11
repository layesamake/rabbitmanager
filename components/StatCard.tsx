import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../lib/theme';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  colorType?: 'primary' | 'secondary' | 'tertiary';
}

export default function StatCard({ title, value, icon, subtitle, colorType = 'primary' }: StatCardProps) {
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const getAccentColor = () => {
    switch (colorType) {
      case 'secondary': return colors.secondary;
      case 'tertiary': return colors.tertiary;
      default: return colors.primary;
    }
  };

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 20,
      padding: 16,
      flex: 1,
      margin: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    title: {
      color: colors.textSecondary,
      fontSize: 10,
      fontWeight: '600',
      fontFamily: 'System',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    value: {
      color: getAccentColor(),
      fontSize: 22,
      fontWeight: 'bold',
      fontFamily: 'System',
      marginBottom: 4,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {icon}
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}
