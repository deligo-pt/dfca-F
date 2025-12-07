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
import { colors } from "../../theme";

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

  const dynamicStyles = {
    enabledContainer: {
      borderColor: colors.primary,
      backgroundColor: colors.background,
    },
    disabledContainer: {
      borderColor: "#ddd",
      backgroundColor: "#f3f3f3",
      opacity: 0.6,
    },
  };

  return (
    <View style={[styles.inputGroup, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          disabled
            ? dynamicStyles.disabledContainer
            : dynamicStyles.enabledContainer,
        ]}
      >
        {iconName && <Ionicons name={iconName} size={20} color="#666" />}

        <TextInput
          style={[styles.input]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          placeholderTextColor={placeholderTextColor}
          editable={!disabled}
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

  /* inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  }, */

  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    marginLeft: 12,
    color: "#000",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },

  enabledContainer: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },

  disabledContainer: {
    borderColor: "#ddd",
    backgroundColor: "#f3f3f3",
    opacity: 0.6,
  },
});
