import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Modal, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EDITOR_SIZE = SCREEN_WIDTH - 40;

const ImageEditor = ({ visible, imageUri, onConfirm, onCancel, colors }) => {
  const [cropMode, setCropMode] = useState(false);
  const [editedImageUri, setEditedImageUri] = useState(imageUri);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [cropArea, setCropArea] = useState(null);

  // Refs for storing initial values during gestures
  const startDrag = useRef({ x: 0, y: 0 });
  const startResize = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const cropAreaRef = useRef(null);

  // Keep cropAreaRef in sync with cropArea state
  useEffect(() => {
    cropAreaRef.current = cropArea;
  }, [cropArea]);

  useEffect(() => {
    if (imageUri) {
      Image.getSize(
        imageUri,
        (width, height) => {
          setImageDimensions({ width, height });
        },
        (error) => {
          console.error('Error getting image size:', error);
        }
      );
    }
  }, [imageUri]);

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
        console.error('Display rect or crop area not available');
        return;
      }

      // Convert display crop coordinates to actual image coordinates
      const { x: displayX, y: displayY, scale } = displayRect;
      const { x: cropX, y: cropY, width: cropWidth, height: cropHeight } = cropArea;

      // Adjust for image offset and scale
      const actualX = (cropX - displayX) / scale;
      const actualY = (cropY - displayY) / scale;
      const actualWidth = cropWidth / scale;
      const actualHeight = cropHeight / scale;

      // Ensure within bounds
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
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setEditedImageUri(result.uri);
      setCropMode(false);
      setCropArea(null);
    } catch (error) {
      console.error('Crop error:', error);
    }
  };

  const handleRotate = async () => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        editedImageUri || imageUri,
        [{ rotate: 90 }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setEditedImageUri(result.uri);
    } catch (error) {
      console.error('Rotate error:', error);
    }
  };

  const handleFlip = async () => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        editedImageUri || imageUri,
        [{ flip: 'horizontal' }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      setEditedImageUri(result.uri);
    } catch (error) {
      console.error('Flip error:', error);
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

    const { x: displayX, y: displayY, width: displayWidth, height: displayHeight } = displayRect;
    const cropSize = Math.min(displayWidth, displayHeight) * 0.8; // 80% of the smaller dimension

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

  // PanResponder for dragging crop area
  const dragPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (!cropAreaRef.current) return;
        startDrag.current = { x: cropAreaRef.current.x, y: cropAreaRef.current.y };
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
    })
  ).current;

  // PanResponder for top-left corner
  const topLeftPanResponder = useRef(
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
        const newX = startResize.current.x + dx;
        const newY = startResize.current.y + dy;
        const newWidth = Math.max(50, startResize.current.width - dx);
        const newHeight = Math.max(50, startResize.current.height - dy);

        setCropArea({
          ...cropAreaRef.current,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // PanResponder for top-right corner
  const topRightPanResponder = useRef(
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
        const newY = startResize.current.y + dy;
        const newWidth = Math.max(50, startResize.current.width + dx);
        const newHeight = Math.max(50, startResize.current.height - dy);

        setCropArea({
          ...cropAreaRef.current,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // PanResponder for bottom-left corner
  const bottomLeftPanResponder = useRef(
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
        const newX = startResize.current.x + dx;
        const newWidth = Math.max(50, startResize.current.width - dx);
        const newHeight = Math.max(50, startResize.current.height + dy);

        setCropArea({
          ...cropAreaRef.current,
          x: newX,
          width: newWidth,
          height: newHeight,
        });
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  // PanResponder for bottom-right corner
  const bottomRightPanResponder = useRef(
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
        const newWidth = Math.max(50, startResize.current.width + dx);
        const newHeight = Math.max(50, startResize.current.height + dy);

        setCropArea({
          ...cropAreaRef.current,
          width: newWidth,
          height: newHeight,
        });
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>Edit Photo</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.headerButton}>
            <Ionicons name="checkmark" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: editedImageUri || imageUri }}
            style={styles.image}
            resizeMode="contain"
            onError={(error) => {
              console.error('Image load error:', error);
              // You could show an error message or fallback here
            }}
          />
          {cropMode && cropArea && (
            <>
              {/* Dimmed overlay outside crop area */}
              <View style={styles.cropOverlay}>
                {/* Top overlay */}
                <View style={[styles.overlay, {
                  top: 0,
                  left: 0,
                  right: 0,
                  height: cropArea.y,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  pointerEvents: 'none'
                }]} />
                {/* Bottom overlay */}
                <View style={[styles.overlay, {
                  bottom: 0,
                  left: 0,
                  right: 0,
                  top: cropArea.y + cropArea.height,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  pointerEvents: 'none'
                }]} />
                {/* Left overlay */}
                <View style={[styles.overlay, {
                  top: cropArea.y,
                  left: 0,
                  width: cropArea.x,
                  height: cropArea.height,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  pointerEvents: 'none'
                }]} />
                {/* Right overlay */}
                <View style={[styles.overlay, {
                  top: cropArea.y,
                  right: 0,
                  left: cropArea.x + cropArea.width,
                  height: cropArea.height,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  pointerEvents: 'none'
                }]} />
              </View>

              {/* Crop rectangle border */}
              <View
                style={[
                  styles.cropContainer,
                  {
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height,
                  }
                ]}
                pointerEvents="box-none"
              />

              {/* Draggable area (inner transparent box) */}
              <View
                style={[
                  styles.dragArea,
                  {
                    left: cropArea.x + 40,
                    top: cropArea.y + 40,
                    width: cropArea.width - 80,
                    height: cropArea.height - 80,
                  }
                ]}
                {...dragPanResponder.panHandlers}
              />

              {/* Corner handles - positioned absolutely */}
              <View style={[styles.handle, styles.topLeftHandle, { left: cropArea.x - 20, top: cropArea.y - 20 }]} {...topLeftPanResponder.panHandlers} />
              <View style={[styles.handle, styles.topRightHandle, { left: cropArea.x + cropArea.width - 20, top: cropArea.y - 20 }]} {...topRightPanResponder.panHandlers} />
              <View style={[styles.handle, styles.bottomLeftHandle, { left: cropArea.x - 20, top: cropArea.y + cropArea.height - 20 }]} {...bottomLeftPanResponder.panHandlers} />
              <View style={[styles.handle, styles.bottomRightHandle, { left: cropArea.x + cropArea.width - 20, top: cropArea.y + cropArea.height - 20 }]} {...bottomRightPanResponder.panHandlers} />
            </>
          )}
        </View>

        {/* Edit Tools */}
        <View style={[styles.toolsContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.toolsRow}>
            <TouchableOpacity
              style={[styles.toolButton, cropMode && { backgroundColor: colors.primary + '20' }]}
              onPress={handleCropModeToggle}
            >
              <Ionicons name="crop" size={24} color={cropMode ? colors.primary : colors.text.primary} />
              <Text style={[styles.toolText, { color: cropMode ? colors.primary : colors.text.primary }]}>Crop</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton} onPress={handleRotate}>
              <Ionicons name="refresh" size={24} color={colors.text.primary} />
              <Text style={[styles.toolText, { color: colors.text.primary }]}>Rotate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton} onPress={handleFlip}>
              <Ionicons name="swap-horizontal" size={24} color={colors.text.primary} />
              <Text style={[styles.toolText, { color: colors.text.primary }]}>Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toolButton} onPress={handleReset}>
              <Ionicons name="arrow-undo" size={24} color={colors.text.primary} />
              <Text style={[styles.toolText, { color: colors.text.primary }]}>Reset</Text>
            </TouchableOpacity>
          </View>

          {cropMode && (
            <View style={styles.cropOptions}>
              <Text style={[styles.cropOptionsTitle, { color: colors.text.primary }]}>
                Drag the crop area or use corner handles to resize
              </Text>
              <View style={styles.cropActions}>
                <TouchableOpacity
                  style={[styles.cropButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => {
                    setCropMode(false);
                    setCropArea(null);
                  }}
                >
                  <Text style={[styles.cropButtonText, { color: colors.text.secondary }]}>Cancel Crop</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.cropButton, { backgroundColor: colors.primary }]}
                  onPress={handleCrop}
                  disabled={!cropArea}
                >
                  <Text style={[styles.cropButtonText, { color: colors.text.white }]}>Apply Crop</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton, { borderColor: colors.border }]}
            onPress={onCancel}
          >
            <Text style={[styles.actionButtonText, { color: colors.text.secondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton, { backgroundColor: colors.primary }]}
            onPress={handleConfirm}
          >
            <Text style={[styles.actionButtonText, { color: colors.text.white }]}>Use Photo</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  image: {
    width: EDITOR_SIZE,
    height: EDITOR_SIZE,
    borderRadius: 12,
  },
  cropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cropContainer: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#fff',
    borderStyle: 'solid',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 5,
  },
  dragArea: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  handle: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topLeftHandle: {},
  topRightHandle: {},
  bottomLeftHandle: {},
  bottomRightHandle: {},
  toolsContainer: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  toolButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 70,
  },
  toolText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    marginTop: 4,
  },
  cropOptions: {
    marginTop: 16,
  },
  cropOptionsTitle: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
    marginBottom: 8,
  },
  cropActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  cropButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  cropButtonText: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
});

export default ImageEditor;
