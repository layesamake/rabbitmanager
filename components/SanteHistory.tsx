import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../lib/theme';
import { useSanteStore } from '../lib/santeStore';
import { Shield, Plus, CheckCircle } from 'lucide-react-native';
import { format } from 'date-fns';

interface SanteHistoryProps {
  subjectType: 'Reproducteur' | 'Portee';
  subjectId: string;
}

export default function SanteHistory({ subjectType, subjectId }: SanteHistoryProps) {
  const router = useRouter();
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;

  const { traitements } = useSanteStore();

  const filteredTraitements = traitements
    .filter((t) => t.sujetType === subjectType && (!t.sujetId || t.sujetId === subjectId))
    .sort((a, b) => new Date(b.datePrevue).getTime() - new Date(a.datePrevue).getTime());

  const styles = StyleSheet.create({
    container: {
      marginTop: 24,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    card: {
      backgroundColor: colors.surfaceCard,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 12,
      padding: 16,
    },
    emptyText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: 16,
    },
    historyItem: {
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
      paddingVertical: 10,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    itemTitle: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
      marginLeft: 8,
      flex: 1,
    },
    badge: {
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    badgeText: {
      color: colors.textSecondary,
      fontSize: 8,
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    itemFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingLeft: 24,
      marginTop: 4,
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 11,
    },
    seeAllText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 12,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
      borderTopColor: colors.surfaceBorder,
      borderTopWidth: 1,
      paddingTop: 16,
    },
    actionBtn: {
      flex: 1,
      backgroundColor: colors.surfaceVariant,
      borderColor: colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      height: 36,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionBtnText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 6,
    },
  });

  const displayList = filteredTraitements.slice(0, 5);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Historique Sanitaire</Text>
      <View style={styles.card}>
        {filteredTraitements.length === 0 ? (
          <Text style={styles.emptyText}>Aucun historique sanitaire pour ce sujet.</Text>
        ) : (
          <View>
            {displayList.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.historyItem}
                onPress={() => router.push(`/sante/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleRow}>
                    <Shield size={14} color={colors.secondary} />
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {item.nomProduit}
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.statut}</Text>
                  </View>
                </View>
                <View style={styles.itemFooter}>
                  <Text style={styles.footerText}>{item.typeAction}</Text>
                  <Text style={styles.footerText}>
                    {format(new Date(item.dateRealisation || item.datePrevue), 'dd/MM/yyyy')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {filteredTraitements.length > 5 && (
              <TouchableOpacity onPress={() => router.push('/sante')} activeOpacity={0.7}>
                <Text style={styles.seeAllText}>Voir tout l'historique dans le module Santé</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/sante/new')}
            activeOpacity={0.7}
          >
            <Plus size={14} color={colors.primary} />
            <Text style={styles.actionBtnText}>Nouveau</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => router.push('/sante/fait')}
            activeOpacity={0.7}
          >
            <CheckCircle size={14} color={colors.secondary} />
            <Text style={styles.actionBtnText}>Marquer fait</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
