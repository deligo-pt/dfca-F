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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { spacing, fontSize, borderRadius } from '../theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme, darkMapStyle } from '../utils/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import { API_ENDPOINTS } from '../constants/config';

const { height } = Dimensions.get('window');

import { customerApi } from '../utils/api';
import OrderRatingModal from '../components/OrderRatingModal';

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
      'PENDING': 'preparing',
      'ACCEPTED': 'preparing',
      'PREPARING': 'preparing',
      'AWAITING_PARTNER': 'preparing',
      'REASSIGNMENT_NEEDED': 'preparing',

      'READY_FOR_PICKUP': 'ready',
      'DISPATCHING': 'ready',
      'ASSIGNED': 'ready',

      'PICKED_UP': 'picked_up',

      'ON_THE_WAY': 'on_the_way',

      'NEARBY': 'nearby', // Internal or computed, keeping just in case

      'DELIVERED': 'delivered',
      'CANCELED': 'delivered', // Show full progress for history/completion state
      'REJECTED': 'delivered',
    };
    return statusMap[status?.toUpperCase()] || 'preparing';
  };

  const initialStatus = order?.orderStatus ? mapOrderStatusToStage(order.orderStatus) : 'preparing';
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [progressAnim] = useState(new Animated.Value(0));
  const mapRef = useRef(null);

  // Location state management
  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [restaurantLocation, setRestaurantLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapLayout, setMapLayout] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [driverEta, setDriverEta] = useState(null);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [callTarget, setCallTarget] = useState({ name: '', phone: '', cleanPhone: '', type: '' });

  // Calculate ETA based on distance
  useEffect(() => {
    if (driverLocation && userLocation) {
      const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
      };

      const deg2rad = (deg) => {
        return deg * (Math.PI / 180);
      };

      const dist = getDistanceFromLatLonInKm(
        driverLocation.latitude,
        driverLocation.longitude,
        userLocation.latitude,
        userLocation.longitude
      );

      // Assume average city speed of 20 km/h + 2 mins buffer
      // Time = Distance / Speed
      const speedKmH = 20;
      const hours = dist / speedKmH;
      const minutes = Math.ceil(hours * 60) + 2;

      // If very close, say 1 min
      setDriverEta(minutes < 1 ? 1 : minutes);
    }
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
  }, [paramOrderId, paramOrder]);

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
      return {
        name: productName,
        quantity: item.quantity || 1,
        price: item.price || item.subtotal / (item.quantity || 1) || 0,
        subtotal: item.subtotal || item.price * (item.quantity || 1) || 0
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

    // 1. Check top-level fully populated vendor object
    if (vendorObj) {
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
      restaurantAddress: data.restaurantAddress || '',
      restaurantPhone: data.restaurantPhone || '',
      restaurantImage: data.restaurantImage || '',
      restaurantCoordinates: restaurantCoords,
      items: normalizedItems,
      itemsText: itemsText,
      subtotal: data.totalPrice || calculatedSubtotal || 0,
      deliveryFee: data.deliveryCharge || 0,
      serviceFee: data.serviceFee || 0,
      discount: data.discount || 0,
      totalAmount: data.subTotal || data.totalAmount || 0,
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
      id: 'preparing',
      title: t('preparing'),
      subtitle: t('restaurantPreparing'),
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
    Alert.alert(
      t('messageDriver'),
      `${t('messageDriver')} ${orderData.driverName}?`,
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('quickMessages'),
          onPress: () => showQuickMessages(),
        },
        {
          text: t('customMessage'),
          onPress: () => {
            // In production, this would open a chat interface
            Alert.alert(
              t('chat'),
              t('chatFeatureText'),
              [{ text: 'OK' }]
            );
          },
        },
      ]
    );
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
            try {
              console.log('[TrackOrder] Geocoding address:', orderData.deliveryAddress);
              const geocoded = await Location.geocodeAsync(orderData.deliveryAddress);
              if (geocoded && geocoded.length > 0) {
                const geoCoords = { latitude: geocoded[0].latitude, longitude: geocoded[0].longitude };
                console.log('[TrackOrder] Geocoded delivery address:', geoCoords);
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
          } else {
            console.warn('[TrackOrder] No delivery address available in order');
          }
        }

        // --- Restaurant Location (REAL DATA ONLY) ---
        const realRestCoords = orderData.restaurantCoordinates;

        if (realRestCoords) {
          console.log('[TrackOrder] Using real restaurant coordinates:', realRestCoords);
          if (active) setRestaurantLocation(realRestCoords);
        } else {
          console.warn('[TrackOrder] No restaurant coordinates available - will attempt to fetch from vendor API');
          // Don't set any fallback - leave null
        }

        // --- Driver Location (REAL DATA ONLY from order or socket) ---
        const partner = order?.deliveryPartnerId;
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
          }

          if (partnerCoords) {
            console.log('[TrackOrder] Using real driver coordinates from order:', partnerCoords);
            if (active) setDriverLocation(partnerCoords);
          } else {
            console.log('[TrackOrder] Driver assigned but no location data - waiting for socket updates');
          }
        } else {
          console.log('[TrackOrder] No delivery partner assigned yet');
        }

        // Create route coordinates only with available real data
        if (active) {
          const routePoints = [];
          if (realRestCoords) routePoints.push(realRestCoords);
          if (driverLocation) routePoints.push(driverLocation);
          if (orderDeliveryCoords) routePoints.push(orderDeliveryCoords);
          if (routePoints.length > 0) {
            setRouteCoordinates(routePoints);
          }
        }

      } catch (error) {
        console.error('[TrackOrder] Error initializing map:', error);
        // No fallback - just log the error
      }
    })();
    return () => { active = false; };
  }, [order, orderData.restaurantCoordinates]);

  // Fetch vendor details if needed
  useEffect(() => {
    const fetchVendorDetails = async () => {
      // Check if we need to fetch vendor (if only ID string is present and we don't have coords)
      const vid = order?.vendorId;
      if (vid && typeof vid === 'string' && !orderData.restaurantCoordinates && !restaurantLocation) {
        try {
          // Since /restaurants/:id (404) and /vendors/:id (401) are problematic,
          // we fetch 1 product from this vendor which usually contains the populated vendor details.
          const url = `${API_ENDPOINTS.PRODUCTS.GET_ALL}?vendor=${vid}&limit=1`;
          const res = await customerApi.get(url);

          let vendor = null;
          if (res.data) {
            // Handle various response structures
            const list = Array.isArray(res.data) ? res.data :
              (res.data.data && Array.isArray(res.data.data)) ? res.data.data :
                (res.data.products && Array.isArray(res.data.products)) ? res.data.products :
                  (res.data.data && res.data.data.products && Array.isArray(res.data.data.products)) ? res.data.data.products : [];

            if (list.length > 0) {
              // Used populated vendor object from product
              const p = list[0];
              if (p.vendorId && typeof p.vendorId === 'object') vendor = p.vendorId;
              else if (p.vendor && typeof p.vendor === 'object') vendor = p.vendor;
            }
          }

          if (vendor) {
            let coords = null;
            if (vendor.latitude && vendor.longitude) {
              coords = { latitude: vendor.latitude, longitude: vendor.longitude };
            } else if (vendor.location && Array.isArray(vendor.location.coordinates)) {
              coords = {
                latitude: vendor.location.coordinates[1],
                longitude: vendor.location.coordinates[0]
              };
            } else if (vendor.businessLocation && vendor.businessLocation.coordinates) {
              coords = {
                latitude: vendor.businessLocation.coordinates[1],
                longitude: vendor.businessLocation.coordinates[0]
              };
            }

            if (coords) {
              console.log('[TrackOrder] Fetched real vendor coords:', coords);
              setRestaurantLocation(coords);

              // Update route will be handled by the useEffect dependent on restaurantLocation
              // if (userLocation) { ... } REMOVED fake driver location logic
            }
          }
        } catch (err) {
          console.warn('[TrackOrder] Failed to fetch vendor details:', err);
        }
      }
    };
    fetchVendorDetails();
  }, [order?.vendorId, orderData.restaurantCoordinates]);

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

    console.log('[TrackOrder] Setting up live tracking for order:', order._id);

    // Join the specific order room
    joinRoom('join-order-tracking', { orderId: order._id });

    // Listen for live location updates from delivery partner
    const handleLocationUpdate = (data) => {
      console.log('[TrackOrder] 📍 Received live driver location:', data);
      if (data && (data.latitude !== undefined) && (data.longitude !== undefined)) {
        const newLocation = {
          latitude: Number(data.latitude),
          longitude: Number(data.longitude)
        };
        console.log('[TrackOrder] Updating driver marker to:', newLocation);
        setDriverLocation(newLocation);
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
      }
    };

    socket.on('delivery-location-live', handleLocationUpdate);
    socket.on('order-status-update', handleOrderUpdate);
    socket.on('order-updated', handleOrderUpdate); // Alternative event name

    return () => {
      console.log('[TrackOrder] Cleaning up socket listeners');
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
    setMapLayout(false);
    // We might also want to reset mapRef if possible, but refs are mutable.
    // The key is to force the layout check again.
  }, [isMapFullscreen]);

  // Adjust map viewport
  useEffect(() => {
    if (mapReady && mapLayout && mapRef.current && routeCoordinates.length > 0) {
      const timeoutId = setTimeout(() => {
        // Double-check mapRef is still valid
        if (mapRef.current && routeCoordinates.length > 0) {
          try {
            mapRef.current.fitToCoordinates(routeCoordinates, {
              edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
              animated: true,
            });
          } catch (error) {
            console.log('Error fitting map to coordinates:', error);
          }
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [mapReady, mapLayout, routeCoordinates]);

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
  };

  const renderMapPlaceholder = () => {
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

    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
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
              setMapLayout(true);
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
          {driverLocation && (currentStatus === 'picked_up' || currentStatus === 'on_the_way' || currentStatus === 'nearby') && (
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
          <Text style={styles.etaText}>{orderData.estimatedTime}</Text>
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
              if (mapRef.current) {
                try {
                  mapRef.current.getCamera().then((cam) => {
                    if (mapRef.current) {
                      cam.zoom += 1;
                      mapRef.current.animateCamera(cam);
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
              if (mapRef.current) {
                try {
                  mapRef.current.getCamera().then((cam) => {
                    if (mapRef.current) {
                      cam.zoom -= 1;
                      mapRef.current.animateCamera(cam);
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
            if (userLocation && mapRef.current) {
              try {
                mapRef.current.animateToRegion({
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

  const renderOrderProgress = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>{t('orderStatus')}</Text>

      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground} />
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Order Stages */}
      <View style={styles.stagesContainer}>
        {orderStages.map((stage, index) => {
          const completed = isStageCompleted(stage.id);
          const current = isCurrentStage(stage.id);

          return (
            <View key={stage.id} style={styles.stageItem}>
              <View style={styles.stageIconContainer}>
                <View
                  style={[
                    styles.stageIconWrapper,
                    completed && styles.stageIconCompleted,
                    current && styles.stageIconCurrent,
                  ]}
                >
                  {stage.iconLibrary === 'Ionicons' ? (
                    <Ionicons
                      name={stage.icon}
                      size={20}
                      color={completed || current ? colors.text.white : colors.text.light}
                    />
                  ) : (
                    <MaterialIcons
                      name={stage.icon}
                      size={20}
                      color={completed || current ? colors.text.white : colors.text.light}
                    />
                  )}
                </View>
                {index < orderStages.length - 1 && (
                  <View
                    style={[
                      styles.stageConnector,
                      completed && styles.stageConnectorCompleted,
                    ]}
                  />
                )}
              </View>
              <View style={styles.stageContent}>
                <Text
                  style={[
                    styles.stageTitle,
                    (completed || current) && styles.stageTitleActive,
                  ]}
                >
                  {stage.title}
                </Text>
                <Text style={styles.stageSubtitle}>{stage.subtitle}</Text>
                {current && (
                  <View style={styles.currentBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.currentBadgeText}>{t('inProgress')}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderDriverInfo = () => (
    <View style={styles.driverContainer}>
      <View style={styles.driverHeader}>
        <Text style={styles.sectionTitle}>{t('deliveryRider')}</Text>
        {orderData.driverTotalDeliveries > 0 && (
          <View style={styles.driverStats}>
            <Text style={styles.driverStatsText}>
              {orderData.driverTotalDeliveries}+ {t('deliveries')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.driverCard}>
        <View style={styles.driverLeft}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={32} color={colors.primary} />
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
            </View>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{orderData.driverName}</Text>
            {(orderData.driverRating > 0 || orderData.vehicleType) && (
              <View style={styles.driverRating}>
                {orderData.driverRating > 0 && (
                  <>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.driverRatingText}>{orderData.driverRating}</Text>
                  </>
                )}
                {orderData.vehicleType && (
                  <Text style={styles.driverVehicle}>{orderData.driverRating > 0 ? '• ' : ''}{orderData.vehicleType}</Text>
                )}
              </View>
            )}
            {(orderData.vehicleNumber || orderData.vehicleColor) && (
              <View style={styles.vehicleInfo}>
                <Ionicons name="car-sport" size={12} color={colors.text.light} />
                {orderData.vehicleNumber && (
                  <Text style={styles.vehicleNumber}>{orderData.vehicleNumber}</Text>
                )}
                {orderData.vehicleNumber && orderData.vehicleColor && (
                  <Text style={styles.vehicleDot}>•</Text>
                )}
                {orderData.vehicleColor && (
                  <Text style={styles.vehicleColor}>{orderData.vehicleColor}</Text>
                )}
              </View>
            )}
            {orderData.driverPhone ? (
              <View style={styles.vehicleInfo}>
                <Ionicons name="call" size={12} color={colors.text.light} />
                <Text style={styles.vehicleNumber}>{orderData.driverPhone}</Text>
              </View>
            ) : null}
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

      {/* Driver Status - only show if we have real data */}
      {driverLocation && (
        <View style={styles.driverStatusBar}>
          <View style={styles.statusItem}>
            <Ionicons name="navigate" size={16} color={colors.success} />
            <Text style={styles.statusText}>{t('headingToYou')}</Text>
          </View>
          {driverEta && (
            <>
              <View style={styles.statusDivider} />
              <View style={styles.statusItem}>
                <Ionicons name="speedometer" size={16} color={colors.info} />
                <Text style={styles.statusText}>~{driverEta} {t('minAway')}</Text>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );

  const renderOrderSummary = () => (
    <View style={styles.summaryContainer}>
      <View style={styles.summaryHeader}>
        <View>
          <Text style={styles.sectionTitle}>{t('orderDetails')}</Text>
          <Text style={styles.orderNumber}>{orderData.orderNumber}</Text>
        </View>
        <View style={styles.orderDateContainer}>
          <Text style={styles.orderDate}>{orderData.orderDate}</Text>
          <Text style={styles.orderTime}>{orderData.orderTime}</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        {/* Restaurant Info with Call Option */}
        <TouchableOpacity
          style={styles.summarySection}
          onPress={handleCallRestaurant}
          activeOpacity={0.7}
        >
          <View style={styles.summaryIconContainer}>
            <MaterialIcons name="restaurant" size={20} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>{t('restaurant')}</Text>
            <Text style={styles.summaryValue}>{orderData.restaurantName}</Text>
            <Text style={styles.summarySubtext}>{orderData.restaurantAddress}</Text>
          </View>
          <Ionicons name="call-outline" size={20} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.summaryDivider} />

        {/* Delivery Address */}
        <View style={styles.summarySection}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="location" size={20} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>{t('deliveryTo')}</Text>
            <Text style={styles.summaryValue}>{orderData.deliveryAddress}</Text>
            {orderData.deliveryLandmark && (
              <Text style={styles.summarySubtext}>📍 {orderData.deliveryLandmark}</Text>
            )}
            {orderData.deliveryInstructions && (
              <View style={styles.instructionsBadge}>
                <Ionicons name="information-circle" size={12} color={colors.info} />
                <Text style={styles.instructionsText}>{orderData.deliveryInstructions}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.summaryDivider} />

        {/* Order Items */}
        <View style={styles.summarySection}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="bag-handle" size={20} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>{t('items')} ({orderData.items?.length || 0})</Text>
            {orderData.items?.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <Text style={styles.itemQuantity}>{item.quantity || 1}x</Text>
                <Text style={styles.itemName}>{item.name || item}</Text>
                <Text style={styles.itemPrice}>€{item.price ? item.price.toFixed(2) : '0.00'}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.summaryDivider} />

        {/* Payment Breakdown */}
        <View style={styles.summarySection}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="receipt" size={20} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>{t('billSummary')}</Text>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>{t('subtotal')}</Text>
              <Text style={styles.billValue}>€{orderData.subtotal ? orderData.subtotal.toFixed(2) : '0.00'}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>{t('deliveryFee')}</Text>
              <Text style={styles.billValue}>€{orderData.deliveryFee ? orderData.deliveryFee.toFixed(2) : '0.00'}</Text>
            </View>

            {orderData.discount > 0 && (
              <View style={styles.billRow}>
                <Text style={styles.billLabelDiscount}>
                  {t('discount')} ({orderData.promoCode || 'PROMO'})
                </Text>
                <Text style={styles.billValueDiscount}>-€{orderData.discount ? orderData.discount.toFixed(2) : '0.00'}</Text>
              </View>
            )}

            <View style={styles.billDivider} />
            <View style={styles.billRow}>
              <Text style={styles.totalLabel}>{t('totalAmount')}</Text>
              <Text style={styles.totalAmount}>€{orderData.totalAmount ? orderData.totalAmount.toFixed(2) : '0.00'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryDivider} />

        {/* Payment Method */}
        <View style={styles.summarySection}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="card" size={20} color={colors.primary} />
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>{t('paymentMethod')}</Text>
            <Text style={styles.summaryValue}>{orderData.paymentMethod}</Text>
            <View style={styles.paidBadge}>
              <Text style={styles.paidText}>{t('paid')}</Text>
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
                ref={mapRef}
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
                    setMapLayout(true);
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
                {driverLocation && (currentStatus === 'picked_up' || currentStatus === 'on_the_way' || currentStatus === 'nearby') && (
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
                <Text style={styles.fullscreenEtaText}>{orderData.estimatedTime}</Text>
              </View>

              {/* Zoom Controls - Fullscreen */}
              <View style={styles.fullscreenZoomControls}>
                <TouchableOpacity
                  style={styles.zoomButton}
                  onPress={() => {
                    if (mapRef.current) {
                      try {
                        mapRef.current.getCamera().then((cam) => {
                          if (mapRef.current) {
                            cam.zoom += 1;
                            mapRef.current.animateCamera(cam);
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
                    if (mapRef.current) {
                      try {
                        mapRef.current.getCamera().then((cam) => {
                          if (mapRef.current) {
                            cam.zoom -= 1;
                            mapRef.current.animateCamera(cam);
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
                  if (userLocation && mapRef.current) {
                    try {
                      mapRef.current.animateToRegion({
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
              {(currentStatus === 'picked_up' || currentStatus === 'on_the_way' || currentStatus === 'nearby') && (
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
                        <Text style={styles.driverName}>{orderData.driverName}</Text>
                        <View style={styles.driverRating}>
                          <Ionicons name="star" size={14} color="#FFD700" />
                          <Text style={styles.driverRatingText}>{orderData.driverRating}</Text>
                          <Text style={styles.driverVehicle}>• {orderData.vehicleType}</Text>
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
                </View>
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
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
      backgroundColor: colors.background,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
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
    progressBarContainer: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      marginBottom: spacing.lg,
      overflow: 'hidden',
    },
    progressBarBackground: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.border,
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 3,
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
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageIconCompleted: {
      backgroundColor: colors.success,
    },
    stageIconCurrent: {
      backgroundColor: colors.primary,
    },
    stageConnector: {
      width: 2,
      flex: 1,
      backgroundColor: colors.border,
      marginVertical: 4,
    },
    stageConnectorCompleted: {
      backgroundColor: colors.success,
    },
    stageContent: {
      flex: 1,
      paddingTop: 2,
    },
    stageTitle: {
      fontSize: fontSize.md,
      fontFamily: 'Poppins-SemiBold',
      color: colors.text.light,
      marginBottom: 2,
    },
    stageTitleActive: {
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
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Map */}
        {renderMapPlaceholder()}

        {/* Driver Info */}
        {(currentStatus === 'picked_up' || currentStatus === 'on_the_way' || currentStatus === 'nearby') && renderDriverInfo()}

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
