# 🧪 Quick Test Guide - Stripe Payment Integration

## ✅ Pre-Test Checklist

### 1. Verify Installation
```powershell
# Check if Stripe package is installed
npm list @stripe/stripe-react-native
```

**Expected:** `@stripe/stripe-react-native@0.57.0`

### 2. Verify Backend is Running
```powershell
# Check if backend is accessible
curl http://10.0.2.2:5000/api/v1/checkout
```

**Expected:** Some response (not connection refused)

### 3. Native Rebuild (REQUIRED)
```powershell
# Clean rebuild for native module
npx expo prebuild --clean
npx expo run:android
```

**Wait:** 3-5 minutes for first build

---

## 🎯 Test Scenario: Complete Checkout Flow

### Step 1: Add Items to Cart
1. Open app
2. Browse restaurants
3. Select a restaurant
4. Add 2-3 items to cart
5. Open cart

**Expected:**
- Cart shows items with prices
- "Checkout" button is visible

---

### Step 2: Navigate to Checkout
1. Tap "Checkout" button in cart

**Expected:**
- Navigate to CheckoutScreen
- See blue banner: "Preparing checkout..."
- Button shows: "Preparing..."

**Console Logs:**
```
DEBUG [CheckoutScreen] Creating checkout via API with useCart=true
DEBUG [CheckoutAPI] POST http://10.0.2.2:5000/api/v1/checkout
```

---

### Step 3: Wait for Stripe Initialization
Wait 2-3 seconds

**Expected:**
- Blue banner disappears
- Button shows: "Initializing Payment..."
- Then button shows: "Place Order →"

**Console Logs:**
```
DEBUG [CheckoutAPI] createCheckout response status: 200
DEBUG [CheckoutScreen] Initializing Stripe with checkoutSummaryId: 692eba...
DEBUG [stripeService] POST .../payment/stripe/create-payment-intent
DEBUG [stripeService] Initializing payment sheet
```

---

### Step 4: Place Order
1. Tap "Place Order" button

**Expected:**
- Stripe PaymentSheet slides up from bottom
- Shows "Add card" or card input fields
- Has Google Pay / Apple Pay options (if configured)

---

### Step 5: Enter Test Card
**Use Stripe Test Card:**
```
Card Number: 4242 4242 4242 4242
Expiry Date: 12/34 (any future date)
CVC: 123 (any 3 digits)
ZIP: 12345 (any 5 digits)
```

1. Enter card details
2. Tap "Pay" button in PaymentSheet

**Expected:**
- PaymentSheet closes
- Button shows: "Processing... ⏳"
- Success modal appears after 1 second

---

### Step 6: Order Confirmation
**Expected:**
- See green checkmark ✅
- "Order Placed!" title
- "Order Confirmed" message
- Auto-navigate to Orders screen after 2 seconds

---

## ❌ Common Errors & Fixes

### Error: "StripeProvider doesn't exist"
**Cause:** Native rebuild needed

**Fix:**
```powershell
npx expo prebuild --clean
npx expo run:android
```

---

### Error: "merchantIdentifier undefined"
**Cause:** Native module not compiled

**Fix:**
```powershell
cd android
./gradlew clean
cd ..
npx expo prebuild --clean
npx expo run:android
```

---

### Error: "Preparing checkout..." never finishes
**Cause:** Checkout API failed

**Check Console:**
```
ERROR [CheckoutAPI] Create checkout error: ...
```

**Fix:**
- Verify backend is running
- Check auth token is valid
- Check network connection (use `10.0.2.2` for Android emulator)

---

### Error: "Initializing Payment..." never finishes
**Cause:** Payment intent creation failed

**Check Console:**
```
ERROR [stripeService] create-payment-intent failed: ...
```

**Fix:**
- Verify backend has Stripe secret key configured
- Check checkoutSummaryId is valid
- Verify backend endpoint: `/api/v1/payment/stripe/create-payment-intent`

---

### Error: Red banner appears
**Read Error Message:**
- "Checkout session not initialized" → Checkout API failed
- "Payment intent not found" → Backend response missing data
- "Failed to create payment intent" → Backend Stripe error

**Fix:**
- Check backend logs
- Verify Stripe keys on backend
- Check network connectivity

---

### Error: PaymentSheet doesn't appear
**Cause:** Stripe not initialized or tapped button too early

**Fix:**
- Wait for button to show "Place Order"
- Check console for Stripe initialization logs
- If still failing, restart app and try again

---

### Error: Payment fails with test card
**Cause:** Backend Stripe secret key incorrect or test mode mismatch

**Fix:**
- Verify backend uses test secret key: `sk_test_...`
- Check publishable key in App.js matches: `pk_test_...`
- Both must be from same Stripe account and test mode

---

## 📊 Expected Console Output (Success)

```
DEBUG [CheckoutScreen] Creating checkout via API with useCart=true
DEBUG [CheckoutAPI] auth present, mask: eyJhbGci...iHqI
DEBUG [CheckoutAPI] POST http://10.0.2.2:5000/api/v1/checkout
DEBUG [CheckoutAPI] createCheckout response status: 200 data: {...}
DEBUG [CheckoutScreen] createCheckout result: {success: true, data: {...}}
DEBUG [CheckoutScreen] Initializing Stripe with checkoutSummaryId: 692eba4584d001067239f6f2
DEBUG [stripeService] POST http://10.0.2.2:5000/api/v1/payment/stripe/create-payment-intent
DEBUG [stripeService] create-payment-intent response: {status: 200, data: {...}}
DEBUG [stripeService] Initializing payment sheet with config: {hasPaymentIntent: true, hasCustomer: true, hasEphemeralKey: true}
```

---

## 🔍 Debugging Tips

### 1. Clear Cache
```powershell
npx expo start -c
```

### 2. Reinstall Dependencies
```powershell
rm -rf node_modules
npm install
```

### 3. Full Clean Rebuild
```powershell
rm -rf android node_modules
npm install
npx expo prebuild --clean
npx expo run:android
```

### 4. Check AsyncStorage
Add temporary code to check auth token:
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

AsyncStorage.getItem('accessToken').then(token => {
  console.log('Token:', token);
});
```

### 5. Test Backend Directly
```powershell
# Test checkout endpoint
curl -X POST http://localhost:5000/api/v1/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: YOUR_TOKEN" \
  -d '{"useCart": true}'

# Test payment intent endpoint
curl -X POST http://localhost:5000/api/v1/payment/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: YOUR_TOKEN" \
  -d '{"checkoutSummaryId": "YOUR_CHECKOUT_ID"}'
```

---

## 📋 Test Completion Checklist

- [ ] App builds without errors
- [ ] No "StripeProvider doesn't exist" error
- [ ] Blue "Preparing checkout..." banner appears
- [ ] Button shows "Initializing Payment..."
- [ ] Button changes to "Place Order"
- [ ] Tap "Place Order" → PaymentSheet appears
- [ ] Enter test card → Payment succeeds
- [ ] Success modal appears
- [ ] Navigate to Orders screen

---

## 🎉 Success Criteria

✅ **Payment flow works end-to-end**
✅ **No errors in console**
✅ **Stripe PaymentSheet appears**
✅ **Test card payment succeeds**
✅ **Order confirmation modal shows**
✅ **Navigate to Orders screen**

---

**Ready to test!** 🚀

Follow each step carefully and check the expected results.
Report any errors with full console logs for debugging.

