import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';

/**
 * OTPInput Component
 * 
 * segmented input for OTP entry.
 * Handles auto-focus switching and clipboard paste events.
 * 
 * @param {Object} props
 * @param {number} [props.length=4] - Digit count.
 * @param {string} props.value - Current entry.
 * @param {Function} props.onChangeText - Value change handler.
 * @param {boolean} [props.disabled=false] - Disable input.
 */
const OTPInput = ({ length = 4, value, onChangeText, disabled = false }) => {
  const inputRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(null);

  /**
   * Handles individual character input and focus management.
   * Supports standard typing, backspace, and pasting full codes.
   */
  const handleChange = (text, index) => {
    // Sanitize input to numbers only
    const numericText = text.replace(/[^0-9]/g, '');

    if (numericText.length === 0) {
      // Deletion logic
      const newValue = value.split('');
      newValue[index] = '';
      onChangeText(newValue.join(''));

      // Move focus backward on delete
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (numericText.length === 1) {
      // Single character entry
      const newValue = value.split('');
      newValue[index] = numericText;
      onChangeText(newValue.join(''));

      // Move focus forward
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (numericText.length > 1) {
      // Paste Logic: Distribute characters across inputs
      const digits = numericText.slice(0, length).split('');
      const newValue = value.split('');

      digits.forEach((digit, i) => {
        if (index + i < length) {
          newValue[index + i] = digit;
        }
      });

      onChangeText(newValue.join(''));

      // Set focus to the end of the pasted sequence
      const nextIndex = Math.min(index + digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  /**
   * Handles special key events, primarily for backspace navigation logic when a field is empty.
   */
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          style={[
            styles.input,
            index < length - 1 ? { marginRight: 8 } : null,
            focusedIndex === index && styles.inputFocused,
            value[index] && styles.inputFilled,
          ]}
          value={value[index] || ''}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
          keyboardType="number-pad"
          maxLength={1} // Actual length handled in onChangeText to support paste
          selectTextOnFocus
          editable={!disabled}
          textAlign="center"
          textAlignVertical={Platform.OS === 'android' ? 'center' : 'auto'}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#222',
    backgroundColor: '#FAFAFA',
    textAlign: 'center',
    paddingVertical: 0,
  },
  inputFocused: {
    borderColor: '#E91E63',
    backgroundColor: '#FFF',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  inputFilled: {
    borderColor: '#E91E63',
    backgroundColor: '#FCE4EC',
  },
});

export default OTPInput;
