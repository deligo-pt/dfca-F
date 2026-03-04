/**
 * TrackOrderScreen
 * 
 * Visualization of live order tracking with map integration, real-time driver
 * location updates, and stage-based status progress.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Linking,
  Alert,
  Platform,
  Modal,
  StatusBar,
  BackHandler,
  ActivityIndicator,
  Easing,
  AppState,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { spacing, fontSize, borderRadius } from '../theme';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme, darkMapStyle } from '../utils/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import { API_ENDPOINTS } from '../constants/config';

const { height } = Dimensions.get('window');

import { customerApi } from '../utils/api';
import OrderRatingModal from '../components/OrderRatingModal';

// Google Maps API Key for ETA calculations
const GOOGLE_MAPS_API_KEY = 'AIzaSyCZ1jixNYbSRM21Uq82a6KXNO_FSpLUwaQ';

// Format address object to string
const formatAddress = (addr) => {
  try {
    if (!addr) return '';
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object') {
      const parts = [addr.street, addr.city, addr.state, addr.postalCode, addr.country]
        .filter(Boolean)
        .map(String)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      return parts.join(', ');
    }
    return String(addr);
  } catch {
    return '';
  }
};

const TrackOrderScreen = ({ route, navigation }) => {
  const { t, language } = useLanguage();
  const { colors, isDarkMode } = useTheme();
  const insets = useSafeAreaInsets();

  const { order: paramOrder, orderId: paramOrderId } = route.params || {};
  const [fetchedOrder, setFetchedOrder] = useState(null);
  const [loading, setLoading] = useState(!paramOrder && !!paramOrderId);

  const order = fetchedOrder || paramOrder;
  const orderId = order?._id || paramOrderId;

  // Map API status to internal stage
  const mapOrderStatusToStage = (status) => {
    const statusMap = {
      'PENDING': 'pending',
      'ACCEPTED': 'accepted',
      'AWAITING_PARTNER': 'accepted', // Use accepted stage but show specific text
      'REASSIGNMENT_NEEDED': 'accepted',
      'DISPATCHING': 'accepted', // Still finding driver
      'ASSIGNED': 'preparing',    // Driver assigned, now preparing? Or vice versa. Let's stick to sequence.
      'PREPARING': 'preparing',

      'READY_FOR_PICKUP': 'ready',

      'PICKED_UP': 'picked_up',

      'ON_THE_WAY': 'on_the_way',

      // 'NEARBY': 'nearby', // Not in backend list

      'DELIVERED': 'delivered',
      'CANCELED': 'cancelled',
      'REJECTED': 'cancelled',
    };
    return statusMap[status?.toUpperCase()] || 'pending';
  };

  const initialStatus = order?.orderStatus ? mapOrderStatusToStage(order.orderStatus) : 'pending';
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [progressAnim] = useState(new Animated.Value(0));
  const inlineMapRef = useRef(null);
  const fullscreenMapRef = useRef(null);
  const geocodingCache = useRef({});

  // Location state management
  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [restaurantLocation, setRestaurantLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [inlineMapLayout, setInlineMapLayout] = useState(false);
  const [fullscreenMapLayout, setFullscreenMapLayout] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [driverEta, setDriverEta] = useState(null);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [callTarget, setCallTarget] = useState({ name: '', phone: '', cleanPhone: '', type: '' });
  const [initialFitDone, setInitialFitDone] = useState(false);
  const [lastDriverUpdate, setLastDriverUpdate] = useState(null);
  const [isDriverLive, setIsDriverLive] = useState(false);
  const fittingTimeoutRef = useRef(null);
  const lastEtaRequestTime = useRef(0);

  // Check driver liveness periodically
  useEffect(() => {
    if (!lastDriverUpdate) {
      if (isDriverLive) setIsDriverLive(false);
      return;
    }

    const checkLiveness = () => {
      const now = Date.now();
      const diff = now - lastDriverUpdate;
      // Consider live if update within last 2 minutes (120000ms)
      const isLive = diff < 120000;
      if (isLive !== isDriverLive) setIsDriverLive(isLive);
    };

    checkLiveness(); // Check immediately
    const intervalId = setInterval(checkLiveness, 30000); // Check every 30s

    return () => clearInterval(intervalId);
  }, [lastDriverUpdate, isDriverLive]);

  // Pulse Animation for Active Stage
  const activeStagePulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(activeStagePulse, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      })
    ).start();
  }, []);

  // Calculate ETA using Google Distance Matrix API or Fallback
  useEffect(() => {
    let active = true;
    const minRequestInterval = 30000; // Throttle API calls to every 30 seconds

    const fetchGoogleEta = async (origin, destination) => {
      const now = Date.now();
      if (now - lastEtaRequestTime.current < minRequestInterval) {
        return;
      }

      try {
        console.log('[TrackOrder] Fetching Google ETA...');
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (active && data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
          const duration = data.rows[0].elements[0].duration;
          // duration.value is in seconds
          const minutes = Math.ceil(duration.value / 60);
          console.log(`[TrackOrder] Google ETA: ${minutes} mins (${duration.text})`);
          setDriverEta(minutes);
          lastEtaRequestTime.current = now;
          return true;
        } else {
          console.warn('[TrackOrder] Google Distance Matrix API error:', data.status, data.error_message);
          return false;
        }
      } catch (error) {
        console.error('[TrackOrder] Google API fetch failed:', error);
        return false;
      }
    };

    const calculateFallbackEta = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Radius of the earth in km
      const deg2rad = (deg) => deg * (Math.PI / 180);
      const dLat = deg2rad(lat2 - lat1);
      const dLon = deg2rad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c; // Distance in km

      const speedKmH = 20; // Average city speed
      const hours = d / speedKmH;
      const minutes = Math.ceil(hours * 60) + 2;
      return minutes < 1 ? 1 : minutes;
    };

    if (driverLocation && userLocation) {
      // Try Google API first
      fetchGoogleEta(driverLocation, userLocation).then(success => {
        if (!success && active) {
          // Fallback to manual calculation
          const fallbackMin = calculateFallbackEta(
            driverLocation.latitude,
            driverLocation.longitude,
            userLocation.latitude,
            userLocation.longitude
          );
          setDriverEta(fallbackMin);
        }
      });
    }

    return () => { active = false; };
  }, [driverLocation, userLocation]);

  // Trigger rating automatically when order is delivered
  useEffect(() => {
    if (currentStatus === 'delivered') {
      // Small delay to ensure user sees the "Delivered" status update first
      const timer = setTimeout(() => {
        setShowRatingModal(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentStatus]);

  // Skeleton Animation
  const skeletonOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [loading]);

  const SkeletonBlock = ({ style }) => (
    <Animated.View
      style={[
        {
          backgroundColor: isDarkMode ? '#2C2C2C' : '#E0E0E0',
          opacity: skeletonOpacity,
          borderRadius: borderRadius.md,
        },
        style,
      ]}
    />
  );

  // Fetch order details if needed
  useEffect(() => {
    let isActive = true;

    const fetchOrderDetails = async () => {
      // If we don't have the order object, but we have an ID, fetch it
      if (!paramOrder && paramOrderId) {
        try {
          if (isActive) setLoading(true);
          console.log('[TrackOrder] Fetching order details for ID:', paramOrderId);

          // Use the GET_BY_ID endpoint
          const url = API_ENDPOINTS.ORDERS.GET_BY_ID.replace(':id', paramOrderId);
          const response = await customerApi.get(url);

          if (isActive) {
            if (response && response.success && response.data) {
              console.log('[TrackOrder] Order fetched successfully');
              setFetchedOrder(response.data);
              // Update status immediately after fetch
              setCurrentStatus(mapOrderStatusToStage(response.data.orderStatus));
            } else {
              console.warn('[TrackOrder] Failed to fetch order or no data returned');
              Alert.alert(t('error'), t('orderNotFound') || 'Order not found', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            }
          }
        } catch (error) {
          console.error('[TrackOrder] Error fetching order:', error);
          if (isActive) {
            Alert.alert(t('error'), t('failedToLoadOrder') || 'Failed to load order details', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          }
        } finally {
          if (isActive) setLoading(false);
        }
      }
    };

    fetchOrderDetails();

    return () => { isActive = false; };
    return () => { isActive = false; };
  }, [order?._id, order?.vendorId, order?.items]);

  // Smart Polling Mechanism (Hybrid Approach)
  useEffect(() => {
    // Only poll if:
    // 1. We have an order ID
    // 2. Driver is NOT strictly "Live" (socket active & recent)
    // 3. Status is active (picked_up, on_the_way, nearby)
    const shouldPoll = order?._id && !isDriverLive &&
      ['PICKED_UP', 'ON_THE_WAY', 'NEARBY', 'ASSIGNED'].includes(order?.orderStatus);

    if (!shouldPoll) return;

    const pollInterval = setInterval(async () => {
      // Don't poll if app is in background to save resources
      if (AppState.currentState !== 'active') {
        console.log('[TrackOrder] App in background, skipping poll');
        return;
      }

      try {
        // Use paramOrderId (from navigation) as it's proven to work for initial fetch
        // Or fallback to order.orderId or order._id if available
        const idToUse = paramOrderId || order?.orderId || order?._id;
        console.log(`[TrackOrder] Smart Polling: Fetching snapshot for ID: ${idToUse}`);

        const url = API_ENDPOINTS.ORDERS.GET_BY_ID.replace(':id', idToUse);
        const response = await customerApi.get(url);

        if (response && response.success && response.data) {
          const newOrder = response.data;
          // Only update if location changed to avoid map jitters
          const newPartner = newOrder.deliveryPartnerId;
          if (newPartner?.currentSessionLocation?.coordinates) {
            const newCoords = {
              latitude: newPartner.currentSessionLocation.coordinates[1],
              longitude: newPartner.currentSessionLocation.coordinates[0]
            };
            console.log('[TrackOrder] Smart Polling: Got new snapshot coords:', newCoords);
            setDriverLocation(newCoords);
            // We do NOT set isDriverLive to true here, because this is a snapshot, not a live stream.
          }
        }
      } catch (err) {
        console.log('[TrackOrder] Smart Polling failed:', err.message);
      }
    }, 45000); // 45 seconds interval - low pressure

    return () => clearInterval(pollInterval);
  }, [order?._id, isDriverLive, order?.orderStatus]);

  // Normalize order data structure
  const normalizeOrderData = (data) => {
    if (!data) return {}; // Return empty object instead of null to match fallback behavior

    // Extract order items with proper names
    const normalizedItems = (data.items || []).map((item) => {
      if (typeof item === 'string') {
        return { name: item, quantity: 1, price: 0 };
      }
      // Handle productId object structure
      let productName = item.name;
      if (typeof item.productId === 'object' && item.productId) {
        productName = item.productId.name || item.name || 'Product';
      }
      const quantity = item.itemSummary?.quantity ?? (item.quantity || 1);
      const subtotal = item.itemSummary?.grandTotal ?? item.subtotal ?? (item.price * (item.quantity || 1) || 0);
      return {
        name: productName,
        quantity: quantity,
        price: item.productPricing?.unitPrice ?? (item.price || (subtotal / quantity) || 0),
        subtotal: subtotal
      };
    });

    // Build items text for display
    const itemsText = normalizedItems.map(item =>
      item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name
    );

    // Format delivery address from object
    const deliveryAddrStr = formatAddress(data.deliveryAddress);

    // Format order date and time from createdAt
    let orderDate = '';
    let orderTime = '';
    if (data.createdAt) {
      try {
        const date = new Date(data.createdAt);
        orderDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        orderTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        orderDate = 'N/A';
        orderTime = 'N/A';
      }
    }

    // Extract vendor/restaurant name - handle both string and object vendorId
    let restaurantName = data.vendorName || data.restaurantName;
    if (!restaurantName && typeof data.vendorId === 'object' && data.vendorId) {
      const vendor = data.vendorId;
      restaurantName = vendor.businessDetails?.businessName
        || vendor.businessName
        || (vendor.name && typeof vendor.name === 'object'
          ? `${vendor.name.firstName || ''} ${vendor.name.lastName || ''}`.trim()
          : vendor.name)
        || 'Restaurant';
    }
    restaurantName = restaurantName || 'Restaurant';

    // Extract vendor coordinates
    let restaurantCoords = null;
    const vendorObj = typeof data.vendorId === 'object' ? data.vendorId : (typeof data.vendor === 'object' ? data.vendor : null);

    // 1. Check for explicit pickupAddress (Highest Priority)
    if (data.pickupAddress && typeof data.pickupAddress.latitude === 'number' && typeof data.pickupAddress.longitude === 'number') {
      restaurantCoords = {
        latitude: data.pickupAddress.latitude,
        longitude: data.pickupAddress.longitude
      };
      console.log('[TrackOrder] Using pickupAddress for restaurant location:', restaurantCoords);
    }

    // 2. Check top-level fully populated vendor object (Fallback)
    if (!restaurantCoords && vendorObj) {
      if (typeof vendorObj.latitude === 'number' && typeof vendorObj.longitude === 'number') {
        restaurantCoords = { latitude: vendorObj.latitude, longitude: vendorObj.longitude };
      } else if (vendorObj.location && Array.isArray(vendorObj.location.coordinates)) {
        restaurantCoords = {
          latitude: vendorObj.location.coordinates[1],
          longitude: vendorObj.location.coordinates[0]
        };
      } else if (vendorObj.businessLocation && vendorObj.businessLocation.coordinates) {
        restaurantCoords = {
          latitude: vendorObj.businessLocation.coordinates[1],
          longitude: vendorObj.businessLocation.coordinates[0]
        };
      } else if (vendorObj.businessLocation && typeof vendorObj.businessLocation.latitude === 'number') {
        restaurantCoords = {
          latitude: vendorObj.businessLocation.latitude,
          longitude: vendorObj.businessLocation.longitude
        };
      }
    }

    // 2. Fallback: Check inside the first ordered item (product -> vendor populates often happen here)
    if (!restaurantCoords && data.items && data.items.length > 0) {
      const firstItem = data.items[0];
      // item might be the product itself or have productId populated
      const product = firstItem.productId || firstItem;

      if (product && typeof product === 'object') {
        const productVendor = product.vendorId;
        if (productVendor && typeof productVendor === 'object') {
          if (productVendor.businessLocation && typeof productVendor.businessLocation.latitude === 'number') {
            restaurantCoords = {
              latitude: productVendor.businessLocation.latitude,
              longitude: productVendor.businessLocation.longitude
            };
          } else if (productVendor.location && Array.isArray(productVendor.location.coordinates)) {
            restaurantCoords = {
              latitude: productVendor.location.coordinates[1],
              longitude: productVendor.location.coordinates[0]
            };
          }
          // If we found vendor info here, we can also fix the name if missing
          if (!restaurantName || restaurantName === 'Restaurant') {
            restaurantName = productVendor.businessDetails?.businessName || productVendor.businessName || 'Restaurant';
          }
        }
      }
    }

    // 3. Last resort fallback
    if (!restaurantCoords && data.restaurantLocation) {
      restaurantCoords = data.restaurantLocation;
    }

    // Extract delivery partner info if available
    let driverName = t('awaitingDriver') || 'Awaiting driver';
    let driverPhone = '';
    let driverRating = 0;
    let vehicleType = '';
    let vehicleNumber = '';

    if (data.deliveryPartnerId && typeof data.deliveryPartnerId === 'object') {
      const partner = data.deliveryPartnerId;
      if (partner.name && typeof partner.name === 'object') {
        driverName = `${partner.name.firstName || ''} ${partner.name.lastName || ''}`.trim() || driverName;
      } else if (partner.name) {
        driverName = partner.name;
      }
      driverPhone = partner.phone || partner.phoneNumber || partner.contactNumber || '';
      driverRating = partner.rating || 0;
      vehicleType = partner.vehicleType || partner.vehicle?.type || '';
      vehicleNumber = partner.vehicleNumber || partner.vehicle?.number || '';
    }

    // Calculate subtotal from items if not provided
    const calculatedSubtotal = normalizedItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);

    return {
      id: data._id || data.id || '',
      orderNumber: data.orderId || (data._id ? `#${data._id.slice(-8)}` : ''),
      orderDate: orderDate,
      orderTime: orderTime,
      restaurantName: restaurantName,
      restaurantAddress: data.pickupAddress ? formatAddress(data.pickupAddress) : (data.restaurantAddress || ''),
      restaurantPhone: data.restaurantPhone || '',
      restaurantImage: data.restaurantImage || '',
      restaurantCoordinates: restaurantCoords,
      items: normalizedItems,
      itemsText: itemsText,
      totalItems: data.totalItems ?? normalizedItems.reduce((acc, item) => acc + (item.quantity || 1), 0),
      subtotal: Number(data.orderCalculation?.taxableAmount ?? data.orderCalculation?.totalOriginalPrice ?? calculatedSubtotal ?? 0),
      taxAmount: Number(data.orderCalculation?.totalTaxAmount ?? 0),
      deliveryFee: Number(data.delivery?.totalDeliveryCharge ?? data.deliveryCharge ?? 0),
      serviceFee: data.serviceFee || 0,
      discount: data.discount || 0,
      totalAmount: Number(data.payoutSummary?.grandTotal ?? data.totalAmount ?? 0),
      estimatedTime: data.estimatedDeliveryTime || '',
      estimatedArrival: data.estimatedArrival || '',
      deliveryAddress: deliveryAddrStr || '',
      deliveryLandmark: data.deliveryAddress?.landmark || '',
      deliveryInstructions: data.remarks || data.deliveryInstructions || '',
      driverName: driverName,
      driverPhone: driverPhone,
      driverRating: driverRating,
      driverTotalDeliveries: data.driverTotalDeliveries || 0,
      vehicleType: vehicleType,
      vehicleNumber: vehicleNumber,
      vehicleColor: data.vehicleColor || '',
      paymentMethod: data.paymentMethod || '',
      paymentStatus: data.paymentStatus || '',
      orderStatus: data.orderStatus || '',
      promoCode: data.couponId?.code || '',
      isOtpVerified: data.isOtpVerified || false,
    };
  };

  const orderData = normalizeOrderData(order || {});

  const orderStages = useMemo(() => [
    {
      id: 'pending',
      title: t('orderPending') || 'Order Pending',
      subtitle: t('waitingForRestaurant') || 'Waiting for restaurant response',
      icon: 'time',
      iconLibrary: 'Ionicons',
    },
    {
      id: 'accepted',
      title: t('orderAccepted') || 'Order Accepted',
      subtitle: (order?.orderStatus === 'AWAITING_PARTNER' || order?.orderStatus === 'DISPATCHING' || order?.orderStatus === 'REASSIGNMENT_NEEDED')
        ? (t('findingDriver') || 'Finding delivery partner...')
        : (t('restaurantAccepted') || 'Restaurant accepted your order'),
      icon: 'checkmark-circle',
      iconLibrary: 'Ionicons',
    },
    {
      id: 'preparing',
      title: t('preparing') || 'Preparing',
      subtitle: (order?.orderStatus === 'ASSIGNED')
        ? (t('driverAssignedPreparing') || 'Driver assigned • Preparing your order')
        : (t('restaurantPreparing') || 'Restaurant is preparing your order'),
      icon: 'restaurant',
      iconLibrary: 'MaterialIcons',
    },
    {
      id: 'ready',
      title: t('readyForPickup'),
      subtitle: t('yourOrderReady'),
      icon: 'checkmark-done',
      iconLibrary: 'Ionicons',
    },
    {
      id: 'picked_up',
      title: t('pickedUp'),
      subtitle: t('riderPickedUp'),
      icon: 'bicycle',
      iconLibrary: 'Ionicons',
    },
    {
      id: 'on_the_way',
      title: t('onTheWay'),
      subtitle: t('riderHeading'),
      icon: 'navigate',
      iconLibrary: 'Ionicons',
    },
    {
      id: 'nearby',
      title: t('nearby'),
      subtitle: t('riderAlmostThere'),
      icon: 'location',
      iconLibrary: 'Ionicons',
    },
    {
      id: 'delivered',
      title: t('delivered'),
      subtitle: t('orderDelivered'),
      icon: 'checkmark-circle',
      iconLibrary: 'Ionicons',
    },
  ], [language]);

  // Handle driver call
  const handleCallDriver = () => {
    const phoneNumber = orderData.driverPhone ? orderData.driverPhone.replace(/\D/g, '') : '';

    if (!phoneNumber) {
      Alert.alert(t('error'), t('phoneNotAvailable') || 'Phone number not available');
      return;
    }

    setCallTarget({
      name: orderData.driverName,
      phone: orderData.driverPhone,
      cleanPhone: phoneNumber,
      type: 'driver'
    });
    setCallModalVisible(true);
  };

  // Handle restaurant call
  const handleCallRestaurant = () => {
    const phoneNumber = orderData.restaurantPhone ? orderData.restaurantPhone.replace(/\D/g, '') : '';

    if (!phoneNumber) {
      Alert.alert(t('error'), t('phoneNotAvailable') || 'Phone number not available');
      return;
    }

    setCallTarget({
      name: orderData.restaurantName,
      phone: orderData.restaurantPhone,
      cleanPhone: phoneNumber,
      type: 'restaurant'
    });
    setCallModalVisible(true);
  };

  const confirmCall = () => {
    setCallModalVisible(false);
    const phoneUrl = Platform.OS === 'ios' ? `telprompt:${callTarget.cleanPhone}` : `tel:${callTarget.cleanPhone}`;
    Linking.openURL(phoneUrl).catch((err) => {
      console.error('Call error:', err);
      Alert.alert(t('error'), t('unableToCall'));
    });
  };

  // Handle back navigation
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If no history (e.g. from notification), go appropriately
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
    return true;
  };

  // Hardware Back Button Handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBack
    );
    return () => backHandler.remove();
  }, []);

  // Handle driver messaging
  const handleMessageDriver = () => {
    setMessageModalVisible(true);
  };

  // Quick Message Templates
  const showQuickMessages = () => {
    Alert.alert(
      t('quickMessages'),
      t('selectMessage'),
      [
        {
          text: t('whereAreYou'),
          onPress: () => sendQuickMessage(`${t('whereAreYou')} 📍`),
        },
        {
          text: t('pleaseBeCareful'),
          onPress: () => sendQuickMessage(`${t('pleaseBeCareful')} 🙏`),
        },
        {
          text: t('takeYourTime'),
          onPress: () => sendQuickMessage(`${t('takeYourTime')} 😊`),
        },
        {
          text: t('callWhenArrive'),
          onPress: () => sendQuickMessage(`${t('callWhenArrive')} 📞`),
        },
        {
          text: t('leaveAtDoor'),
          onPress: () => sendQuickMessage(`${t('leaveAtDoor')} 🚪`),
        },
        {
          text: t('cancel'),
          style: 'cancel',
        },
      ]
    );
  };

  // Send Quick Message
  const sendQuickMessage = (message) => {
    Alert.alert(
      t('messageSent'),
      `"${message}"\n\n${t('hasSentTo')} ${orderData.driverName} ✓`,
      [{ text: 'OK' }]
    );
  };

  // Initialize location services - REAL DATA ONLY, no fallbacks
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // 1. Get coordinates from Order Delivery Address (REAL DATA ONLY)
        let orderDeliveryCoords = null;
        if (order?.deliveryAddress) {
          const da = order.deliveryAddress;
          if (typeof da.latitude === 'number' && typeof da.longitude === 'number') {
            orderDeliveryCoords = { latitude: da.latitude, longitude: da.longitude };
          } else if (da.location && Array.isArray(da.location.coordinates)) {
            orderDeliveryCoords = { latitude: da.location.coordinates[1], longitude: da.location.coordinates[0] };
          } else if (da.coordinates && Array.isArray(da.coordinates)) {
            orderDeliveryCoords = { latitude: da.coordinates[1], longitude: da.coordinates[0] };
          }
        }

        // 2. If valid delivery coords from order, use them
        if (orderDeliveryCoords) {
          console.log('[TrackOrder] Using real delivery coordinates from order:', orderDeliveryCoords);
          if (active) setUserLocation(orderDeliveryCoords);
        } else {
          // Try geocoding the address string if we have a real address
          if (orderData.deliveryAddress && orderData.deliveryAddress !== 'Delivery address' && orderData.deliveryAddress.trim() !== '') {
            const addressKey = orderData.deliveryAddress.trim();

            // Check cache first
            if (geocodingCache.current[addressKey]) {
              const cachedCoords = geocodingCache.current[addressKey];
              console.log('[TrackOrder] Using cached delivery coordinates:', cachedCoords);
              if (active) {
                setUserLocation(cachedCoords);
                orderDeliveryCoords = cachedCoords;
              }
            } else {
              try {
                console.log('[TrackOrder] Geocoding address:', addressKey);
                const geocoded = await Location.geocodeAsync(addressKey);
                if (geocoded && geocoded.length > 0) {
                  const geoCoords = { latitude: geocoded[0].latitude, longitude: geocoded[0].longitude };
                  console.log('[TrackOrder] Geocoded delivery address:', geoCoords);

                  // Save to cache
                  geocodingCache.current[addressKey] = geoCoords;

                  if (active) {
                    setUserLocation(geoCoords);
                    orderDeliveryCoords = geoCoords;
                  }
                } else {
                  console.warn('[TrackOrder] Geocoding returned no results');
                }
              } catch (e) {
                console.warn('[TrackOrder] Geocoding failed:', e);
              }
            }
          } else {
            console.warn('[TrackOrder] No delivery address available in order');
          }
        }

        // --- Restaurant Location (REAL DATA ONLY) ---

        const partner = order?.deliveryPartnerId;
        const realRestCoords = orderData.restaurantCoordinates;

        if (realRestCoords) {
          console.log('[TrackOrder] Using real restaurant coordinates:', realRestCoords);
          if (active) setRestaurantLocation(realRestCoords);
        } else {
          console.warn('[TrackOrder] No restaurant coordinates available - will attempt to fetch from vendor API');
          if (active) setRestaurantLocation(null);
        }

        // --- Driver Location (REAL DATA ONLY from order or socket) ---
        // partner variable is already defined above
        if (partner && typeof partner === 'object') {
          let partnerCoords = null;
          if (partner.location && Array.isArray(partner.location.coordinates)) {
            partnerCoords = {
              latitude: partner.location.coordinates[1],
              longitude: partner.location.coordinates[0]
            };
          } else if (typeof partner.latitude === 'number' && typeof partner.longitude === 'number') {
            partnerCoords = { latitude: partner.latitude, longitude: partner.longitude };
          } else if (partner.currentLocation) {
            const cl = partner.currentLocation;
            if (Array.isArray(cl.coordinates)) {
              partnerCoords = { latitude: cl.coordinates[1], longitude: cl.coordinates[0] };
            } else if (typeof cl.latitude === 'number') {
              partnerCoords = { latitude: cl.latitude, longitude: cl.longitude };
            }
          } else if (partner.currentSessionLocation) {
            const csl = partner.currentSessionLocation;
            if (Array.isArray(csl.coordinates)) {
              partnerCoords = { latitude: csl.coordinates[1], longitude: csl.coordinates[0] };
            } else if (typeof csl.latitude === 'number') {
              partnerCoords = { latitude: csl.latitude, longitude: csl.longitude };
            }
          }

          if (partnerCoords) {
            console.log('[TrackOrder] Using real driver coordinates from order:', partnerCoords);
            if (active) {
              setDriverLocation(partnerCoords);

              // Initialize last driver update time
              // Do NOT set lastDriverUpdate from initial load. 
              // We want "LIVE" to mean strictly "Connected to Socket".
              // if (partner.currentSessionLocation?.lastLocationUpdate) {
              //   const lastUpdate = new Date(partner.currentSessionLocation.lastLocationUpdate).getTime();
              //   if (!isNaN(lastUpdate)) {
              //     setLastDriverUpdate(lastUpdate);
              //   }
              // }
            }
          } else {
            console.log('[TrackOrder] Driver assigned but no location data - waiting for socket updates');
          }
        } else {
          console.log('[TrackOrder] No delivery partner assigned yet');
        }

        // Create route coordinates only with available real data


      } catch (error) {
        console.error('[TrackOrder] Error initializing map:', error);
        // No fallback - just log the error
      }
    })();
    return () => { active = false; };
  }, [order?._id, order?.orderStatus, order?.driverId, order?.deliveryPartnerId?._id]);

  // Fetch vendor details if needed
  useEffect(() => {
    const fetchVendorDetails = async () => {
      // 0. If order has specific restaurant/pickup coordinates, ALWAYS use them
      if (orderData.restaurantCoordinates) {
        // Check if different to avoid unnecessary updates
        if (!restaurantLocation ||
          restaurantLocation.latitude !== orderData.restaurantCoordinates.latitude ||
          restaurantLocation.longitude !== orderData.restaurantCoordinates.longitude) {
          console.log('[TrackOrder] Vendor: Updating coords from orderData:', orderData.restaurantCoordinates);
          setRestaurantLocation(orderData.restaurantCoordinates);
        }
        return;
      }

      // Skip if we already have restaurant location (from manual fetch below)
      if (restaurantLocation) {
        console.log('[TrackOrder] Vendor: Already have restaurant location, skipping fetch');
        return;
      }

      // 1. First try to extract from order items (no API call needed)
      if (order?.items && order.items.length > 0) {
        for (const item of order.items) {
          const product = item.productId || item;
          const vendor = product?.vendorId || product?.vendor;

          if (vendor && typeof vendor === 'object') {
            console.log('[TrackOrder] Vendor: Found in order items:', vendor._id);
            const coords = extractVendorCoords(vendor);
            if (coords) {
              console.log('[TrackOrder] Vendor: Extracted coords from order items:', coords);
              setRestaurantLocation(coords);
              return;
            }
          }
        }
      }

      // 2. If vendorId is populated object on order itself
      console.log('[TrackOrder] Vendor: order.vendorId type:', typeof order?.vendorId,
        'value:', JSON.stringify(order?.vendorId, null, 2)?.substring(0, 800));

      if (order?.vendorId && typeof order.vendorId === 'object') {
        console.log('[TrackOrder] Vendor: Found populated vendorId on order');
        const coords = extractVendorCoords(order.vendorId);
        if (coords) {
          console.log('[TrackOrder] Vendor: Extracted coords from order.vendorId:', coords);
          setRestaurantLocation(coords);
          return;
        } else {
          console.log('[TrackOrder] Vendor: vendorId object has no coords, businessLocation:',
            JSON.stringify(order.vendorId.businessLocation, null, 2));
        }
      }

      // 3. Fallback: Fetch product by SKU to get vendor details
      // The /products/:id endpoint expects SKU (like PROD-O0V2GO), not MongoDB ObjectId
      const firstItem = order?.items?.[0];
      console.log('[TrackOrder] Vendor: First item structure:', JSON.stringify(firstItem, null, 2)?.substring(0, 500));

      // Try to get SKU from various possible locations
      const productSku = firstItem?.sku
        || firstItem?.productSku
        || (typeof firstItem?.productId === 'object' ? firstItem?.productId?.sku : null);

      // Fallback to productId (might work for some APIs)
      const productObjectId = typeof firstItem?.productId === 'string'
        ? firstItem.productId
        : firstItem?.productId?._id;

      const productIdentifier = productSku || productObjectId;
      console.log('[TrackOrder] Vendor: Product identifier:', productIdentifier, '(SKU:', productSku, ', ObjectId:', productObjectId, ')');

      if (productIdentifier) {
        try {
          console.log('[TrackOrder] Vendor: Fetching product:', productIdentifier);
          const url = `${API_ENDPOINTS.PRODUCTS.GET_ALL}/${productIdentifier}`;
          console.log('[TrackOrder] Vendor: API URL:', url);

          const res = await customerApi.get(url);
          console.log('[TrackOrder] Vendor: API Response keys:', res.data ? Object.keys(res.data) : 'null');

          let vendor = null;
          const product = res.data?.data || res.data;

          if (product) {
            console.log('[TrackOrder] Vendor: Product found:', product.name || product.sku);
            if (product.vendorId && typeof product.vendorId === 'object') {
              vendor = product.vendorId;
            } else if (product.vendor && typeof product.vendor === 'object') {
              vendor = product.vendor;
            }
          }

          if (vendor) {
            console.log('[TrackOrder] Vendor: Extracted vendor object:', vendor._id, vendor.businessDetails?.businessName);
            const coords = extractVendorCoords(vendor);
            if (coords) {
              console.log('[TrackOrder] Vendor: SUCCESS - coords:', coords);
              setRestaurantLocation(coords);
            } else {
              console.warn('[TrackOrder] Vendor: Found vendor but no valid coords');
            }
          } else {
            console.warn('[TrackOrder] Vendor: No vendor found in product response');
          }
        } catch (err) {
          console.warn('[TrackOrder] Vendor: Product fetch failed:', err.message);
        }
      } else {
        console.log('[TrackOrder] Vendor: No product identifier available in order items');
      }
    };

    // Helper function to extract coordinates from vendor object
    const extractVendorCoords = (vendor) => {
      if (!vendor) return null;

      // 1. Direct lat/long
      if (typeof vendor.latitude === 'number' && typeof vendor.longitude === 'number') {
        return { latitude: vendor.latitude, longitude: vendor.longitude };
      }

      // 2. location.coordinates array [lng, lat]
      if (vendor.location?.coordinates && Array.isArray(vendor.location.coordinates)) {
        return {
          latitude: vendor.location.coordinates[1],
          longitude: vendor.location.coordinates[0]
        };
      }

      // 3. businessLocation.coordinates array [lng, lat]
      if (vendor.businessLocation?.coordinates && Array.isArray(vendor.businessLocation.coordinates)) {
        return {
          latitude: vendor.businessLocation.coordinates[1],
          longitude: vendor.businessLocation.coordinates[0]
        };
      }

      // 4. businessLocation with direct lat/long (User's case!)
      if (vendor.businessLocation && typeof vendor.businessLocation.latitude === 'number') {
        return {
          latitude: vendor.businessLocation.latitude,
          longitude: vendor.businessLocation.longitude
        };
      }

      return null;
    };

    fetchVendorDetails();
  }, [order?.vendorId, order?.items, orderData.restaurantCoordinates, restaurantLocation]);

  // Helper for safe map fitting
  const safeFitToCoordinates = (ref, isLayoutReady, coords, padding = { top: 100, right: 50, bottom: 350, left: 50 }) => {
    if (!ref.current || !isLayoutReady || coords.length < 2) return;

    // Clear any existing fitting timeout to prevent race conditions
    if (fittingTimeoutRef.current) {
      clearTimeout(fittingTimeoutRef.current);
    }

    // Mandatory delay to ensure native map instance is truly ready after layout
    fittingTimeoutRef.current = setTimeout(() => {
      if (ref.current) {
        try {
          console.log(`[TrackOrder] Power Fitting ${ref === inlineMapRef ? 'inline' : 'fullscreen'} map to ${coords.length} points`);
          ref.current.fitToCoordinates(coords, {
            edgePadding: padding,
            animated: true,
          });
        } catch (e) {
          console.warn('[TrackOrder] Map fit error:', e.message);
        }
      }
      fittingTimeoutRef.current = null;
    }, 1000); // 1 second delay for stability
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (fittingTimeoutRef.current) {
        clearTimeout(fittingTimeoutRef.current);
      }
    };
  }, []);

  // Update route and fit map when locations change
  useEffect(() => {
    const points = [];
    if (restaurantLocation) points.push(restaurantLocation);
    if (driverLocation) points.push(driverLocation);
    if (userLocation) points.push(userLocation);

    setRouteCoordinates(points);

    if (points.length > 1) {
      // Fit inline map
      setTimeout(() => {
        safeFitToCoordinates(inlineMapRef, inlineMapLayout, points);
      }, 500);

      // Fit fullscreen map if active
      if (isMapFullscreen) {
        setTimeout(() => {
          safeFitToCoordinates(fullscreenMapRef, fullscreenMapLayout, points, { top: 100, right: 50, bottom: 100, left: 50 });
        }, 600);
      }
    }
  }, [restaurantLocation, driverLocation, userLocation, inlineMapLayout, fullscreenMapLayout, isMapFullscreen]);

  // Socket Integration
  const { socket, joinRoom, leaveRoom, isConnected } = useSocket();

  // Initialize socket listeners for live driver tracking
  useEffect(() => {
    if (!order?._id || !socket || !isConnected) {
      console.log('[TrackOrder] Socket not ready or no order:', {
        orderId: order?._id,
        socketConnected: !!socket,
        isConnected
      });
      return;
    }

    console.log('[TrackOrder] [Socket] Setting up live tracking for order:', order._id);
    console.log('[TrackOrder] [Socket] Socket connected:', socket.id);

    // Join the specific order room
    console.log('[TrackOrder] [Socket] Joining room: join-order-tracking', { orderId: order._id });
    joinRoom('join-order-tracking', { orderId: order._id });

    // Listen for live location updates from delivery partner
    const handleLocationUpdate = (data) => {
      console.log('[TrackOrder] [Socket] 📍 Received live driver location data:', JSON.stringify(data));
      if (data && (data.latitude !== undefined) && (data.longitude !== undefined)) {
        const newLocation = {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude)
        };
        console.log('[TrackOrder] Updating driver marker to:', newLocation);
        setDriverLocation(newLocation);
        setLastDriverUpdate(Date.now());
      } else {
        console.warn('[TrackOrder] Received invalid location data:', data);
      }
    };

    // Listen for order status updates
    const handleOrderUpdate = (data) => {
      console.log('[TrackOrder] 📦 Received order update:', data);
      if (data && data.orderStatus) {
        const newStage = mapOrderStatusToStage(data.orderStatus);
        console.log('[TrackOrder] Status changed to:', data.orderStatus, '-> stage:', newStage);
        setCurrentStatus(newStage);

        // Update local order data to reflect change immediately
        setFetchedOrder(prev => {
          // If we have previous data, merge it. Otherwise use current 'order' or empty
          const baseOrder = prev || order || {};
          return {
            ...baseOrder,
            ...data,
            orderStatus: data.orderStatus
          };
        });
      }
    };

    socket.on('delivery-location-live', handleLocationUpdate);
    socket.on('order-status-update', handleOrderUpdate);
    socket.on('order-updated', handleOrderUpdate); // Alternative event name

    return () => {
      console.log('[TrackOrder] [Socket] Cleaning up socket listeners for order:', order._id);
      socket.off('delivery-location-live', handleLocationUpdate);
      socket.off('order-status-update', handleOrderUpdate);
      socket.off('order-updated', handleOrderUpdate);
      // Optional: Leave room if backend supports it
      // leaveRoom('leave-order-tracking', { orderId: order._id });
    };
  }, [order?._id, socket, joinRoom, isConnected]);



  // Update route coordinates - works with or without driver location
  useEffect(() => {
    if (restaurantLocation && userLocation) {
      if (driverLocation) {
        // Full route: Restaurant -> Driver -> User
        setRouteCoordinates([restaurantLocation, driverLocation, userLocation]);
      } else {
        // No driver yet: Restaurant -> User
        setRouteCoordinates([restaurantLocation, userLocation]);
      }
    } else if (restaurantLocation) {
      // Only restaurant available
      setRouteCoordinates([restaurantLocation]);
    } else if (userLocation) {
      // Only user location available
      setRouteCoordinates([userLocation]);
    }
  }, [driverLocation, restaurantLocation, userLocation]);

  // Reset map layout state when switching fullscreen mode
  useEffect(() => {
    // We don't necessarily need to reset here if we use separate trackers
    // but we can trigger a fit if needed
    if (isMapFullscreen && fullscreenMapLayout && routeCoordinates.length > 1) {
      safeFitToCoordinates(fullscreenMapRef, fullscreenMapLayout, routeCoordinates, { top: 100, right: 50, bottom: 100, left: 50 });
    }
  }, [isMapFullscreen, fullscreenMapLayout]);

  // Initial fit logic
  useEffect(() => {
    if (mapReady && routeCoordinates.length > 0 && !initialFitDone) {
      if (inlineMapLayout) {
        safeFitToCoordinates(inlineMapRef, inlineMapLayout, routeCoordinates);
        setInitialFitDone(true);
      }
    }
  }, [mapReady, inlineMapLayout, routeCoordinates, initialFitDone]);

  useEffect(() => {
    // Simulate order progress
    const statusIndex = orderStages.findIndex(stage => stage.id === currentStatus);
    const progress = (statusIndex + 1) / orderStages.length;

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentStatus]);

  const getCurrentStageIndex = () => {
    return orderStages.findIndex(stage => stage.id === currentStatus);
  };

  const isStageCompleted = (stageId) => {
    const currentIndex = getCurrentStageIndex();
    const stageIndex = orderStages.findIndex(stage => stage.id === stageId);
    return stageIndex <= currentIndex;
  };

  const isCurrentStage = (stageId) => {
    return currentStatus === stageId;
    return currentStatus === stageId;
  };

  // --- Animation for Waiting View ---
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (currentStatus === 'pending') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1); // Reset
    }
  }, [currentStatus]);

  const renderWaitingView = () => (
    <View style={[styles.mapContainer, { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }]}>
      <Animated.View style={{
        transform: [{ scale: pulseAnim }],
        marginBottom: spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary + '15', // Light primary background
      }}>
        <MaterialCommunityIcons name="store-clock-outline" size={48} color={colors.primary} />
      </Animated.View>
      <Text style={{
        fontSize: fontSize.lg,
        fontFamily: 'Poppins-Bold',
        color: colors.text.primary,
        marginBottom: spacing.xs,
        textAlign: 'center',
      }}>{t('orderPending') || 'Order Pending'}</Text>
      <Text style={{
        fontSize: fontSize.sm,
        fontFamily: 'Poppins-Regular',
        color: colors.text.secondary,
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
      }}>{t('waitingForRestaurant') || 'Waiting for restaurant response'}</Text>
    </View>
  );

  const renderMessageModal = () => {
    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={messageModalVisible}
        onRequestClose={() => setMessageModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMessageModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="chatbubble" size={32} color={colors.primary} />
            </View>

            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>{t('messageDriver')}</Text>
            <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>
              {t('messageDriver')} <Text style={{ fontWeight: 'bold', color: colors.text.primary }}>{orderData.driverName}</Text>?
            </Text>

            <View style={{ width: '100%', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.modalButtonSecondary, { borderColor: colors.primary }]}
                onPress={() => {
                  setMessageModalVisible(false);
                  // Navigate to chat or show feature alert
                  Alert.alert(t('chat'), t('chatFeatureText'), [{ text: 'OK' }]);
                }}
              >
                <Text style={[styles.modalButtonSecondaryText, { color: colors.primary }]}>{t('customMessage')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButtonSecondary, { borderColor: colors.secondary }]}
                onPress={() => {
                  setMessageModalVisible(false);
                  showQuickMessages();
                }}
              >
                <Text style={[styles.modalButtonSecondaryText, { color: colors.secondary }]}>{t('quickMessages')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ alignSelf: 'center', padding: 8, marginTop: 4 }}
                onPress={() => setMessageModalVisible(false)}
              >
                <Text style={{ fontSize: fontSize.md, fontFamily: 'Poppins-Medium', color: colors.text.secondary }}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderMapPlaceholder = () => {
    // Show Animated Waiting View if status is PENDING
    if (currentStatus === 'pending') {
      return renderWaitingView();
    }
    // If no location data available at all, show unavailable message
    if (!userLocation && !restaurantLocation) {
      return (
        <View style={styles.mapContainer}>
          <View style={[styles.map, styles.mapLoading]}>
            <Ionicons name="location-outline" size={48} color={colors.text.light} />
            <Text style={[styles.mapLoadingText, { color: colors.text.secondary }]}>
              {t('locationUnavailable') || 'Location data unavailable'}
            </Text>
          </View>
        </View>
      );
    }

    // Determine which location to center the map on
    const centerLocation = userLocation || restaurantLocation;

    console.log('[TrackOrder] Map Render:', {
      hasDriverLocation: !!driverLocation,
      driverCoords: driverLocation,
      status: currentStatus,
      driverName: orderData.driverName,
      isDriverLive: isDriverLive
    });

    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={inlineMapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          onMapReady={() => setMapReady(true)}
          onError={(error) => {
            console.error('MapView Error:', error);
          }}
          initialRegion={{
            latitude: centerLocation.latitude,
            longitude: centerLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          customMapStyle={isDarkMode ? darkMapStyle : []}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={true}
          loadingEnabled={true}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 50 && height > 50) {
              setInlineMapLayout(true);
            }
          }}
        >
          {/* Restaurant Marker */}
          {restaurantLocation && (
            <Marker
              coordinate={restaurantLocation}
              title={orderData.restaurantName}
              description={t('restaurant')}
            >
              <View style={styles.customMarker}>
                <View style={styles.restaurantMarker}>
                  <MaterialIcons name="restaurant" size={20} color={colors.text.white} />
                </View>
              </View>
            </Marker>
          )}

          {driverLocation && (
            <Marker
              coordinate={driverLocation}
              title={orderData.driverName}
              description={t('deliveryRider')}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.customMarker}>
                <View style={styles.driverMarker}>
                  <Ionicons name="bicycle" size={20} color={colors.text.white} />
                </View>
                <View style={styles.driverMarkerPulse} />
              </View>
            </Marker>
          )}

          {/* User Location Marker */}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              title={t('deliveryAddress') || "Delivery Address"}
              description={orderData.deliveryAddress}
            >
              <View style={styles.customMarker}>
                <View style={[styles.userMarker, { backgroundColor: colors.primary }]}>
                  <Ionicons name="home" size={20} color="#FFF" />
                </View>
                <View style={styles.markerTail} />
              </View>
            </Marker>
          )}

          {/* Route Polyline */}
          {routeCoordinates.length > 0 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.primary}
              strokeWidth={4}
              lineDashPattern={[1]}
            />
          )}
        </MapView>

        {/* Delivery ETA Badge */}
        <View style={styles.etaBadge}>
          <Ionicons name="time-outline" size={18} color={colors.text.white} />
          <Text style={styles.etaText}>
            {driverEta ? `${driverEta} min` : orderData.estimatedTime}
          </Text>
        </View>


        {/* Fullscreen Toggle Button */}
        <TouchableOpacity
          style={styles.fullscreenButton}
          onPress={() => setIsMapFullscreen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="expand" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              if (inlineMapRef.current) {
                try {
                  inlineMapRef.current.getCamera().then((cam) => {
                    if (inlineMapRef.current) {
                      cam.zoom += 1;
                      inlineMapRef.current.animateCamera(cam);
                    }
                  }).catch(err => console.log('Zoom in error:', err));
                } catch (error) {
                  console.log('Camera zoom error:', error);
                }
              }
            }}
          >
            <Ionicons name="add" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles.zoomDivider} />
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => {
              if (inlineMapRef.current) {
                try {
                  inlineMapRef.current.getCamera().then((cam) => {
                    if (inlineMapRef.current) {
                      cam.zoom -= 1;
                      inlineMapRef.current.animateCamera(cam);
                    }
                  }).catch(err => console.log('Zoom out error:', err));
                } catch (error) {
                  console.log('Camera zoom error:', error);
                }
              }
            }}
          >
            <Ionicons name="remove" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* My Location Button */}
        <TouchableOpacity
          style={styles.myLocationButton}
          onPress={() => {
            if (userLocation && inlineMapRef.current) {
              try {
                inlineMapRef.current.animateToRegion({
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                });
              } catch (error) {
                console.log('Animate to region error:', error);
              }
            }
          }}
        >
          <MaterialIcons name="my-location" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderOrderProgress = () => {
    return (
      <View style={{ paddingHorizontal: 16, marginTop: 12, marginBottom: 24 }}>
        <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', color: colors.text.primary, marginBottom: 20 }}>{t('orderStatus')}</Text>

        <View style={{
          backgroundColor: colors.surface,
          borderRadius: 24,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          borderWidth: 1,
          borderColor: isDarkMode ? '#2A2A2A' : '#F0F0F0',
          padding: 20
        }}>
          {orderStages.map((stage, index) => {
            const completed = isStageCompleted(stage.id);
            const current = isCurrentStage(stage.id);
            const isLast = index === orderStages.length - 1;

            return (
              <View key={stage.id} style={{ flexDirection: 'row', minHeight: 60 }}>
                {/* Left Timeline Column */}
                <View style={{ alignItems: 'center', width: 40, marginRight: 16 }}>
                  {/* Top Connector Line */}
                  {index > 0 && (
                    <View style={{ width: 2, height: 16, backgroundColor: completed || current ? colors.primary : (isDarkMode ? '#333' : '#F0F0F0'), borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
                  )}

                  {/* Icon Circle */}
                  <View style={{ flex: 1, justifyContent: 'center', marginVertical: 4 }}>
                    <View
                      style={{
                        width: 36, height: 36, borderRadius: 18,
                        backgroundColor: (completed || current) ? colors.primary : (isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F5F5'),
                        alignItems: 'center', justifyContent: 'center',
                        borderWidth: current ? 3 : 0,
                        borderColor: 'rgba(220,49,115,0.2)'
                      }}
                    >
                      {current ? (
                        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                          <Animated.View style={{
                            position: 'absolute', width: '100%', height: '100%', borderRadius: 18, borderWidth: 2,
                            borderColor: colors.primary,
                            transform: [{ scale: activeStagePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
                            opacity: activeStagePulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] })
                          }} />
                          <Ionicons name={stage.icon} size={16} color={colors.text.white} />
                        </View>
                      ) : (
                        stage.iconLibrary === 'Ionicons' ? (
                          <Ionicons name={completed ? 'checkmark' : stage.icon} size={16} color={completed ? colors.text.white : colors.text.light} />
                        ) : (
                          <MaterialIcons name={completed ? 'check' : stage.icon} size={16} color={completed ? colors.text.white : colors.text.light} />
                        )
                      )}
                    </View>
                  </View>

                  {/* Bottom Connector Line */}
                  {!isLast && (
                    <View style={{ width: 2, height: 16, backgroundColor: completed ? colors.primary : (isDarkMode ? '#333' : '#F0F0F0'), borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
                  )}
                </View>

                {/* Right Content Column */}
                <View style={{ flex: 1, paddingBottom: 20, paddingTop: index > 0 ? 0 : 4, opacity: (completed || current) ? 1 : 0.5 }}>
                  <Text style={{ fontSize: 16, fontFamily: current ? 'Poppins-Bold' : 'Poppins-SemiBold', color: current ? colors.primary : colors.text.primary, letterSpacing: -0.3 }}>
                    {stage.title}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    {(stage.id === 'accepted' && (order?.orderStatus === 'AWAITING_PARTNER' || order?.orderStatus === 'DISPATCHING')) && (
                      <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                    )}
                    <Text style={{ fontSize: 13, fontFamily: 'Poppins-Regular', color: colors.text.secondary }} numberOfLines={2}>
                      {stage.subtitle && stage.subtitle !== 'findingDriver' ? stage.subtitle : (t('findingDriver') !== 'findingDriver' ? t('findingDriver') : 'Finding delivery partner...')}
                    </Text>
                  </View>

                  {/* Current Status Badge Indicator */}
                  {current && currentStatus !== 'delivered' && currentStatus !== 'cancelled' && (
                    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 6 }} />
                      <Text style={{ fontSize: 11, fontFamily: 'Poppins-Bold', color: colors.primary }}>{t('inProgress')}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };



  const renderDriverInfo = () => (
    <View style={[styles.driverContainer, {
      backgroundColor: colors.surface,
      borderColor: isDarkMode ? '#2A2A2A' : '#F0F0F0',
      borderWidth: 1,
      borderRadius: 24,
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      padding: 16,
      marginBottom: 20
    }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(220,49,115,0.15)', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? '#2A2A2A' : '#F5F5F5' }}>
          <Ionicons name="bicycle" size={28} color={colors.primary} />
        </View>

        <View style={{ marginLeft: 14, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 18, fontFamily: 'Poppins-Bold', color: colors.text.primary }} numberOfLines={1}>
              {orderData.driverName === t('awaitingDriver') ? (t('assigningDriver') || 'Assigning Driver...') : orderData.driverName}
            </Text>
            {isDriverLive ? (
              <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: '#4CAF50' }}>LIVE</Text>
              </View>
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
            {orderData.driverRating > 0 && orderData.driverName !== t('awaitingDriver') && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFF8E1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4 }}>
                <Ionicons name="star" size={11} color="#FFA000" />
                <Text style={{ fontSize: 11, fontFamily: 'Poppins-Medium', color: '#FFA000' }}>{orderData.driverRating}</Text>
              </View>
            )}
            {(orderData.vehicleType || orderData.driverName !== t('awaitingDriver')) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F5F5F5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4 }}>
                <Ionicons name="bicycle" size={11} color={colors.text.secondary} />
                <Text style={{ fontSize: 11, fontFamily: 'Poppins-Medium', color: colors.text.secondary }}>
                  {orderData.vehicleType || t('delivery') || 'Delivery'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {orderData.driverName !== t('awaitingDriver') && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }} onPress={handleCallDriver}>
              <Ionicons name="call" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Driver Status - only show if we have real data */}
      {driverLocation && (
        <>
          <View style={{ height: 1, backgroundColor: isDarkMode ? '#2A2A2A' : '#F0F0F0', marginVertical: 14 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
              <Ionicons name="navigate" size={16} color={colors.success} />
              <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: colors.text.primary, marginLeft: 6 }}>{t('headingToYou') || 'Heading to you'}</Text>
            </View>
            {driverEta && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 1, height: 12, backgroundColor: colors.border, marginHorizontal: 12 }} />
                <Ionicons name="speedometer" size={16} color={colors.info} />
                <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: colors.text.primary, marginLeft: 6 }}>~{driverEta} {t('minAway') || 'min away'}</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );

  const renderOrderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 16 }}>
        <View>
          <Text style={{ fontSize: 20, fontFamily: 'Poppins-Bold', color: colors.text.primary }}>{t('orderDetails') || 'Order Details'}</Text>
          <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: colors.text.secondary }}>{orderData.orderNumber}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 13, fontFamily: 'Poppins-SemiBold', color: colors.text.primary }}>{orderData.orderDate}</Text>
          <Text style={{ fontSize: 12, fontFamily: 'Poppins-Regular', color: colors.text.secondary }}>{orderData.orderTime}</Text>
        </View>
      </View>

      <View style={{
        backgroundColor: colors.surface,
        marginHorizontal: 16,
        borderRadius: 24,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: isDarkMode ? '#2A2A2A' : '#F0F0F0',
        padding: 20
      }}>
        {/* Restaurant Info */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFF0F5', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
            <MaterialIcons name="restaurant" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.text.secondary }}>{t('restaurant')}</Text>
            <Text style={{ fontSize: 16, fontFamily: 'Poppins-Bold', color: colors.text.primary }}>{orderData.restaurantName}</Text>
            <Text style={{ fontSize: 13, fontFamily: 'Poppins-Regular', color: colors.text.secondary }}>{orderData.restaurantAddress}</Text>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: isDarkMode ? '#333' : '#F0F0F0', marginVertical: 16 }} />

        {/* Delivery Address */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFF0F5', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
            <Ionicons name="location" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.text.secondary }}>{t('deliveryTo')}</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Poppins-SemiBold', color: colors.text.primary, marginVertical: 4 }}>{orderData.deliveryAddress}</Text>
            {orderData.deliveryLandmark && (
              <Text style={{ fontSize: 13, fontFamily: 'Poppins-Regular', color: colors.text.secondary }}>📍 {orderData.deliveryLandmark}</Text>
            )}
            {orderData.deliveryInstructions && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#333' : '#F5F5F5', padding: 8, borderRadius: 8, marginTop: 8 }}>
                <Ionicons name="information-circle" size={14} color={colors.info} />
                <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.text.primary, marginLeft: 6 }}>{orderData.deliveryInstructions}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: isDarkMode ? '#333' : '#F0F0F0', marginVertical: 16 }} />

        {/* Order Items */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFF0F5', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
            <Ionicons name="bag-handle" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.text.secondary, marginBottom: 8 }}>{t('items')} ({orderData.totalItems})</Text>
            {orderData.items?.map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 }}>
                  <View style={{ backgroundColor: isDarkMode ? 'rgba(220,49,115,0.15)' : 'rgba(220,49,115,0.08)', width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                    <Text style={{ fontSize: 12, fontFamily: 'Poppins-Bold', color: colors.primary }}>{item.quantity || 1}x</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: 'Poppins-Medium', color: colors.text.primary }} numberOfLines={2}>{item.name || item}</Text>
                </View>
                <Text style={{ fontSize: 14, fontFamily: 'Poppins-SemiBold', color: colors.text.primary }}>€{item.subtotal ? item.subtotal.toFixed(2) : '0.00'}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: isDarkMode ? '#333' : '#F0F0F0', marginVertical: 16 }} />

        {/* Payment Breakdown */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#FFF0F5', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
            <Ionicons name="receipt" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Poppins-Medium', color: colors.text.secondary, marginBottom: 8 }}>{t('billSummary')}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.text.secondary }}>{t('subtotal')}</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Poppins-Medium', color: colors.text.primary }}>€{orderData.subtotal ? orderData.subtotal.toFixed(2) : '0.00'}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
              <Text style={{ fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.text.secondary }}>{t('deliveryFee')}</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Poppins-Medium', color: colors.text.primary }}>€{orderData.deliveryFee ? orderData.deliveryFee.toFixed(2) : '0.00'}</Text>
            </View>

            {orderData.taxAmount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.text.secondary }}>{t('tax') || 'Tax'}</Text>
                <Text style={{ fontSize: 14, fontFamily: 'Poppins-Medium', color: colors.text.primary }}>€{orderData.taxAmount.toFixed(2)}</Text>
              </View>
            )}

            {orderData.discount > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={{ fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.success }}>
                  {t('discount')} ({orderData.promoCode || 'PROMO'})
                </Text>
                <Text style={{ fontSize: 14, fontFamily: 'Poppins-Medium', color: colors.success }}>-€{orderData.discount ? orderData.discount.toFixed(2) : '0.00'}</Text>
              </View>
            )}

            <View style={{ height: 1, backgroundColor: isDarkMode ? '#333' : '#F0F0F0', marginVertical: 12 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontFamily: 'Poppins-Bold', color: colors.text.primary }}>{t('totalAmount')}</Text>
              <Text style={{ fontSize: 18, fontFamily: 'Poppins-Bold', color: colors.primary }}>€{orderData.totalAmount ? orderData.totalAmount.toFixed(2) : '0.00'}</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <View style={{ backgroundColor: isDarkMode ? '#333' : '#F5F5F5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: colors.text.secondary }}>{t('paymentMethod') || 'Method'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.text.primary, marginRight: 8 }}>{orderData.paymentMethod}</Text>
                  <View style={{ backgroundColor: colors.success + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, fontFamily: 'Poppins-Bold', color: colors.success }}>{t('paid') || 'PAID'}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderFullscreenMap = () => (
    <Modal
      visible={isMapFullscreen}
      animationType="slide"
      onRequestClose={() => setIsMapFullscreen(false)}
    >
      <SafeAreaView style={styles.fullscreenContainer} edges={['top', 'bottom']}>
        {/* Fullscreen Map Header */}
        <View style={styles.fullscreenHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setIsMapFullscreen(false)}
          >
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.fullscreenTitle}>{t('liveTracking')}</Text>
          <View style={styles.backButton} />
        </View>

        {/* Fullscreen Map View */}
        <View style={styles.fullscreenMapContainer}>
          {!userLocation ? (
            <View style={[styles.map, styles.mapLoading]}>
              <Ionicons name="map-outline" size={48} color={colors.text.light} />
              <Text style={styles.mapLoadingText}>{t('loadingMap')}</Text>
            </View>
          ) : (
            <>
              <MapView
                ref={fullscreenMapRef}
                provider={PROVIDER_GOOGLE}
                style={styles.fullscreenMap}
                initialRegion={{
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                customMapStyle={isDarkMode ? darkMapStyle : []}
                showsUserLocation={false}
                showsMyLocationButton={false}
                showsCompass={true}
                loadingEnabled={true}
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  if (width > 50 && height > 50) {
                    setFullscreenMapLayout(true);
                  }
                }}
              >
                {/* Restaurant Marker */}
                {restaurantLocation && (
                  <Marker
                    coordinate={restaurantLocation}
                    title={orderData.restaurantName}
                    description={t('restaurant')}
                  >
                    <View style={styles.customMarker}>
                      <View style={styles.restaurantMarker}>
                        <MaterialIcons name="restaurant" size={20} color={colors.text.white} />
                      </View>
                    </View>
                  </Marker>
                )}

                {/* Driver Marker */}
                {driverLocation && (
                  <Marker
                    coordinate={driverLocation}
                    title={orderData.driverName}
                    description={t('deliveryRider')}
                    anchor={{ x: 0.5, y: 0.5 }}
                  >
                    <View style={styles.customMarker}>
                      <View style={styles.driverMarker}>
                        <Ionicons name="bicycle" size={20} color={colors.text.white} />
                      </View>
                      <View style={styles.driverMarkerPulse} />
                    </View>
                  </Marker>
                )}

                {/* User Location Marker */}
                {userLocation && (
                  <Marker
                    coordinate={userLocation}
                    title={t('yourLocation')}
                    description={orderData.deliveryAddress}
                  >
                    <View style={styles.customMarker}>
                      <View style={[styles.userMarker, { backgroundColor: colors.primary }]}>
                        <Ionicons name="home" size={20} color="#FFF" />
                      </View>
                      <View style={styles.markerTail} />
                    </View>
                  </Marker>
                )}

                {/* Route Polyline */}
                {routeCoordinates.length > 0 && (
                  <Polyline
                    coordinates={routeCoordinates}
                    strokeColor={colors.primary}
                    strokeWidth={4}
                    lineDashPattern={[1]}
                  />
                )}
              </MapView>


              {/* ETA Badge - Fullscreen */}
              <View style={styles.fullscreenEtaBadge}>
                <Ionicons name="time-outline" size={20} color={colors.text.white} />
                <Text style={styles.fullscreenEtaText}>
                  {driverEta ? `${driverEta} min` : orderData.estimatedTime}
                </Text>
              </View>

              {/* Zoom Controls - Fullscreen */}
              <View style={styles.fullscreenZoomControls}>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={() => {
                    if (fullscreenMapRef.current) {
                      try {
                        fullscreenMapRef.current.getCamera().then((cam) => {
                          if (fullscreenMapRef.current) {
                            cam.zoom += 1;
                            fullscreenMapRef.current.animateCamera(cam);
                          }
                        }).catch(err => console.log('Zoom in error:', err));
                      } catch (error) {
                        console.log('Camera zoom error:', error);
                      }
                    }
                  }}
                >
                  <Ionicons name="add" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <View style={styles.zoomDivider} />
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={() => {
                    if (fullscreenMapRef.current) {
                      try {
                        fullscreenMapRef.current.getCamera().then((cam) => {
                          if (fullscreenMapRef.current) {
                            cam.zoom -= 1;
                            fullscreenMapRef.current.animateCamera(cam);
                          }
                        }).catch(err => console.log('Zoom out error:', err));
                      } catch (error) {
                        console.log('Camera zoom error:', error);
                      }
                    }
                  }}
                >
                  <Ionicons name="remove" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              {/* My Location Button - Fullscreen */}
              <TouchableOpacity
                style={styles.fullscreenMyLocationButton}
                onPress={() => {
                  if (userLocation && fullscreenMapRef.current) {
                    try {
                      fullscreenMapRef.current.animateToRegion({
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                      });
                    } catch (error) {
                      console.log('Animate to region error:', error);
                    }
                  }
                }}
              >
                <MaterialIcons name="my-location" size={24} color={colors.primary} />
              </TouchableOpacity>

              {/* Driver Info Card - Fullscreen Bottom */}
              {driverLocation && (
                <View style={styles.fullscreenDriverCard}>
                  <View style={styles.driverCardContent}>
                    <View style={styles.driverLeft}>
                      <View style={styles.driverAvatar}>
                        <Ionicons name="person" size={28} color={colors.primary} />
                        <View style={styles.onlineBadge}>
                          <View style={styles.onlineDot} />
                        </View>
                      </View>
                      <View style={styles.driverInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.driverName}>{orderData.driverName}</Text>
                          {isDriverLive ? (
                            <View style={styles.liveBadge}>
                              <Text style={styles.liveText}>LIVE</Text>
                            </View>
                          ) : (
                            <View style={[styles.liveBadge, { backgroundColor: colors.text.secondary }]}>
                              <Text style={styles.liveText}>OFFLINE</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.driverRating}>
                          <Ionicons name="star" size={14} color="#FFD700" />
                          <Text style={styles.driverRatingText}>{orderData.driverRating}</Text>
                          <Text style={styles.driverVehicle}>• {orderData.vehicleType}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <View style={styles.driverActions}>
                    <TouchableOpacity
                      style={styles.driverActionButton}
                      onPress={handleCallDriver}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="call" size={20} color={colors.primary} />
                      <Text style={styles.actionButtonLabel}>{t('call')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.driverActionButton}
                      onPress={handleMessageDriver}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chatbubble" size={20} color={colors.primary} />
                      <Text style={styles.actionButtonLabel}>{t('chat')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal >
  );

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: fontSize.xl,
      fontFamily: 'Poppins-Bold',
      color: colors.text.primary,
      flex: 1,
      textAlign: 'center',
    },
    helpButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: spacing.xl,
    },

    // Map Styles
    mapContainer: {
      width: '100%',
      height: height * 0.35,
      backgroundColor: colors.surface,
      position: 'relative',
    },
    map: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    mapLoading: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    mapLoadingText: {
      marginTop: spacing.sm,
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Regular',
      color: colors.text.light,
    },
    customMarker: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    restaurantMarker: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    driverMarker: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 10,
    },
    driverMarkerPulse: {
      position: 'absolute',
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.success,
      opacity: 0.3,
    },
    userMarker: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primary,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    etaBadge: {
      position: 'absolute',
      top: spacing.md,
      left: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    etaText: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-Bold',
      color: colors.text.white,
      marginLeft: spacing.xs,
    },
    fullscreenButton: {
      position: 'absolute',
      bottom: spacing.md + 50,
      right: spacing.md,
      width: 48,
      height: 48,
      backgroundColor: colors.surface,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    zoomControls: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    zoomButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomDivider: {
      height: 1,
      backgroundColor: colors.border,
    },
    myLocationButton: {
      position: 'absolute',
      bottom: spacing.md,
      right: spacing.md,
      width: 48,
      height: 48,
      backgroundColor: colors.surface,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },

    // Driver Info Styles
    driverContainer: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    driverHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    driverStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    driverStatsText: {
      fontSize: fontSize.xs,
      fontFamily: 'Poppins-Medium',
      color: colors.text.secondary,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontFamily: 'Poppins-Bold',
      color: colors.text.primary,
    },
    driverCard: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      // Premium Shadow
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      marginHorizontal: 1,
      marginTop: 4,
    },
    driverLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    driverAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
      position: 'relative',
    },
    onlineBadge: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    onlineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.success,
    },
    driverInfo: {
      flex: 1,
    },
    driverName: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.primary,
      marginBottom: 4,
    },
    driverRating: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    driverRatingText: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Medium',
      color: colors.text.primary,
      marginLeft: 4,
    },
    driverVehicle: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Regular',
      color: colors.text.secondary,
      marginLeft: 4,
    },
    vehicleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    vehicleNumber: {
      fontSize: fontSize.xs,
      fontFamily: 'Poppins-Medium',
      color: colors.text.light,
    },
    vehicleDot: {
      fontSize: fontSize.xs,
      color: colors.text.light,
    },
    vehicleColor: {
      fontSize: fontSize.xs,
      fontFamily: 'Poppins-Regular',
      color: colors.text.light,
    },
    driverActions: {
      flexDirection: 'column',
      gap: spacing.sm,
    },
    driverActionButton: {
      minWidth: 56,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonLabel: {
      fontSize: fontSize.xs,
      fontFamily: 'Poppins-SemiBold',
      color: colors.primary,
      marginTop: 2,
    },
    driverStatusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.md,
      padding: spacing.sm,
      backgroundColor: colors.primary + '15',
      borderRadius: borderRadius.md,
    },
    statusItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    statusText: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Medium',
      color: colors.text.primary,
    },
    statusDivider: {
      width: 1,
      height: 20,
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },

    // Progress Styles
    progressContainer: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    progressTitle: {
      fontSize: fontSize.lg,
      fontFamily: 'Poppins-Bold',
      color: colors.text.primary,
    },
    viewDetailsText: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Medium',
      color: colors.primary,
    },

    stagesContainer: {
      marginTop: spacing.sm,
    },
    stageItem: {
      flexDirection: 'row',
      marginBottom: spacing.md,
    },
    stageIconContainer: {
      alignItems: 'center',
      marginRight: spacing.md,
    },
    stageIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border,
      zIndex: 2,
    },
    stageIconCompleted: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    stageIconCurrent: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      elevation: 4,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    stageIconPending: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    activePulseContainer: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseRing: {
      position: 'absolute',
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 4,
    },
    stageConnectorTop: {
      position: 'absolute',
      top: -24, // Reach up to previous item
      bottom: '50%',
      width: 2,
      backgroundColor: colors.border,
      zIndex: 1,
    },
    stageConnectorBottom: {
      position: 'absolute',
      top: '50%',
      bottom: -24, // Reach down to next item
      width: 2,
      backgroundColor: colors.border,
      zIndex: 1,
    },
    stageContent: {
      flex: 1,
      paddingVertical: 4,
      justifyContent: 'center',
    },
    stageTitle: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-Medium',
      color: colors.text.secondary,
      marginBottom: 2,
    },
    stageTitleActive: {
      fontFamily: 'Poppins-Bold',
      color: colors.primary,
      fontSize: fontSize.md + 1,
    },
    stageTitleCompleted: {
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.primary,
    },
    stageSubtitle: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Regular',
      color: colors.text.secondary,
    },
    currentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    pulseDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
      marginRight: spacing.xs,
    },
    currentBadgeText: {
      fontSize: fontSize.xs,
      fontFamily: 'Poppins-Medium',
      color: colors.primary,
    },

    // Summary Styles
    summaryContainer: {
      backgroundColor: colors.surface,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    orderDateContainer: {
      alignItems: 'flex-end',
    },
    orderDate: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Medium',
      color: colors.text.primary,
    },
    orderTime: {
      fontSize: fontSize.xs,
      fontFamily: 'Poppins-Regular',
      color: colors.text.secondary,
    },
    orderNumber: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Medium',
      color: colors.text.secondary,
      marginTop: 2,
    },
    summaryCard: {
      backgroundColor: colors.background,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summarySection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    summaryIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    summaryContent: {
      flex: 1,
    },
    summaryLabel: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Regular',
      color: colors.text.secondary,
      marginBottom: 4,
    },
    summaryValue: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.primary,
      marginBottom: 2,
    },
    summarySubtext: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Regular',
      color: colors.text.light,
      marginTop: 2,
    },
    instructionsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.info + '15',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      marginTop: spacing.xs,
      gap: 4,
    },
    instructionsText: {
      fontSize: fontSize.xs,
      fontFamily: 'Poppins-Medium',
      color: colors.info,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      gap: spacing.sm,
    },
    itemQuantity: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Bold',
      color: colors.text.secondary,
      minWidth: 24,
    },
    itemName: {
      flex: 1,
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Regular',
      color: colors.text.primary,
    },
    itemPrice: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.primary,
    },
    billRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    billLabel: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Regular',
      color: colors.text.secondary,
    },
    billValue: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.primary,
    },
    billLabelDiscount: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Medium',
      color: colors.success,
    },
    billValueDiscount: {
      fontSize: fontSize.sm,
      fontFamily: 'Poppins-Bold',
      color: colors.success,
    },
    billDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.sm,
    },
    totalLabel: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-Bold',
      color: colors.text.primary,
    },
    totalAmount: {
      fontSize: fontSize.xl,
      fontFamily: 'Poppins-Bold',
      color: colors.primary,
    },
    paidBadge: {
      backgroundColor: colors.success,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    paidText: {
      fontSize: fontSize.xs,
      fontFamily: 'Poppins-Bold',
      color: colors.text.white,
    },
    summaryDivider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },

    // Fullscreen Map Styles
    fullscreenContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    fullscreenHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      zIndex: 10,
    },
    fullscreenTitle: {
      fontSize: fontSize.xl,
      fontFamily: 'Poppins-Bold',
      color: colors.text.primary,
      flex: 1,
      textAlign: 'center',
    },
    fullscreenMapContainer: {
      flex: 1,
      position: 'relative',
    },
    fullscreenMap: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    fullscreenEtaBadge: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    fullscreenEtaText: {
      fontSize: fontSize.lg,
      fontFamily: 'Poppins-Bold',
      color: colors.text.white,
      marginLeft: spacing.xs,
    },
    fullscreenZoomControls: {
      position: 'absolute',
      bottom: 200,
      right: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    fullscreenMyLocationButton: {
      position: 'absolute',
      bottom: 280,
      right: spacing.md,
      width: 48,
      height: 48,
      backgroundColor: colors.surface,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    fullscreenDriverCard: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
    driverCardContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
    },

    // Bottom Actions
    bottomActionsInline: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      gap: spacing.sm,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.error,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-SemiBold',
      color: colors.error,
    },
    supportButton: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    supportButtonText: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.white,
    },
    // Call Modal Styles
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      width: '80%',
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      alignItems: 'center',
    },
    modalIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      fontSize: fontSize.xl,
      fontFamily: 'Poppins-Bold',
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    modalSubtitle: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-Regular',
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    modalPhone: {
      fontSize: fontSize.lg,
      fontFamily: 'Poppins-SemiBold',
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    modalActions: {
      flexDirection: 'row',
      width: '100%',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    modalButtonSecondary: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonSecondaryText: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-SemiBold',
    },
    modalButtonPrimary: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonPrimaryText: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.white,
    },
  }), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
          translucent={true}
        />
        {/* Header Skeleton */}
        <View style={styles.header}>
          <SkeletonBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
          <SkeletonBlock style={{ width: 140, height: 24, borderRadius: 4 }} />
          <SkeletonBlock style={{ width: 40, height: 40, borderRadius: 20 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Map Skeleton */}
          <SkeletonBlock style={{ width: '100%', height: height * 0.35, borderRadius: 0, marginBottom: spacing.md }} />

          {/* Driver/Status Skeleton */}
          <View style={{ paddingHorizontal: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
              <SkeletonBlock style={{ width: 120, height: 24, borderRadius: 4 }} />
              <SkeletonBlock style={{ width: 80, height: 20, borderRadius: 4 }} />
            </View>

            {/* Driver Card Placeholder */}
            <View style={{ padding: spacing.md, borderWidth: 1, borderColor: isDarkMode ? '#333' : '#eee', borderRadius: borderRadius.lg, marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonBlock style={{ width: 50, height: 50, borderRadius: 25, marginRight: spacing.md }} />
                <View style={{ gap: 6 }}>
                  <SkeletonBlock style={{ width: 140, height: 20, borderRadius: 4 }} />
                  <SkeletonBlock style={{ width: 100, height: 16, borderRadius: 4 }} />
                </View>
              </View>
            </View>

            <SkeletonBlock style={{ width: '100%', height: 2, marginBottom: spacing.lg }} />

            {/* Progress Steps Skeleton */}
            <View style={{ gap: 24, marginBottom: spacing.xl }}>
              {[1, 2, 3].map(i => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <SkeletonBlock style={{ width: 32, height: 32, borderRadius: 16, marginRight: spacing.md }} />
                  <View style={{ gap: 6 }}>
                    <SkeletonBlock style={{ width: 160, height: 18, borderRadius: 4 }} />
                    <SkeletonBlock style={{ width: 100, height: 14, borderRadius: 4 }} />
                  </View>
                </View>
              ))}
            </View>

            {/* Order Summary Skeleton */}
            <SkeletonBlock style={{ width: 140, height: 24, borderRadius: 4, marginBottom: spacing.md }} />
            <SkeletonBlock style={{ width: '100%', height: 180, borderRadius: borderRadius.lg }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('trackOrder')}</Text>
        <View style={styles.helpButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Map */}
        {currentStatus !== 'delivered' && currentStatus !== 'cancelled' && renderMapPlaceholder()}

        {/* Driver Info */}
        {(currentStatus === 'picked_up' || currentStatus === 'on_the_way' || currentStatus === 'nearby' || (currentStatus === 'preparing' && orderData.driverName)) && renderDriverInfo()}

        {/* Order Progress */}
        {renderOrderProgress()}

        {/* Order Summary */}
        {renderOrderSummary()}

        {/* Bottom Action Buttons - Inside ScrollView */}
        <View style={[styles.bottomActionsInline, {
          marginBottom: Math.max(spacing.md, insets.bottom + spacing.sm)
        }]}>

          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => navigation.navigate('HelpCenter')}
          >
            <Ionicons name="headset" size={20} color={colors.text.white} />
            <Text style={styles.supportButtonText}>{t('support')}</Text>
          </TouchableOpacity>
        </View>

        {/* Rate Order Button (Visible only when Delivered) */}
        {currentStatus === 'delivered' && (
          <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
            <TouchableOpacity
              style={[styles.supportButton, { backgroundColor: colors.secondary, marginTop: 0 }]} // Using secondary color or gold for rating
              onPress={() => setShowRatingModal(true)}
            >
              <Ionicons name="star" size={20} color={colors.text.white} />
              <Text style={styles.supportButtonText}>{t('rateOrder') || 'Rate Order'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Spacing for safe area and tab bar */}
        <View style={{ height: Math.max(80, insets.bottom + 80) }} />
      </ScrollView>

      {/* Fullscreen Map Modal */}
      {renderFullscreenMap()}

      {/* Call Confirmation Modal */}
      <Modal
        visible={callModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCallModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="call" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
              {callTarget.type === 'driver' ? t('callDriver') : t('callRestaurant')}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>
              {t('call')} <Text style={{ fontWeight: 'bold', color: colors.text.primary }}>{callTarget.name}</Text>?
            </Text>
            <Text style={[styles.modalPhone, { color: colors.text.secondary }]}>{callTarget.phone}</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButtonSecondary, { borderColor: colors.border }]}
                onPress={() => setCallModalVisible(false)}
              >
                <Text style={[styles.modalButtonSecondaryText, { color: colors.text.primary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonPrimary, { backgroundColor: colors.primary }]}
                onPress={confirmCall}
              >
                <Text style={styles.modalButtonPrimaryText}>{t('call')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Message Modal */}
      {renderMessageModal()}

      {/* Rating Modal */}
      <OrderRatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        orderId={orderData.id}
        restaurantName={orderData.restaurantName}
        driverName={
          orderData.driverName !== t('awaitingDriver')
            ? orderData.driverName
            : (currentStatus === 'delivered' ? (t('deliveryRider') || 'Delivery Partner') : null)
        }
        onRatingSuccess={() => {
          // Optionally navigate away or refresh
          // navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
};

export default TrackOrderScreen;
