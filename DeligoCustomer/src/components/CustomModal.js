import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

const CustomModal = ({ visible, title, message, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel', onlyConfirm = false }) => {
  const { colors } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      width: '80%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      // Shadow for iOS
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      // Elevation for Android
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontFamily: 'Poppins-Bold',
      fontSize: 18,
      marginBottom: 12,
      color: colors.text.primary,
      textAlign: 'center',
    },
    message: {
      fontFamily: 'Poppins-Regular',
      fontSize: 15,
      color: colors.text.secondary,
      marginBottom: 24,
      textAlign: 'center',
      lineHeight: 22,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      width: '100%',
      gap: 12,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 80,
    },
    cancelButton: {
      backgroundColor: 'transparent',
    },
    confirmButton: {
      backgroundColor: colors.primary,
    },
    confirmText: {
      color: colors.text.white,
      fontFamily: 'Poppins-SemiBold',
      fontSize: 14,
    },
    cancelText: {
      color: colors.text.secondary,
      fontFamily: 'Poppins-Medium',
      fontSize: 14,
    },
  }), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {!onlyConfirm && (
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
                <Text style={styles.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomModal;

