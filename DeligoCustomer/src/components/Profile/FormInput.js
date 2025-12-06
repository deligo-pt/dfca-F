// components/FormInput.js
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PropTypes from "prop-types";
import { useTheme } from "../../utils/ThemeContext";

const FormInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  iconName = null,
  iconOnPress = null,
  secureTextEntry = false,
  style,
  placeholderTextColor = "#999",
  disabled = false,
}) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.inputGroup, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputContainer,
          disabled && styles.disabledContainer,
          !disabled && {
            backgroundColor: colors.background,
            borderColor: colors.primary,
          },
        ]}
      >
        {iconName ? (
          iconOnPress ? (
            <TouchableOpacity
              onPress={iconOnPress}
              disabled={disabled}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name={iconName} size={20} color="#666" />
            </TouchableOpacity>
          ) : (
            <Ionicons name={iconName} size={20} color="#666" />
          )
        ) : null}

        <TextInput
          style={[styles.input, disabled && styles.disabledText]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          placeholderTextColor={placeholderTextColor}
          underlineColorAndroid="transparent"
          editable={!disabled} // <-- FIXED
        />
      </View>
    </View>
  );
};

FormInput.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChangeText: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  keyboardType: PropTypes.string,
  iconName: PropTypes.string,
  iconOnPress: PropTypes.func,
  secureTextEntry: PropTypes.bool,
  style: PropTypes.object,
  placeholderTextColor: PropTypes.string,
  disabled: PropTypes.bool,
};

export default FormInput;

const styles = StyleSheet.create({
  inputGroup: { marginBottom: 24 },

  label: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 8,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },

  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    marginLeft: 12,
    color: "#000",
  },
});
