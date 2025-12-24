import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
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
        // Cycle through colors
        const bgColor = bubbleColors[index % bubbleColors.length];
        const isSelected = selectedId === category.id;

        return (
            <TouchableOpacity
                key={category.id}
                style={styles.bubbleContainer}
                onPress={() => onPress(category)}
                activeOpacity={0.8}
            >
                <View style={[
                    styles.bubbleCircle,
                    { backgroundColor: isSelected ? colors.primary : bgColor }
                ]}>
                    <Text style={styles.bubbleIcon}>{category.icon}</Text>
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
        gap: 20, // Grid gap
    },
    bubbleContainer: {
        alignItems: 'center',
        width: (width - 48 - 60) / 3, // Roughly 3 columns
        marginBottom: 16,
    },
    bubbleCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    bubbleIcon: {
        fontSize: 32,
    },
    bubbleLabel: {
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Medium',
        textAlign: 'center',
    },
});

export default GlovoBubbles;
