import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Modal, FlatList, SafeAreaView } from 'react-native';
import { Control, Controller, FieldError } from 'react-hook-form';
import { useThemeStore } from '../lib/theme';
import { ChevronDown, Calendar } from 'lucide-react-native';

interface FormInputProps {
  name: string;
  label: string;
  control: any;
  error?: any;
  placeholder?: string;
  type?: 'text' | 'number' | 'select' | 'date';
  options?: { label: string; value: string }[]; // Pour type='select'
  keyboardType?: 'default' | 'numeric';
}

export default function FormInput({
  name,
  label,
  control,
  error,
  placeholder,
  type = 'text',
  options = [],
}: FormInputProps) {
  const { currentTheme } = useThemeStore();
  const colors = currentTheme.colors;
  const [modalVisible, setModalVisible] = useState(false);

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontFamily: 'System',
    },
    inputContainer: {
      backgroundColor: colors.surfaceCard,
      borderColor: error ? colors.error : colors.surfaceBorder,
      borderWidth: 1,
      borderRadius: 8,
      height: 48,
      justifyContent: 'center',
      paddingHorizontal: 12,
    },
    textInput: {
      color: colors.textPrimary,
      fontSize: 15,
      height: '100%',
      width: '100%',
    },
    errorText: {
      color: colors.error,
      fontSize: 11,
      marginTop: 4,
      fontWeight: '500',
    },
    selectContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    selectText: {
      color: colors.textPrimary,
      fontSize: 15,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.surfaceCard,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '60%',
      paddingBottom: 24,
    },
    modalHeader: {
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
      padding: 16,
      alignItems: 'center',
    },
    modalTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: 'bold',
    },
    optionItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceBorder,
    },
    optionText: {
      color: colors.textPrimary,
      fontSize: 15,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, value } }) => {
          if (type === 'select') {
            const selectedOption = options.find((o) => o.value === value);
            return (
              <>
                <TouchableOpacity
                  style={styles.inputContainer}
                  onPress={() => setModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.selectContainer}>
                    <Text style={[styles.selectText, !value && { color: colors.textSecondary }]}>
                      {selectedOption ? selectedOption.label : placeholder || 'Sélectionner...'}
                    </Text>
                    <ChevronDown size={20} color={colors.textSecondary} />
                  </View>
                </TouchableOpacity>

                <Modal
                  visible={modalVisible}
                  transparent={true}
                  animationType="slide"
                  onRequestClose={() => setModalVisible(false)}
                >
                  <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                  >
                    <View style={styles.modalContent}>
                      <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{label}</Text>
                      </View>
                      <FlatList
                        data={options}
                        keyExtractor={(item) => item.value}
                        renderItem={({ item }) => (
                          <TouchableOpacity
                            style={styles.optionItem}
                            onPress={() => {
                              onChange(item.value);
                              setModalVisible(false);
                            }}
                          >
                            <Text style={styles.optionText}>{item.label}</Text>
                          </TouchableOpacity>
                        )}
                      />
                    </View>
                  </TouchableOpacity>
                </Modal>
              </>
            );
          }

          if (type === 'date') {
            // Un sélecteur de date simplifié à l'aide d'un champ texte standard YYYY-MM-DD
            return (
              <View style={[styles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder={placeholder || 'AAAA-MM-JJ'}
                  placeholderTextColor={colors.textSecondary}
                  value={value || ''}
                  onChangeText={onChange}
                  keyboardType="numeric"
                  maxLength={10}
                />
                <Calendar size={18} color={colors.textSecondary} style={{ marginLeft: 8 }} />
              </View>
            );
          }

          return (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={placeholder}
                placeholderTextColor={colors.textSecondary}
                value={value !== undefined && value !== null ? String(value) : ''}
                onChangeText={(text) => {
                  if (type === 'number') {
                    onChange(text === '' ? null : Number(text));
                  } else {
                    onChange(text);
                  }
                }}
                keyboardType={type === 'number' ? 'numeric' : 'default'}
              />
            </View>
          );
        }}
      />

      {error && <Text style={styles.errorText}>{error.message}</Text>}
    </View>
  );
}
