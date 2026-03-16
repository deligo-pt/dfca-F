/**
 * RestaurantDetailsScreen
 *
 * Displays restaurant information and menu, allowing users to browse categories,
 * view product details, and add items to their cart.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  StatusBar,
  LayoutAnimation,
  Platform,
  UIManager,
  RefreshControl,
  InteractionManager,
  Linking,
  Share,
  Animated,
  Dimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { spacing, fontSize, borderRadius } from "../theme";
import { useTheme } from "../utils/ThemeContext";
import { useProducts } from "../contexts/ProductsContext";
import { useLanguage } from "../utils/LanguageContext";
import { useCart } from "../contexts/CartContext";
import { useLocation } from "../contexts/LocationContext";
import { useDelivery } from "../contexts/DeliveryContext";
import formatCurrency from "../utils/currency";
import { formatMinutesToUX, to12Hour } from "../utils/timeFormat";
import * as Location from "expo-location";
import AlertModal from "../components/AlertModal";
import MaxQuantityModal from "../components/MaxQuantityModal";
import { fetchAddonGroups } from "../utils/addonApi";
import { GOOGLE_MAPS_CONFIG } from "../constants/config";

const RestaurantDetailsScreen = ({ route, navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { restaurant } = route?.params || {};

  // Normalize rating
  const _r = restaurant || {};
  let ratingValue = null;
  if (_r.rating !== undefined && _r.rating !== null) {
    if (typeof _r.rating === "number") ratingValue = _r.rating;
    else if (
      typeof _r.rating === "object" &&
      typeof _r.rating.average === "number"
    )
      ratingValue = _r.rating.average;
  }
  if (
    (ratingValue === null || ratingValue === undefined) &&
    _r.vendor &&
    typeof _r.vendor.rating === "number"
  ) {
    ratingValue = _r.vendor.rating;
  }

  // Fallback to nested vendor rating from backend data
  if (ratingValue === null || ratingValue === undefined || ratingValue === 0) {
    const rawRating =
      _r._raw?.vendorId?.rating?.average || _r._raw?.vendor?.rating?.average;
    if (rawRating) ratingValue = rawRating;
  }

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    addItem,
    updateQuantity: cartUpdateQuantity,
    itemsMap,
    clearAllCarts,
    getVendorCart,
  } = useCart();

  // Alert modal state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: "", message: "" });

  // REMOVED LayoutAnimation enablement to fix Modal glitch on Android
  // useEffect(() => {
  //   if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  //     UIManager.setLayoutAnimationEnabledExperimental(true);
  //   }
  // }, []);

  // Local quantity for UI responsiveness
  const [localQty, setLocalQty] = useState({});
  const getQuantity = (productId) => {
    const q = localQty[productId];
    if (typeof q === "number") return q;
    return itemsMap?.[productId]?.quantity || 0;
  };

  // Product modal state
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [activeProduct, setActiveProduct] = useState(null);
  const [updatingProductId, setUpdatingProductId] = useState(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalFooterHeight, setModalFooterHeight] = useState(140); // Measured on-device via onLayout

  const [selectedVariations, setSelectedVariations] = useState({});

  // Full-screen image state
  const [fullScreenImage, setFullScreenImage] = useState(null);

  // State for active add-ons display
  const [activeAddons, setActiveAddons] = useState([]);

  // ── Heartbeat + Shimmer animation refs (must be at component level) ──
  const heartbeatAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (productModalVisible && modalQuantity > 0) {
      // Heartbeat: 1 → 1.04 → 1 → 1.025 → 1
      const heartbeat = Animated.loop(
        Animated.sequence([
          Animated.timing(heartbeatAnim, { toValue: 1.04, duration: 150, useNativeDriver: true }),
          Animated.timing(heartbeatAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(heartbeatAnim, { toValue: 1.025, duration: 120, useNativeDriver: true }),
          Animated.timing(heartbeatAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.delay(1800),
        ])
      );
      heartbeat.start();

      return () => {
        heartbeat.stop();
      };
    } else {
      heartbeatAnim.setValue(1);
    }
  }, [productModalVisible, modalQuantity]);

  // Global shimmer for bottom buttons
  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3500,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  // Max Quantity Modal State
  const [maxQuantityModalVisible, setMaxQuantityModalVisible] = useState(false);
  const [maxQuantityData, setMaxQuantityData] = useState({
    maxStock: 0,
    currentCartQty: 0,
    itemName: "",
  });

  const [vendorDetailsVisible, setVendorDetailsVisible] = useState(false);
  const [fullMapVisible, setFullMapVisible] = useState(false);
  const [fullMapReady, setFullMapReady] = useState(false);

  useEffect(() => {
    let timeout;
    if (fullMapVisible) {
      timeout = setTimeout(() => {
        setFullMapReady(true);
      }, 350); // delay render to avoid zero-dimension bounds calculation on Android during slide animation
    } else {
      setFullMapReady(false);
    }
    return () => clearTimeout(timeout);
  }, [fullMapVisible]);

  const openProductModal = (product) => {
    setActiveProduct(product);
    setSelectedVariations({});
    // Reset quantity to 1 for fresh addition (using separate modal state)
    setModalQuantity(1);

    // Reset add-ons
    setActiveAddons([]);
    setModalFooterHeight(140); // Reset before onLayout remeasures
    setProductModalVisible(true);

    // FETCH FRESH DETAILS (Single Product Get)
    // This ensures we have the latest price, tax, and stock info which might be missing from list
    if (product.id) {
      fetchProductDetails(product.id).then((freshDetails) => {
        if (freshDetails) {
          console.log(
            "[RestaurantDetails] Updated active product with fresh details",
            freshDetails.id,
          );

          // Fix for UI Glitch: Wait for modal animation to complete before updating heavy state
          InteractionManager.runAfterInteractions(() => {
            // Merge fresh details but keep local UI state if needed
            setActiveProduct((prev) =>
              prev && prev.id === freshDetails.id ? freshDetails : prev,
            );

            // Also update addons if present in fresh details
            const rawProduct = freshDetails._raw || freshDetails;
            if (rawProduct.addonGroups && rawProduct.addonGroups.length > 0) {
              fetchAddonGroups(rawProduct.addonGroups)
                .then((groups) => {
                  const processedGroups = groups
                    .map((g) => g.data || g)
                    .filter((g) => !g.isDeleted);
                  setActiveAddons(processedGroups);
                })
                .catch((err) =>
                  console.error(
                    "Failed to load add-ons from fresh details",
                    err,
                  ),
                );
            }
          });
        }
      });
    }

    // Fallback: Fetch add-ons from initial product if present (to show info banner quickly)
    const rawProduct = product._raw || product;
    if (rawProduct.addonGroups && rawProduct.addonGroups.length > 0) {
      fetchAddonGroups(rawProduct.addonGroups)
        .then((groups) => {
          // Filter active groups. The API might return { data: group } or just group
          const processedGroups = groups
            .map((g) => g.data || g)
            .filter((g) => !g.isDeleted);
          setActiveAddons(processedGroups);
        })
        .catch((err) => console.error("Failed to load add-ons", err));
    }
  };

  const closeProductModal = () => {
    setActiveProduct(null);
    setProductModalVisible(false);
  };

  // Use ProductsContext
  const {
    products: allProducts,
    fetchRestaurantMenu,
    fetchProductDetails,
  } = useProducts();

  const handleShare = async () => {
    try {
      const shareOptions = {
        title: displayName,
        message: `Check out ${displayName} on Deligo!\nLocation: ${displayLocation || 'Unknown'}\nRating: ${ratingValue ? parseFloat(ratingValue).toFixed(1) : 'New'}`,
      };
      // For iOS, url can be passed separately. Assuming no specific URL structure for now.
      if (Platform.OS === 'ios') {
        // shareOptions.url = `https://deligo.com/restaurant/${vendorId}`; 
      }

      await Share.share(shareOptions);
    } catch (error) {
      console.error("[RestaurantDetails] Share failed:", error);
    }
  };

  // Resolve vendor ID from various potential data structures
  // Access normalized vendor if available, else raw nested object, else raw flat props
  const normVendor = restaurant.vendor || {};
  const rawVendorObj = restaurant._raw?.vendorId || {};
  const rawVendorFlat = restaurant._raw?.vendor || {};

  // Enhanced Vendor Details extraction for display
  const vendorBusinessDetails =
    rawVendorObj?.businessDetails || normVendor?.businessDetails || rawVendorFlat?.businessDetails || {};
  
  // Resolve correct store photo
  const vendorStorePhoto = 
    normVendor?.storePhoto || 
    normVendor?.logo ||
    rawVendorObj?.documents?.storePhoto ||
    rawVendorObj?.storePhoto ||
    rawVendorObj?.logo ||
    rawVendorFlat?.documents?.storePhoto ||
    rawVendorFlat?.storePhoto ||
    rawVendorFlat?.logo ||
    null;
  const vendorOpeningHours = vendorBusinessDetails.openingHours;
  const vendorClosingHours = vendorBusinessDetails.closingHours;
  const formattedHours = to12Hour(
    (vendorOpeningHours && vendorClosingHours)
      ? `${vendorOpeningHours} – ${vendorClosingHours}`
      : (vendorOpeningHours || normVendor.openingHours || "11:00 – 23:59")
  );
  // If vendorId is an object in _raw, use its _id
  const rawVendorId =
    typeof rawVendorObj === "object" ? rawVendorObj._id : rawVendorObj;

  const vendorId =
    normVendor.id ||
    normVendor.vendorId ||
    rawVendorId ||
    restaurant?._raw?.vendor?.vendorId ||
    restaurant?.vendorId ||
    restaurant?._raw?.vendorId ||
    null;

  // Menu products state with initial cache and fresh fetch support
  const [menuProducts, setMenuProducts] = useState(
    (allProducts || []).filter((p) => {
      // Use robust vendorId extraction for filtering
      const pRaw = p._raw || p;
      const pRawVendorObj = pRaw.vendorId || {};
      const pRawVendorId =
        typeof pRawVendorObj === "object" ? pRawVendorObj._id : pRawVendorObj;
      const pId =
        p.vendor?.id || pRaw.vendor?.vendorId || pRawVendorId || pRaw.vendorId;
      return pId && vendorId && String(pId) === String(vendorId);
    }),
  );
  const [menuLoading, setMenuLoading] = useState(false);
  const vendorProducts = menuProducts;

  // Location resolution
  const [dynamicLocation, setDynamicLocation] = useState(null);

  // Derive vendor coordinates
  const vendorCoordsObj = restaurant._raw?.vendor || restaurant.vendor || {};
  const vendorNestedObj =
    typeof restaurant._raw?.vendorId === "object"
      ? restaurant._raw.vendorId
      : {};
  const rawLat =
    normVendor.latitude ||
    vendorNestedObj.businessLocation?.latitude ||
    vendorNestedObj.latitude ||
    vendorCoordsObj.latitude;
  const rawLng =
    normVendor.longitude ||
    vendorNestedObj.businessLocation?.longitude ||
    vendorNestedObj.longitude ||
    vendorCoordsObj.longitude;
  const vendorCoords =
    rawLat && rawLng
      ? { latitude: parseFloat(rawLat), longitude: parseFloat(rawLng) }
      : null;

  // ---------------------------------------------------------------------------
  // Dynamic Delivery Time Calculation
  // ---------------------------------------------------------------------------
  const { currentLocation } = useLocation();
  const { fetchEstimate, getFormattedRange } = useDelivery();

  useEffect(() => {
    if (vendorCoords && vendorId) {
      fetchEstimate(vendorId, vendorCoords.latitude, vendorCoords.longitude);
    }
  }, [vendorId, vendorCoords]);

  const deliveryTimeProp = normVendor.deliveryTime || restaurant._raw?.deliveryTime || null;
  const finalDeliveryTime = getFormattedRange(vendorId, deliveryTimeProp || '20 - 30 min');

  useEffect(() => {
    let mounted = true;
    const fetchLocation = async () => {
      // Prioritize normalized vendor location
      if (normVendor.address || normVendor.city) return;

      const v = restaurant._raw?.vendor || restaurant.vendor || {};
      // Fallback: check nested vendorId object
      const vNested =
        typeof restaurant._raw?.vendorId === "object"
          ? restaurant._raw.vendorId
          : {};

      if (v.city || v.address || v.town) return; // explicit exists

      if (vendorCoords) {
        try {
          const res = await Location.reverseGeocodeAsync(vendorCoords);
          if (mounted && res && res.length > 0) {
            const addr = res[0];
            // Get specific area (neighborhood)
            const area =
              addr.street || addr.district || addr.name || addr.subregion;
            // Get city
            const city = addr.city || addr.region;
            // Combine: "Basabo, Dhaka" or just city if no area
            if (area && city && area !== city) {
              setDynamicLocation(`${area}, ${city}`);
            } else {
              setDynamicLocation(area || city);
            }
          }
        } catch (e) {
          /* ignore */
        }
      }
    };
    fetchLocation();
    return () => {
      mounted = false;
    };
  }, [restaurant]);

  // Derived values using normalized data
  const displayName =
    normVendor.vendorName ||
    normVendor.businessName ||
    (typeof restaurant._raw?.vendorId === "object"
      ? restaurant._raw.vendorId.businessDetails?.businessName
      : null) ||
    restaurant?.name ||
    restaurant?._raw?.name ||
    restaurant?._raw?.product?.name ||
    restaurant?._raw?.productName ||
    restaurant?._raw?.vendor?.vendorName ||
    "Restaurant";

  const displayLocation =
    normVendor.address ||
    restaurant._raw?.vendor?.city ||
    restaurant._raw?.vendor?.address ||
    dynamicLocation;

  // Vendor currency
  const vendorCurrency = (() => {
    const productWithCurrency = vendorProducts.find(
      (p) => p?._raw?.pricing?.currency || p?.pricing?.currency,
    );
    return productWithCurrency
      ? productWithCurrency._raw?.pricing?.currency ||
      productWithCurrency.pricing?.currency ||
      ""
      : "";
  })();

  // Derive menu categories
  const derivedCategories = new Set();
  vendorProducts.forEach((p) => {
    const raw = p._raw || {};
    if (raw.subCategory) {
      const val =
        typeof raw.subCategory === "object"
          ? raw.subCategory.name || raw.subCategory.slug
          : raw.subCategory;
      if (val) derivedCategories.add(String(val));
    } else if (raw.category) {
      const val =
        typeof raw.category === "object"
          ? raw.category.name || raw.category.slug
          : raw.category;
      if (val) derivedCategories.add(String(val));
    } else if (Array.isArray(p.categories) && p.categories.length) {
      p.categories.forEach((c) => {
        const val = typeof c === "object" ? c.name || c.slug : c;
        if (val) derivedCategories.add(String(val));
      });
    }
  });
  const menuCategories = ["All", "Popular", ...Array.from(derivedCategories)];

  // Fetch fresh menu data on focus
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadMenu = async () => {
        if (!vendorId) {
          setMenuLoading(false);
          return;
        }
        setMenuLoading(true);
        try {
          console.log("[RestaurantDetails] Fetching fresh menu for", vendorId);
          const freshItems = await fetchRestaurantMenu(vendorId);
          if (active) {
            // ALWAYS update with fresh data, even if empty
            if (freshItems && freshItems.length > 0) {
              setMenuProducts(freshItems);
              console.log(
                "[RestaurantDetails] Updated menu with",
                freshItems.length,
                "items",
              );
            } else {
              console.log(
                "[RestaurantDetails] Fresh menu empty, keeping previous/cached data if any",
              );
            }
          }
        } catch (err) {
          console.error("[RestaurantDetails] Failed to load menu", err);
          // if (active) setMenuProducts([]); // DO NOT CLEAR ON ERROR - Keep cached data
        } finally {
          if (active) setMenuLoading(false);
        }
      };
      loadMenu();
      return () => {
        active = false;
      };
    }, [vendorId, fetchRestaurantMenu]),
  );

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      console.log("[RestaurantDetails] Refreshing menu for", vendorId);
      const freshItems = await fetchRestaurantMenu(vendorId);
      // ALWAYS update with fresh data IF valid
      if (freshItems && freshItems.length > 0) {
        setMenuProducts(freshItems);
        console.log(
          "[RestaurantDetails] Refreshed menu with",
          freshItems.length,
          "items",
        );
      } else {
        console.log(
          "[RestaurantDetails] Refreshed menu empty, keeping previous data",
        );
      }
    } catch (err) {
      console.error("Refresh failed", err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchRestaurantMenu, vendorId]);

  // Update add/remove with optimistic updates and animation
  const addToCart = async (item, options = {}) => {
    const current = getQuantity(item.id);
    if (!productModalVisible) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setLocalQty((prev) => ({ ...prev, [item.id]: current + 1 }));
    setUpdatingProductId(item.id);
    await addItem(item, 1, options);
    setTimeout(() => setUpdatingProductId(null), 250);
  };

  const removeFromCart = async (item) => {
    const current = getQuantity(item.id);
    if (current <= 0) return;
    if (!productModalVisible) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setLocalQty((prev) => ({ ...prev, [item.id]: Math.max(0, current - 1) }));
    setUpdatingProductId(item.id);
    await cartUpdateQuantity(item.id, -1);
    setTimeout(() => setUpdatingProductId(null), 250);
  };

  const getTotalItems = () => {
    const ids = Object.keys(itemsMap || {});
    return ids.reduce((s, id) => {
      const it = itemsMap[id];
      if (!it) return s;
      const vendorIdOfItem =
        it.product.vendorId || it.product._raw?.vendor?.vendorId;
      if (vendorIdOfItem && vendorIdOfItem === vendorId) return s + it.quantity;
      return s;
    }, 0);
  };

  const getTotalPrice = () => {
    const vc = getVendorCart ? getVendorCart(vendorId) : null;
    if (vc && vc.totals && vc.totals.grandTotal !== undefined && vc.totals.grandTotal !== null) {
      return Number(vc.totals.grandTotal);
    }

    return Object.keys(itemsMap || {}).reduce((s, id) => {
      const it = itemsMap[id];
      if (!it) return s;
      const vendorIdOfItem =
        it.product?.vendorId || it.product?._raw?.vendor?.vendorId || it.vendorId;

      const rawData = it.product?._raw || {};
      const backendSubtotal = it.subtotal ?? rawData.subtotal ?? rawData.totalBeforeTax;

      let itemTotal = 0;
      if (backendSubtotal !== undefined && backendSubtotal !== null) {
        itemTotal = Number(backendSubtotal);
      } else {
        const basePrice = Number(it.product?.finalPrice ?? it.product?.price ?? 0);
        const addons = rawData.addons || it.addons || [];
        const addonsTotal = addons.reduce(
          (sum, ad) => sum + Number(ad.price || 0) * (ad.quantity || 1),
          0,
        );
        itemTotal = basePrice * it.quantity + addonsTotal;
      }

      if (vendorIdOfItem && String(vendorIdOfItem) === String(vendorId)) return s + itemTotal;
      return s;
    }, 0);
  };

  // Filter menu items
  const getFilteredMenuItems = () => {
    let items = vendorProducts;

    // If searching, ignore category filter and search through ALL items
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return items.filter((item) => {
        const rawItem = item._raw || {};
        const itemName = (
          rawItem.product?.name ||
          rawItem.name ||
          rawItem.productName ||
          item.name ||
          ""
        ).toLowerCase();
        const desc = (rawItem.description || rawItem.slug || "").toLowerCase();
        return itemName.includes(q) || desc.includes(q);
      });
    }

    // No search query, apply category filter normally
    if (selectedCategory === "All") {
      // No filter - show all items
    } else if (selectedCategory === "Popular") {
      const popular = items.filter(
        (p) => (p._raw?.meta && p._raw.meta.isFeatured) || p._raw?.isFeatured,
      );
      if (popular.length) items = popular;
    } else if (selectedCategory) {
      items = items.filter((p) => {
        const raw = p._raw || {};
        const cat =
          raw.subCategory ||
          raw.category ||
          (Array.isArray(p.categories) && p.categories[0]) ||
          "";
        return String(cat) === String(selectedCategory);
      });
    }

    return items;
  };

  const calculateModalTotal = () => {
    const raw = activeProduct?._raw || activeProduct || {};
    const pricing = raw.pricing || {};

    // Base price
    // Prefer finalPrice from backend if available for DEFAULT item.
    // BUT we must check for VARIATION override first.
    let basePrice = Number(
      pricing.price ?? raw.price ?? activeProduct?.price ?? 0,
    );

    // Check for selected variation price override
    let hasVariationOverride = false;
    if (selectedVariations) {
      const variationKeys = Object.keys(selectedVariations).filter((k) =>
        k.endsWith("_obj"),
      );
      for (const key of variationKeys) {
        const opt = selectedVariations[key];
        if (opt && opt.price) {
          basePrice = Number(opt.price);
          hasVariationOverride = true;
        }
      }
    }

    const discount = Number(pricing.discount ?? raw.discount ?? 0);
    const taxRate = Number(pricing.taxRate ?? raw.taxRate ?? 0);

    let effectivePrice = basePrice;

    // Direct from backend - no frontend math!
    if (!hasVariationOverride && pricing.finalPrice !== undefined && pricing.finalPrice !== null) {
      effectivePrice = Number(pricing.finalPrice);
    } else if (hasVariationOverride) {
      // 1. Apply Discount
      if (discount > 0) {
        effectivePrice = basePrice - (basePrice * discount) / 100;
      }

      // 2. Apply Tax (on discounted price)
      if (taxRate > 0) {
        effectivePrice += (effectivePrice * taxRate) / 100;
      }
    }

    let total = effectivePrice * modalQuantity;

    // Add variations
    if (selectedVariations) {
      Object.keys(selectedVariations).forEach((key) => {
        // Skip object refs
        if (key.endsWith("_obj")) return;

        const variantPrice = selectedVariations[`${key}_price`];
        if (variantPrice) {
          total += Number(variantPrice) * modalQuantity;
        }
      });
    }

    // Add addons
    if (activeAddons && activeAddons.length > 0) {
      // ... logic for addons (already correct in original if used) ...
      // We need to iterate over selectedAddons state to sum up
      // Since logic is complex and state is distinct, reusing existing loop if available
      // or simple traverse:
      Object.values(selectedAddons)
        .flat()
        .forEach((addon) => {
          if (addon && addon.price) {
            total += Number(addon.price) * (addon.quantity || 1);
          }
          // Flattened structure depends on implementation
        });

      // Correct approach for current structure:
      Object.keys(selectedAddons).forEach((groupId) => {
        const groupSelections = selectedAddons[groupId];
        Object.values(groupSelections).forEach((item) => {
          total += Number(item.price || 0) * (item.quantity || 1);
        });
      });
    }

    return total;
  };

  const renderMenuItem = (product) => {
    const quantity = getQuantity(product.id);
    const raw = product._raw || {};
    const displayProductName =
      raw.product?.name || raw.name || raw.productName || product.name || "";
    const image = product.image || (Array.isArray(raw.images) && raw.images[0]);

    // Pricing logic (No frontend calculation)
    const price = Number(raw.pricing?.price ?? raw.price ?? product.price ?? 0);
    const discount = Number(raw.pricing?.discount ?? raw.discount ?? 0);

    // Direct from backend
    let finalPrice = price;
    if (discount > 0 && raw.pricing && raw.pricing.discountedBasePrice !== undefined && raw.pricing.discountedBasePrice !== null) {
      finalPrice = Number(raw.pricing.discountedBasePrice);
    }

    const currency = raw.pricing?.currency ?? "";
    const hasVariations =
      (raw.variations && raw.variations.length > 0) ||
      (raw.options && raw.options.length > 0);
    const description = raw.description || raw.slug || "";
    const isUpdating = updatingProductId === product.id;

    // Stock Logic
    const stockQty = raw.stock?.quantity ?? 999;
    const isOutOfStock = stockQty <= 0;
    const isLowStock = stockQty > 0 && stockQty <= 5;

    return (
      <TouchableOpacity
        key={product.id}
        activeOpacity={0.92}
        onPress={() => !isOutOfStock && openProductModal(product)}
        disabled={isUpdating || isOutOfStock}
        style={[
          styles.menuItem,
          {
            backgroundColor: colors.surface,
            borderColor: isDarkMode
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.05)",
          },
          isOutOfStock && { opacity: 0.65 },
        ]}
      >
        {/* Image */}
        <View style={styles.menuImageWrap}>
          {image ? (
            <Image
              source={{ uri: image }}
              style={styles.menuItemImage}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.menuItemImage,
                {
                  backgroundColor: isDarkMode ? "#2a2a2a" : "#f4f4f5",
                  alignItems: "center",
                  justifyContent: "center",
                },
              ]}
            >
              <Ionicons
                name="fast-food-outline"
                size={28}
                color={isDarkMode ? "#555" : "#ccc"}
              />
            </View>
          )}

          {/* Discount Badge */}
          {discount > 0 && !isOutOfStock && (
            <View
              style={[styles.discountFlag, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.discountFlagText}>{discount}%</Text>
            </View>
          )}

          {/* Sold Out */}
          {isOutOfStock && (
            <View style={styles.soldOutOverlay}>
              <Text style={styles.soldOutText}>SOLD OUT</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.menuItemInfo}>
          <Text
            style={[styles.menuItemName, { color: colors.text.primary }]}
            numberOfLines={2}
          >
            {displayProductName}
          </Text>

          {description ? (
            <Text
              style={[
                styles.menuItemDescription,
                { color: isDarkMode ? "#888" : "#999" },
              ]}
              numberOfLines={2}
            >
              {description}
            </Text>
          ) : null}

          {/* Low Stock */}
          {isLowStock && (
            <Text style={styles.lowStockText}>
              {t("lowStock") || "Low Stock"}: {stockQty} {t("left") || "left"}
            </Text>
          )}

          {/* Price Row */}
          <View style={styles.priceRow}>
            {discount > 0 ? (
              <>
                <Text style={[styles.menuItemPrice, { color: colors.primary }]}>
                  {formatCurrency(currency, finalPrice)}
                </Text>
                <Text style={styles.originalPrice}>
                  {formatCurrency(currency, price)}
                </Text>
              </>
            ) : (
              <Text style={[styles.menuItemPrice, { color: colors.primary }]}>
                {hasVariations ? "From " : ""}
                {formatCurrency(currency, price)}
              </Text>
            )}
            {hasVariations && (
              <Text
                style={[
                  styles.customizableTag,
                  { color: colors.text.secondary },
                ]}
              >
                {t("customizable") || "Customizable"}
              </Text>
            )}
          </View>
        </View>

        {/* Add Button */}
        <View style={styles.menuItemActions}>
          <View
            style={[
              styles.addButton,
              {
                backgroundColor: isOutOfStock
                  ? isDarkMode
                    ? "#333"
                    : "#eee"
                  : colors.primary,
              },
            ]}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons
                name={isOutOfStock ? "close" : "add"}
                size={22}
                color={isOutOfStock ? "#999" : "#fff"}
              />
            )}
            {quantity > 0 && !isOutOfStock && (
              <View
                style={[styles.quantityBadge, { borderColor: colors.primary }]}
              >
                <Text
                  style={[styles.quantityBadgeText, { color: colors.primary }]}
                >
                  {quantity}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Product detail modal
  const renderProductModal = () => {
    if (!activeProduct) return null;
    const raw = activeProduct._raw || {};
    const title =
      raw.product?.name ||
      raw.name ||
      raw.productName ||
      activeProduct.name ||
      "";
    const images =
      Array.isArray(raw.images) && raw.images.length
        ? raw.images
        : activeProduct.image
          ? [activeProduct.image]
          : [];
    const description =
      raw.longDescription || raw.description || raw.details || raw.slug || "";
    const price = raw.pricing?.price ?? raw.price ?? activeProduct.price ?? 0;
    const currency = raw.pricing?.currency ?? "";
    const quantity = modalQuantity;
    const isUpdating = updatingProductId === activeProduct.id;

    // Helper to calculate total price dynamically
    const calculateModalTotalInner = () => {
      let base = Number(
        raw.pricing?.price ?? raw.price ?? activeProduct.price ?? 0,
      );

      let hasSelection = false;
      if (selectedVariations) {
        Object.values(selectedVariations).forEach((val) => {
          if (val && typeof val === "object" && val.price) {
            base = Number(val.price);
            hasSelection = true;
          }
        });
      }

      // If no selection, show the "starting from" (minimum) variation price
      if (!hasSelection) {
        const variationItems = (raw.variations || raw.options || []).flatMap(v => v.items || v.options || []);
        const prices = variationItems.map(i => Number(i.price || 0)).filter(p => p > 0);
        if (prices.length > 0) {
          base = Math.min(...prices);
        }
      }

      const discount = Number(raw.pricing?.discount ?? raw.discount ?? 0);
      if (discount > 0) {
        base = base - (base * discount) / 100;
      }

      // Add tax
      const taxRate = Number(raw.pricing?.taxRate ?? raw.taxRate ?? 0);
      if (taxRate > 0) {
        base += (base * taxRate) / 100;
      }

      return base * quantity;
    };


    return (
      <Modal
        visible={productModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeProductModal}
      >
        <View style={styles.modalOverlay}>
          {/* Dim backdrop */}
          <TouchableOpacity
            style={{ flex: 1, width: '100%' }}
            onPress={closeProductModal}
            activeOpacity={1}
          />

          {/* Bottom Sheet */}
          <View style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              height: Math.round(Dimensions.get('window').height * 0.92),
            }
          ]}>

            {/* Handle bar + Close button */}
            <View style={styles.modalHandleRow}>
              {/* Spacer for symmetry */}
              <View style={{ width: 36 }} />
              {/* Handle */}
              <View style={[styles.modalHandle, { backgroundColor: isDarkMode ? '#555' : '#D5D5D5' }]} />
              {/* Close X button */}
              <TouchableOpacity
                onPress={closeProductModal}
                activeOpacity={0.7}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F0F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={20} color={isDarkMode ? '#AAA' : '#555'} />
              </TouchableOpacity>
            </View>

            {/* ScrollView — everything scrolls */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: modalFooterHeight + 24 }}
              showsVerticalScrollIndicator={false}
              bounces={true}
              overScrollMode="never"
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Rounded hero image — Design 3 centered ── */}
              <View style={styles.modalImageCenter}>
                {images.length > 0 ? (
                  <TouchableOpacity activeOpacity={0.9} onPress={() => setFullScreenImage(images[0])}>
                    <Image
                      source={{ uri: images[0] }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.modalImage, { backgroundColor: isDarkMode ? '#2A2A2A' : '#F5F5F5', alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="fast-food" size={64} color={isDarkMode ? '#555' : '#CCC'} />
                  </View>
                )}
              </View>

              {/* ── Info pills strip — Design 3 style ── */}
              <View style={styles.modalInfoPills}>
                {raw.category?.name ? (
                  <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#1A2E1A' : '#E8F5E9' }]}>
                    <Ionicons name="restaurant" size={12} color="#388E3C" style={{ marginRight: 4 }} />
                    <Text style={[styles.infoPillText, { color: '#388E3C' }]}>{raw.category.name}</Text>
                  </View>
                ) : null}
                {raw.attributes?.weight ? (
                  <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#1A1A2E' : '#EDE7F6' }]}>
                    <Ionicons name="scale-outline" size={12} color="#5E35B1" style={{ marginRight: 4 }} />
                    <Text style={[styles.infoPillText, { color: '#5E35B1' }]}>{raw.attributes.weight}{raw.attributes.weightUnit || 'g'}</Text>
                  </View>
                ) : null}
                {raw.attributes?.isNonVeg !== undefined ? (
                  <View style={[styles.infoPill, { backgroundColor: raw.attributes.isNonVeg ? (isDarkMode ? '#2E1A1A' : '#FFEBEE') : (isDarkMode ? '#1A2E1A' : '#E8F5E9') }]}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, borderWidth: 1.5, borderColor: raw.attributes.isNonVeg ? '#D32F2F' : '#388E3C', alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: raw.attributes.isNonVeg ? '#D32F2F' : '#388E3C' }} />
                    </View>
                    <Text style={[styles.infoPillText, { color: raw.attributes.isNonVeg ? '#D32F2F' : '#388E3C' }]}>
                      {raw.attributes.isNonVeg ? 'Non-Veg' : 'Veg'}
                    </Text>
                  </View>
                ) : null}
                {raw.rating?.totalReviews > 0 ? (
                  <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#2E2E1A' : '#FFF8E1' }]}>
                    <Ionicons name="star" size={12} color="#F9A825" style={{ marginRight: 4 }} />
                    <Text style={[styles.infoPillText, { color: '#F57F17' }]}>{raw.rating.average}</Text>
                  </View>
                ) : null}
                {raw.attributes?.isOrganic ? (
                  <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#1A2E1A' : '#E8F5E9' }]}>
                    <Ionicons name="leaf" size={12} color="#2E7D32" style={{ marginRight: 4 }} />
                    <Text style={[styles.infoPillText, { color: '#2E7D32' }]}>Organic</Text>
                  </View>
                ) : null}
                {raw.attributes?.spiceLevel > 0 ? (
                  <View style={[styles.infoPill, { backgroundColor: isDarkMode ? '#2E1A1A' : '#FBE9E7' }]}>
                    <Ionicons name="flame" size={12} color="#E64A19" style={{ marginRight: 4 }} />
                    <Text style={[styles.infoPillText, { color: '#E64A19' }]}>
                      {'🌶'.repeat(Math.min(raw.attributes.spiceLevel, 3))}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* ── Title + Price Row — Design 2 style (title LEFT, price RIGHT) ── */}
              {(() => {
                const pricing = raw.pricing || {};
                let basePrice = Number(pricing.price ?? raw.price ?? 0);

                let hasSelection = false;
                if (selectedVariations) {
                  Object.values(selectedVariations).forEach(val => {
                    if (val && typeof val === "object" && val.price) {
                      basePrice = Number(val.price);
                      hasSelection = true;
                    }
                  });
                }

                // If no selection, use the minimum variation price as "starting from"
                if (!hasSelection) {
                  const variationItems = (raw.variations || raw.options || []).flatMap(v => v.items || v.options || []);
                  const prices = variationItems.map(i => Number(i.price || 0)).filter(p => p > 0);
                  if (prices.length > 0) {
                    basePrice = Math.min(...prices);
                  }
                }

                const discountPercent = Number(pricing.discount ?? raw.discount ?? 0);
                const discountedBase = discountPercent > 0 
                  ? basePrice - (basePrice * discountPercent) / 100
                  : basePrice;

                const discountAmount = basePrice - discountedBase;
                const taxRate = Number(pricing.taxRate ?? raw.taxRate ?? 0);
                const taxAmount = (discountedBase * taxRate) / 100;
                const finalPrice = discountedBase + taxAmount;

                return (
                  <>
                    {/* Title + Price — Design 2 inline */}
                    <View style={styles.modalTitlePriceRow}>
                      {/* Title LEFT */}
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text style={[styles.modalTitle, { color: colors.text.primary }]} numberOfLines={2}>
                          {title}
                        </Text>
                      </View>
                      {/* Price RIGHT */}
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.modalPrice, { color: colors.primary }]}>
                          {formatCurrency(currency, discountedBase)}
                        </Text>
                        {discountPercent > 0 && (
                          <Text style={styles.modalPriceOriginal}>
                            {formatCurrency(currency, basePrice)}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Save pill — below title row */}
                    {discountPercent > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 8 }}>
                        <Ionicons name="pricetag" size={11} color="#DC3173" style={{ marginRight: 3 }} />
                        <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: '#DC3173' }}>
                          Save {formatCurrency(currency, discountAmount)} ({Math.round(discountPercent)}% off)
                        </Text>
                      </View>
                    )}

                    {/* Quantity controls inline — same row as price info */}
                    <View style={styles.modalPriceQtyRow}>
                      <View style={{ flex: 1 }} />

                      {/* Quantity controls */}
                      {(raw.stock?.quantity ?? 999) > 0 ? (
                        <View style={styles.modalQtyInline}>
                          <TouchableOpacity
                            style={[styles.modalQtyInlineBtn, {
                              backgroundColor: quantity <= 1 ? (isDarkMode ? '#2A2A2A' : '#F3F3F3') : colors.primary,
                              borderWidth: quantity <= 1 ? 1 : 0,
                              borderColor: isDarkMode ? '#444' : '#E0E0E0',
                            }]}
                            onPress={() => { if (quantity > 0) setModalQuantity(Math.max(0, quantity - 1)); }}
                            disabled={quantity === 0}
                            activeOpacity={0.8}
                          >
                            <Ionicons name={quantity <= 1 ? 'trash-outline' : 'remove'} size={16} color={quantity <= 1 ? (isDarkMode ? '#888' : '#666') : '#fff'} />
                          </TouchableOpacity>
                          <Text style={[styles.modalQtyInlineText, { color: colors.text.primary }]}>{quantity}</Text>
                          <TouchableOpacity
                            style={[styles.modalQtyInlineBtn, { backgroundColor: colors.primary }]}
                            onPress={() => {
                              const currentCartQty = itemsMap?.[activeProduct.id]?.quantity || 0;
                              const maxStock = parseInt(raw.stock?.quantity ?? 0, 10);
                              if (maxStock > 0 && (currentCartQty + quantity + 1 > maxStock)) {
                                setMaxQuantityData({ maxStock, currentCartQty, itemName: activeProduct?.name || 'Item' });
                                setMaxQuantityModalVisible(true);
                                return;
                              }
                              setModalQuantity(quantity + 1);
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="add" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={styles.outOfStockBadge}>
                          <Text style={styles.outOfStockText}>{t('outOfStock') || 'Out of Stock'}</Text>
                        </View>
                      )}
                    </View>

                    {/* ── Price Breakdown Card ── */}
                    {(taxRate > 0 || taxAmount > 0) && (
                      <View style={[styles.priceBreakdownCard, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FAFAFA', borderColor: isDarkMode ? '#333' : '#F0F0F0' }]}>
                        <View style={styles.priceBreakdownRow}>
                          <Text style={[styles.priceBreakdownLabel, { color: colors.text.secondary }]}>Subtotal</Text>
                          <Text style={[styles.priceBreakdownValue, { color: colors.text.primary }]}>{formatCurrency(currency, discountedBase)}</Text>
                        </View>
                        {taxRate > 0 && (
                          <View style={styles.priceBreakdownRow}>
                            <Text style={[styles.priceBreakdownLabel, { color: colors.text.secondary }]}>Tax ({taxRate}%)</Text>
                            <Text style={[styles.priceBreakdownValue, { color: colors.text.primary }]}>{formatCurrency(currency, taxAmount)}</Text>
                          </View>
                        )}
                        <View style={[styles.priceBreakdownDivider, { backgroundColor: isDarkMode ? '#333' : '#EAEAEA' }]} />
                        <View style={styles.priceBreakdownRow}>
                          <Text style={[styles.priceBreakdownTotal, { color: colors.text.primary }]}>Total (per item)</Text>
                          <Text style={[styles.priceBreakdownTotal, { color: colors.primary }]}>{formatCurrency(currency, finalPrice)}</Text>
                        </View>
                      </View>
                    )}
                  </>
                );
              })()}

              {/* ── Divider ── */}
              <View style={[styles.modalDivider, { backgroundColor: colors.border, marginHorizontal: 20 }]} />

              {/* ── Stock Info ── */}
              {raw.stock && (
                <View style={styles.modalSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[styles.stockDot, { backgroundColor: (raw.stock.quantity ?? 0) > 0 ? '#4CAF50' : '#F44336' }]} />
                    <Text style={[styles.stockText, { color: colors.text.secondary }]}>
                      {(raw.stock.quantity ?? 0) > 0
                        ? `${raw.stock.availabilityStatus || 'In Stock'} • ${raw.stock.quantity} ${raw.stock.unit || 'pcs'} available`
                        : t('outOfStock') || 'Out of Stock'}
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Add-ons Banner ── */}
              {activeAddons.length > 0 && (
                <View style={[styles.addonsBanner, { backgroundColor: isDarkMode ? '#1A0810' : '#FFF5F8', borderColor: '#FEE2F0', marginHorizontal: 20, marginBottom: 12 }]}>
                  <View style={{ backgroundColor: '#FEE2F0', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Ionicons name="sparkles-outline" size={16} color="#DC3173" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.addonsBannerTitle, { color: colors.text.primary, fontSize: 13 }]}>{t('extrasAvailable')}</Text>
                    <Text style={[styles.addonsBannerText, { color: colors.text.secondary, fontSize: 12 }]}>{t('addExtrasAfterCart')}</Text>
                  </View>
                </View>
              )}

              {/* ── Details Section ── */}
              {description ? (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text.primary }]}>
                    <Ionicons name="document-text-outline" size={16} color={colors.text.primary} />{' '}Details
                  </Text>
                  <Text style={[styles.modalDescription, { color: colors.text.secondary }]}>{description}</Text>
                </View>
              ) : null}

              {/* ── Brand ── */}
              {raw.brand ? (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text.primary }]}>
                    <Ionicons name="ribbon-outline" size={16} color={colors.text.primary} />{' '}Brand
                  </Text>
                  <Text style={[styles.modalDescription, { color: colors.text.secondary }]}>{raw.brand}</Text>
                </View>
              ) : null}

              {/* ── Customize / Variations ── */}
              {(raw.variations || raw.options) && (raw.variations || raw.options).length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: colors.text.primary }]}>
                    <Ionicons name="options-outline" size={16} color={colors.text.primary} />{' '}Customize
                  </Text>
                  {(raw.variations || raw.options || []).map((variation, vIndex) => (
                    <View key={vIndex} style={{ marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 14, fontFamily: 'Poppins-SemiBold', color: colors.text.secondary, flex: 1 }}>
                          {variation.name || variation.title || `Option ${vIndex + 1}`}
                        </Text>
                        {variation.required && (
                          <View style={styles.requiredBadge}>
                            <Text style={styles.requiredBadgeText}>Required</Text>
                          </View>
                        )}
                      </View>
                      {(variation.items || variation.options || []).map((opt, oIndex) => {
                        const optId = opt.label || opt.name || opt.id || opt._id;
                        const isSelected = selectedVariations[variation.name || variation.title || variation.id] === optId;
                        const optPrice = opt.price ? Number(opt.price) : 0;
                        return (
                          <TouchableOpacity
                            key={oIndex}
                            style={[styles.variationOptionRow, { borderColor: isSelected ? colors.primary + '50' : (isDarkMode ? '#2A2A2A' : '#EFEFEF'), backgroundColor: isSelected ? (isDarkMode ? '#1E0A14' : '#FFF0F5') : 'transparent' }]}
                            onPress={() => setSelectedVariations(prev => {
                              const key = variation.name || variation.title || variation.id;
                              if (prev[key] === optId) {
                                // Already selected, unselect it (clears everything)
                                return {};
                              }
                              // Enforce single selection across ALL variation groups
                              // This ensures that if "Small" and "Medium" are in different groups,
                              // picking one will automatically deselect the other.
                              return {
                                [key]: optId,
                                [`${key}_obj`]: opt,
                              };
                            })}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.radioOuter, { borderColor: isSelected ? colors.primary : (isDarkMode ? '#555' : '#CCC') }]}>
                              {isSelected && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
                            </View>
                            <Text style={[styles.variationOptionText, { color: colors.text.primary, flex: 1 }, isSelected && { color: colors.primary, fontFamily: 'Poppins-SemiBold' }]}>
                              {opt.label || opt.name || opt.value}
                            </Text>
                            {optPrice > 0 && (
                              <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: colors.text.secondary }}>
                                +{formatCurrency(currency, optPrice)}
                              </Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* ── STICKY FOOTER: Full-width ADD TO CART ── */}
            <View
              onLayout={(e) => setModalFooterHeight(e.nativeEvent.layout.height)}
              style={[styles.modalFooter, {
                backgroundColor: colors.surface,
                borderTopColor: isDarkMode ? '#2A2A2A' : '#F0F0F0',
                paddingBottom: Platform.OS === 'android' ? Math.max(34, insets.bottom + 20) : Math.max(24, insets.bottom),
                paddingTop: 16,
                zIndex: 999,
                elevation: 10,
              }]}>
                {/* Animated heartbeat wrapper */}
                <Animated.View style={{
                  transform: [{ scale: quantity > 0 ? heartbeatAnim : 1 }],
                }}>
                  <TouchableOpacity
                    style={{ opacity: (quantity > 0 && (raw.stock?.quantity ?? 999) > 0) ? 1 : 0.38, borderRadius: 16, overflow: 'hidden' }}
                    onPress={async () => {
                      const stockQty = raw.stock?.quantity ?? 999;
                      if (stockQty <= 0 || addingToCart || quantity === 0) return;
                      const variations = raw.variations || raw.options || [];
                      if (variations.length > 0) {
                        // Check if at least one variation is selected globally
                        const selectionKeys = Object.keys(selectedVariations).filter(k => !k.endsWith('_obj'));
                        if (selectionKeys.length === 0) {
                          setAlertConfig({ 
                            title: t('selectionRequired') || 'Required', 
                            message: t('pleaseSelectVariation') || 'Please select an option to continue.' 
                          });
                          setAlertVisible(true);
                          return;
                        }

                        // Also check for specific required groups (if any)
                        const unselectedRequired = variations.filter(v => v.required && !selectedVariations[v.name || v.title || v.id]);
                        if (unselectedRequired.length > 0) {
                          setAlertConfig({ title: t('selectionRequired') || 'Required', message: `${t('pleaseSelect') || 'Please select'}: ${unselectedRequired[0].name || unselectedRequired[0].title || 'a variation'}` });
                          setAlertVisible(true);
                          return;
                        }
                      }
                      setAddingToCart(true);
                      try {
                        const selectedObjs = Object.keys(selectedVariations).filter(k => k.endsWith('_obj')).map(k => selectedVariations[k]);
                        let targetVariantName = null, variationSku = null;
                        const selectedKeys = Object.keys(selectedVariations).filter(k => !k.endsWith('_obj'));
                        if (selectedKeys.length > 0) {
                          const freshVars = activeProduct._raw?.variations || activeProduct._raw?.options || [];
                          for (const key of selectedKeys) {
                            const grp = freshVars.find(v => (v.name || v.title || v.id) === key);
                            if (grp) {
                              const opts = grp.items || grp.options || [];
                              const opt = opts.find(o => (o.label || o.name || o.value) === selectedVariations[key] || (o.id || o._id) === selectedVariations[key] || o.sku === selectedVariations[key]);
                              if (opt && opt.sku) { variationSku = opt.sku; targetVariantName = opt.label || opt.name || opt.value; break; }
                            }
                          }
                        }
                        if (!variationSku) { const so = selectedObjs.find(o => o.sku); if (so) { targetVariantName = so.label || so.name || so.value; variationSku = so.sku; } }
                        if (!targetVariantName) { const fo = selectedObjs[0]; if (fo) targetVariantName = fo.label || fo.name || fo.value; }
                        const variantName = targetVariantName || null;
                        const addonGroupIds = raw.addonGroups || [];
                        const hasAddons = addonGroupIds.length > 0;
                        const payload = { variantName, variationSku, options: selectedVariations, addons: [] };

                        // IF HAS ADDONS: Navigate to configuration screen instead of adding to cart so we can submit in 1 unified API request (like Postman)
                        if (hasAddons) {
                          closeProductModal();
                          setTimeout(() => {
                            const mid = raw._id || activeProduct._raw?._id || activeProduct.id;
                            navigation.navigate('Addons', {
                              product: raw || activeProduct,
                              productId: mid,
                              variantName,
                              variationSku,
                              addonGroupIds,
                              currency: raw.pricing?.currency || 'EUR',
                              quantity: quantity,
                              options: selectedVariations,
                              isNewItem: true
                            });
                          }, 300);
                          return; // STOP execution
                        }

                        // IF NO ADDONS: Just add to cart directly here
                        const result = await addItem(activeProduct, quantity, payload);
                        if (result && !result.success) {
                          if (result.error === 'DIFFERENT_VENDOR') {
                            const safeT = (k, f) => { const v = t(k); return v === k ? f : v; };
                            setAlertConfig({
                              title: safeT('startNewBasket', 'Start new basket?'),
                              message: safeT('clearCartConfirm', 'Your cart has items from another restaurant. Clear it?'),
                              buttons: [
                                { text: safeT('cancel', 'Cancel'), style: 'cancel', onPress: () => { } },
                                {
                                  text: safeT('clearAndAdd', 'Clear & Add'), onPress: async () => {
                                    try {
                                      await clearAllCarts();
                                      setTimeout(async () => {
                                        const retry = await addItem(activeProduct, quantity, payload);
                                        if (retry && !retry.success) { setAlertConfig({ title: safeT('error', 'Error'), message: retry.message || 'Failed' }); setAlertVisible(true); }
                                        else { closeProductModal(); }
                                      }, 100);
                                    } catch (e) { console.error(e); }
                                  }
                                },
                              ],
                            });
                            setAlertVisible(true);
                            return;
                          }
                          throw new Error(result.message || 'Failed to add to cart');
                        }
                        closeProductModal();
                      } catch (error) {
                        console.error('[RestaurantDetails] Add to cart error:', error);
                        const rawMessage = String(error?.message || '');
                        const isTimeoutLike = /aborted|timeout|timed out/i.test(rawMessage);
                        const alertMessage = isTimeoutLike
                          ? (t('networkSlowTryAgain') === 'networkSlowTryAgain'
                            ? 'Network is slow. Please try adding the item again.'
                            : t('networkSlowTryAgain'))
                          : (error.message || t('addToCartFailed') || 'Failed to add item to cart');

                        setAlertConfig({ title: t('error') || 'Error', message: alertMessage });
                        setAlertVisible(true);
                      } finally { setAddingToCart(false); }
                    }}
                    disabled={isUpdating || addingToCart || quantity === 0}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={quantity > 0 ? ['#DC3173', '#A8154E'] : ['#CCCCCC', '#BBBBBB']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.modalAddToCartGradient}
                    >
                      {/* Glossy shimmer sweep overlay */}
                      {quantity > 0 && (
                        <Animated.View
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: 60,
                            transform: [{
                              translateX: shimmerAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [-100, Dimensions.get('window').width + 800],
                              }),
                            }],
                          }}
                        >
                          <LinearGradient
                            colors={['transparent', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.25)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ flex: 1, borderRadius: 30 }}
                          />
                        </Animated.View>
                      )}
                      {addingToCart ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="cart" size={22} color={quantity > 0 ? '#fff' : '#888'} style={{ marginRight: 10 }} />
                          <Text style={[styles.modalAddToCartText, { color: quantity > 0 ? '#fff' : '#888' }]}>
                            {quantity > 0
                              ? `${t('addToCart') || 'ADD TO CART'} \u2022 ${formatCurrency(currency, calculateModalTotalInner())}`
                              : t('addToCart') || 'ADD TO CART'}
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Final safety guard for missing data - MUST be after all hooks to prevent crash
  useEffect(() => {
    if (!restaurant && navigation && navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [restaurant, navigation]);

  if (!restaurant) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text.secondary }}>{t('loading') || 'Loading...'}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom", "left", "right"]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />

      {/* Header */}
      <View style={[styles.headerContainer]}>
        <LinearGradient
          colors={isDarkMode ? ['#1A0A15', '#1A0A15'] : ['#FFF5F8', '#FFE8F0']}
          style={[styles.headerGradient, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text
            style={[styles.headerTitle, { color: colors.text.primary }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}
            onPress={() => setSearchVisible(!searchVisible)}
          >
            <Ionicons name="search" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* Premium Search Bar */}
      {searchVisible && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: colors.background,
            zIndex: 10,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDarkMode ? '#252525' : '#FFFFFF',
              borderRadius: 16,
              paddingHorizontal: 16,
              height: 52,
              borderWidth: 1,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(220, 49, 115, 0.1)',
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Ionicons
              name="search"
              size={22}
              color={colors.primary}
              style={{ marginRight: 12 }}
            />
            <TextInput
              style={{
                flex: 1,
                fontSize: 15,
                fontFamily: 'Poppins-Regular',
                color: colors.text.primary,
                paddingVertical: 0, // Fix Android text alignment
              }}
              placeholder={t("searchMenu") || "Search menu..."}
              placeholderTextColor={colors.text.light || '#999'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              selectionColor={colors.primary}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={{ padding: 6, marginRight: -6 }}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.text.light || '#999'}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            title={t("loading") || "Loading..."}
            titleColor={colors.text.secondary}
          />
        }
      >
        {!searchVisible && (
          <>
            {/* Premium Vendor Header */}
            <View style={styles.vendorHero}>
              <Image
                source={
                  vendorStorePhoto
                    ? { uri: vendorStorePhoto }
                    : restaurant.image && !restaurant._raw?.productName // only use restaurant.image if it's actually a restaurant, not a product obj passed down
                      ? { uri: restaurant.image }
                      : require("../assets/images/logonew.png")
                }
                style={styles.restaurantImage}
                resizeMode="cover"
              />
              {/* Bottom gradient for blending */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.06)"]}
                style={styles.heroBottomGradient}
              />
            </View>

            {/* Solid Info Card — floating overlap */}
            <View
              style={[
                styles.glassInfoCardContainer,
                { shadowColor: isDarkMode ? "#000" : "#888" },
              ]}
            >
              <BlurView
                intensity={60}
                tint={isDarkMode ? "dark" : "light"}
                style={[
                  styles.glassInfoCard,
                  {
                    backgroundColor: isDarkMode
                      ? "rgba(30, 30, 30, 0.5)"
                      : "rgba(255, 255, 255, 0.65)",
                    borderColor: isDarkMode
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(255, 255, 255, 0.6)",
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.restaurantName,
                    { color: colors.text.primary, textAlign: "center" },
                  ]}
                >
                  {displayName}
                </Text>

                <TouchableOpacity
                  style={styles.moreInfoBtn}
                  onPress={() => setVendorDetailsVisible(true)}
                >
                  <Text
                    style={[styles.moreInfoText, { color: colors.text.secondary }]}
                  >
                    More info
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={12}
                    color={colors.text.secondary}
                  />
                </TouchableOpacity>

                <View style={styles.restaurantMetaWrapper}>
                  <View style={styles.metaStat}>
                    <Ionicons
                      name="star"
                      size={14}
                      color="#FFB300"
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.metaStatText,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {ratingValue ? parseFloat(ratingValue).toFixed(1) : "New"}
                    </Text>
                  </View>
                  <View style={styles.metaDivider} />
                  <View style={styles.metaStat}>
                    <MaterialCommunityIcons
                      name="bike-fast"
                      size={14}
                      color={colors.text.secondary}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.metaStatText,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {finalDeliveryTime}
                    </Text>
                  </View>
                </View>
              </BlurView>
            </View>

            {/* Category Tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[
                styles.categoryTabs,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
              contentContainerStyle={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
              }}
            >
              {menuCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryTab,
                    {
                      backgroundColor:
                        selectedCategory === category
                          ? colors.primary
                          : colors.surface,
                      borderColor:
                        selectedCategory === category
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.categoryTabText,
                      { color: colors.text.secondary },
                      selectedCategory === category && { color: "#fff" },
                    ]}
                  >
                    {category === "Popular" ? t("popular") || "Popular" : category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* Menu Items */}
        <View style={{ padding: spacing.md }}>
          <Text
            style={[styles.menuSectionTitle, { color: colors.text.primary }]}
          >
            {searchQuery
              ? `${t("search") || "Search"} (${getFilteredMenuItems().length})`
              : t("menu") || "Menu"}
          </Text>

          {getFilteredMenuItems().length > 0 ? (
            getFilteredMenuItems().map((item) => renderMenuItem(item))
          ) : (
            <View style={styles.noResultsContainer}>
              <Ionicons
                name="search-outline"
                size={64}
                color={colors.text.light}
              />
              <Text
                style={[styles.noResultsText, { color: colors.text.primary }]}
              >
                {t("noItemsFound") || "No items found"}
              </Text>
              <Text
                style={[
                  styles.noResultsSubtext,
                  { color: colors.text.secondary },
                ]}
              >
                {t("tryAdjustingFilters") || "Try different keywords"}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating Cart Button */}
      {getTotalItems() > 0 && (
        <View
          style={[
            styles.floatingCart,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: Math.max(16, insets.bottom + 16),
            },
          ]}
        >
          <View>
            <Text
              style={[styles.cartItemCount, { color: colors.text.secondary }]}
            >
              {getTotalItems()} {t("items") || "items"}
            </Text>
            <Text style={[styles.cartTotal, { color: colors.primary }]}>
              {formatCurrency(vendorCurrency, getTotalPrice())}
            </Text>
          </View>
          <TouchableOpacity
            style={{ borderRadius: 24, overflow: 'hidden', elevation: 4, shadowColor: '#DC3173', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }}
            onPress={() => navigation.navigate("Main", { screen: "Cart" })}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#DC3173', '#A8154E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: 48,
                paddingHorizontal: 24,
                minWidth: 160,
              }}
            >
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  width: 60,
                  transform: [{
                    translateX: shimmerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-100, Dimensions.get('window').width + 800],
                    }),
                  }],
                }}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.25)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ flex: 1, borderRadius: 24 }}
                />
              </Animated.View>
              <Text style={styles.viewCartButtonText}>
                {t("viewCart") || "View Cart"}
              </Text>
              <Ionicons
                name="arrow-forward"
                size={18}
                color="#fff"
                style={{ marginLeft: 6 }}
              />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {renderProductModal()}

      {/* Vendor Details Modal */}
      <Modal
        visible={!!fullScreenImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: Math.max(40, insets.top + 10), right: 20, zIndex: 10, padding: 8 }}
            onPress={() => setFullScreenImage(null)}
          >
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={{ width: Dimensions.get('window').width, height: 400 }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* Vendor Details Modal */}
      <Modal
        visible={vendorDetailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVendorDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={{ flex: 1, width: "100%" }}
            onPress={() => setVendorDetailsVisible(false)}
          />
          <View
            style={[
              styles.vendorDetailsCard,
              {
                backgroundColor: colors.surface,
                paddingBottom: Math.max(30, insets.bottom + 10),
              },
            ]}
          >
            <View style={styles.vendorModalHeader}>
              <TouchableOpacity
                onPress={() => setVendorDetailsVisible(false)}
                style={styles.vendorModalCloseBtn}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.vendorModalShareBtn}
                onPress={handleShare}
              >
                <Ionicons
                  name="share-social-outline"
                  size={22}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                paddingBottom: Math.max(160, insets.bottom + 120),
              }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text
                style={[
                  styles.vendorModalTitle,
                  { color: colors.text.primary },
                ]}
              >
                {displayName}
              </Text>
              <Text
                style={[
                  styles.vendorModalSubtitle,
                  { color: colors.text.secondary },
                ]}
              >
                {t("vendorContactMsg") === "vendorContactMsg"
                  ? "Get in touch with the venue if you have allergies to learn about their ingredients and cooking methods."
                  : t("vendorContactMsg")}
              </Text>

              {/* Info Items */}
              <View style={styles.vendorInfoList}>
                <View style={styles.vendorInfoItem}>
                  <Ionicons
                    name="time"
                    size={20}
                    color={colors.primary}
                    style={styles.vendorInfoIcon}
                  />
                  <View style={styles.vendorInfoContent}>
                    <Text
                      style={[
                        styles.vendorInfoLabel,
                        { color: colors.primary },
                      ]}
                    >
                      Open now
                    </Text>
                    <Text
                      style={[
                        styles.vendorInfoValue,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {formattedHours}
                    </Text>
                  </View>
                </View>

                {/* Estimated Delivery Section - Added Google Matrix Calculation */}
                <View style={styles.vendorInfoItem}>
                  <Ionicons
                    name="bicycle"
                    size={20}
                    color={colors.primary}
                    style={styles.vendorInfoIcon}
                  />
                  <View style={styles.vendorInfoContent}>
                    <Text
                      style={[
                        styles.vendorInfoLabel,
                        { color: colors.primary },
                      ]}
                    >
                      Estimated Delivery
                    </Text>
                    <Text
                      style={[
                        styles.vendorInfoValue,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {finalDeliveryTime}
                    </Text>
                  </View>
                </View>

                {(normVendor.contactNumber ||
                  normVendor.phone ||
                  restaurant._raw?.vendorId?.contactDetails?.phone) && (
                    <View style={styles.vendorInfoItem}>
                      <Ionicons
                        name="call"
                        size={20}
                        color={colors.primary}
                        style={styles.vendorInfoIcon}
                      />
                      <View style={styles.vendorInfoContent}>
                        <Text
                          style={[
                            styles.vendorInfoLabel,
                            { color: colors.primary },
                          ]}
                        >
                          Call us
                        </Text>
                        <Text
                          style={[
                            styles.vendorInfoValue,
                            { color: colors.text.secondary },
                          ]}
                        >
                          {normVendor.contactNumber ||
                            normVendor.phone ||
                            restaurant._raw?.vendorId?.contactDetails?.phone}
                        </Text>
                      </View>
                    </View>
                  )}

                {displayLocation && (
                  <View style={styles.vendorInfoItem}>
                    <Ionicons
                      name="location"
                      size={20}
                      color={colors.primary}
                      style={styles.vendorInfoIcon}
                    />
                    <View style={styles.vendorInfoContent}>
                      <Text
                        style={[
                          styles.vendorInfoLabel,
                          { color: colors.primary },
                        ]}
                      >
                        View map
                      </Text>
                      <Text
                        style={[
                          styles.vendorInfoValue,
                          { color: colors.text.secondary },
                        ]}
                      >
                        {displayLocation}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Real Map Integration */}
              {displayLocation && (
                <View
                  style={[
                    styles.mapPlaceholder,
                    {
                      backgroundColor: isDarkMode ? "#222" : "#E0E0E0",
                      borderRadius: 12,
                    },
                  ]}
                >
                  {vendorCoords ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setFullMapVisible(true)}
                    >
                      <View pointerEvents="none">
                        <MapView
                          provider={PROVIDER_GOOGLE}
                          style={{ width: "100%", height: 200, opacity: 0.9 }}
                          initialRegion={{
                            latitude: vendorCoords.latitude,
                            longitude: vendorCoords.longitude,
                            latitudeDelta: 0.005,
                            longitudeDelta: 0.005,
                          }}
                          scrollEnabled={false}
                          zoomEnabled={false}
                          pitchEnabled={false}
                          rotateEnabled={false}
                        >
                          <Marker coordinate={vendorCoords} />
                        </MapView>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={{
                        width: "100%",
                        height: 200,
                        justifyContent: "center",
                        alignItems: "center",
                        opacity: 0.5,
                      }}
                    >
                      <Ionicons
                        name="map-outline"
                        size={48}
                        color={colors.text.secondary}
                      />
                    </View>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.getDirectionsBtn,
                      {
                        backgroundColor: isDarkMode ? "#333" : "#fff",
                        position: "absolute",
                        bottom: 12,
                        alignSelf: "center",
                        paddingHorizontal: 16,
                      },
                    ]}
                    onPress={() => {
                      if (vendorCoords) {
                        const url =
                          Platform.OS === "ios"
                            ? `http://maps.apple.com/?daddr=${vendorCoords.latitude},${vendorCoords.longitude}`
                            : `https://www.google.com/maps/dir/?api=1&destination=${vendorCoords.latitude},${vendorCoords.longitude}`;
                        Linking.openURL(url).catch((err) =>
                          console.error("An error occurred", err),
                        );
                      }
                    }}
                  >
                    <Ionicons
                      name="navigate"
                      size={18}
                      color={colors.text.primary}
                      style={{ marginRight: 8 }}
                    />
                    <Text
                      style={[
                        styles.getDirectionsText,
                        { color: colors.text.primary },
                      ]}
                    >
                      Get directions
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Rating block */}
              {ratingValue !== null && (
                <View
                  style={[
                    styles.vendorRatingBlock,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.vendorRatingScore,
                      {
                        backgroundColor: isDarkMode ? "#333" : "#f0f0f0",
                        color: colors.text.primary,
                      },
                    ]}
                  >
                    {parseFloat(ratingValue).toFixed(1)}
                  </Text>
                  <View style={styles.vendorRatingRight}>
                    <Text
                      style={[
                        styles.vendorRatingTitle,
                        { color: colors.primary },
                      ]}
                    >
                      Rating
                    </Text>
                    <Text
                      style={[
                        styles.vendorRatingSub,
                        { color: colors.text.secondary },
                      ]}
                    >
                      Based on{" "}
                      {restaurant.ratingsCount ||
                        restaurant._raw?.vendorId?.rating?.totalReviews ||
                        restaurant._raw?.vendor?.rating?.totalReviews ||
                        0}{" "}
                      {(restaurant.ratingsCount ||
                        restaurant._raw?.vendorId?.rating?.totalReviews ||
                        restaurant._raw?.vendor?.rating?.totalReviews ||
                        0) === 1
                        ? "rating"
                        : "ratings"}
                    </Text>
                  </View>
                </View>
              )}

              {/* Other Details block */}
              {(normVendor.businessDetails ||
                restaurant._raw?.vendorId?.businessDetails ||
                normVendor.registrationCode) && (
                  <View style={styles.otherDetailsContainer}>
                    <Text
                      style={[
                        styles.otherDetailsTitle,
                        { color: colors.primary },
                      ]}
                    >
                      Other details
                    </Text>

                    {/* Legal Entity Name */}
                    {(normVendor.businessDetails?.businessName ||
                      restaurant._raw?.vendorId?.businessDetails
                        ?.businessName) && (
                        <View style={styles.otherDetailItem}>
                          <Text
                            style={[
                              styles.otherDetailLabel,
                              { color: colors.text.secondary },
                            ]}
                          >
                            Legal entity name
                          </Text>
                          <Text
                            style={[
                              styles.otherDetailValue,
                              { color: colors.text.primary },
                            ]}
                          >
                            {normVendor.businessDetails?.businessName ||
                              restaurant._raw?.vendorId?.businessDetails
                                ?.businessName}
                          </Text>
                        </View>
                      )}

                    {/* Address */}
                    {displayLocation && (
                      <View style={styles.otherDetailItem}>
                        <Text
                          style={[
                            styles.otherDetailLabel,
                            { color: colors.text.secondary },
                          ]}
                        >
                          Address
                        </Text>
                        <Text
                          style={[
                            styles.otherDetailValue,
                            { color: colors.text.primary },
                          ]}
                        >
                          {displayLocation}
                        </Text>
                      </View>
                    )}

                    {/* Phone */}
                    {(normVendor.contactNumber ||
                      normVendor.phone ||
                      restaurant._raw?.vendorId?.contactDetails?.phone) && (
                        <View style={styles.otherDetailItem}>
                          <Text
                            style={[
                              styles.otherDetailLabel,
                              { color: colors.text.secondary },
                            ]}
                          >
                            Phone
                          </Text>
                          <Text
                            style={[
                              styles.otherDetailValue,
                              { color: colors.text.primary },
                            ]}
                          >
                            {normVendor.contactNumber ||
                              normVendor.phone ||
                              restaurant._raw?.vendorId?.contactDetails?.phone}
                          </Text>
                        </View>
                      )}

                    {/* Email */}
                    {(normVendor.contactDetails?.email ||
                      restaurant._raw?.vendorId?.contactDetails?.email ||
                      normVendor.email) && (
                        <View style={styles.otherDetailItem}>
                          <Text
                            style={[
                              styles.otherDetailLabel,
                              { color: colors.text.secondary },
                            ]}
                          >
                            Email
                          </Text>
                          <Text
                            style={[
                              styles.otherDetailValue,
                              { color: colors.text.primary },
                            ]}
                          >
                            {normVendor.contactDetails?.email ||
                              restaurant._raw?.vendorId?.contactDetails?.email ||
                              normVendor.email}
                          </Text>
                        </View>
                      )}

                    {/* Registration Code */}
                    {(normVendor.businessDetails?.registrationCode ||
                      restaurant._raw?.vendorId?.businessDetails
                        ?.registrationCode ||
                      normVendor.registrationCode) && (
                        <View style={styles.otherDetailItem}>
                          <Text
                            style={[
                              styles.otherDetailLabel,
                              { color: colors.text.secondary },
                            ]}
                          >
                            Registration Code
                          </Text>
                          <Text
                            style={[
                              styles.otherDetailValue,
                              { color: colors.text.primary },
                            ]}
                          >
                            {normVendor.businessDetails?.registrationCode ||
                              restaurant._raw?.vendorId?.businessDetails
                                ?.registrationCode ||
                              normVendor.registrationCode}
                          </Text>
                        </View>
                      )}

                    {/* Business Register Name */}
                    {(normVendor.businessDetails?.businessRegisterName ||
                      restaurant._raw?.vendorId?.businessDetails
                        ?.businessRegisterName) && (
                        <View style={styles.otherDetailItem}>
                          <Text
                            style={[
                              styles.otherDetailLabel,
                              { color: colors.text.secondary },
                            ]}
                          >
                            Business Register Name
                          </Text>
                          <Text
                            style={[
                              styles.otherDetailValue,
                              { color: colors.text.primary },
                            ]}
                          >
                            {normVendor.businessDetails?.businessRegisterName ||
                              restaurant._raw?.vendorId?.businessDetails
                                ?.businessRegisterName}
                          </Text>
                        </View>
                      )}

                    <Text
                      style={[
                        styles.legalDisclaimer,
                        { color: colors.text.secondary },
                      ]}
                    >
                      The partner commits to only offer products that comply with
                      the applicable rules of European Union law.
                    </Text>
                  </View>
                )}

              {/* Explicit spacer to fix Android bottom clipping when scrolled to the end */}
              <View style={{ height: Math.max(60, insets.bottom + 40) }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Screen Map Modal */}
      <Modal
        visible={fullMapVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFullMapVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View
            style={{
              paddingTop: insets.top || 40,
              backgroundColor: colors.surface,
              zIndex: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                height: 56,
              }}
            >
              <TouchableOpacity
                onPress={() => setFullMapVisible(false)}
                style={{ position: "absolute", left: 8, padding: 8 }}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Poppins-SemiBold",
                  color: colors.text.primary,
                }}
              >
                Map
              </Text>
            </View>
          </View>
          {vendorCoords && fullMapReady && (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={{ flex: 1 }}
              initialRegion={{
                latitude: vendorCoords.latitude,
                longitude: vendorCoords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              showsUserLocation={true}
            >
              <Marker
                coordinate={vendorCoords}
                title={displayName}
                description={displayLocation}
              />
            </MapView>
          )}
          <View
            style={{
              position: "absolute",
              bottom: Math.max(40, insets.bottom + 20),
              left: 0,
              right: 0,
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={[
                styles.getDirectionsBtn,
                {
                  backgroundColor: colors.primary,
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  borderRadius: 24,
                  flexDirection: "row",
                  alignItems: "center",
                  elevation: 4,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                },
              ]}
              onPress={() => {
                if (vendorCoords) {
                  const url =
                    Platform.OS === "ios"
                      ? `http://maps.apple.com/?daddr=${vendorCoords.latitude},${vendorCoords.longitude}`
                      : `https://www.google.com/maps/dir/?api=1&destination=${vendorCoords.latitude},${vendorCoords.longitude}`;
                  Linking.openURL(url).catch((err) =>
                    console.error("An error occurred", err),
                  );
                }
              }}
            >
              <Ionicons
                name="navigate"
                size={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: "#fff",
                  fontFamily: "Poppins-SemiBold",
                  fontSize: 16,
                }}
              >
                Get directions
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Alert Modal */}
      <AlertModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertVisible(false)}
      />

      {/* Max Quantity Modal */}
      <MaxQuantityModal
        visible={maxQuantityModalVisible}
        onClose={() => setMaxQuantityModalVisible(false)}
        maxStock={maxQuantityData.maxStock}
        currentCartQty={maxQuantityData.currentCartQty}
        itemName={maxQuantityData.itemName}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  headerGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontFamily: "Poppins-SemiBold",
    textAlign: "center",
    marginHorizontal: spacing.sm,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    fontFamily: "Poppins-Regular",
    paddingVertical: spacing.xs,
  },
  // ── Premium Vendor Hero ──
  vendorHero: {
    position: "relative",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    overflow: "hidden",
    // Premium shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  heroBottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 50,
  },
  restaurantImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#f0f0f0",
  },
  // ── Info Card Overlap ──
  glassInfoCardContainer: {
    marginHorizontal: 26,
    marginTop: -40, // Float over hero image
    marginBottom: 16,
    borderRadius: 24,
    // Clean shadow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  glassInfoCard: {
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: 24,
    alignItems: "center",
    overflow: "hidden",
  },
  restaurantName: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    letterSpacing: 0.15,
  },
  locationText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    marginLeft: 5,
  },
  restaurantMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: fontSize.sm,
    fontFamily: "Poppins-Medium",
  },
  metaDot: {
    marginHorizontal: spacing.sm,
    fontSize: fontSize.sm,
  },
  deliveryInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderColor: "#f0f0f0",
  },
  deliveryLabel: {
    fontSize: fontSize.sm,
    fontFamily: "Poppins-Regular",
  },
  deliveryValue: {
    fontSize: fontSize.md,
    fontFamily: "Poppins-Bold",
  },
  offerBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  offerText: {
    fontSize: fontSize.sm,
    fontFamily: "Poppins-SemiBold",
    color: "#fff",
  },
  categoryTabs: {
    borderBottomWidth: 1,
  },
  categoryTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  categoryTabText: {
    fontSize: fontSize.md,
    fontFamily: "Poppins-SemiBold",
  },
  menuSectionTitle: {
    fontSize: fontSize.xl,
    fontFamily: "Poppins-Bold",
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    // Premium depth
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  menuImageWrap: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
  },
  menuItemImage: {
    width: 88,
    height: 88,
    borderRadius: 16,
  },
  discountFlag: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  discountFlagText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Poppins-Bold",
    letterSpacing: 0.3,
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  soldOutText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Poppins-Bold",
    letterSpacing: 1,
  },
  menuItemInfo: {
    flex: 1,
    paddingLeft: 14,
    paddingRight: 4,
    justifyContent: "center",
  },
  menuItemName: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold",
    letterSpacing: 0.1,
    marginBottom: 3,
  },
  menuItemDescription: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    lineHeight: 17,
    marginBottom: 6,
  },
  lowStockText: {
    fontSize: 10,
    color: "#E8850C",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 3,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  menuItemPrice: {
    fontSize: 15,
    fontFamily: "Poppins-Bold",
    letterSpacing: 0.2,
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#bbb",
    textDecorationLine: "line-through",
  },
  customizableTag: {
    fontSize: 10,
    fontFamily: "Poppins-Medium",
    marginLeft: 4,
  },
  menuItemActions: {
    paddingLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    // Premium shadow glow
    shadowColor: "#E91E63",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: borderRadius.full,
    borderWidth: 1,
    padding: 4,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    marginHorizontal: spacing.sm,
    fontSize: fontSize.md,
    fontFamily: "Poppins-SemiBold",
    minWidth: 24,
    textAlign: "center",
  },
  quantityBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  quantityBadgeText: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
  },
  noResultsContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  noResultsText: {
    fontSize: fontSize.lg,
    fontFamily: "Poppins-SemiBold",
    marginTop: spacing.md,
  },
  noResultsSubtext: {
    fontSize: fontSize.sm,
    fontFamily: "Poppins-Regular",
    marginTop: spacing.xs,
  },
  floatingCart: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cartItemCount: {
    fontSize: fontSize.sm,
    fontFamily: "Poppins-Regular",
  },
  cartTotal: {
    fontSize: fontSize.xl,
    fontFamily: "Poppins-Bold",
  },
  viewCartButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  viewCartButtonText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontFamily: "Poppins-SemiBold",
  },
  // ── Clean Modal Styles (Frutti Pizza inspired) ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    // height set inline via Dimensions for cross-device accuracy
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    flexDirection: 'column',
  },
  modalHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingBottom: 4,
    paddingHorizontal: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  // Centered image
  modalImageCenter: {
    alignItems: 'center',
    marginVertical: 16,
  },
  modalImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    borderWidth: 3,
    borderColor: 'rgba(220,49,115,0.15)',
  },
  // Title
  modalTitle: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  // Info pills strip
  modalInfoPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  infoPillText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
  },
  // Price + Qty Row
  modalPriceQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 4,
  },
  modalPrice: {
    fontSize: 28,
    fontFamily: 'Poppins-Bold',
    letterSpacing: -0.3,
  },
  modalPriceOriginal: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    textDecorationLine: 'line-through',
    color: '#9E9E9E',
  },
  // Inline qty controls
  modalQtyInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalQtyInlineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  modalQtyInlineText: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    minWidth: 26,
    textAlign: 'center',
  },
  // Price breakdown card
  priceBreakdownCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  priceBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceBreakdownLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  priceBreakdownValue: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
  priceBreakdownDivider: {
    height: 1,
    marginVertical: 6,
  },
  priceBreakdownTotal: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
  },
  // Stock info
  stockDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
  },
  // Divider
  modalDivider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.35,
  },
  // Section
  modalSection: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  modalSectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    lineHeight: 22,
  },
  // Variations
  variationGroup: { marginBottom: 4 },
  variationHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  variationTitle: { fontSize: 14, fontFamily: 'Poppins-SemiBold' },
  requiredBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  requiredBadgeText: { fontSize: 10, fontFamily: 'Poppins-Medium', color: '#E65100' },
  variationOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  variationOptionText: { fontSize: 15, fontFamily: 'Poppins-Regular' },
  variationOptions: { flexDirection: 'row', flexWrap: 'wrap' },
  variationOptionChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1, marginBottom: 8, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  // Footer
  modalFooter: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  modalAddToCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  modalAddToCartText: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  outOfStockBadge: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFE5E5', borderRadius: 22 },
  outOfStockText: { color: '#D32F2F', fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  // Legacy compatibility stubs
  modalQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalQtyBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  modalQtyText: { fontSize: 20, fontFamily: 'Poppins-Bold', minWidth: 28, textAlign: 'center' },
  modalAddToCartBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  modalPriceContainer: { marginBottom: 0 },
  modalPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalBadge: { backgroundColor: '#E91E63', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  modalBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  modalQuantityLabel: { fontSize: 17, fontFamily: 'Poppins-SemiBold' },
  modalQuantityControl: { flexDirection: 'row', alignItems: 'center', borderRadius: 50 },
  modalQuantityBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modalQuantityText: { fontSize: 20, fontFamily: 'Poppins-Bold', minWidth: 44, textAlign: 'center' },
  modalDiscountPill: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  modalDiscountPillText: { color: '#2E7D32', fontSize: 12, fontFamily: 'Poppins-Bold' },
  modalOriginalPrice: { fontSize: 14, fontFamily: 'Poppins-Regular' },
  discountBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  discountText: { color: '#fff', fontSize: 10, fontFamily: 'Poppins-Bold' },
  modalVariations: { paddingHorizontal: 16, marginTop: 8 },
  imageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60 },
  imageTopOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 60 },
  modalCloseBtn: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalFavBtn: { backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  modalHeroContainer: { height: 280, width: '100%', position: 'relative', overflow: 'visible', justifyContent: 'flex-start' },
  modalHeroTopRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, zIndex: 10 },
  modalHeroTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontFamily: 'Poppins-Bold', color: '#fff', paddingHorizontal: 8 },
  modalImageWrapper: { position: 'absolute', bottom: -30, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  modalContentCard: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -28, paddingTop: 40, paddingHorizontal: 20, zIndex: 5 },
  modalInfoStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, marginBottom: 4 },
  modalImageDiscountBadge: { position: 'absolute', bottom: 12, right: 16, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  modalImageDiscountText: { color: '#fff', fontSize: 13, fontFamily: 'Poppins-Bold' },
  modalTitlePriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 6, marginTop: 4 },
  modalSavingRow: { flexDirection: 'row', marginBottom: 10 },
  modalSavingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2F0', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  modalSavingText: { fontSize: 12, fontFamily: 'Poppins-Medium', color: '#DC3173' },
  addonsBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.md, // Ensure space below too
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  addonsBannerTitle: {
    fontSize: fontSize.sm,
    fontFamily: "Poppins-SemiBold",
    lineHeight: 20, // Better line height
  },
  addonsBannerText: {
    fontSize: fontSize.xs,
    fontFamily: "Poppins-Regular",
    marginTop: 2,
    lineHeight: 16, // Better line height
  },
  moreInfoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  moreInfoText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
    marginRight: 2,
  },
  restaurantMetaWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  metaStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaStatText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 12,
  },
  vendorDetailsCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: "70%",
    maxHeight: "90%",
    paddingTop: 8,
    paddingHorizontal: 24,
    width: "100%",
    flex: 1, // Let it fill up the available maxHeight area naturally
  },
  vendorModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  vendorModalCloseBtn: {
    padding: 8,
    marginLeft: -8, // better touch target
  },
  vendorModalShareBtn: {
    padding: 8,
    marginRight: -8,
  },
  vendorModalTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    marginTop: 8,
    marginBottom: 4,
  },
  vendorModalSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
    marginBottom: 24,
  },
  vendorInfoList: {
    marginBottom: 24,
  },
  vendorInfoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  vendorInfoIcon: {
    marginTop: 2,
    marginRight: 16,
  },
  vendorInfoContent: {
    flex: 1,
  },
  vendorInfoLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    marginBottom: 2,
  },
  vendorInfoValue: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  mapPlaceholder: {
    marginBottom: 24,
    overflow: "hidden",
  },
  getDirectionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  getDirectionsText: {
    fontSize: 15,
    fontFamily: "Poppins-SemiBold", // Slightly bolder for better visibility
    letterSpacing: 0.3,
  },
  serviceTypesContainer: {
    marginBottom: 24,
  },
  serviceTypesTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    marginBottom: 12,
  },
  serviceTypeItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  serviceTypeBullet: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
  },
  serviceTypeText: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
  },
  vendorRatingBlock: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  vendorRatingScore: {
    fontSize: 26, // Slightly larger
    fontFamily: "Poppins-Bold",
    marginRight: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14, // Softer radius
    overflow: "hidden",
    textAlign: "center",
    minWidth: 70,
  },
  vendorRatingRight: {
    flex: 1,
    justifyContent: "center",
  },
  vendorRatingTitle: {
    fontSize: 19,
    fontFamily: "Poppins-Bold", // Stronger title
    marginBottom: 1,
  },
  vendorRatingSub: {
    fontSize: 13.5,
    fontFamily: "Poppins-Regular",
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  otherDetailsContainer: {
    marginTop: 8,
    marginBottom: 40,
  },
  otherDetailsTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    marginBottom: 16,
  },
  otherDetailItem: {
    marginBottom: 16,
  },
  otherDetailLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    marginBottom: 2,
  },
  otherDetailValue: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  legalDisclaimer: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    marginTop: 16,
    lineHeight: 18,
  },
});

export default RestaurantDetailsScreen;
