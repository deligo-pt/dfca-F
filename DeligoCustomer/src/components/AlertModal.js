import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/ThemeContext";
import { useLanguage } from "../utils/LanguageContext";

const { width } = Dimensions.get("window");

/**
 * AlertModal Component
 *
 * A generalized modal for presenting alerts, warnings, or confirmations.
 *
 * @param {Object} props
 * @param {boolean} props.visible - Modal visibility flag.
 * @param {string} props.title - Alert header text.
 * @param {string} props.message - Alert body text.
 * @param {string} [props.icon='alert-circle'] - Ionicons name.
 * @param {string} [props.iconColor] - Custom icon tint.
 * @param {Function} props.onClose - Dismissal handler.
 * @param {Array<{text: string, style?: 'cancel'|'default', onPress?: Function}>} [props.buttons] - Custom action buttons.
 */
const AlertModal = ({
  visible,
  title,
  message,
  icon = "alert-circle",
  iconColor,
  onClose,
  buttons,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[styles.modalContainer, { backgroundColor: colors.surface }]}
        >
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: (iconColor || colors.primary) + "15" },
            ]}
          >
            <Ionicons
              name={icon}
              size={48}
              color={iconColor || colors.primary}
            />
          </View>

          <Text style={[styles.title, { color: colors.text.primary }]}>
            {title}
          </Text>

          <Text style={[styles.message, { color: colors.text.secondary }]}>
            {message}
          </Text>

          {buttons && buttons.length > 0 ? (
            <View style={styles.buttonContainer}>
              {buttons.map((btn, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    btn.style === "cancel"
                      ? styles.cancelButton
                      : { backgroundColor: colors.primary },
                    { flex: 1, marginHorizontal: 6 },
                  ]}
                  onPress={() => {
                    if (btn.onPress) btn.onPress();
                    onClose();
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      btn.style === "cancel" && { color: colors.text.primary },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>{t("ok") || "OK"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 99999999999,
  },
  modalContainer: {
    width: Math.min(width - 40, 340),
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 8,
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
});

export default AlertModal;
