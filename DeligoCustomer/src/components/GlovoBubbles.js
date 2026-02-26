import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Dimensions,
    ScrollView,
} from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { useLanguage } from '../utils/LanguageContext';

const { width } = Dimensions.get('window');

const BubbleItem = ({ category, selectedId, onPress, colors, fixedWidth }) => {
    const [imageError, setImageError] = React.useState(false);

    if (!category) return null;

    const isSelected = selectedId === category.slug || selectedId === category.id;
    const displayName = category.name || '';
    const iconUrl = category.image || category.icon || null;

    const isImage =
        iconUrl &&
        !imageError &&
        typeof iconUrl === 'string' &&
        (iconUrl.startsWith('http') || iconUrl.startsWith('file'));

    const fallbackLetter = displayName.charAt(0).toUpperCase();
    const titleCaseName = displayName.charAt(0).toUpperCase() + displayName.slice(1).toLowerCase();

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPress && onPress(category)}
            style={[styles.bubbleItem, fixedWidth ? styles.bubbleItemFixed : styles.bubbleItemFlex]}
        >
            <View style={styles.imageWrapper}>
                {isImage ? (
                    <Image
                        source={{ uri: iconUrl }}
                        style={styles.image}
                        resizeMode="contain"
                        onError={() => setImageError(true)}
                    />
                ) : iconUrl && typeof iconUrl === 'string' ? (
                    <Text style={styles.emoji}>
                        {iconUrl}
                    </Text>
                ) : (
                    <Text style={[styles.emoji, { color: colors.primary }]}>
                        {fallbackLetter}
                    </Text>
                )}
            </View>

            <Text
                numberOfLines={1}
                style={[
                    styles.label,
                    { color: isSelected ? '#000000' : '#6B6B6B' }
                ]}
            >
                {titleCaseName}
            </Text>

            {/* Tiny dot indicator — minimal premium */}
            {isSelected && (
                <View style={styles.activeIndicator} />
            )}
        </TouchableOpacity>
    );
};

const PremiumCategories = ({
    categories,
    onPress,
    selectedId,
    showTitle = true
}) => {
    const { colors } = useTheme();
    const { t } = useLanguage();

    if (!Array.isArray(categories) || categories.length === 0) return null;

    const useScroll = categories.length > 3;

    return (
        <View style={styles.container}>
            {showTitle && (
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {t('shopOnDeliGo')}
                    </Text>
                </View>
            )}

            <View style={styles.glassCard}>
                {useScroll ? (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {categories.map((category, index) => (
                            <BubbleItem
                                key={category.id || category.slug || index}
                                category={category}
                                selectedId={selectedId}
                                onPress={onPress}
                                colors={colors}
                                fixedWidth={true}
                            />
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.rowContent}>
                        {categories.map((category, index) => (
                            <BubbleItem
                                key={category.id || category.slug || index}
                                category={category}
                                selectedId={selectedId}
                                onPress={onPress}
                                colors={colors}
                                fixedWidth={false}
                            />
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 15,
    },
    header: {
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'Poppins-Bold', // keeping bold but sharp
        letterSpacing: 0.2,
        color: '#1C1C1E', // Apple-esque dark gray
    },
    glassCard: {
        marginHorizontal: 20,
        borderRadius: 24,
        paddingVertical: 14,

        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.04)',

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 28,
        elevation: 8,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    scrollContent: {
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    bubbleItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 16,
        marginHorizontal: 4,
    },
    bubbleItemFlex: {
        flex: 1,  // Spread evenly for ≤3 items
    },
    bubbleItemFixed: {
        width: (width - 80) / 3,  // Fixed width for scrollable items
    },
    imageWrapper: {
        width: 110,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    image: {
        width: '100%',
        height: '100%'
    },
    emoji: {
        fontSize: 42,
        textAlign: 'center',
    },
    label: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 16,
        letterSpacing: 0.3,
        textAlign: 'center'
    },
    activeIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#1C1C1E',
        marginTop: 6,
    }
});

export default PremiumCategories;