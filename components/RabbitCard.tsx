import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useThemeStore } from '../lib/theme';
import { Mars, Venus, Tag } from 'lucide-react-native';
import type { Reproducteur } from '../types';

interface RabbitCardProps {
  rabbit: Reproducteur;
  raceName: string;
  onPress: () => void;
}

export default function RabbitCard({ rabbit, raceName, onPress }: RabbitCardProps) {
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const getBadgeStyles = (statut: string) => {
    switch (statut) {
      case 'gestante':
        return { bg: colors.secondary + '20', text: colors.secondary, border: colors.secondary + '40' };
      case 'allaitante':
        return { bg: colors.statusBreeding + '20', text: colors.statusBreeding, border: colors.statusBreeding + '40' };
      case 'actif':
        return { bg: colors.secondary + '10', text: colors.secondary, border: colors.secondary + '30' };
      case 'disponible':
        return { bg: colors.primary + '20', text: colors.primary, border: colors.primary + '40' };
      case 'saillie':
        return { bg: colors.tertiary + '20', text: colors.tertiary, border: colors.tertiary + '40' };
      case 'decede':
      case 'reforme':
        return { bg: colors.error + '20', text: colors.error, border: colors.error + '40' };
      default:
        return { bg: colors.surfaceVariant, text: colors.textSecondary, border: colors.surfaceBorder };
    }
  };

  const badge = getBadgeStyles(rabbit.statut);

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 20,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 8,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.surfaceBorder,
      overflow: 'hidden',
      marginRight: 16,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      color: rabbit.sexe === 'male' ? colors.secondary : colors.primary,
    },
    photo: {
      width: '100%',
      height: '100%',
    },
    infoContainer: {
      flex: 1,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    code: {
      fontSize: 15,
      fontWeight: 'bold',
      color: colors.primary,
      fontFamily: 'System',
    },
    badge: {
      backgroundColor: badge.bg,
      borderColor: badge.border,
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: {
      color: badge.text,
      fontSize: 9,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    details: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
    },
    nameText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    tagContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    tagText: {
      color: colors.textSecondary,
      fontSize: 11,
      marginLeft: 4,
    },
  });

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {/* Avatar / Photo */}
      <View style={styles.avatar}>
        {rabbit.photo ? (
          <Image source={{ uri: rabbit.photo }} style={styles.photo} />
        ) : (
          <Text style={styles.avatarText}>{rabbit.code.slice(0, 2)}</Text>
        )}
      </View>

      {/* Info details */}
      <View style={styles.infoContainer}>
        <View style={styles.row}>
          <Text style={styles.code}>{rabbit.code}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{rabbit.statut}</Text>
          </View>
        </View>

        <View style={styles.details}>
          {rabbit.sexe === 'male' ? (
            <Mars size={14} color={colors.secondary} style={{ marginRight: 4 }} />
          ) : (
            <Venus size={14} color={colors.primary} style={{ marginRight: 4 }} />
          )}
          <Text style={styles.nameText} numberOfLines={1}>
            {rabbit.sexe === 'male' ? 'Mâle' : 'Femelle'}
            {rabbit.nom ? ` - ${rabbit.nom}` : ''}
            {`, ${raceName}`}
          </Text>
        </View>

        {rabbit.emplacement && (
          <View style={styles.tagContainer}>
            <Tag size={12} color={colors.textSecondary} />
            <Text style={styles.tagText}>Cage {rabbit.emplacement}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
