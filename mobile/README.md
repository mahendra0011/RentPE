# RoomsFind — Full Native Android App + 360° Listing Capture

A **full standalone React Native & Expo Android application** for **RoomsFind** that brings the entire platform experience to mobile devices. Users can browse rooms, search with filters, chat with owners in real-time, save wishlists, manage listings, and capture full-sphere 360° virtual tours natively using their phone's camera and gyroscope sensors.

---

## 📱 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **App Framework** | React Native + Expo (SDK 52) | Direct React skill reuse, fast APK generation with EAS |
| **Navigation** | React Navigation (Bottom Tabs + Native Stack) | Smooth mobile tab and stack flows |
| **State Management** | Redux Toolkit (`@reduxjs/toolkit`, `react-redux`) | Shared data contracts matching web store |
| **Styling & Icons** | React Native StyleSheet + `lucide-react-native` | High-performance styling, consistent icon set |
| **Animations & Gestures** | `react-native-reanimated` + `react-native-gesture-handler` | Fluid 60fps animations and swipe gestures |
| **Real-Time Chat** | `socket.io-client` | Live in-app messaging connected to existing server |
| **Camera & Sensors** | `expo-camera`, `expo-sensors` (`DeviceMotion`) | Live camera preview + 3-row gyro tracking |
| **Image Compression** | `expo-image-manipulator` | Client-side compression before multipart upload |
| **Gallery Picker** | `expo-image-picker` | Select room photos or panoramic images |
| **Auth Storage** | `expo-secure-store` | Secure storage of JWT tokens from `/api/auth/login` |
| **Backend** | Node.js / Express 5 + MongoDB + Cloudinary | Pure MERN stack — **Zero Python microservices** |
| **Stitching Engine** | Node.js `worker_thread` + `sharp` + `@techstark/opencv-js` | In-process spherical equirectangular stitching |

---

## 🚀 Complete Feature List

1. **Explore (Home Screen)**
   - City selector (Bhopal, Indore, Pune, Bangalore, Delhi NCR)
   - Search bar by area, college, or landmark
   - Category chips (Single Room, PG, Flat, Hostel, Shared)
   - "360° Virtual Tours" featured horizontal carousel
   - Room cards with rent price, 360 tour badges, distance tags, and wishlist save

2. **Search & Filter (Find Rooms Screen)**
   - Text search query filter
   - Price range filters (<₹5K, <₹8K, <₹12K, <₹20K)
   - Room type & gender filters
   - **"360° Tours Only" toggle**

3. **Room Details Screen**
   - Multi-photo carousel
   - **Interactive 360° Virtual Tour Modal**: pan around, zoom, look up at ceiling / down at floor
   - Amenities grid & house rules
   - Verified owner profile with rating
   - **"In-App Chat"** button directly opening live socket messaging
   - Direct call owner button

4. **List Room Wizard (with 360° Capture)**
   - **Step 1: Details** — title, room type, gender, rent, description
   - **Step 2: Amenities & Rules** — clickable amenity chips, custom house rules
   - **Step 3: Photos & 360° Tour** —
     - Regular photo upload
     - **Embedded 360° Capture Card**: Launches guided gyro capture or picks panorama file
   - **Step 4: Location & Contact** — address, landmark, city, owner phone
   - **Submit**: Publishes room to MongoDB and automatically starts background 360 stitching!

5. **360° Guided Capture Engine**
   - Live camera with augmented reality reticle overlay
   - Tracks 20 target points across 3 rows:
     - **Ceiling**: Pitch +40° (6 yaw angles)
     - **Eye-Level**: Pitch 0° (8 yaw angles)
     - **Floor**: Pitch -40° (6 yaw angles)
   - Real-time guidance ("Tilt UP 15°", "Turn RIGHT 30°")
   - **Auto-capture**: Locks on within ±7.5°, triggers haptic feedback, snaps photo after 1s hold

6. **In-App Real-Time Chat**
   - Live Socket.io connection to backend (`/api/chat`)
   - Instant messaging between seeker and property owner
   - Quick inquiry suggestion chips

7. **Wishlist & Profile Screens**
   - Saved rooms bookmarking
   - Owner / Seeker role switch
   - Direct shortcut to My Listings and 360 Studio

---

## 🛠️ How to Run Locally

### 1. Install dependencies
```bash
cd mobile
npm install
```

### 2. Start Expo Development Server
```bash
npx expo start
```

### 3. Open on Device
- **Physical Phone**: Install **Expo Go** from Google Play Store or iOS App Store, scan the QR code.
- **Android Emulator**: Press `a` in the terminal.
- **Web Preview**: Press `w` in the terminal.

---

## 📦 Generating an Installable APK (EAS Build)

To build a standalone `.apk` for Android without manual Android Studio setup:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to Expo:
   ```bash
   eas login
   ```
3. Configure build:
   ```bash
   eas build:configure
   ```
4. Generate the APK:
   ```bash
   eas build --platform android --profile preview
   ```
5. Download and install the generated APK on any Android phone!
