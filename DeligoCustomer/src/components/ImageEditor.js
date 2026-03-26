import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  PanResponder,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const EDITOR_SIZE = SCREEN_WIDTH - 40;

/**
 * ImageEditor Component
 *
 * Modal interface for basic image manipulation.
 * Supports cropping, rotating, and flipping images using gesture controls.
 * Uses `expo-image-manipulator` for efficient processing.
 *
 * @param {Object} props
 * @param {boolean} props.visible - Controls modal visibility.
 * @param {string} props.imageUri - The image source URI.
 * @param {Function} props.onConfirm - Callback with edited image URI.
 * @param {Function} props.onCancel - Callback to close editor.
 * @param {Object} props.colors - Theme colors.
 */
const ImageEditor = ({ visible, imageUri, onConfirm, onCancel, colors }) => {
  const insets = useSafeAreaInsets();
  const [cropMode, setCropMode] = useState(false);
  const [editedImageUri, setEditedImageUri] = useState(imageUri);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [cropArea, setCropArea] = useState(null);

  // References for tracking touch gestures without triggering re-renders
  const startDrag = useRef({ x: 0, y: 0 });
  const startResize = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const cropAreaRef = useRef(null);

  // Synchronize ref with state for PanResponder access
  useEffect(() => {
    cropAreaRef.current = cropArea;
  }, [cropArea]);

  // Load image dimensions on mount
  useEffect(() => {
    if (imageUri) {
      Image.getSize(
        imageUri,
        (width, height) => {
          setImageDimensions({ width, height });
        },
        (error) => {
          console.error(
            "ImageEditor: Failed to retrieve image dimensions",
            error,
          );
        },
      );
    }
  }, [imageUri]);

  // Calculate the render position of the image within the editor frame
  const getImageDisplayRect = () => {
    const { width: imgWidth, height: imgHeight } = imageDimensions;
    if (!imgWidth || !imgHeight) return null;

    const scale = Math.min(EDITOR_SIZE / imgWidth, EDITOR_SIZE / imgHeight);
    const scaledWidth = imgWidth * scale;
    const scaledHeight = imgHeight * scale;
    const offsetX = (EDITOR_SIZE - scaledWidth) / 2;
    const offsetY = (EDITOR_SIZE - scaledHeight) / 2;

    return {
      x: offsetX,
      y: offsetY,
      width: scaledWidth,
      height: scaledHeight,
      scale,
    };
  };

  const handleCrop = async () => {
    try {
      const displayRect = getImageDisplayRect();
      if (!displayRect || !cropArea) {
        return;
      }

      // Map display coordinates back to original image coordinates
      const { x: displayX, y: displayY, scale } = displayRect;
      const {
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      } = cropArea;

      const actualX = (cropX - displayX) / scale;
      const actualY = (cropY - displayY) / scale;
      const actualWidth = cropWidth / scale;
      const actualHeight = cropHeight / scale;

      // Constrain to image bounds to prevent errors
      const { width: imgWidth, height: imgHeight } = imageDimensions;
      const clampedX = Math.max(0, Math.min(actualX, imgWidth - actualWidth));
      const clampedY = Math.max(0, Math.min(actualY, imgHeight - actualHeight));
      const clampedWidth = Math.min(actualWidth, imgWidth - clampedX);
      const clampedHeight = Math.min(actualHeight, imgHeight - clampedY);

      const result = await ImageManipulator.manipulateAsync(
        editedImageUri || imageUri,
        [
          {
            crop: {
              originX: clampedX,
              originY: clampedY,
              width: clampedWidth,
              height: clampedHeight,
            },
          },
        ],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      setEditedImageUri(result.uri);
      setCropMode(false);
      setCropArea(null);
    } catch (error) {
      console.error("ImageEditor: Crop operation failed", error);
    }
  };

  const handleRotate = async () => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        editedImageUri || imageUri,
        [{ rotate: 90 }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      setEditedImageUri(result.uri);
    } catch (error) {
      console.error("ImageEditor: Rotate operation failed", error);
    }
  };

  const handleFlip = async () => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        editedImageUri || imageUri,
        [{ flip: "horizontal" }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
      );
      setEditedImageUri(result.uri);
    } catch (error) {
      console.error("ImageEditor: Flip operation failed", error);
    }
  };

  const handleConfirm = () => {
    onConfirm(editedImageUri || imageUri);
  };

  const handleReset = () => {
    setEditedImageUri(imageUri);
    setCropMode(false);
  };

  const initializeCropArea = () => {
    const displayRect = getImageDisplayRect();
    if (!displayRect) return;

    const {
      x: displayX,
      y: displayY,
      width: displayWidth,
      height: displayHeight,
    } = displayRect;
    const cropSize = Math.min(displayWidth, displayHeight) * 0.8;

    setCropArea({
      x: displayX + (displayWidth - cropSize) / 2,
      y: displayY + (displayHeight - cropSize) / 2,
      width: cropSize,
      height: cropSize,
    });
  };

  const handleCropModeToggle = () => {
    if (!cropMode) {
      initializeCropArea();
    } else {
      setCropArea(null);
    }
    setCropMode(!cropMode);
  };

  /**
   * Gesture Handlers
   *
   * Manages drag and resize interactions for the crop selection area.
   * - dragPanResponder: Moves the entire selection.
   * - resizePanResponders: Adjust dimensions from specific corners.
   */
  const dragPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (!cropAreaRef.current) return;
        startDrag.current = {
          x: cropAreaRef.current.x,
          y: cropAreaRef.current.y,
        };
      },
      onPanResponderMove: (e, gestureState) => {
        if (!cropAreaRef.current) return;
        const newX = startDrag.current.x + gestureState.dx;
        const newY = startDrag.current.y + gestureState.dy;
        setCropArea({
          ...cropAreaRef.current,
          x: newX,
          y: newY,
        });
      },
      onPanResponderRelease: () => {},
    }),
  ).current;

  // Corner resize handlers
  const createResizeResponder = (adjustX, adjustY, adjustW, adjustH) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (!cropAreaRef.current) return;
        startResize.current = { ...cropAreaRef.current };
      },
      onPanResponderMove: (e, gestureState) => {
        if (!cropAreaRef.current) return;
        const { dx, dy } = gestureState;

        const newX = startResize.current.x + (adjustX ? dx : 0);
        const newY = startResize.current.y + (adjustY ? dy : 0);
        const newWidth = Math.max(
          50,
          startResize.current.width + (adjustW ? dx * adjustW : 0),
        );
        const newHeight = Math.max(
          50,
          startResize.current.height + (adjustH ? dy * adjustH : 0),
        );

        setCropArea({
          ...cropAreaRef.current,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      },
    });

  const topLeftPanResponder = useRef(
    createResizeResponder(true, true, -1, -1),
  ).current;
  const topRightPanResponder = useRef(
    createResizeResponder(false, true, 1, -1),
  ).current;
  const bottomLeftPanResponder = useRef(
    createResizeResponder(true, false, -1, 1),
  ).current;
  const bottomRightPanResponder = useRef(
    createResizeResponder(false, false, 1, 1),
  ).current;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />

        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              paddingTop:
                Platform.OS === "ios"
                  ? insets.top
                  : StatusBar.currentHeight + 10,
            },
          ]}
        >
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Edit Photo
          </Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.headerButton}>
            <Ionicons name="checkmark" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Editor Canvas */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: editedImageUri || imageUri }}
            style={styles.image}
            resizeMode="contain"
            onError={(error) => {
              console.error("ImageEditor: Render error", error);
            }}
          />
          {cropMode && cropArea && (
            <>
              {/* Dimmed Background Overlay */}
              <View style={styles.cropOverlay}>
                <View
                  style={[
                    styles.overlay,
                    {
                      top: 0,
                      left: 0,
                      right: 0,
                      height: cropArea.y,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      pointerEvents: "none",
                    },
                  ]}
                />
                <View
                  style={[
                    styles.overlay,
                    {
                      bottom: 0,
                      left: 0,
                      right: 0,
                      top: cropArea.y + cropArea.height,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      pointerEvents: "none",
                    },
                  ]}
                />
                <View
                  style={[
                    styles.overlay,
                    {
                      top: cropArea.y,
                      left: 0,
                      width: cropArea.x,
                      height: cropArea.height,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      pointerEvents: "none",
                    },
                  ]}
                />
                <View
                  style={[
                    styles.overlay,
                    {
                      top: cropArea.y,
                      right: 0,
                      left: cropArea.x + cropArea.width,
                      height: cropArea.height,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      pointerEvents: "none",
                    },
                  ]}
                />
              </View>

              {/* Active Crop Rectangle & Handles */}
              <View
                style={[
                  styles.cropContainer,
                  {
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height,
                  },
                ]}
                {...dragPanResponder.panHandlers}
              >
                <View
                  style={[styles.handle, styles.topLeftHandle]}
                  {...topLeftPanResponder.panHandlers}
                />
                <View
                  style={[styles.handle, styles.topRightHandle]}
                  {...topRightPanResponder.panHandlers}
                />
                <View
                  style={[styles.handle, styles.bottomLeftHandle]}
                  {...bottomLeftPanResponder.panHandlers}
                />
                <View
                  style={[styles.handle, styles.bottomRightHandle]}
                  {...bottomRightPanResponder.panHandlers}
                />
              </View>
            </>
          )}
        </View>

        {/* Editing Tools Bar */}
        <View
          style={[styles.toolsContainer, { backgroundColor: colors.surface }]}
        >
          <View style={styles.toolsRow}>
            <TouchableOpacity
              style={[
                styles.toolButton,
                cropMode && { backgroundColor: colors.primary + "20" },
              ]}
              onPress={handleCropModeToggle}
            >
              <Ionicons
                name="crop"
                size={24}
                color={cropMode ? colors.primary : colors.text.primary}
              />
              <Text
                style={[
                  styles.toolText,
                  { color: cropMode ? colors.primary : colors.text.primary },
                ]}
              >
                Crop
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton} onPress={handleRotate}>
              <Ionicons name="refresh" size={24} color={colors.text.primary} />
              <Text style={[styles.toolText, { color: colors.text.primary }]}>
                Rotate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton} onPress={handleFlip}>
              <Ionicons
                name="swap-horizontal"
                size={24}
                color={colors.text.primary}
              />
              <Text style={[styles.toolText, { color: colors.text.primary }]}>
                Flip
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton} onPress={handleReset}>
              <Ionicons
                name="arrow-undo"
                size={24}
                color={colors.text.primary}
              />
              <Text style={[styles.toolText, { color: colors.text.primary }]}>
                Reset
              </Text>
            </TouchableOpacity>
          </View>

          {cropMode && (
            <View style={styles.cropOptions}>
              <Text
                style={[
                  styles.cropOptionsTitle,
                  { color: colors.text.primary },
                ]}
              >
                Adjust selection or use handles to resize
              </Text>
              <View style={styles.cropActions}>
                <TouchableOpacity
                  style={[
                    styles.cropButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => {
                    setCropMode(false);
                    setCropArea(null);
                  }}
                >
                  <Text
                    style={[
                      styles.cropButtonText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.cropButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleCrop}
                  disabled={!cropArea}
                >
                  <Text
                    style={[
                      styles.cropButtonText,
                      { color: colors.text.white },
                    ]}
                  >
                    Apply
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Global Modal Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.cancelButton,
              { borderColor: colors.border },
            ]}
            onPress={onCancel}
          >
            <Text
              style={[
                styles.actionButtonText,
                { color: colors.text.secondary },
              ]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.confirmButton,
              { backgroundColor: colors.primary },
            ]}
            onPress={handleConfirm}
          >
            <Text
              style={[styles.actionButtonText, { color: colors.text.white }]}
            >
              Save Changes
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#000", // Dark background for better contrast while editing
  },
  image: {
    width: EDITOR_SIZE,
    height: EDITOR_SIZE,
    borderRadius: 12,
  },
  cropOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  cropContainer: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#fff",
    borderStyle: "solid",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  handle: {
    position: "absolute",
    width: 32,
    height: 32,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#007AFF", // IOS Blue for drag handles
    elevation: 6,
    zIndex: 10,
  },
  topLeftHandle: {
    left: -16,
    top: -16,
  },
  topRightHandle: {
    right: -16,
    top: -16,
  },
  bottomLeftHandle: {
    left: -16,
    bottom: -16,
  },
  bottomRightHandle: {
    right: -16,
    bottom: -16,
  },
  toolsContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  toolsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  toolButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    minWidth: 70,
  },
  toolText: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    marginTop: 4,
  },
  cropOptions: {
    marginTop: 16,
  },
  cropOptionsTitle: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Poppins-Medium",
    marginBottom: 8,
  },
  cropActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  cropButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  cropButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    fontFamily: "Poppins-SemiBold",
  },
});

export default ImageEditor;
