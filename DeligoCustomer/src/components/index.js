/**
 * Component Exports Registry
 * 
 * Central hub for all shared components to simplify import statements.
 * Provides aliases for feature-specific components to match domain terminology.
 */

export { default as OnboardingIllustrations } from './OnboardingIllustrations';
export { DealsIllustration, DeliveryIllustration, DiscoverIllustration } from './OnboardingIllustrations';
export { CategoriesIcon, OrdersIcon, CartIcon, ProfileIcon } from './TabBarIcons';
export { default as LocationHeader } from './LocationHeader';
export { default as SearchBar } from './SearchBar';
export { default as CategoryCard } from './CategoryCard';
export { default as CuisineChip } from './CuisineChip';
export { default as RestaurantCard } from './RestaurantCard';
export { default as SkeletonCategory } from './SkeletonCategory';
export { default as SectionHeader } from './SectionHeader';
export { default as StickySearchHeader } from './StickySearchHeader';
export { default as AlertModal } from './AlertModal';
export { default as CartDetail } from './CartDetail';
export { default as CartList } from './CartList';
export { default as CustomModal } from './CustomModal';
export { default as CustomSplashScreen } from './CustomSplashScreen';
export { default as GlovoBubbles } from './GlovoBubbles';
export { default as PromoCarousel } from './PromoCarousel';
export { default as ImageEditor } from './ImageEditor';
export { default as NotificationOverlay } from './NotificationOverlay';
export { default as NotificationPopup } from './NotificationPopup';
export { default as OTPInput } from './OTPInput';
export { default as ProductSearchResultCard } from './ProductSearchResultCard';
export { default as ToastConfig } from './ToastConfig';

/**
 * Feature Aliases
 *
 * These exports map specific implementation components to domain-specific names
 * used in the products/categories feature modules.
 */
export { default as VendorType } from './Categories/CategoriesList';
export { default as Category } from './Categories/CuisinesList';
