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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { spacing, fontSize, borderRadius } from '../theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useTheme } from '../utils/ThemeContext';

const { height } = Dimensions.get('window');

const TrackOrderScreen = ({ route, navigation }) => {
  const { t, language } = useLanguage();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { order } = route.params || {};
  const [currentStatus, setCurrentStatus] = useState('on_the_way'); // preparing, ready, picked_up, on_the_way, nearby, delivered
  const [progressAnim] = useState(new Animated.Value(0));
  const mapRef = useRef(null);

  // Location states
  const [userLocation, setUserLocation] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [restaurantLocation, setRestaurantLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [mapReady, setMapReady] = useState(false);

  // Normalize order data to handle both detailed and simple formats
  const normalizeOrderData = (data) => {
    if (!data) return null;

    // If items is array of strings, convert to objects
    const normalizedItems = data.items?.map((item) => {
      if (typeof item === 'string') {
        return { name: item, quantity: 1, price: 0 };
      }
      return item;
    }) || [];

    return {
      id: data.id || '1',
      orderNumber: data.orderNumber || '#DLG-2024-1234',
      orderDate: data.orderDate || 'Oct 26, 2025',
      orderTime: data.orderTime || '2:45 PM',
      restaurantName: data.restaurantName || 'Burger King',
      restaurantAddress: data.restaurantAddress || '123 Main Street, Downtown District',
      restaurantPhone: data.restaurantPhone || '+1 (555) 123-4567',
      restaurantImage: data.restaurantImage || '🍔',
      items: normalizedItems,
      itemsText: data.itemsText || data.items || [],
      subtotal: data.subtotal || data.totalAmount || 0,
      deliveryFee: data.deliveryFee || 2.99,
      serviceFee: data.serviceFee || 1.99,
      discount: data.discount || 0,
      totalAmount: data.totalAmount || 0,
      estimatedTime: data.estimatedTime || '20-25 min',
      estimatedArrival: data.estimatedArrival || '3:10 PM',
      deliveryAddress: data.deliveryAddress || '456 Park Avenue, Apartment 5B, 2nd Floor',
      deliveryLandmark: data.deliveryLandmark || 'Near Central Park',
      deliveryInstructions: data.deliveryInstructions || 'Please ring the bell twice',
      driverName: data.driverName || 'Michael Rodriguez',
      driverPhone: data.driverPhone || '+1 (555) 987-6543',
      driverRating: data.driverRating || 4.9,
      driverTotalDeliveries: data.driverTotalDeliveries || 1247,
      vehicleType: data.vehicleType || 'Motorcycle',
      vehicleNumber: data.vehicleNumber || 'DLG-8845',
      vehicleColor: data.vehicleColor || 'Red',
      paymentMethod: data.paymentMethod || 'Credit Card •••• 4242',
      promoCode: data.promoCode || 'SAVE5',
    };
  };

  // Mock order data if not provided - Professional format
  const defaultMockData = {
    id: '1',
    orderNumber: '#DLG-2024-1234',
    orderDate: 'Oct 26, 2025',
    orderTime: '2:45 PM',
    restaurantName: 'Burger King',
    restaurantAddress: '123 Main Street, Downtown District',
    restaurantPhone: '+1 (555) 123-4567',
    restaurantImage: '🍔',
    items: [
      { name: 'Double Whopper Meal', quantity: 1, price: 12.99 },
      { name: 'Chicken Royale', quantity: 1, price: 8.99 },
      { name: 'Large Fries', quantity: 2, price: 3.49 },
      { name: 'Coca Cola (500ml)', quantity: 2, price: 2.49 }
    ],
    itemsText: ['Double Whopper Meal', 'Chicken Royale', 'Large Fries x2', 'Coca Cola x2'],
    subtotal: 31.45,
    deliveryFee: 2.99,
    serviceFee: 1.99,
    discount: 5.00,
    totalAmount: 31.43,
    estimatedTime: '20-25 min',
    estimatedArrival: '3:10 PM',
    deliveryAddress: '456 Park Avenue, Apartment 5B, 2nd Floor',
    deliveryLandmark: 'Near Central Park',
    deliveryInstructions: 'Please ring the bell twice',
    driverName: 'Michael Rodriguez',
    driverPhone: '+1 (555) 987-6543',
    driverRating: 4.9,
    driverTotalDeliveries: 1247,
    vehicleType: 'Motorcycle',
    vehicleNumber: 'DLG-8845',
    vehicleColor: 'Red',
    paymentMethod: 'Credit Card •••• 4242',
    promoCode: 'SAVE5',
  };

  const orderData = normalizeOrderData(order) || defaultMockData;

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

  // Professional Call Handler
  const handleCallDriver = async () => {
    const phoneNumber = orderData.driverPhone.replace(/\D/g, ''); // Remove non-numeric characters
    const phoneUrl = Platform.OS === 'ios' ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;

    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        Alert.alert(
          t('callDriver'),
          `${t('callDriver')} ${orderData.driverName}?\n${orderData.driverPhone}`,
          [
            {
              text: t('cancel'),
              style: 'cancel',
            },
            {
              text: t('call'),
              onPress: async () => {
                await Linking.openURL(phoneUrl);
              },
            },
          ]
        );
      } else {
        Alert.alert(t('error'), t('unableToCall'));
      }
    } catch (error) {
      Alert.alert(t('error'), t('unableToInitiate'));
      console.error('Call error:', error);
    }
  };

  // Professional Call Restaurant Handler
  const handleCallRestaurant = async () => {
    const phoneNumber = orderData.restaurantPhone.replace(/\D/g, '');
    const phoneUrl = Platform.OS === 'ios' ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;

    try {
      const supported = await Linking.canOpenURL(phoneUrl);
      if (supported) {
        Alert.alert(
          t('callRestaurant'),
          `${t('call')} ${orderData.restaurantName}?\n${orderData.restaurantPhone}`,
          [
            {
              text: t('cancel'),
              style: 'cancel',
            },
            {
              text: t('call'),
              onPress: async () => {
                await Linking.openURL(phoneUrl);
              },
            },
          ]
        );
      } else {
        Alert.alert(t('error'), t('unableToCall'));
      }
    } catch (error) {
      Alert.alert(t('error'), t('unableToInitiate'));
      console.error('Call error:', error);
    }
  };

  // Professional Message Handler
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

  // Request location permissions and get user location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          // Set default location (fallback)
          const defaultCoords = {
            latitude: 37.78825,
            longitude: -122.4324,
          };
          setUserLocation(defaultCoords);

          const restaurantCoords = {
            latitude: 37.78825 + 0.01,
            longitude: -122.4324 + 0.008,
          };
          setRestaurantLocation(restaurantCoords);

          const driverCoords = {
            latitude: 37.78825 + 0.005,
            longitude: -122.4324 + 0.004,
          };
          setDriverLocation(driverCoords);

          setRouteCoordinates([restaurantCoords, driverCoords, defaultCoords]);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(userCoords);

        // Set mock restaurant location (offset from user)
        const restaurantCoords = {
          latitude: location.coords.latitude + 0.01,
          longitude: location.coords.longitude + 0.008,
        };
        setRestaurantLocation(restaurantCoords);

        // Set initial driver location (between restaurant and user)
        const driverCoords = {
          latitude: location.coords.latitude + 0.005,
          longitude: location.coords.longitude + 0.004,
        };
        setDriverLocation(driverCoords);

        // Create route coordinates (simple straight line for demo)
        setRouteCoordinates([restaurantCoords, driverCoords, userCoords]);
      } catch (error) {
        console.error('Error getting location:', error);
        // Set default location on error
        const defaultCoords = {
          latitude: 37.78825,
          longitude: -122.4324,
        };
        setUserLocation(defaultCoords);

        const restaurantCoords = {
          latitude: 37.78825 + 0.01,
          longitude: -122.4324 + 0.008,
        };
        setRestaurantLocation(restaurantCoords);

        const driverCoords = {
          latitude: 37.78825 + 0.005,
          longitude: -122.4324 + 0.004,
        };
        setDriverLocation(driverCoords);

        setRouteCoordinates([restaurantCoords, driverCoords, defaultCoords]);
      }
    })();
  }, []);

  // Simulate driver movement towards user
  useEffect(() => {
    if (!userLocation || !driverLocation) return;

    const interval = setInterval(() => {
      setDriverLocation((prevLocation) => {
        if (!prevLocation || !userLocation) return prevLocation;

        // Calculate direction towards user
        const latDiff = userLocation.latitude - prevLocation.latitude;
        const lngDiff = userLocation.longitude - prevLocation.longitude;

        // Move driver closer to user (simulate movement)
        const newLat = prevLocation.latitude + latDiff * 0.02; // Move 2% closer each update
        const newLng = prevLocation.longitude + lngDiff * 0.02;

        // Check if driver is very close to user
        const distance = Math.sqrt(
          Math.pow(userLocation.latitude - newLat, 2) +
          Math.pow(userLocation.longitude - newLng, 2)
        );

        if (distance < 0.001) {
          // Driver has arrived
          setCurrentStatus('delivered');
          clearInterval(interval);
          return userLocation;
        } else if (distance < 0.003) {
          // Driver is nearby
          setCurrentStatus('nearby');
        }

        return {
          latitude: newLat,
          longitude: newLng,
        };
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [userLocation, driverLocation]);

  // Update route when driver moves
  useEffect(() => {
    if (restaurantLocation && driverLocation && userLocation) {
      setRouteCoordinates([restaurantLocation, driverLocation, userLocation]);
    }
  }, [driverLocation, restaurantLocation, userLocation]);

  // Fit map to show all markers
  useEffect(() => {
    if (mapReady && mapRef.current && routeCoordinates.length > 0) {
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
  }, [mapReady, routeCoordinates]);

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
    // If location data is not ready, show loading state
    if (!userLocation) {
      return (
        <View style={styles.mapContainer}>
          <View style={[styles.map, styles.mapLoading]}>
            <Ionicons name="map-outline" size={48} color={colors.text.light} />
            <Text style={styles.mapLoadingText}>{t('loadingMap') || 'Loading map...'}</Text>
          </View>
        </View>
      );
    }

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
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={true}
          loadingEnabled={true}
        >
        {/* Restaurant Marker */}
        {restaurantLocation && (
          <Marker
            coordinate={restaurantLocation}
            title={orderData.restaurantName}
            description="Restaurant"
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
            description="Delivery Rider"
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
            title="Your Location"
            description={orderData.deliveryAddress}
          >
            <View style={styles.customMarker}>
              <View style={styles.userMarker}>
                <Ionicons name="location" size={24} color={colors.primary} />
              </View>
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
        <TouchableOpacity>
          <Text style={styles.viewDetailsText}>{t('viewDetails')}</Text>
        </TouchableOpacity>
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
        <View style={styles.driverStats}>
          <Text style={styles.driverStatsText}>
            {orderData.driverTotalDeliveries}+ {t('deliveries')}
          </Text>
        </View>
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
            <View style={styles.driverRating}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.driverRatingText}>{orderData.driverRating}</Text>
              <Text style={styles.driverVehicle}>• {orderData.vehicleType}</Text>
            </View>
            <View style={styles.vehicleInfo}>
              <Ionicons name="car-sport" size={12} color={colors.text.light} />
              <Text style={styles.vehicleNumber}>{orderData.vehicleNumber}</Text>
              <Text style={styles.vehicleDot}>•</Text>
              <Text style={styles.vehicleColor}>{orderData.vehicleColor}</Text>
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

      {/* Driver Status */}
      <View style={styles.driverStatusBar}>
        <View style={styles.statusItem}>
          <Ionicons name="navigate" size={16} color={colors.success} />
          <Text style={styles.statusText}>{t('headingToYou')}</Text>
        </View>
        <View style={styles.statusDivider} />
        <View style={styles.statusItem}>
          <Ionicons name="speedometer" size={16} color={colors.info} />
          <Text style={styles.statusText}>~3 {t('minAway')}</Text>
        </View>
      </View>
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
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>{t('serviceFee')}</Text>
              <Text style={styles.billValue}>€{orderData.serviceFee ? orderData.serviceFee.toFixed(2) : '0.00'}</Text>
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
    backgroundColor: '#E8F5E9',
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
    backgroundColor: '#E8F5E9',
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
    backgroundColor: '#E8F5E9',
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
    backgroundColor: '#E8F5E9',
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
    backgroundColor: '#E3F2FD',
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
}), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          <TouchableOpacity style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>{t('cancelOrder')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.supportButton}>
            <Ionicons name="headset" size={20} color={colors.text.white} />
            <Text style={styles.supportButtonText}>{t('support')}</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing for safe area and tab bar */}
        <View style={{ height: Math.max(80, insets.bottom + 80) }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default TrackOrderScreen;

