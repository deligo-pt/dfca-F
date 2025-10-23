import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';

const OTPInput = ({ length = 4, value, onChangeText, disabled = false }) => {
  const inputRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(null);

  const handleChange = (text, index) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');

    if (numericText.length === 0) {
      // Handle deletion
      const newValue = value.split('');
      newValue[index] = '';
      onChangeText(newValue.join(''));

      // Move to previous input
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (numericText.length === 1) {
      // Handle single digit input
      const newValue = value.split('');
      newValue[index] = numericText;
      onChangeText(newValue.join(''));

      // Move to next input
      if (index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (numericText.length > 1) {
      // Handle paste of multiple digits
      const digits = numericText.slice(0, length).split('');
      const newValue = value.split('');

      digits.forEach((digit, i) => {
        if (index + i < length) {
          newValue[index + i] = digit;
        }
      });

      onChangeText(newValue.join(''));

      // Focus the next empty box or the last box
      const nextIndex = Math.min(index + digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

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
            index < length - 1 ? { marginRight: 12 } : null,
            focusedIndex === index && styles.inputFocused,
            value[index] && styles.inputFilled,
          ]}
          value={value[index] || ''}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => setFocusedIndex(index)}
          onBlur={() => setFocusedIndex(null)}
          keyboardType="number-pad"
          maxLength={1}
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
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    fontSize: 24,
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
