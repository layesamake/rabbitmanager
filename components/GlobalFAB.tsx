import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal, Text, Animated, Dimensions, TouchableWithoutFeedback, Platform } from 'react-native';
import { Plus, X, Users, HeartPulse, Baby, ClipboardPlus, Landmark } from 'lucide-react-native';
import { useThemeStore } from '../lib/theme';
import { useRouter } from 'expo-router';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function GlobalFAB() {
  const [isVisible, setIsVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(SCREEN_HEIGHT));
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;
  const router = useRouter();

  const openSheet = () => {
    setIsVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 8,
    }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIsVisible(false));
  };

  const navigateTo = (path: any) => {
    closeSheet();
    setTimeout(() => {
      router.push(path);
    }, 300); // Wait for animation to finish
  };

  const styles = StyleSheet.create({
    fabContainer: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 90 : 80,
      right: 20,
      zIndex: 1000,
    },
    fab: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      padding: 24,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 10,
    },
    handle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.surfaceBorder,
      alignSelf: 'center',
      marginBottom: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 20,
      fontWeight: 'bold',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    actionItem: {
      width: '48%',
      backgroundColor: colors.surfaceCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    actionIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    actionText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
    },
  });

  return (
    <>
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={openSheet}>
          <Plus size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSheet}
      >
        <TouchableWithoutFeedback onPress={closeSheet}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.sheet,
                  { transform: [{ translateY: slideAnim }] }
                ]}
              >
                <View style={styles.handle} />
                
                <View style={styles.header}>
                  <Text style={styles.title}>Nouveau...</Text>
                  <TouchableOpacity onPress={closeSheet}>
                    <X size={24} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.grid}>
                  <TouchableOpacity 
                    style={styles.actionItem} 
                    activeOpacity={0.7}
                    onPress={() => navigateTo('/reproducteur/new')}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: `${colors.primary}20` }]}>
                      <Users size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.actionText}>Sujet</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionItem} 
                    activeOpacity={0.7}
                    onPress={() => navigateTo('/saillie/new')}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: `${colors.secondary}20` }]}>
                      <HeartPulse size={24} color={colors.secondary} />
                    </View>
                    <Text style={styles.actionText}>Saillie</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionItem} 
                    activeOpacity={0.7}
                    onPress={() => navigateTo('/portee/new')}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: `${colors.tertiary}20` }]}>
                      <Baby size={24} color={colors.tertiary} />
                    </View>
                    <Text style={styles.actionText}>Portée</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionItem} 
                    activeOpacity={0.7}
                    onPress={() => navigateTo('/sante/new')}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: `${colors.primary}20` }]}>
                      <ClipboardPlus size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.actionText}>Traitement</Text>
                  </TouchableOpacity>
                  
                  {/* Optionnel: Dépense / Recette 
                  <TouchableOpacity 
                    style={[styles.actionItem, { width: '100%', flexDirection: 'row', justifyContent: 'center' }]} 
                    activeOpacity={0.7}
                    onPress={() => navigateTo('/finance')}
                  >
                    <View style={[styles.actionIconContainer, { backgroundColor: `${colors.secondary}20`, marginRight: 16, marginBottom: 0 }]}>
                      <Landmark size={24} color={colors.secondary} />
                    </View>
                    <Text style={styles.actionText}>Dépense / Recette</Text>
                  </TouchableOpacity>
                  */}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
