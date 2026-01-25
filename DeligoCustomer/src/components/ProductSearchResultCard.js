import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, fontSize, borderRadius } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import formatCurrency from '../utils/currency';

/**
 * ProductSearchResultCard Component
 * 
 * Compact product summary for search results.
 * Handles variable API response structures via normalization.
 * 
 * @param {Object} props
 * @param {Object} props.product - Raw product data.
 * @param {Function} props.onPress - Interaction handler.
 */
const ProductSearchResultCard = ({ product, onPress }) => {
    const { colors, isDarkMode } = useTheme();

    // Data Normalization:
    // Flattens nested `_raw` properties and handles fallback values
    // to ensure safe rendering regardless of backend schema variations.

    const raw = product._raw || {};

    // Product Title Resolution
    const name = raw.product?.name || raw.name || raw.productName || product.name || 'Unknown Product';

    // Image URI Resolution: Explicit property > Gallery First Item > Vendor Store Photo
    const imageUri = product.image ||
        (Array.isArray(raw.images) && raw.images.length > 0 ? raw.images[0] : null) ||
        raw.vendor?.storePhoto ||
        null;

    // Pricing Resolution
    const price = raw.pricing?.price ?? raw.price ?? product.price ?? 0;
    const currency = raw.pricing?.currency ?? '';

    // Vendor Information Resolution
    const vendorName = raw.vendor?.vendorName || product.vendor?.vendorName || raw.vendorName || '';

    return (
        <TouchableOpacity
            style={styles(colors, isDarkMode).card}
            onPress={() => onPress && onPress(product)}
            activeOpacity={0.7}
        >
            {/* Image Thumbnail */}
            <View style={styles(colors, isDarkMode).imageContainer}>
                {imageUri ? (
                    <Image source={{ uri: imageUri }} style={styles(colors, isDarkMode).image} />
                ) : (
                    <View style={[styles(colors, isDarkMode).image, styles(colors, isDarkMode).placeholder]}>
                        <Ionicons name="fast-food" size={24} color={colors.text.tertiary} />
                    </View>
                )}
            </View>

            {/* Product Details */}
            <View style={styles(colors, isDarkMode).infoContainer}>
                <Text style={styles(colors, isDarkMode).name} numberOfLines={2}>
                    {name}
                </Text>

                {vendorName ? (
                    <Text style={styles(colors, isDarkMode).vendor} numberOfLines={1}>
                        <Ionicons name="storefront-outline" size={12} color={colors.text.secondary} /> {vendorName}
                    </Text>
                ) : null}

                <Text style={styles(colors, isDarkMode).price}>
                    {formatCurrency(currency, price)}
                </Text>
            </View>

            {/* Navigation Indicator */}
            <View style={styles(colors, isDarkMode).actionContainer}>
                <Ionicons name="arrow-forward-circle-outline" size={24} color={colors.primary} />
            </View>
        </TouchableOpacity>
    );
};

const styles = (colors, isDarkMode) => StyleSheet.create({
    card: {
        flexDirection: 'row',
        padding: spacing.sm,
        marginBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        shadowColor: isDarkMode ? '#000' : '#ccc',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: isDarkMode ? '#333' : '#f0f0f0',
    },
    imageContainer: {
        marginRight: spacing.md,
    },
    image: {
        width: 60,
        height: 60,
        borderRadius: borderRadius.md,
        backgroundColor: isDarkMode ? '#333' : '#f5f5f5',
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    name: {
        fontSize: fontSize.md,
        fontFamily: 'Poppins-SemiBold',
        color: colors.text.primary,
        marginBottom: 2,
    },
    vendor: {
        fontSize: fontSize.xs,
        fontFamily: 'Poppins-Regular',
        color: colors.text.secondary,
        marginBottom: 4,
    },
    price: {
        fontSize: fontSize.md,
        fontFamily: 'Poppins-Bold',
        color: colors.primary,
    },
    actionContainer: {
        paddingLeft: spacing.sm,
    },
});

export default ProductSearchResultCard;
