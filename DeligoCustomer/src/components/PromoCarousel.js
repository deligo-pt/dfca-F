/**
 * PromoCarousel — Premium Stacked Card Deck
 *
 * Smooth deck animation:
 *  • Front card exits LEFT (slide + fade)
 *  • Back-0 card smoothly advances → front position
 *  • Back-1 card smoothly advances → back-0 position
 *  All driven by a single `progressAnim` (0→1), so everything moves together.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Animated,
    Easing,
    PanResponder,
    Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../utils/ThemeContext';
import { spacing } from '../theme';
import sponsorshipApi from '../utils/sponsorshipApi';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;
const CARD_HEIGHT = 158;
const SWIPE_THRESHOLD = width * 0.28;
const ANIM_DURATION = 360;

// Static resting positions for back cards
const BACK_CONFIGS = [
    { rotate: '3.5deg', tx: 12, ty: 6, scale: 0.95 }, // directly behind front
    { rotate: '-2.5deg', tx: -10, ty: 10, scale: 0.90 }, // furthest back
];

const FALLBACK_PROMOS = [
    {
        id: 1, title: 'Food In 15 Mins!', subtitle: 'Crispy, hot & fresh.', brand: 'DeliGo', cta: 'ORDER NOW',
        image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', bgColor: '#6B1A3D'
    },
    {
        id: 2, title: 'Free Delivery', subtitle: 'On your first 3 orders.', brand: 'DeliGo Pro', cta: 'JOIN NOW',
        image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', bgColor: '#1A3D6B'
    },
    {
        id: 3, title: 'Weekend Feast', subtitle: 'Up to 40% off Sundays.', brand: 'Offers', cta: 'GRAB DEAL',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80', bgColor: '#1A6B3D'
    },
];

function shadeColor(hex, pct) {
    try {
        const n = parseInt((hex || '#555').replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (n >> 16) + pct));
        const g = Math.min(255, Math.max(0, ((n >> 8) & 0xFF) + pct));
        const b = Math.min(255, Math.max(0, (n & 0xFF) + pct));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    } catch { return hex || '#333'; }
}

const PromoCarousel = ({ promos: propPromos = [], onPress, refreshTrigger = 0 }) => {
    const { colors } = useTheme();
    const [apiPromos, setApiPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [displayIndex, setDisplayIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    const isTransitioning = useRef(false);

    // --- Exit animation (front card slides off) ---
    const exitX = useRef(new Animated.Value(0)).current;
    const exitOp = useRef(new Animated.Value(1)).current;

    // --- Progress (0→1): drives back cards advancing forward ---
    const progress = useRef(new Animated.Value(0)).current;

    // --- Back cards opacity (we hide them briefly during snap-reset) ---
    const backCardsOp = useRef(new Animated.Value(1)).current;

    // --- Swipe (interactive drag, stable front only) ---
    const swipeX = useRef(new Animated.Value(0)).current;
    // Safe tracking of swipeX value (avoids unsafe ._value read)
    const swipeXRef = useRef(0);

    /* ── Fetch ── */
    useEffect(() => {
        (async () => {
            try {
                const data = await sponsorshipApi.getAllSponsorships();
                const now = new Date();
                const valid = data
                    .filter(i => {
                        const s = new Date(i.startDate), e = new Date(i.endDate);
                        return i.isActive && !i.isDeleted && now >= s && now <= e;
                    })
                    .map(i => ({
                        _id: i._id, sponsorName: i.sponsorName, sponsorType: i.sponsorType,
                        image: i.bannerImage, title: '', brand: i.sponsorName, subtitle: '', bgColor: colors.primary,
                    }));
                setApiPromos(valid);
            } catch (e) { console.warn('[PromoCarousel]', e); }
            finally { setLoading(false); }
        })();
    }, [colors.primary, refreshTrigger]);

    const finalPromos = useMemo(() =>
        apiPromos.length > 0 ? apiPromos : FALLBACK_PROMOS,
        [apiPromos]);

    /* ── Auto-cycle ── */
    useEffect(() => {
        if (finalPromos.length <= 1) return;
        const t = setInterval(triggerTransition, 4500);
        return () => clearInterval(t);
    }, [finalPromos.length, displayIndex]);

    /* ── Transition: all cards move together ── */
    const triggerTransition = () => {
        if (isTransitioning.current) return;
        isTransitioning.current = true;

        // Reset interactive swipe immediately (before any render)
        swipeX.setValue(0);
        swipeXRef.current = 0;

        // Prepare exit + progress values
        exitX.setValue(0);    // exit always starts from center (swipeX already reset)
        exitOp.setValue(1);
        progress.setValue(0);
        backCardsOp.setValue(1); // back cards visible during exit animation

        setIsAnimating(true);

        Animated.parallel([
            Animated.timing(exitX, { toValue: -width, duration: ANIM_DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(exitOp, { toValue: 0, duration: ANIM_DURATION * 0.75, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.timing(progress, { toValue: 1, duration: ANIM_DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start(({ finished }) => {
            if (!finished) { isTransitioning.current = false; return; }

            // ── CRITICAL ORDER (prevents 1-frame flicker) ──

            // Step 1: Hide back cards synchronously — they will snap position
            //         when displayIndex changes; we must hide before that render.
            backCardsOp.setValue(0);

            // Step 2: Update React state (batched in same tick)
            setDisplayIndex(prev => (prev + 1) % finalPromos.length);
            setIsAnimating(false); // stable-front now renders at swipeX=0 (already reset above)
            isTransitioning.current = false;

            // Step 3: After React paints the new frame (new front card is opaque,
            //         back cards are hidden), safely reset progress & exit values.
            //         A single rAF is sufficient — React flushes in the same frame.
            requestAnimationFrame(() => {
                progress.setValue(0);  // back cards snap to resting positions (hidden by backCardsOp)
                exitX.setValue(0);
                exitOp.setValue(1);

                // Step 4: Fade back cards in smoothly at their correct resting positions.
                Animated.timing(backCardsOp, {
                    toValue: 1,
                    duration: 240,
                    useNativeDriver: true,
                }).start();
            });
        });
    };

    /* ── Pan ── */
    const swipeRotate = swipeX.interpolate({
        inputRange: [-width, 0, width],
        outputRange: ['-10deg', '0deg', '10deg'],
        extrapolate: 'clamp',
    });
    const pan = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => !isTransitioning.current,
        onMoveShouldSetPanResponder: (_, g) => !isTransitioning.current && Math.abs(g.dx) > 5,
        onPanResponderMove: (_, g) => {
            swipeX.setValue(g.dx);
            swipeXRef.current = g.dx; // safe tracking
        },
        onPanResponderRelease: (_, g) => {
            if (g.dx < -SWIPE_THRESHOLD) {
                triggerTransition();
            } else {
                Animated.spring(swipeX, { toValue: 0, friction: 5, tension: 90, useNativeDriver: true }).start();
            }
        },
    })).current;

    if (!loading && finalPromos.length === 0) return null;

    // ── Interpolated back-card transforms (progress 0→1) ──
    // back-0: resting-pos → front-pos
    const b0tx = progress.interpolate({ inputRange: [0, 1], outputRange: [BACK_CONFIGS[0].tx, 0] });
    const b0ty = progress.interpolate({ inputRange: [0, 1], outputRange: [BACK_CONFIGS[0].ty, 0] });
    const b0scale = progress.interpolate({ inputRange: [0, 1], outputRange: [BACK_CONFIGS[0].scale, 1] });
    const b0rot = progress.interpolate({ inputRange: [0, 1], outputRange: [BACK_CONFIGS[0].rotate, '0deg'] });
    const b0op = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.7, 0.85, 1] });

    // back-1: resting-pos → back-0-pos
    const b1tx = progress.interpolate({ inputRange: [0, 1], outputRange: [BACK_CONFIGS[1].tx, BACK_CONFIGS[0].tx] });
    const b1ty = progress.interpolate({ inputRange: [0, 1], outputRange: [BACK_CONFIGS[1].ty, BACK_CONFIGS[0].ty] });
    const b1scale = progress.interpolate({ inputRange: [0, 1], outputRange: [BACK_CONFIGS[1].scale, BACK_CONFIGS[0].scale] });
    const b1rot = progress.interpolate({ inputRange: [0, 1], outputRange: [BACK_CONFIGS[1].rotate, BACK_CONFIGS[0].rotate] });

    const totalCards = finalPromos.length;
    const hasBack0 = totalCards >= 2;
    const hasBack1 = totalCards >= 3;

    const frontPromo = finalPromos[displayIndex];
    const back0Promo = finalPromos[(displayIndex + 1) % totalCards];
    const back1Promo = finalPromos[(displayIndex + 2) % totalCards];

    /* ── Render a card's visual content ── */
    const renderCardInner = (promo) => {
        if (!promo) return null;
        const pureImg = promo.sponsorType === 'Ads' || !promo.title;
        const imgUrl = promo.image || promo.banner;
        const bgStart = promo.bgGradientStart || promo.bgColor || colors.primary;
        const bgEnd = shadeColor(bgStart, -40);

        return (
            <View style={styles.card}>
                {pureImg ? (
                    <Image source={{ uri: imgUrl }} style={styles.fullImg} resizeMode="cover" />
                ) : (
                    <>
                        <LinearGradient
                            colors={[bgStart, bgEnd]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.contentRow}>
                            <View style={styles.textBox}>
                                <View style={styles.pill}>
                                    <Text style={styles.pillTxt}>⚡ {promo.brand || promo.sponsorName}</Text>
                                </View>
                                <Text style={styles.titleTxt} numberOfLines={2}>{promo.title}</Text>
                                <Text style={styles.subTxt} numberOfLines={2}>{promo.subtitle}</Text>
                                {promo.cta && (
                                    <TouchableOpacity style={styles.cta} onPress={() => onPress?.(promo)}>
                                        <Text style={styles.ctaTxt}>{promo.cta}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {imgUrl && (
                                <View style={styles.imgBox}>
                                    <Image source={{ uri: imgUrl }} style={styles.cardImg} resizeMode="cover" />
                                </View>
                            )}
                        </View>
                    </>
                )}
                <View style={styles.sheen} />
                {(promo.sponsorType || promo.label) && (
                    <View style={styles.sponsorBadge}>
                        <Text style={styles.sponsorTxt}>{promo.sponsorType || promo.label}</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.wrapper}>
            <View style={styles.deck}>

                {/* ─── BACK-1: furthest behind, moves → back-0 position ─── */}
                {hasBack1 && (
                    <Animated.View
                        style={[styles.cardWrap, {
                            transform: [
                                { translateX: b1tx },
                                { translateY: b1ty },
                                { rotate: b1rot },
                                { scale: b1scale },
                            ],
                            opacity: backCardsOp,
                            zIndex: 10,
                            elevation: 0,
                        }]}
                    >
                        {renderCardInner(back1Promo)}
                    </Animated.View>
                )}

                {/* ─── BACK-0: directly behind front, moves → front position ─── */}
                {hasBack0 && (
                    <Animated.View
                        style={[styles.cardWrap, {
                            transform: [
                                { translateX: b0tx },
                                { translateY: b0ty },
                                { rotate: b0rot },
                                { scale: b0scale },
                            ],
                            opacity: backCardsOp,
                            zIndex: 20,
                            elevation: isAnimating ? 6 : 3,
                        }]}
                    >
                        {renderCardInner(back0Promo)}
                    </Animated.View>
                )}

                {/* ─── FRONT card (exit animation during transition) ─── */}
                {isAnimating && (
                    <Animated.View
                        style={[styles.cardWrap, {
                            transform: [{ translateX: exitX }],
                            opacity: exitOp,
                            zIndex: 100,
                            elevation: 8,
                        }]}
                        pointerEvents="none"
                    >
                        {renderCardInner(frontPromo)}
                    </Animated.View>
                )}

                {/* ─── FRONT card (stable, swipeable, shown when not animating) ─── */}
                {!isAnimating && (
                    <Animated.View
                        style={[styles.cardWrap, {
                            transform: [{ translateX: swipeX }, { rotate: swipeRotate }],
                            zIndex: 100,
                            elevation: 8,
                        }]}
                        {...pan.panHandlers}
                    >
                        {renderCardInner(frontPromo)}
                    </Animated.View>
                )}
            </View>

            {/* Dot indicators */}
            {finalPromos.length > 1 && (
                <View style={styles.dots}>
                    {finalPromos.map((_, i) => (
                        <View key={i} style={[styles.dot, i === displayIndex && styles.dotActive]} />
                    ))}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginBottom: spacing.xs,
        paddingTop: 0,
    },
    deck: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT + 10,
        alignSelf: 'center',
        position: 'relative',
    },
    cardWrap: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
    },
    fullImg: { width: '100%', height: '100%' },
    contentRow: {
        flex: 1,
        flexDirection: 'row',
        position: 'absolute',
        inset: 0,
    },
    textBox: {
        width: '55%',
        paddingHorizontal: 18,
        paddingVertical: 16,
        justifyContent: 'center',
    },
    pill: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignSelf: 'flex-start',
        paddingHorizontal: 10, paddingVertical: 3,
        borderRadius: 20, marginBottom: 7,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
    },
    pillTxt: { color: '#fff', fontSize: 9, fontFamily: 'Poppins-SemiBold', letterSpacing: 0.4 },
    titleTxt: { color: '#fff', fontSize: 16, fontFamily: 'Poppins-Bold', lineHeight: 21, marginBottom: 3 },
    subTxt: { color: 'rgba(255,255,255,0.82)', fontSize: 10, fontFamily: 'Poppins-Regular', marginBottom: 10 },
    cta: {
        backgroundColor: '#FF6B00',
        paddingVertical: 6, paddingHorizontal: 13,
        borderRadius: 20, alignSelf: 'flex-start', elevation: 3,
    },
    ctaTxt: { color: '#fff', fontSize: 9, fontFamily: 'Poppins-Bold', letterSpacing: 1 },
    imgBox: { width: '45%', position: 'absolute', right: 0, top: 0, bottom: 0 },
    cardImg: { width: '100%', height: '100%' },
    sheen: {
        position: 'absolute', top: 0, left: 0,
        width: '55%', height: '42%',
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderBottomRightRadius: 70,
    },
    sponsorBadge: {
        position: 'absolute', top: 11, right: 11,
        backgroundColor: 'rgba(0,0,0,0.52)',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12,
    },
    sponsorTxt: { color: '#fff', fontSize: 9, fontFamily: 'Poppins-Medium', textTransform: 'uppercase', letterSpacing: 0.4 },
    backDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
    dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 5 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ddd' },
    dotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: '#DC3173' },
});

export default PromoCarousel;
