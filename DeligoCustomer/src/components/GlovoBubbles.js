import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Image } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';
import { fontSize, spacing } from '../theme';

const { width } = Dimensions.get('window');

const GlovoBubbles = ({ categories, onPress, selectedId }) => {
    const { colors, isDarkMode } = useTheme();
    const { t } = useLanguage();

    // Define bubble colors for a vibrant look
    const bubbleColors = [
        '#FFC56F', // Yellow-Orange (Food)
        '#A5D6A7', // Green (Grocery)
        '#90CAF9', // Blue (Pharmacy)
        '#FFAB91', // Peach
        '#CE93D8', // Purple
        '#80CBC4', // Teal
    ];

    // If no categories, return null
    if (!categories || categories.length === 0) return null;

    // Render a single bubble
    const renderBubble = (category, index) => {
        const isSelected = selectedId === category.id;

        return (
            <TouchableOpacity
                key={category.id}
                style={styles.bubbleContainer}
                onPress={() => onPress(category)}
                activeOpacity={0.7}
            >
                <View style={[
                    styles.bubbleCircle,
                    // If selected, show a subtle border or active state, else white/transparent
                    isSelected && styles.selectedBubble
                ]}>
                    {category.icon && category.icon.toString().startsWith('http') ? (
                        <Image
                            source={{ uri: category.icon }}
                            style={styles.bubbleImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <Text style={styles.bubbleIcon}>{category.icon}</Text>
                    )}
                </View>
                <Text
                    style={[
                        styles.bubbleLabel,
                        { color: isDarkMode ? colors.text.primary : '#333' },
                        isSelected && { color: colors.primary, fontFamily: 'Poppins-Bold' }
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.8}
                >
                    {category.name}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Text style={[styles.title, { color: colors.text.primary }]}>
                {t('whatDoYouNeed') || "What's on your mind?"}
            </Text>
            <View style={styles.grid}>
                {categories.map((category, index) => renderBubble(category, index))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    title: {
        fontSize: fontSize.lg,
        fontFamily: 'Poppins-Bold',
        marginBottom: spacing.md,
        marginLeft: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: 16,
    },
    bubbleContainer: {
        alignItems: 'center',
        width: (width - 48 - 48) / 3, // Roughly 3 columns
        marginBottom: 16,
    },
    bubbleCircle: {
        width: 80,
        height: 80,
        borderRadius: 40, // Perfectly rounded
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        backgroundColor: '#F5F5F5', // Neutral professional background (light gray)
        // subtle shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden', // Ensure image stays inside
    },
    selectedBubble: {
        borderWidth: 2,
        borderColor: '#FFC107', // Primary color border
        backgroundColor: '#FFF',
    },
    bubbleIcon: {
        fontSize: 32,
    },
    bubbleImage: {
        width: '100%',
        height: '100%',
    },
    bubbleLabel: {
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Medium',
        textAlign: 'center',
    },
});

export default GlovoBubbles;
