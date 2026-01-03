# Expo SDK 54 Upgrade Script for PowerShell

Write-Host "Starting Expo SDK 54 upgrade..." -ForegroundColor Green

# Navigate to project directory
Set-Location "J:\deligo-food-customer-application-frontend\DeligoCustomer"

# Clean existing installations
Write-Host "Cleaning existing installations..." -ForegroundColor Yellow
if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
if (Test-Path "package-lock.json") { Remove-Item -Force "package-lock.json" }
if (Test-Path "android\build") { Remove-Item -Recurse -Force "android\build" }
if (Test-Path "android\.gradle") { Remove-Item -Recurse -Force "android\.gradle" }

# Install dependencies
Write-Host "Installing new dependencies..." -ForegroundColor Yellow
npm install

# Run expo install to ensure compatibility
Write-Host "Running expo install for compatibility..." -ForegroundColor Yellow
npx expo install --fix

# Prebuild for Android
Write-Host "Prebuilding for Android..." -ForegroundColor Yellow
npx expo prebuild --platform android --clear

Write-Host "Expo SDK 54 upgrade completed!" -ForegroundColor Green
Write-Host "You can now run: npx expo run:android" -ForegroundColor Cyan
