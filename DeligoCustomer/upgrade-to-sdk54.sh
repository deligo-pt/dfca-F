#!/bin/bash
# Expo SDK 54 Upgrade Script

echo "Starting Expo SDK 54 upgrade..."

# Navigate to project directory
cd "J:\deligo-food-customer-application-frontend\DeligoCustomer"

# Clean existing installations
echo "Cleaning existing installations..."
rm -rf node_modules
rm -f package-lock.json
rm -rf android/build
rm -rf android/.gradle

# Install dependencies
echo "Installing new dependencies..."
npm install

# Run expo install to ensure compatibility
echo "Running expo install for compatibility..."
npx expo install --fix

# Prebuild for Android
echo "Prebuilding for Android..."
npx expo prebuild --platform android --clear

echo "Expo SDK 54 upgrade completed!"
echo "You can now run: npx expo run:android"
