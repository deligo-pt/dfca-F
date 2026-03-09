import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { spacing } from '../theme';
import { useTheme } from '../utils/ThemeContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../utils/LanguageContext';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../contexts/ProductsContext';
import { useLocation } from '../contexts/LocationContext';
import { useProfile } from '../contexts/ProfileContext';
import formatCurrency from '../utils/currency';
import { formatMinutesToUX } from '../utils/timeFormat';
import { setupPaymentSheet, openPaymentSheet } from '../utils/stripeService';
import CheckoutAPI from '../utils/checkoutApi';
import OrderAPI from '../utils/orderApi';
import { customerApi } from '../utils/api';
import AddressApi from '../utils/addressApi';
import { API_ENDPOINTS, API_CONFIG } from '../constants/config';
import { getUserId, getUserData } from '../utils/auth';
import AlertModal from '../components/AlertModal';

/**
 * ConsumerLocationDisplay
 * 
 * Displays the current delivery address with appropriate iconography.
 * 
 * @param {Object} props
 * @param {Object} props.colors - Theme colors.
 * @param {Function} props.t - Localization helper.
 */
const ConsumerLocationDisplay = ({ colors, t }) => {
  const { address, detailedAddress, city, postalCode, label } = useLocation();
  const displayAddress = address || t('selectAddress');

  // Filter out redundant parts for the secondary line
  const locationDetails = [
    city,
    postalCode
  ].filter(part => part && part.trim()).join(', ');

  return (
    <View style={styles(colors).addressContainer}>
      <View style={styles(colors).addressIconWrapper}>
        <MaterialCommunityIcons name={label === 'Work' ? 'briefcase' : label === 'Other' ? 'map-marker' : 'home-variant'} size={24} color={colors.primary} />
      </View>
      <View style={styles(colors).addressDetails}>
        <Text style={styles(colors).addressType}>{label || t('home')}</Text>

        {/* Show Detailed Address (Apt/Floor) prominently if available */}
        {detailedAddress ? (
          <Text style={[styles(colors).addressFull, { fontFamily: 'Poppins-SemiBold', color: colors.text.primary, marginBottom: 2 }]}>
            {detailedAddress}
          </Text>
        ) : null}

        <Text style={styles(colors).addressFull}>
          {displayAddress}
        </Text>

        {locationDetails ? (
          <Text style={[styles(colors).addressFull, { fontSize: 13, color: colors.text.secondary, marginTop: 2 }]}>
            {locationDetails}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

/**
 * CheckoutScreen
 * 
 * Orchestrates the final order placement process.
 * Features:
 * - Address validation and creation.
 * - Profile completeness checks.
 * - Integration with Stripe PaymentSheet.
 * - Order creation via backend API.
 * - Handling of both cart-based and direct-buy flows.
 * 
 * @param {Object} props
 * @param {Object} props.route - Route params containing initial cart data.
 * @param {Object} props.navigation - Navigation prop.
 */
const CheckoutScreen = ({ route, navigation }) => {
  const { colors, isDarkMode } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { cartData } = route.params || {};

  // Context Hooks
  // Context Hooks
  const { getVendorCart, clearVendorCartAndSync, cartsArray } = useCart();

  // Resolve Cart Data source
  // cartData from params contains the items we want to checkout
  // If it has a vendorId, we try to Load the full cart from Context to get coupons/instructions/etc
  const paramsVendorId = cartData?.vendorId;
  const cart = paramsVendorId ? getVendorCart(paramsVendorId) : null;
  const vendorId = paramsVendorId;
  const appliedOffer = cart?.appliedPromo || null;
  const { products } = useProducts();
  const {
    address,
    detailedAddress,
    city,
    postalCode,
    state,
    country,
    currentLocation,
    selectAddress,
  } = useLocation();
  const { user } = useProfile();

  // Local State
  const [initializingCheckout, setInitializingCheckout] = useState(false);
  const [stripeError, setStripeError] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [notes, setNotes] = useState('');
  const [checkoutResponse, setCheckoutResponse] = useState(null);

  // Missing States Restoration
  const [selectedPayment, setSelectedPayment] = useState('CARD');
  const [stripeReady, setStripeReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tip, setTip] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [deliveryInstruction, setDeliveryInstruction] = useState('');

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState(null);

  // CTA shimmer animation
  const shimmerAnim = useRef(new Animated.Value(0)).current;
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

  // NIF Modal State
  const [showNifModal, setShowNifModal] = useState(false);
  const [nifValue, setNifValue] = useState('');
  const [nifSkipped, setNifSkipped] = useState(false);
  const [isUpdatingNif, setIsUpdatingNif] = useState(false);
  const { updateProfile } = useProfile();

  const [showCancelModal, setShowCancelModal] = useState(false);

  // ... (existing state) ...

  const handleUpdateNif = async () => {
    if (!nifValue.trim()) {
      setStripeError(t('pleaseEnterNif') || 'Please enter valid NIF');
      return;
    }

    setIsUpdatingNif(true);
    console.log(`[${new Date().toISOString()}] [CheckoutScreen] handleUpdateNif starting with:`, nifValue);
    try {
      // Send both cases to ensure backend compat
      const success = await updateProfile({
        NIF: nifValue.trim(),
        nif: nifValue.trim()
      });
      console.log(`[${new Date().toISOString()}] [CheckoutScreen] handleUpdateNif result:`, success);
      if (success) {
        console.log('[CheckoutScreen] NIF updated successfully');
        setShowNifModal(false);
        setNifSkipped(true);
      } else {
        setStripeError('Failed to update NIF. Please try again or Skip.');
      }
    } catch (error) {
      console.error('[CheckoutScreen] NIF update error:', error);
      setStripeError('Failed to update NIF.');
    } finally {
      setIsUpdatingNif(false);
    }
  };

  const handleSkipNif = () => {
    setShowNifModal(false);
    setNifSkipped(true);
  };

  // ... (render) ...




  // Build full address string from all components
  const fullAddressParts = [
    address,
    detailedAddress,
    city,
    postalCode
  ].filter(part => part && part.trim()).join(', ');

  const completeStreet = [detailedAddress, address]
    .filter(part => part && part.trim())
    .join(', ');

  const addressData = {
    // Primary address fields - combine address with details in street
    address: completeStreet || address || '',
    street: completeStreet || address || '', // Street should include apartment/building
    detailedAddress: detailedAddress || '',
    addressLine1: address || '',
    addressLine2: detailedAddress || '', // Apartment/building as separate line
    building: detailedAddress || '',
    apartment: detailedAddress || '',
    city: city || '',
    postalCode: postalCode || '',
    zipCode: postalCode || '',
    // Combined full address
    fullAddress: fullAddressParts,
    formattedAddress: fullAddressParts,
    // Coordinates
    coordinates: currentLocation ? {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude
    } : null,
    latitude: currentLocation?.latitude || null,
    longitude: currentLocation?.longitude || null,
    // Backend required fields
    state: state || 'Dhaka Division', // Use map state or default
    country: country || 'Bangladesh', // Use map country or default
  };

  useEffect(() => {
    let canceled = false;
    const createCheckoutOnEnter = async () => {
      if (appliedOffer || (checkoutResponse && checkoutResponse.offerDiscount > 0)) {
        console.debug('[CheckoutScreen] Skipping auto-createCheckout because offer is active.');
        return;
      }

      if (user && !user.NIF && !nifSkipped && !showNifModal) {
        console.debug('[CheckoutScreen] User missing NIF, prompting modal...');
        setShowNifModal(true);
        return;
      }

      if (!address || !city) {
        console.debug('[CheckoutScreen] No address available, skipping API call');
        setStripeError(t('pleaseSelectAddress') || 'Please select a delivery address');
        setInitializingCheckout(false);
        return;
      }

      setInitializingCheckout(true);
      setStripeError(null);
      setProfileIncomplete(false);

      // 0. Pre-check: Validate Profile Completeness
      try {
        const currentUser = await getUserData();
        const hasFirstName = currentUser?.name?.firstName || currentUser?.firstName;
        const hasLastName = currentUser?.name?.lastName || currentUser?.lastName;
        const hasContactNumber = currentUser?.contactNumber || currentUser?.phone || currentUser?.mobile;
        // Note: Email is not required - users can authenticate with mobile only

        // Validate customer.name.firstName
        if (!hasFirstName || !hasFirstName.trim()) {
          console.warn('[CheckoutScreen] Profile incomplete (missing first name)');
          setProfileIncomplete(true);
          setStripeError(t('incompleteProfileError') || 'Please complete your profile before checking out');
          setInitializingCheckout(false);
          return;
        }

        // Validate customer.name.lastName
        if (!hasLastName || !hasLastName.trim()) {
          console.warn('[CheckoutScreen] Profile incomplete (missing last name)');
          setProfileIncomplete(true);
          setStripeError(t('incompleteProfileError') || 'Please complete your profile before checking out');
          setInitializingCheckout(false);
          return;
        }

        // Validate customer.contactNumber
        if (!hasContactNumber || !hasContactNumber.trim()) {
          console.warn('[CheckoutScreen] Profile incomplete (missing contact number)');
          setProfileIncomplete(true);
          setStripeError(t('incompleteProfileError') || 'Please complete your profile before checking out');
          setInitializingCheckout(false);
          return;
        }

        // Validate customer.address.state
        if (!state || !state.trim()) {
          console.warn('[CheckoutScreen] Profile incomplete (missing address state)');
          setProfileIncomplete(true);
          setStripeError(t('incompleteProfileError') || 'Please complete your profile before checking out');
          setInitializingCheckout(false);
          return;
        }

        // Validate customer.address.city
        if (!city || !city.trim()) {
          console.warn('[CheckoutScreen] Profile incomplete (missing address city)');
          setProfileIncomplete(true);
          setStripeError(t('incompleteProfileError') || 'Please complete your profile before checking out');
          setInitializingCheckout(false);
          return;
        }

        // Validate customer.address.country
        if (!country || !country.trim()) {
          console.warn('[CheckoutScreen] Profile incomplete (missing address country)');
          setProfileIncomplete(true);
          setStripeError(t('incompleteProfileError') || 'Please complete your profile before checking out');
          setInitializingCheckout(false);
          return;
        }

        // Validate customer.address.postalCode
        if (!postalCode || !postalCode.trim()) {
          console.warn('[CheckoutScreen] Profile incomplete (missing address postalCode)');
          setProfileIncomplete(true);
          setStripeError(t('incompleteProfileError') || 'Please complete your profile before checking out');
          setInitializingCheckout(false);
          return;
        }
      } catch (err) {
        console.warn('[CheckoutScreen] Failed to validate profile completeness', err);
      }

      let backendAddressId = null;
      let currentUser = null;

      // Helper to find address in a list
      const findMatchingAddress = (list, target) => {
        if (!Array.isArray(list) || !list.length) return null;
        return list.find(a =>
          (a.latitude === target.latitude && a.longitude === target.longitude) ||
          (a.street === target.street) ||
          (a.address === target.address)
        );
      };

      try {
        // Step 1: ALWAYS Fetch fresh profile from API to ensure we have the latest address IDs
        // Local storage (getUserData) might be stale specific for checkout flow
        console.debug('[CheckoutScreen] Fetching fresh profile for address resolution...');
        let freshProfile = null;
        try {
          const profileRes = await customerApi.get(API_ENDPOINTS.PROFILE.GET);
          if (profileRes.data && profileRes.data.data) {
            freshProfile = profileRes.data.data;
          } else if (profileRes.data) {
            freshProfile = profileRes.data;
          }
        } catch (fetchErr) {
          console.warn('[CheckoutScreen] Failed to fetch fresh profile', fetchErr);
          // Fallback to local data if network fails
          freshProfile = await getUserData();
        }

        currentUser = freshProfile; // Update currentUser reference to use the fresh one
        const serverAddresses = freshProfile?.deliveryAddresses || [];
        console.debug('[CheckoutScreen] Server addresses count:', serverAddresses.length);

        // Strategy 1: Check fresh server list for match
        if (serverAddresses.length > 0) {
          const match = findMatchingAddress(serverAddresses, addressData);
          if (match) {
            console.debug('[CheckoutScreen] Found matching delivery address in SERVER data:', match._id);
            backendAddressId = match._id;
          }
        }

        // Strategy 2: If not found, try to add it as a NEW delivery address
        if (!backendAddressId) {
          console.debug('[CheckoutScreen] Address ID not found on server. Attempting to add...');

          try {
            const payload = {
              deliveryAddress: {
                street: addressData.street || addressData.address,
                city: addressData.city,
                state: addressData.state,
                country: addressData.country,
                postalCode: addressData.postalCode,
                latitude: addressData.latitude,
                longitude: addressData.longitude,
                addressType: (addressData.label === 'Work' ? 'OFFICE' : addressData.label === 'Other' ? 'OTHER' : 'HOME').toUpperCase(),
                isActive: true
              }
            };

            const addRes = await AddressApi.addDeliveryAddress(payload);

            if (addRes.data && addRes.data.success) {
              // Extract ID from response (structure depends on backend)
              const addedAddr = addRes.data.data || addRes.data.address;
              if (addedAddr && addedAddr._id) {
                backendAddressId = addedAddr._id;
              } else if (addRes.data.user && addRes.data.user.deliveryAddresses) {
                const match = findMatchingAddress(addRes.data.user.deliveryAddresses, addressData);
                if (match) backendAddressId = match._id;
              }
              console.debug('[CheckoutScreen] Address added successfully, new ID:', backendAddressId);
            }
          } catch (addErr) {
            // Strategy 3: Handle 409 Conflict (Address already exists)
            if (addErr.response && (addErr.response.status === 409)) {
              console.warn('[CheckoutScreen] Address already exists (409) but was not matched initially.');
              // Try fuzzy match on street alone if strict match failed
              const looseMatch = serverAddresses.find(a => a.street === addressData.street);
              if (looseMatch) {
                backendAddressId = looseMatch._id;
                console.debug('[CheckoutScreen] Resolved ID via loose street match after 409:', backendAddressId);
              } else {
                console.warn('[CheckoutScreen] Could not resolve ID even after 409 conflict.');
              }
            } else if (addErr.response && addErr.response.status === 400) {
              const errorMsg = addErr.response.data?.message || '';
              if (errorMsg.includes('maximum number of delivery addresses')) {
                console.warn('[CheckoutScreen] Max addresses reached. Ideally prompt user to select existing.');
                setStripeError(t('maxAddressesReached') || 'You have reached the maximum number of delivery addresses. Please select or delete an existing address.');
                setInitializingCheckout(false);
                return;
              }
            } else {
              console.warn('[CheckoutScreen] Failed to add address', addErr.message);
            }
          }
        }
      } catch (e) {
        console.warn('[CheckoutScreen] Address resolution logic failed', e);
      }

      // Prepare Final Payload
      // Fallback to getUserData if currentUser is still null
      if (!currentUser) {
        currentUser = await getUserData();
      }

      // Determine Purchase Type: Cart vs Direct
      // The `cart` variable comes from `getVendorCart(vendorId)`.
      // If we are checking out a Vendor Cart, `cart` will be defined and `useCart` should be true.
      // If `cartData` was passed (e.g. "Buy Now") but it's not in the context cart, we send items directly.

      // Heuristic: If we have a valid vendorId and that vendor cart exists in context, prefer `useCart: true`.
      // Otherwise, assume it's a direct purchase of the items in `route.params.cartData`.

      const isCartPurchase = !!(vendorId && cart);

      let checkoutPayload = {
        ...addressData,
        label: addressData.label || 'Home',
        customerName: `${currentUser?.name?.firstName || ''} ${currentUser?.name?.lastName || ''}`.trim(),
        customerEmail: currentUser?.email || '',
        customerPhone: currentUser?.contactNumber || currentUser?.phone || currentUser?.mobile || '',
        vendorId: vendorId,
        // Optional fields from original req
        estimatedDeliveryTime: cartData?.estimatedDeliveryTime || formatMinutesToUX("25-35 min"),
        discount: 0, // Placeholder
        nif: nifValue || currentUser?.NIF || '',
        NIF: nifValue || currentUser?.NIF || ''
      };

      if (isCartPurchase) {
        // CART PURCHASE
        // User requested to use "useCart: true" to leverage backend cart state
        checkoutPayload.useCart = true;

        // Note: When useCart is true, we should NOT send items array manually
        // The backend will pull items from the user's active cart

        // Construct items payload explicitly from context cart
        /*
        let calculatedSubtotal = 0;
      
        const itemsPayload = Object.keys(cart.items || {}).map(key => {
          const it = cart.items[key];
          const rawId = it.product?.id || it.product?._id || it.productId || key;
      
          // Calculate item subtotal for payload
          const price = Number(it.product?.price || it.price || 0);
          const qty = Number(it.quantity || 1);
          const addonsCost = (it.addons || []).reduce((s, a) => s + Number(a.price || 0), 0);
          const itemTotal = (price + addonsCost) * qty;
          calculatedSubtotal += itemTotal;
      
          return {
            productId: (rawId && rawId.includes('|')) ? rawId.split('|')[0] : rawId,
            product: (rawId && rawId.includes('|')) ? rawId.split('|')[0] : rawId, // Backend might expect 'product'
            id: (rawId && rawId.includes('|')) ? rawId.split('|')[0] : rawId,      // Backend might expect 'id'
            quantity: qty,
            offerCode: appliedOffer?.code,
            addons: it.addons,
            options: it.options,
            variantName: it.variantName || it.selectedVariation,
            price: price,
            itemTotal: itemTotal
          };
        });
        checkoutPayload.items = itemsPayload;
        checkoutPayload.cartItems = itemsPayload; // Backend alias?
        checkoutPayload.products = itemsPayload;  // Backend alias?
        checkoutPayload.orderItems = itemsPayload;// Backend alias?
      
        // SHOTGUN STRATEGY: Send all possible naming conventions to satisfy backend validation
        checkoutPayload.subtotal = calculatedSubtotal;
        checkoutPayload.subTotal = calculatedSubtotal;
        checkoutPayload.total = calculatedSubtotal;
        checkoutPayload.totalPrice = calculatedSubtotal;
        checkoutPayload.cartTotal = calculatedSubtotal;
        checkoutPayload.amount = calculatedSubtotal;
        */

      } else {
        // DIRECT PURCHASE (Buy Now / Reorder / etc)
        // Extract items from cartData params
        let calculatedSubtotal = 0;

        const directItems = (cartData?.items || []).map(it => {
          const rawId = it.productId || it.product?.id || it.product?._id || it.id || it._id;

          const price = Number(it.price || it.product?.price || 0);
          const qty = Number(it.quantity || 1);
          const itemTotal = price * qty;
          calculatedSubtotal += itemTotal;

          return {
            productId: (rawId && rawId.includes('|')) ? rawId.split('|')[0] : rawId, // Ensure productId is set and clean
            product: (rawId && rawId.includes('|')) ? rawId.split('|')[0] : rawId,   // Alias
            id: (rawId && rawId.includes('|')) ? rawId.split('|')[0] : rawId,        // Alias
            quantity: qty,
            offerCode: appliedOffer?.code, // Inject offerCode
            price: price,
            itemTotal: itemTotal
          };
        });
        checkoutPayload.items = directItems;
        checkoutPayload.cartItems = directItems; // Alias
        checkoutPayload.products = directItems;  // Alias
        checkoutPayload.orderItems = directItems;// Alias

        checkoutPayload.subtotal = calculatedSubtotal;
        checkoutPayload.subTotal = calculatedSubtotal;
        checkoutPayload.total = calculatedSubtotal;
        checkoutPayload.totalPrice = calculatedSubtotal;
        // Don't send useCart
      }

      console.log('[CheckoutScreen] Layout Dump:', JSON.stringify(checkoutPayload));

      // Fix: Ensure we send the robust deliveryAddress object if we don't have an ID
      // Fix: ALWAYS Construct proper nested object for backend validation
      // Even if we have an ID, the validator might be looking for deliveryAddress.street
      // Remove root fields that might confuse backend validation if it sees both
      // Note: Backend validation requires these fields at the root level.
      // Do not delete them.
      // delete checkoutPayload.street;
      // delete checkoutPayload.address;
      // delete checkoutPayload.city;
      // delete checkoutPayload.state;
      // delete checkoutPayload.country;
      // delete checkoutPayload.postalCode;
      // delete checkoutPayload.zipCode;

      checkoutPayload.deliveryAddress = {
        street: addressData.street,
        city: addressData.city,
        state: addressData.state,
        country: addressData.country,
        postalCode: addressData.postalCode,
        latitude: addressData.latitude,
        longitude: addressData.longitude,
        detailedAddress: addressData.detailedAddress,
        addressType: (addressData.label === 'Work' ? 'OFFICE' : addressData.label === 'Other' ? 'OTHER' : 'HOME').toUpperCase(),
        isActive: true
      };

      if (backendAddressId) {
        checkoutPayload.deliveryAddressId = backendAddressId;
        checkoutPayload.addressId = backendAddressId;
        // Do NOT overwrite deliveryAddress with the ID string, keep it as object
      }

      let attempts = 0;
      let maxAttempts = 3;
      let success = false;
      let delay = 1000;

      while (attempts < maxAttempts && !success && !canceled) {
        attempts++;
        try {
          console.debug(`[CheckoutScreen] Creating checkout (Attempt ${attempts}/${maxAttempts})...`);

          if (!backendAddressId) {
            console.warn('[CheckoutScreen] Sending NEW Address payload:', JSON.stringify(checkoutPayload.deliveryAddress));
          }

          const res = await CheckoutAPI.createCheckout(checkoutPayload);

          if (res.success || (res.data && res.data.success)) {
            const checkoutData = res.data?.data || res.data || res;
            console.debug('[CheckoutScreen] Checkout created successfully, ID:', extractCheckoutSummaryId(checkoutData));
            setCheckoutResponse(checkoutData);
            success = true;
          } else {
            // Handle logical errors (non-throwing)
            console.warn('[CheckoutScreen] Checkout creation failed:', res.error);
            // If the API returns 429 in the body/error, we might need to handle it here too, 
            // but usually axios throws for 4xx/5xx.
            // Assuming res.error is a string message.
            setStripeError(res.error || 'Failed to initialize checkout');
            break; // Don't retry logical errors (e.g. invalid data)
          }
        } catch (err) {
          // Check for 429 Rate Limit
          if (err.response && (err.response.status === 429 || err.status === 429)) {
            console.warn(`[CheckoutScreen] 429 Too Many Requests. Retrying in ${delay}ms...`);
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2; // Exponential backoff
              continue; // Retry
            } else {
              setStripeError(t('serverBusy') || 'Server is busy. Please try again later.');
            }
          } else {
            // Other errors
            console.error('[CheckoutScreen] createCheckout error:', err);
            setStripeError('An error occurred while initializing checkout. Please try again.');
          }
          break; // Break loop for non-retriable errors
        }
      }

      if (!canceled) {
        setInitializingCheckout(false);
      }
    };

    createCheckoutOnEnter();

    return () => {
      canceled = true;
    };
  }, [address, detailedAddress, city, postalCode, appliedOffer, nifSkipped]);

  // Calculate real cart values with ProductsContext enrichment
  const cartItems = cart?.items ? Object.keys(cart.items).map(id => {
    let p = cart.items[id].product;

    // Enrich product data from ProductsContext (same logic as CartDetail)
    let contextProduct = null;
    if (products && products.length > 0) {
      const rawId = p.id || p._id || p.productId || id;
      if (rawId) {
        contextProduct = products.find(prod =>
          prod.id === rawId ||
          prod._id === rawId ||
          prod._raw?._id === rawId ||
          prod._raw?.productId === rawId ||
          prod._raw?.id === rawId ||
          (prod._raw && (prod._raw.productId === rawId || prod._raw.id === rawId))
        );
      }

      // Debug logging
      if (!contextProduct && rawId) {
        console.debug('[CheckoutScreen] Product lookup failed for ID:', rawId);
      } else if (contextProduct) {
        console.debug('[CheckoutScreen] Product matched:', contextProduct.name, 'for ID:', rawId);
      }
    }

    // Merge: Prefer Context data for static fields (image, name) AND pricing if cart data is incomplete
    if (contextProduct) {
      p = {
        ...p,
        image: contextProduct.image || p.image,
        name: contextProduct.name || p.name,
        _raw: {
          ...(contextProduct._raw || {}),
          ...(p._raw || {}),
          // Merge pricing: use context pricing if cart pricing is missing
          pricing: {
            ...(contextProduct._raw?.pricing || {}),
            ...(p._raw?.pricing || {}),
            ...(p.pricing || {})
          }
        }
      };
    }

    const rawPricing = p?._raw?.pricing || p?.pricing || null;
    const basePrice = Number((rawPricing && rawPricing.price) ?? p.price ?? 0) || 0;
    const discountRaw = rawPricing?.discount;
    const taxRaw = rawPricing?.tax;
    const discountPercent = (discountRaw != null && !isNaN(Number(discountRaw))) ? (Number(discountRaw) <= 1 ? Number(discountRaw) * 100 : Number(discountRaw)) : 0;
    const taxPercent = (taxRaw != null && !isNaN(Number(taxRaw))) ? (Number(taxRaw) <= 1 ? Number(taxRaw) * 100 : Number(taxRaw)) : (Number(cart?.vendorMeta?.taxRate ?? 0) * 100);
    const finalUnitFromPricing = rawPricing && rawPricing.finalPrice != null ? Number(rawPricing.finalPrice) : null;
    const computedFinalUnit = basePrice * (1 - (discountPercent / 100)) * (1 + (taxPercent / 100));
    const finalUnitPrice = Number.isFinite(finalUnitFromPricing) ? finalUnitFromPricing : computedFinalUnit;

    return ({
      id,
      name: p?.name,
      price: basePrice,
      finalPrice: finalUnitPrice,
      // Pass backend totals if available
      subtotal: cart.items[id].subtotal,
      totalPrice: cart.items[id].totalPrice,
      discountPercent,
      taxPercent,
      quantity: cart.items[id].quantity,
      image: p?.image,
      image: p?.image,
      currency: (rawPricing && rawPricing.currency) || p?.currency,
      // Pass through customization data from cart item
      addons: cart.items[id].addons || [],
      variantName: cart.items[id].variantName || '',
      options: cart.items[id].options || {},
    });
  }) : (cartData?.items || []);

  const currency = cartItems.length > 0 ? (cartItems[0].currency || 'EUR') : 'EUR';
  // Compute item-level subtotal (after item discounts, before tax) and tax
  const itemsSubtotal = cartItems.reduce((sum, it) => {
    const addonsTotal = (it.addons || []).reduce((s, ad) => s + Number(ad.price || 0), 0);
    // FIX: Discount applies only to base price
    const unitDiscount = (it.price || 0) * ((it.discountPercent || 0) / 100);
    const unitDiscountedBase = (it.price || 0) - unitDiscount;
    const unitTaxable = unitDiscountedBase + addonsTotal;
    return sum + unitTaxable * (it.quantity || 0);
  }, 0);
  const itemsTax = cartItems.reduce((sum, it) => {
    const unitDiscount = (it.price || 0) * ((it.discountPercent || 0) / 100);
    const unitTaxable = (it.price || 0) - unitDiscount;
    const unitTax = unitTaxable * ((it.taxPercent || 0) / 100);
    return sum + unitTax * (it.quantity || 0);
  }, 0);

  // Calculate display subtotal using finalPrice (price after tax and discount)
  // MOVED UP to be available for logs
  const displaySubtotal = cartItems.reduce((sum, it) => {
    // Match CartDetail logic: Addons are flat cost per line item
    const addonsCost = (it.addons || []).reduce((aSum, a) => aSum + (Number(a.price || 0) * Number(a.quantity || 1)), 0);
    const itemTotal = (it.finalPrice || it.price || 0) * (it.quantity || 0);
    return sum + itemTotal + addonsCost;
  }, 0);

  // Extract values from server response FIRST so they are available for valid calculation
  const serverData = checkoutResponse?.data || checkoutResponse || {};
  const serverTotal = serverData.payoutSummary?.grandTotal ?? serverData.subtotal ?? serverData.total ?? serverData.totalAmount ?? serverData.subTotal; // Fallback to grandTotal first

  // Try to find explicit delivery fee
  const serverDeliveryFee = serverData.deliveryCharge ?? serverData.deliveryFee ?? serverData.delivery_fee ?? null;

  // Fees and promo discount
  // Extract discount from server main object or data object
  let discount = serverData?.offerDiscount || serverData?.discount || serverData?.discountAmount || cart?.appliedPromo?.discount || cartData?.discount || 0;

  console.debug('[CheckoutScreen] Discount Calculation:', {
    serverDiscount: discount,
    serverDataTotal: serverTotal,
    itemsSubtotal: displaySubtotal,
    appliedOffer: appliedOffer ? { code: appliedOffer.code, type: appliedOffer.type, value: appliedOffer.value, discountAmount: appliedOffer.discountAmount } : 'null'
  });

  // Fallback: Calculate local discount if server didn't return it but we have an applied offer
  if ((!discount || discount === 0) && appliedOffer) {
    if (appliedOffer.discountType === 'PERCENTAGE' || appliedOffer.type === 'PERCENTAGE') {
      const pct = Number(appliedOffer.discountAmount || appliedOffer.value || 0);
      // Calculate against displaySubtotal (or baseSubtotal)
      discount = (displaySubtotal * pct) / 100;
      // Check max discount
      if (appliedOffer.maxDiscountAmount && discount > appliedOffer.maxDiscountAmount) {
        discount = appliedOffer.maxDiscountAmount;
      }
    } else if (appliedOffer.discountType === 'FIXED' || appliedOffer.type === 'FIXED') {
      discount = Number(appliedOffer.discountAmount || appliedOffer.value || 0);
    }
  }

  // Build baseSubtotal/discountTotal/taxAmount/total to match CartDetail
  const baseSubtotal = cartItems.reduce((sum, it) => {
    const addonsTotal = (it.addons || []).reduce((s, ad) => s + Number(ad.price || 0), 0);
    return sum + ((it.price || 0) + addonsTotal) * (it.quantity || 0);
  }, 0);
  const discountTotal = discount; // Use the calculated/server discount as total discount

  /* 
   * Previous logic was calculating line-item discounts from product.discountPercent.
   * IF we want to show Coupon Discount separately, we should distinguish item-discounts from order-discounts.
   * For now, we overwrite discountTotal with the Order Level discount if present.
   */
  const subtotalAfterDiscount = baseSubtotal - discountTotal;
  const taxAmount = cartItems.reduce((sum, it) => {
    const unitDiscount = (it.price || 0) * ((it.discountPercent || 0) / 100);
    const unitTaxable = (it.price || 0) - unitDiscount;
    const unitTax = unitTaxable * ((it.taxPercent || 0) / 100);
    return sum + unitTax * (it.quantity || 0);
  }, 0);
  const total = subtotalAfterDiscount + taxAmount;

  // Debug: Log checkoutResponse to verify it's being populated
  console.debug('[CheckoutScreen] Render - checkoutResponse:', checkoutResponse, 'local total:', total);

  // Use server's total if available, else local
  const displayTotal = serverTotal ?? total;

  // Calculate delivery fee: Explicit -> Diff -> CartData -> 0
  let finalDeliveryFee = 0;

  if (serverDeliveryFee !== null && serverDeliveryFee !== undefined) {
    finalDeliveryFee = Number(serverDeliveryFee);
  } else if (serverTotal) {
    // Determine fee from total diff (User confirmed distance-based)
    const diff = Number(serverTotal) - displaySubtotal;
    // Only clamp negative
    finalDeliveryFee = diff > 0 ? diff : 0;
  } else {
    finalDeliveryFee = cartData?.deliveryFee || 0;
  }

  // Ensure non-negative
  if (finalDeliveryFee < 0) finalDeliveryFee = 0;

  // Set initial notes from cart delivery instructions
  useEffect(() => {
    if (cart?.deliveryInstructions) {
      setNotes(cart.deliveryInstructions);
    }
  }, [cart?.deliveryInstructions]);

  const paymentMethods = [
    {
      id: 'CARD',
      name: t('creditDebitCard'),
      icon: 'credit-card-outline',
      badge: t('recommended'),
    },
    {
      id: 'MB_WAY',
      name: 'MB WAY',
      icon: 'cellphone-nfc'
    },
    {
      id: 'APPLE_PAY',
      name: 'Apple Pay',
      icon: 'apple'
    },
    {
      id: 'OTHER',
      name: t('otherMethods') || 'Other Methods',
      icon: 'dots-horizontal-circle-outline',
    },
  ];

  // Helper: robustly extract checkoutSummaryId from various backend response shapes
  const extractCheckoutSummaryId = (checkoutResponse) => {
    if (!checkoutResponse || typeof checkoutResponse !== 'object') return null;
    const candidatePaths = [
      // Priority 1: Specific checkout summary ID keys
      ['checkoutSummaryId'],
      ['CheckoutSummaryId'],
      ['data', 'checkoutSummaryId'],
      ['data', 'CheckoutSummaryId'],
      ['checkout_summary_id'],
      ['data', 'checkout_summary_id'],
      // Priority 2: Nested summary objects
      ['data', 'checkoutSummary', '_id'],
      ['checkoutSummary', '_id'],
      // Priority 3: Fallback generic IDs (Low priority as they might be MongoDB IDs)
      ['data', '_id'],
      ['_id'],
    ];
    for (const path of candidatePaths) {
      let cur = checkoutResponse;
      let ok = true;
      for (const segment of path) {
        if (cur && Object.prototype.hasOwnProperty.call(cur, segment)) {
          cur = cur[segment];
        } else { ok = false; break; }
      }
      // Allow strings and numbers
      if (ok && (typeof cur === 'string' || typeof cur === 'number')) return String(cur);
    }
    // Try case-insensitive scan of top-level keys
    for (const k of Object.keys(checkoutResponse)) {
      if (/checkoutsummaryid/i.test(k)) return checkoutResponse[k];
      const v = checkoutResponse[k];
      if (v && typeof v === 'object') {
        for (const vk of Object.keys(v)) {
          if (/checkoutsummaryid/i.test(vk)) return v[vk];
        }
      }
    }
    return null;
  };

  useEffect(() => {
    // Reduniq does not require initialization on the client side like Stripe.
    // We just wait for the user to click "Place Order".
  }, [checkoutResponse, total]);

  const handlePlaceOrder = async () => {
    const checkoutSummaryId = extractCheckoutSummaryId(checkoutResponse);

    if (!checkoutSummaryId) {
      setStripeError('Checkout session expired. Please try again.');
      return;
    }

    setIsProcessing(true);

    // Step 1: Create Reduniq Payment Intent
    // using selected payment mapping or fallback to CARD
    const validPaymentMethods = ['CARD', 'MB_WAY', 'APPLE_PAY', 'OTHER'];
    let paymentMethod = validPaymentMethods.includes(selectedPayment) ? selectedPayment : 'CARD';

    const config = API_CONFIG;
    const returnUrlOk = `${config.frontend_urls.frontend_url_test_payment}/payment-success?token={token}&summaryId=${checkoutSummaryId}`;
    const returnUrlError = `${config.frontend_urls.frontend_url_test_payment}/payment-failed?summaryId=${checkoutSummaryId}`;

    console.debug('[CheckoutScreen] Creating Reduniq payment intent with:', {
      checkoutSummaryId,
      paymentMethod,
      returnUrlOk,
      returnUrlError
    });

    const payRes = await CheckoutAPI.createReduniqPaymentIntent(
      checkoutSummaryId,
      paymentMethod,
      returnUrlOk,
      returnUrlError
    );

    if (!payRes.success) {
      setIsProcessing(false);
      setStripeError(payRes.error || 'Payment initiation failed. Please try again.');
      return;
    }

    const responseData = payRes.data?.data || payRes.data;
    const redirectUrl = responseData?.redirectUrl;

    if (!redirectUrl) {
      console.error('[CheckoutScreen] Reduniq response missing redirectUrl:', responseData);
      setIsProcessing(false);
      setStripeError('Payment gateway did not provide a redirect URL.');
      return;
    }

    // Step 2: Open the payment page in an in-app WebView
    setPaymentUrl(redirectUrl);
    setIsProcessing(false);
  };

  const handlePaymentSuccess = async (url) => {
    console.log('[CheckoutScreen] Processing Success. URL:', url);

    // Set loading state while converting checkout to order
    setIsProcessing(true);
    setPaymentUrl(null);

    let checkoutSummaryId = extractCheckoutSummaryId(checkoutResponse);
    let paymentToken = 'REDUNIQ_SUCCESS';

    // Parse parameters from URL if available
    if (url && url.includes('?')) {
      try {
        const queryString = url.split('?')[1];
        const pairs = queryString.split('&');
        const params = {};
        pairs.forEach(p => {
          const [k, v] = p.split('=');
          params[k] = decodeURIComponent(v || '');
        });

        if (params.summaryId) checkoutSummaryId = params.summaryId;

        // Robust token extraction
        // 1. Direct 'token' parameter
        if (params.token && params.token !== '{token}') {
          paymentToken = params.token;
        }
        // 2. Fallback: Scan URL for anything that looks like a token if 'token' param is placeholder
        else {
          const tokenMatch = url.match(/token=([a-zA-Z0-9_-]+)/);
          if (tokenMatch && tokenMatch[1] !== '{token}') {
            paymentToken = tokenMatch[1];
          }
        }
      } catch (e) {
        console.warn('[CheckoutScreen] Failed to parse success URL params:', e);
      }
    }

    console.log('[CheckoutScreen] Delaying order confirmation to ensure gateway sync...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('[CheckoutScreen] Confirming order with backend:', { checkoutSummaryId, paymentToken });

    // Step 3: Convert Checkout to real Order
    const orderRes = await OrderAPI.createOrder(checkoutSummaryId, paymentToken);

    setIsProcessing(false);

    if (orderRes.success) {
      setShowSuccessModal(true);

      const targetVendorId = vendorId || (cartsArray && cartsArray.length > 0 ? cartsArray[0].vendorId : null);
      if (targetVendorId) {
        clearVendorCartAndSync(targetVendorId).catch(err => {
          console.warn('[CheckoutScreen] Failed to clear cart after order:', err);
        });
      }

      setTimeout(() => {
        setShowSuccessModal(false);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main', params: { screen: 'Orders' } }]
        });
      }, 4000);
    } else {
      console.error('[CheckoutScreen] Failed to convert checkout to order:', orderRes.error);
      setStripeError(orderRes.error || 'Payment was successful, but we failed to create your order. Please contact support.');
      setShowFailureModal(true);
    }
  };

  const handlePaymentFailure = (urlOrMsg) => {
    let displayError = t('paymentFailedDescription') || 'Something went wrong with your transaction. Please try again.';
    let errorCode = 'UNKNOWN';

    console.log('[CheckoutScreen] Processing Failure. Input:', urlOrMsg);

    if (typeof urlOrMsg === 'string' && urlOrMsg.includes('?')) {
      try {
        const queryString = urlOrMsg.split('?')[1];
        const pairs = queryString.split('&');
        const params = {};
        pairs.forEach(p => {
          const [k, v] = p.split('=');
          params[k] = decodeURIComponent(v || '');
        });

        // Reduniq often sends 'message', 'errorMessage', 'reasonCode', or 'ResponseCode'
        const reason = params.message || params.reason || params.error || params.errorMessage || params.status;
        errorCode = params.errorCode || params.ResponseCode || params.status || 'FAIL';

        if (reason) {
          displayError = `${reason} (Code: ${errorCode})`;
        } else if (errorCode !== 'UNKNOWN') {
          displayError = `Payment refused by provider. Code: ${errorCode}`;
        }
      } catch (e) {
        console.warn('[CheckoutScreen] Failed to parse failure URL details:', e);
      }
    } else if (typeof urlOrMsg === 'string' && urlOrMsg.length > 0 && !urlOrMsg.startsWith('http')) {
      displayError = urlOrMsg;
    }

    console.error(`[CheckoutScreen] 🚨 PAYMENT FAILED 🚨\nURL/Msg: ${urlOrMsg}\nExtracted Error: ${displayError}`);

    setPaymentUrl(null);
    setIsProcessing(false);
    setStripeError(displayError);
    setShowFailureModal(true);
  };

  const handlePaymentNavigationChange = (navState) => {
    if (!navState.url) return;
    const url = navState.url;

    console.debug('[CheckoutScreen] WebView Navigation:', url);

    if (url.includes('payment-success')) {
      handlePaymentSuccess(url);
    } else if (url.includes('payment-failed')) {
      handlePaymentFailure(url);
    }
  };

  const handleCancelPayment = () => {
    setShowCancelModal(true);
  };

  const renderSuccessModal = () => (
    <Modal visible={showSuccessModal} transparent animationType="slide">
      <View style={styles(colors).modalOverlay}>
        <View style={[styles(colors).successModal, { paddingBottom: 40 }]}>
          <View style={styles(colors).successIconContainer}>
            <View style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: '#E8F5E9',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 10
            }}>
              <Ionicons name="checkmark-done-circle" size={80} color={colors.success} />
            </View>
          </View>
          <Text style={styles(colors).successTitle}>{t('orderPlacedSuccessfully') === 'orderPlacedSuccessfully' ? 'Order Placed!' : t('orderPlacedSuccessfully')}</Text>
          <Text style={styles(colors).successMessage}>
            {t('paymentConfirmedInfo') === 'paymentConfirmedInfo' ? 'Your payment was successful. We are now preparing your order.' : t('paymentConfirmedInfo')}
          </Text>
          <View style={[styles(colors).successDetails, { backgroundColor: colors.background, padding: 16, borderRadius: 16, width: '100%', marginBottom: 24 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontFamily: 'Poppins-Regular', color: colors.text.secondary }}>{t('amountPaid') || 'Amount Paid'}</Text>
              <Text style={{ fontFamily: 'Poppins-Bold', color: colors.text.primary }}>{formatCurrency(currency, displayTotal)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: 'Poppins-Regular', color: colors.text.secondary }}>{t('estimatedDelivery') || 'Delivery Time'}</Text>
              <Text style={{ fontFamily: 'Poppins-Bold', color: colors.primary }}>25-35 {t('min')}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 16,
              paddingHorizontal: 40,
              borderRadius: 30,
              elevation: 4,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              width: '100%',
              alignItems: 'center'
            }}
            onPress={() => {
              setShowSuccessModal(false);
              navigation.reset({
                index: 0,
                routes: [{ name: 'Main', params: { screen: 'Orders' } }]
              });
            }}
          >
            <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 16 }}>
              {t('viewOrderDetails') || 'View Order'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderFailureModal = () => (
    <Modal visible={showFailureModal} transparent animationType="fade">
      <View style={styles(colors).modalOverlay}>
        <View style={styles(colors).successModal}>
          <View style={{
            width: 90,
            height: 90,
            borderRadius: 45,
            backgroundColor: '#FFEBEE',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20
          }}>
            <Ionicons name="close-circle" size={70} color="#F44336" />
          </View>
          <Text style={[styles(colors).successTitle, { color: '#D32F2F' }]}>{t('paymentFailed') === 'paymentFailed' ? 'Payment Failed' : t('paymentFailed')}</Text>
          <Text style={styles(colors).successMessage}>
            {stripeError === 'paymentFailedDescription' ? 'Something went wrong with your transaction. Please try again.' : stripeError}
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: '#D32F2F',
              paddingVertical: 14,
              paddingHorizontal: 32,
              borderRadius: 30,
              minWidth: 200,
              alignItems: 'center'
            }}
            onPress={() => setShowFailureModal(false)}
          >
            <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 16 }}>
              {t('tryAgain') || 'Try Again'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderProcessingModal = () => (
    <Modal visible={isProcessing} transparent animationType="fade">
      <View style={styles(colors).modalOverlay}>
        <View style={styles(colors).processingModal}>
          <ActivityIndicator size="large" color={colors.primary} style={styles(colors).loadingSpinner} />
          <Text style={styles(colors).processingText}>{t('processing')}</Text>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles(colors).container} edges={['bottom', 'left', 'right']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
        animated={true}
      />

      {/* Header */}
      <View style={[styles(colors).headerContainer]}>
        <LinearGradient
          colors={isDarkMode ? ['#1A0A15', '#1A0A15'] : ['#FFF5F8', '#FFE8F0']}
          style={[styles(colors).headerGradient, { paddingTop: insets.top + 16 }]}
        >
          <TouchableOpacity
            style={styles(colors).backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <View style={styles(colors).headerCenter}>
            <Text style={styles(colors).headerTitle} numberOfLines={1}>{cart?.vendorName || cartData?.vendorName || t('checkout')}</Text>
            <Text
              style={styles(colors).headerSubtitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {cartItems.length} {cartItems.length === 1 ? t('item') : t('items')} • {t('estimated')} {cartData?.estimatedDeliveryTime || formatMinutesToUX("25-35 min")}
            </Text>
          </View>
          <View style={styles(colors).headerRight} />
        </LinearGradient>
      </View>

      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContent}
      >
        {/* Delivery Time Banner */}
        <View style={styles(colors).deliveryTimeBanner}>
          <View style={styles(colors).deliveryTimeIcon}>
            <MaterialCommunityIcons name="timer-sand" size={28} color={colors.primary} />
          </View>
          <View style={styles(colors).deliveryTimeContent}>
            <Text style={styles(colors).deliveryTimeLabel}>{t('deliveryTime')}</Text>
            <Text
              style={styles(colors).deliveryTimeValue}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {cartData?.estimatedDeliveryTime || formatMinutesToUX("25-35 min")}
            </Text>
          </View>
          <View style={styles(colors).deliveryTimeBadge}>
            <Ionicons name="flash" size={14} color="#FFA000" />
            <Text style={styles(colors).deliveryTimeBadgeText}>{t('fast')}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles(colors).section}>
          <View style={styles(colors).sectionHeader}>
            <Text style={styles(colors).sectionTitle}>{t('deliveryTo')}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SavedAddresses', {
                onSelect: (selectedAddr) => {
                  // Map API address to LocationContext format
                  const locAddr = {
                    address: selectedAddr.street || selectedAddr.address,
                    detailedAddress: selectedAddr.detailedAddress || '',
                    city: selectedAddr.city,
                    postalCode: selectedAddr.postalCode,
                    state: selectedAddr.state,
                    country: selectedAddr.country,
                    coordinates: {
                      latitude: selectedAddr.latitude,
                      longitude: selectedAddr.longitude
                    },
                    label: selectedAddr.addressType === 'OFFICE' ? 'Work' : selectedAddr.addressType === 'OTHER' ? 'Other' : 'Home'
                  };
                  selectAddress(locAddr);
                },
                selectedId: user?.deliveryAddresses?.find(a =>
                  (a.latitude === currentLocation?.latitude && a.longitude === currentLocation?.longitude) ||
                  (a.street === address || a.address === address)
                )?._id
              })}
            >
              <Text style={styles(colors).changeButton}>{t('change')}</Text>
            </TouchableOpacity>
          </View>
          <ConsumerLocationDisplay colors={colors} t={t} />
        </View>

        {/* Delivery Instructions */}
        {notes && (
          <View style={styles(colors).instructionsContainer}>
            <View style={styles(colors).instructionsBadge}>
              <Ionicons name="alert-circle" size={16} color="#0288D1" />
              <Text style={styles(colors).instructionsText}>{notes}</Text>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles(colors).section}>
          <View style={styles(colors).sectionHeader}>
            <View style={styles(colors).sectionTitleRow}>
              <Text style={styles(colors).sectionTitle}>{t('yourOrder')}</Text>
            </View>
            <Text style={styles(colors).itemCount}>{cartItems.length} {t('items')}</Text>
          </View>
          <View style={styles(colors).orderItemsContainer}>
            {cartItems.map((item, index) => {
              // Priority: Backend GrandTotal > Backend Subtotal > Calculated Subtotal
              const serverItem = (checkoutResponse?.items || []).find(
                si => String(si.productId?._id || si.productId) === String(item.product?._id || item.product || item.id || item.productId)
                  && (!item.variationSku || si.variationSku === item.variationSku)
              );

              const itemTotal = (serverItem?.itemSummary?.grandTotal !== undefined && serverItem?.itemSummary?.grandTotal !== null)
                ? Number(serverItem.itemSummary.grandTotal)
                : (item.subtotal !== undefined && item.subtotal !== null)
                  ? Number(item.subtotal)
                  : ((item.finalPrice || item.price || 0) + (item.addons || []).reduce((s, ad) => s + Number(ad.price || 0), 0)) * item.quantity;

              console.debug(`[CheckoutScreen] Item Match for ${item.name}: serverItemFound=${!!serverItem}, serverItemTotal=${serverItem?.itemSummary?.grandTotal}, itemSubtotal=${item.subtotal}, finalItemTotal=${itemTotal}`);

              // Back-calculate unit price for display consistency
              // If backend gives total 25.3 for qty 3, unit is ~8.43
              const unitPrice = item.quantity > 0 ? (itemTotal / item.quantity) : 0;

              return (
                <View key={item.id || index} style={styles(colors).orderItemRow}>
                  <View style={styles(colors).orderItemLeft}>
                    <View style={{ backgroundColor: isDarkMode ? 'rgba(220,49,115,0.15)' : 'rgba(220,49,115,0.08)', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 }}>
                      <Text style={{ fontSize: 13, fontFamily: 'Poppins-Bold', color: colors.primary }}>{item.quantity}x</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles(colors).itemNameText} numberOfLines={2}>
                        {item.name}
                      </Text>
                      {/* Unit price (Base + Addons) */}
                      <Text style={{ fontSize: 12, fontFamily: 'Poppins-Regular', color: colors.text.secondary, marginTop: 4 }}>
                        {formatCurrency(currency, unitPrice)} {t('each')}
                      </Text>

                      {/* Variations & Add-ons */}
                      {(item.variantName && item.variantName !== 'Standard') && (
                        <Text style={{ fontSize: 12, color: colors.text.secondary, marginTop: 2 }}>
                          {item.variantName}
                        </Text>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <View style={{ marginTop: 4 }}>
                          {item.addons.map((addon, aIdx) => (
                            <Text key={aIdx} style={{ fontSize: 12, color: colors.text.secondary }}>
                              + {addon.name}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                  {/* Line total */}
                  <Text style={styles(colors).itemPriceText}>
                    {formatCurrency(currency, itemTotal)}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Voucher / Promo Code */}
        <View style={styles(colors).section}>
          <TouchableOpacity
            style={styles(colors).voucherButton}
            onPress={() => {
              const checkoutSummaryId = extractCheckoutSummaryId(checkoutResponse);
              navigation.navigate('Vouchers', {
                selectionMode: true,
                vendorId: vendorId,
                checkoutId: checkoutSummaryId,
                currentTotal: displayTotal,
                onSelect: async (coupon, manualResult) => {
                  // Handle both list selection (coupon) and manual verification result (manualResult)
                  const selectedOffer = coupon || manualResult;

                  if (selectedOffer && selectedOffer.code) {
                    console.debug('[CheckoutScreen] Voucher selected:', selectedOffer.code, 'AutoApply:', selectedOffer.autoApply);

                    // Extract Checkout ID
                    const checkoutSummaryId = extractCheckoutSummaryId(checkoutResponse);
                    if (!checkoutSummaryId) {
                      setStripeError(t('checkoutNotReady') === 'checkoutNotReady' ? 'Checkout session not ready. Please wait.' : t('checkoutNotReady'));
                      return;
                    }

                    // User Request Fix: Always valid to send ID if we have it?
                    // Previous rule was confusing. Now prioritizing ID if available, else Code.
                    // For "test20" (AutoApply=false), user explicitly wanted ID.
                    let offerIdentifier = selectedOffer.id || selectedOffer._id || selectedOffer.code;

                    // Validate via API
                    try {
                      setIsProcessing(true);
                      const res = await CheckoutAPI.validateApplyOffer({
                        checkoutId: checkoutSummaryId,
                        offerIdentifier: offerIdentifier
                      });

                      if (res.success) {
                        console.debug('[CheckoutScreen] Offer validation FULL response:', JSON.stringify(res, null, 2));
                        setAppliedPromo(selectedOffer);
                        // Refresh checkout data if returned
                        if (res.data && res.data.data) {
                          setCheckoutResponse(res.data.data);
                        }
                        setStripeError(null);
                      } else {
                        console.warn('[CheckoutScreen] Offer validation failed:', res.error);
                        setStripeError(res.error || 'Failed to apply voucher');
                        setAppliedPromo(null);
                      }
                    } catch (err) {
                      console.error('[CheckoutScreen] Offer validation error:', err);
                      setStripeError(t('failedToValidateVoucher') || 'Failed to validate voucher');
                      setAppliedPromo(null);
                    } finally {
                      setIsProcessing(false);
                    }
                  } else {
                    console.warn('[CheckoutScreen] Invalid voucher selection:', selectedOffer);
                    setStripeError('Invalid voucher selected');
                  }
                }
              })
            }}
          >
            <View style={styles(colors).voucherLeft}>
              <View style={styles(colors).voucherIconBadge}>
                <Ionicons name="pricetag" size={20} color={colors.primary} />
              </View>
              <Text style={styles(colors).voucherButtonText}>
                {checkoutResponse?.data?.discount > 0 ? t('voucherApplied') : t('applyVoucher')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Payment Methods */}
        <View style={styles(colors).section}>
          <View style={styles(colors).sectionHeader}>
            <View style={styles(colors).sectionTitleRow}>
              <MaterialCommunityIcons
                name="credit-card-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles(colors).sectionTitle}>{t('paymentMethod')}</Text>
            </View>
          </View>
          <View style={styles(colors).paymentMethodsList}>
            {paymentMethods.map((method) => {
              const isSelected = selectedPayment === method.id;
              return (
                <TouchableOpacity
                  key={method.id}
                  style={isSelected ? styles(colors).methodRowSelected : styles(colors).methodRowUnselected}
                  onPress={() => setSelectedPayment(method.id)}
                  activeOpacity={0.8}
                >
                  {/* Left Icon Layout exactly like image */}
                  <View style={isSelected ? styles(colors).iconCircleSelected : styles(colors).iconCircleUnselected}>
                    <MaterialCommunityIcons
                      name={method.icon}
                      size={22}
                      color={isSelected ? colors.primary : colors.text.secondary}
                    />
                  </View>

                  {/* Name */}
                  <Text style={styles(colors).methodName}>{method.name}</Text>

                  {/* Recommended Badge */}
                  {method.badge && (
                    <View style={styles(colors).badge}>
                      <Text style={styles(colors).badgeText}>{method.badge}</Text>
                    </View>
                  )}

                  {/* Radio Button */}
                  <View style={[styles(colors).radioContainer, isSelected ? styles(colors).radioSelected : styles(colors).radioUnselected]}>
                    {isSelected && <View style={styles(colors).radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Add Notes */}
        <View style={styles(colors).section}>
          <View style={styles(colors).sectionHeader}>
            <View style={styles(colors).sectionTitleRow}>
              <Text style={styles(colors).sectionTitle}>{t('addNote')}</Text>
            </View>
            <Text style={styles(colors).optionalText}>{t('optional')}</Text>
          </View>
          <TextInput
            style={styles(colors).notesInput}
            placeholder={t('specialInstructions')}
            placeholderTextColor={colors.text.light}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Payment Summary - Granular Breakdown */}
        <View style={styles(colors).summarySection}>
          <View style={styles(colors).sectionHeader}>
            <View style={styles(colors).sectionTitleRow}>
              <Text style={styles(colors).sectionTitle}>🧾 {t('paymentSummary') || 'Payment Summary'}</Text>
            </View>
          </View>

          <View style={styles(colors).summaryRows}>
            {/* 1. Items Price (Original) */}
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>{t('itemsPrice') || 'Items Price'}</Text>
              <Text style={styles(colors).summaryValue}>
                {formatCurrency(currency, checkoutResponse?.orderCalculation?.totalOriginalPrice || cart?.totals?.itemsOriginalTotal || 0)}
              </Text>
            </View>

            {/* 2. Product Discount */}
            {(checkoutResponse?.orderCalculation?.totalProductDiscount > 0 || cart?.totals?.discount > 0) && (
              <View style={styles(colors).summaryRow}>
                <Text style={styles(colors).summaryLabel}>{t('productDiscount') || 'Product Discount'}</Text>
                <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#4CAF50' }}>
                  -{formatCurrency(currency, checkoutResponse?.orderCalculation?.totalProductDiscount || cart?.totals?.discount)}
                </Text>
              </View>
            )}

            {/* 3. Subtotal (Net/Excl Tax) */}
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>{t('subtotalExclTax') || 'Subtotal (Excl. Tax)'}</Text>
              <Text style={styles(colors).summaryValue}>
                {formatCurrency(currency, (checkoutResponse?.orderCalculation?.totalOriginalPrice - (checkoutResponse?.orderCalculation?.totalProductDiscount || 0)) || cart?.totals?.totalPrice || 0)}
              </Text>
            </View>

            {/* Spacing */}
            <View style={{ height: 12 }} />

            {/* 4. Tax (Items) */}
            {(checkoutResponse?.orderCalculation?.totalTaxAmount > 0 || cart?.totals?.itemsTax > 0) && (
              <View style={styles(colors).summaryRow}>
                <Text style={styles(colors).summaryLabel}>{t('taxItems') || 'Tax (Items)'}</Text>
                <Text style={styles(colors).summaryValue}>
                  {formatCurrency(currency, checkoutResponse?.orderCalculation?.totalTaxAmount || cart?.totals?.itemsTax || 0)}
                </Text>
              </View>
            )}

            {/* 5. Delivery Fee */}
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>{t('deliveryFee')}</Text>
              <Text style={styles(colors).summaryValue}>
                {formatCurrency(currency, checkoutResponse?.delivery?.charge || checkoutResponse?.deliveryCharge || finalDeliveryFee || 0)}
              </Text>
            </View>

            {/* 6. Delivery VAT */}
            {(checkoutResponse?.delivery?.vatAmount > 0 || checkoutResponse?.deliveryVatAmount > 0) && (
              <View style={styles(colors).summaryRow}>
                <Text style={styles(colors).summaryLabel}>
                  {t('taxDelivery') || 'Delivery VAT'} {checkoutResponse?.delivery?.vatRate ? `(${checkoutResponse.delivery.vatRate}%)` : ''}
                </Text>
                <Text style={styles(colors).summaryValue}>
                  {formatCurrency(currency, checkoutResponse?.delivery?.vatAmount || checkoutResponse?.deliveryVatAmount || 0)}
                </Text>
              </View>
            )}

            {/* ──────────────────────── Divider 1 */}
            <View style={[styles(colors).divider, { marginVertical: 12, backgroundColor: colors.border, opacity: 0.6 }]} />

            {/* 7. Order Total (Before Voucher) */}
            <View style={styles(colors).summaryRow}>
              <Text style={[styles(colors).summaryLabel, { fontFamily: 'Poppins-Bold' }]}>{t('orderTotal') || 'Order Total'}</Text>
              <Text style={[styles(colors).summaryValue, { fontFamily: 'Poppins-Bold' }]}>
                {(() => {
                  const voucherAmt = checkoutResponse?.orderCalculation?.totalOfferDiscount || checkoutResponse?.offerDiscount || 0;
                  const grandTotal = checkoutResponse?.payoutSummary?.grandTotal || 0;
                  // Order total before voucher is simply grandTotal + voucher discount
                  return formatCurrency(currency, grandTotal + voucherAmt);
                })()}
              </Text>
            </View>

            {/* 8. Voucher Applied (If any) */}
            {(checkoutResponse?.orderCalculation?.totalOfferDiscount > 0 || checkoutResponse?.offerDiscount > 0) && (
              <View style={[styles(colors).summaryRow, { marginTop: 8 }]}>
                <Text style={[styles(colors).summaryLabel, { color: '#059669' }]}>{t('voucherApplied') || 'Voucher Applied'}</Text>
                <Text style={{ fontFamily: 'Poppins-Bold', fontSize: 13, color: '#059669' }}>
                  -{formatCurrency(currency, checkoutResponse?.orderCalculation?.totalOfferDiscount || checkoutResponse?.offerDiscount || 0)}
                </Text>
              </View>
            )}

            {/* Optional Fallback Total if No Voucher */}
            {!(checkoutResponse?.orderCalculation?.totalOfferDiscount > 0 || checkoutResponse?.offerDiscount > 0) && (
              <View style={{ marginTop: 12 }}>
                {/* No special final payable needed, already shown as Order Total above or can repeat with emoji */}
              </View>
            )}
          </View>
        </View>

        {/* Payment Error Banner - Industry Grade */}
        {
          !!stripeError && (
            <View style={{
              backgroundColor: '#FEF2F2',
              borderRadius: 16,
              marginHorizontal: spacing.lg,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#FECACA',
              overflow: 'hidden'
            }}>
              <View style={{ flexDirection: 'row', padding: 16 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#FEE2E2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#EF4444" />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontFamily: 'Poppins-Bold', color: '#B91C1C', marginBottom: 4 }}>
                    {t('paymentFailed') === 'paymentFailed' ? 'Payment Failed' : t('paymentFailed')}
                  </Text>
                  <Text style={{ fontSize: 14, fontFamily: 'Poppins-Regular', color: '#7F1D1D', marginBottom: 8, lineHeight: 20 }}>
                    {typeof stripeError === 'string' ? stripeError : t('error')}
                  </Text>

                  {/* User requested specific text: "please abar payment korar try korun" -> "Please try paying again" */}
                  <Text style={{ fontSize: 13, fontFamily: 'Poppins-Medium', color: '#991B1B', marginBottom: 12 }}>
                    {t('pleaseTryPayingAgain') || 'Please try paying again.'}
                  </Text>

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {profileIncomplete ? (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('EditProfile')}
                        style={{ backgroundColor: '#DC2626', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center' }}
                      >
                        <Text style={{ color: '#fff', fontFamily: 'Poppins-Bold', fontSize: 13 }}>{t('completeProfile') || 'Complete Profile'}</Text>
                      </TouchableOpacity>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => navigation.goBack()}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 16,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: '#DC2626'
                          }}
                        >
                          <Text style={{ color: '#DC2626', fontFamily: 'Poppins-SemiBold', fontSize: 13 }}>{t('goBack')}</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )
        }

        {/* Checkout Initializing Banner */}
        {
          initializingCheckout && (
            <View style={{ backgroundColor: '#E3F2FD', padding: 12, borderRadius: 12, marginHorizontal: spacing.lg, marginBottom: 12, borderWidth: 1, borderColor: '#2196F3', flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#1976D2" style={{ marginRight: 8 }} />
              <Text style={{ color: '#1565C0', fontFamily: 'Poppins-Medium', fontSize: 13 }}>{t('preparingCheckout')}</Text>
            </View>
          )
        }
        {/* Place Order Button */}
        <View style={styles(colors).checkoutButtonContainer}>
          <View style={styles(colors).totalBarInline}>
            <Text style={styles(colors).totalBarLabel}>{t('total')}</Text>
            <Text style={styles(colors).totalBarAmount}>{formatCurrency(currency, displayTotal)}</Text>
          </View>
          <TouchableOpacity
            style={{ borderRadius: 18, overflow: 'hidden', opacity: (isProcessing || initializingCheckout) ? 0.7 : 1 }}
            onPress={handlePlaceOrder}
            disabled={isProcessing || initializingCheckout}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#DC3173', '#B51D5C', '#A8154E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: 54,
                paddingHorizontal: 20,
              }}
            >
              {/* Shimmer overlay */}
              <Animated.View
                style={{
                  position: 'absolute', top: 0, bottom: 0, width: 60,
                  transform: [{ translateX: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, Dimensions.get('window').width + 800] }) }],
                }}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0.25)', 'transparent']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>

              {isProcessing || initializingCheckout ? (
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              ) : null}
              <Text style={[styles(colors).placeOrderBtnText, { marginRight: 10, marginBottom: Platform.OS === 'ios' ? 0 : 2 }]}>
                {isProcessing
                  ? t('processing')
                  : initializingCheckout
                    ? t('preparingCheckout')
                    : t('placeOrder')}
              </Text>
              {!isProcessing && !initializingCheckout && (
                <View style={{
                  width: 30,
                  height: 30,
                  backgroundColor: '#fff',
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={colors.primary}
                  />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: Math.max(100, insets.bottom + 40) }} />
      </ScrollView >

      {renderProcessingModal()}
      {renderSuccessModal()}
      {renderFailureModal()}

      <AlertModal
        visible={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title={t('cancelPaymentTitle') || 'Cancel Payment'}
        message={t('cancelPaymentMessage') || 'Are you sure you want to cancel the payment process?'}
        icon="alert-circle"
        buttons={[
          {
            text: t('no') || 'No',
            style: 'cancel',
            onPress: () => setShowCancelModal(false)
          },
          {
            text: t('yes') || 'Yes',
            onPress: () => {
              setPaymentUrl(null);
              setShowCancelModal(false);
            }
          }
        ]}
      />

      {/* Payment WebView Modal */}
      <Modal visible={!!paymentUrl} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCancelPayment}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <TouchableOpacity onPress={handleCancelPayment}>
              <Ionicons name="close" size={28} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontFamily: 'Poppins-SemiBold', marginLeft: 16, color: colors.text.primary }}>
              {t('completePayment') || 'Complete Payment'}
            </Text>
          </View>
          {paymentUrl && (
            <WebView
              source={{ uri: paymentUrl }}
              onNavigationStateChange={handlePaymentNavigationChange}
              onShouldStartLoadWithRequest={(request) => {
                console.log('[CheckoutScreen] WebView Loading Request:', request.url);
                // Intercept redirection before it loads the web page
                if (request.url.includes('payment-success')) {
                  handlePaymentSuccess(request.url);
                  return false;
                }
                if (request.url.includes('payment-failed')) {
                  handlePaymentFailure(request.url);
                  return false;
                }
                return true;
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('[CheckoutScreen] WebView Error:', nativeEvent);
                handlePaymentFailure(`WebView Error: ${nativeEvent.description}`);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('[CheckoutScreen] WebView HTTP Error:', nativeEvent);
                if (nativeEvent.statusCode === 404) {
                  handlePaymentFailure('Payment session expired or invalid (404). Please try again.');
                }
              }}
              startInLoadingState={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              thirdPartyCookiesEnabled={true}
              userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
              originWhitelist={['*']}
              mixedContentMode="always"
              renderLoading={() => <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, position: 'absolute', top: '50%', left: '50%', marginTop: -20, marginLeft: -20 }} />}
              style={{ flex: 1 }}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* NIF Modal */}
      <Modal
        visible={showNifModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleSkipNif}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
            <View style={{
              backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 32,
              paddingBottom: 40,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 10,
            }}>
              {/* Header Icon */}
              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <View style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: isDarkMode ? '#333' : '#F0F9FF',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16
                }}>
                  <Ionicons name="card-outline" size={32} color={colors.primary} />
                </View>
                <Text style={{
                  fontSize: 22,
                  fontFamily: 'Poppins-Bold',
                  color: colors.text.primary,
                  textAlign: 'center',
                  marginBottom: 8
                }}>
                  Add Tax ID (NIF)
                </Text>
                <Text style={{
                  fontSize: 15,
                  fontFamily: 'Poppins-Regular',
                  color: colors.text.secondary,
                  textAlign: 'center',
                  lineHeight: 22,
                  paddingHorizontal: 10
                }}>
                  For invoice purposes, please add your Tax ID (NIF) or skip this step.
                </Text>
              </View>

              {/* Input Field */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{
                  fontSize: 13,
                  fontFamily: 'Poppins-Medium',
                  color: colors.text.secondary,
                  marginBottom: 8,
                  marginLeft: 4
                }}>
                  NIF / Fiscal Number
                </Text>
                <TextInput
                  style={{
                    backgroundColor: isDarkMode ? '#2C2C2C' : '#F8F9FA',
                    borderRadius: 16,
                    padding: 18,
                    fontSize: 16,
                    fontFamily: 'Poppins-Regular',
                    color: colors.text.primary,
                    borderWidth: 1.5,
                    borderColor: nifValue ? colors.primary : (isDarkMode ? '#444' : '#E0E0E0')
                  }}
                  placeholder="123 456 789"
                  placeholderTextColor={colors.text.disabled}
                  value={nifValue}
                  onChangeText={setNifValue}
                  keyboardType="numeric"
                  maxLength={9}
                  autoFocus={true}
                />
              </View>

              {/* Action Buttons */}
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={handleUpdateNif}
                  disabled={isUpdatingNif}
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 18,
                    borderRadius: 16,
                    alignItems: 'center',
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 4,
                    flexDirection: 'row',
                    justifyContent: 'center'
                  }}
                >
                  {isUpdatingNif ? (
                    <ActivityIndicator color="#FFF" style={{ marginRight: 8 }} />
                  ) : null}
                  <Text style={{
                    fontFamily: 'Poppins-SemiBold',
                    fontSize: 16,
                    color: '#FFF'
                  }}>
                    Save & Continue
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSkipNif}
                  disabled={isUpdatingNif}
                  style={{
                    paddingVertical: 16,
                    borderRadius: 16,
                    alignItems: 'center',
                    backgroundColor: 'transparent'
                  }}
                >
                  <Text style={{
                    fontFamily: 'Poppins-Medium',
                    fontSize: 15,
                    color: colors.text.secondary
                  }}>
                    Skip for now
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView >
  );
};

const styles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 100,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
  },
  deliveryTimeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deliveryTimeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F5' : 'rgba(220, 49, 115, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  deliveryTimeContent: {
    flex: 1,
  },
  deliveryTimeLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
    marginBottom: 2,
  },
  deliveryTimeValue: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    lineHeight: 22,
  },
  deliveryTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF8E1' : 'rgba(255, 193, 7, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
    marginLeft: 10,
    flexShrink: 0,
  },
  deliveryTimeBadgeText: {
    fontSize: 12,
    fontFamily: 'Poppins-SemiBold',
    color: '#F57C00',
  },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
  },
  changeButton: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
  },
  itemCount: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
  },
  optionalText: {
    fontSize: 12,
    fontFamily: 'Poppins-Medium',
    color: colors.text.light,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIconWrapper: {
    marginRight: spacing.md,
  },
  addressIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F5' : 'rgba(220, 49, 115, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressDetails: {
    flex: 1,
  },
  addressType: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  addressFull: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    lineHeight: 21,
  },
  instructionsContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: 12,
  },
  instructionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background === '#FFFFFF' ? '#E3F2FD' : 'rgba(33, 150, 243, 0.15)',
    padding: spacing.md,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0288D1',
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: '#0277BD',
    marginLeft: 10,
    lineHeight: 19,
  },
  orderItemsContainer: {
    gap: 12,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderItemLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: spacing.md,
  },
  quantityBadge: {
    backgroundColor: colors.primary,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  quantityText: {
    fontSize: 13,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  itemNameText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
    lineHeight: 22,
  },
  itemPriceText: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
  },
  voucherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  voucherIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F5' : 'rgba(220, 49, 115, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  voucherButtonText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  voucherInputContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: 10,
  },
  voucherInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  applyVoucherButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  applyVoucherText: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  tipDescription: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  tipOptionsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tipOption: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  tipOptionSelected: {
    backgroundColor: colors.background === '#FFFFFF' ? '#FFF0F5' : 'rgba(220, 49, 115, 0.15)',
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tipOptionText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.secondary,
  },
  tipOptionTextSelected: {
    color: colors.primary,
  },
  paymentMethodsList: {
    gap: 12,
  },
  methodRowSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: colors.background === '#FFFFFF' ? 'rgba(217, 27, 92, 0.04)' : 'rgba(217, 27, 92, 0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
  },
  methodRowUnselected: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'transparent',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
  },
  iconCircleSelected: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: 'transparent',
  },
  iconCircleUnselected: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    backgroundColor: 'transparent',
  },
  methodName: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
    flex: 1,
  },
  badge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 14,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: 'Poppins-Bold',
    textTransform: 'none',
    letterSpacing: 0.5,
  },
  radioContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioUnselected: {
    borderColor: colors.text.light,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
  },
  summarySection: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryRows: {
    gap: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  summaryValueFree: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: '#4CAF50',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabelDiscount: {
    fontSize: 14,
    fontFamily: 'Poppins-Medium',
    color: '#4CAF50',
  },
  summaryValueDiscount: {
    fontSize: 15,
    fontFamily: 'Poppins-Bold',
    color: '#4CAF50',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
  totalSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  totalSummaryLabel: {
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
  },
  totalSummaryValue: {
    fontSize: 22,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  checkoutButtonContainer: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalBarInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  totalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalBarLeft: {
    flex: 1,
  },
  totalBarLabel: {
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
    color: colors.text.secondary,
    marginBottom: 2,
  },
  totalBarAmount: {
    fontSize: 26,
    fontFamily: 'Poppins-Bold',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  placeOrderBtnDisabled: {
    opacity: 0.6,
  },
  shimmerEffect: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: 200,
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ skewX: '-20deg' }],
  },
  placeOrderBtnText: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  placeOrderArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  processingModal: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    minWidth: 260,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  processingText: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: colors.text.primary,
  },
  successModal: {
    backgroundColor: colors.surface,
    padding: 32,
    borderRadius: 24,
    alignItems: 'center',
    maxWidth: 360,
    width: '100%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 23,
  },
  successDetails: {
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  successDetailText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: colors.primary,
    marginBottom: 4,
  },
});

export default CheckoutScreen;
