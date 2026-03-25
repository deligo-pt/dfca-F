# AGENTS.md

## Project snapshot
- `DeligoCustomer` is an Expo 54 / React Native 0.81 customer app for discovery, cart, checkout, live order tracking, notifications, and support chat.
- App boot starts in `index.js` (Notifee channel + FCM background handler) and `App.js` (font loading, custom splash, provider stack, `StripeProvider`, `NavigationContainer`).
- There were no existing repo-level AI instruction files found via the requested guidance-file glob search.

## Read these files first
- `App.js` — real provider order matters: `Theme -> Language -> Profile -> Notification -> Socket -> Location -> Delivery -> Products -> Cart -> Orders`.
- `src/navigation/RootNavigator.js` — route gating is state-driven: Permissions → Onboarding → Login → Main tabs.
- `src/navigation/BottomTabNavigator.js` — tab badges come from `CartContext` and `OrdersContext`; tab focus refreshes orders.
- `src/constants/config.js` — environment, API base URLs, endpoint registry, Google Maps config.
- `src/utils/api.js` — Axios client with queued 401 refresh handling; many screens/services rely on this behavior.

## Architecture and data flow
- Global state is context-heavy, not Redux. Feature work usually means touching a screen + one context/service rather than adding a new state library.
- Auth/profile lives in `src/contexts/ProfileContext.js` and `src/utils/auth.js`; login is OTP-based (`sendOTP`, `verifyOTP`) and logout also tries to unregister the FCM token.
- Product/catalog data flows through `src/contexts/ProductsContext.js`; it normalizes inconsistent backend shapes, caches list responses in AsyncStorage (`productsCache:*`), and exposes category/menu/detail helpers.
- Discovery UI in `src/screens/CategoriesScreen.js` deliberately prefers API-driven business/product categories (`fetchBusinessCategories`, `fetchProductCategories`) over hardcoded lists.
- Cart state in `src/contexts/CartContext.js` is stored as vendor-keyed carts, but `addItem` enforces a single-vendor checkout constraint. Preserve that behavior unless the backend changes.
- Checkout in `src/screens/CheckoutScreen.js` is orchestration-heavy: validates profile/address/NIF, creates checkout state, launches Stripe PaymentSheet via `src/utils/stripeService.js`, then clears the vendor cart with `clearVendorCartAndSync`.
- Orders in `src/contexts/OrdersContext.js` are fetched via `fetch` (not Axios), throttled, then enriched by Socket.IO order events. `TrackOrderScreen.js` also uses Google Distance Matrix + socket updates for ETA/live tracking.
- Notifications are split across layers: `index.js` handles background FCM, `src/services/firebaseNotificationService.js` handles token/channel/listeners, and `src/contexts/NotificationContext.js` owns in-app notification state + navigation.
- Support chat is separate from the shared socket context: `src/services/ChatService.js` opens its own Socket.IO connection and also uses REST endpoints for history/upload.

## Project-specific conventions
- Most screens/components derive styling from `useTheme()` and local `styles(colors)` / `getStyles(colors)` factories; avoid hardcoded palette values except where the code already uses brand constants.
- Localization is done through `useLanguage().t(...)`; missing keys fall back to the key string, so add text in `src/utils/i18n.js` when introducing new copy.
- The app mixes `customerApi` (Axios) and raw `fetch`. Before refactoring one to the other, check whether the current code depends on custom refresh, multipart handling, or response-shape quirks.
- Backend data is inconsistent (`_id`, `id`, `productId`, nested `vendorId`, typo `RESTAURENT`), so existing normalizers in `ProductsContext` / `CartContext` are the source of truth.
- AsyncStorage keys are part of app behavior (`HAS_VIEWED_PERMISSIONS`, `location_enabled`, `notifications_enabled`, `productsCache:*`, `rating_completed_<orderId>`). Reuse existing keys instead of inventing near-duplicates.

## Build / debug workflows
- Main local commands from `package.json`: `npm start` (`expo start --dev-client`), `npm run android`, `npm run ios`, `npm run web`.
- This repo is configured for a development client, not Expo Go (`eas.json` sets `developmentClient: true`). Native changes usually require rebuilding the app.
- There is no test script in `package.json`; validate changes with targeted lint/error checks in edited files and by running the relevant app flow.
- Android notification/meta-data setup is patched by `plugins/withResolvedFirebaseIconColor.js`; keep that plugin if touching `app.json` notification/Firebase config.

## Integration cautions
- Firebase/Notifee/Google Maps/Stripe are wired directly in `app.json`, `App.js`, `config.js`, and native Android files. Avoid duplicating or “fixing” keys/config in multiple places unless you trace the existing path first.
- `config.js` currently hardcodes `ENVIRONMENT = 'production'`; if API behavior seems surprising in local runs, check that before debugging screens.
- `SocketContext` connects to `API_CONFIG.BASE_URL` (root), while REST uses `BASE_API_URL` (`/api/v1`). Keep that distinction when adding endpoints or socket features.

