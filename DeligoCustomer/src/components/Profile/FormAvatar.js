import React from "react";
import { View, Image, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const Avatar = ({
  uri,
  size = 100,
  isEditing = false,
  onChangePhoto = () => {},
  colors,
}) => {
  return (
    <View style={{ alignItems: "center", marginBottom: 30 }}>
      {/* Avatar Image */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors?.border || "#ccc",
        }}
      >
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} />
      </View>

      {/* Change Photo Button */}
      {isEditing && (
        <TouchableOpacity
          onPress={onChangePhoto}
          style={{
            marginTop: 12,
            flexDirection: "row",
            alignItems: "center",
            padding: 10,
            backgroundColor: colors?.surface,
            borderColor: colors?.border,
            borderWidth: 1,
            borderRadius: 10,
          }}
        >
          <Ionicons name="camera" size={20} color={colors?.primary} />
          <Text style={{ marginLeft: 8, color: colors?.primary }}>
            Change Photo
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default Avatar;
