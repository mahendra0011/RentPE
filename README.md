# RoomRadar

RoomRadar is a room rental marketplace for students, interns, job seekers, and people moving to a new city. Owners can post rooms, PGs, hostels, and flats. Seekers can search by city, area, college, or office and connect directly with owners on WhatsApp.

The UI intentionally does not include a map screen. Location is still used in the backend for nearby search and distance-based results.

## Features

- Room, PG, hostel, and flat listings
- Owner room posting flow with photos, price, amenities, address, and contact
- Nearby search using city, area, college, office, or landmark
- Filters for price, distance, furnished, amenities, tenant type, and property type
- Room details page with gallery, owner card, amenities, nearby essentials, and WhatsApp contact
- Roommate finder with budget, city, area, college or office, and move-in fields
- User dashboard for saved rooms, contacted owners, and posted listings
- Password login and signup with name, email, mobile number, and owner role support
- Report listing action
- Availability support for available or occupied rooms
- Cloudinary-ready image upload
- MongoDB geospatial-ready room schema

## Tech Stack

Frontend:

- React
- React Router
- Redux Toolkit
- Tailwind CSS
- Framer Motion
- Lucide icons

Backend:

- Node.js
- Express.js
- MongoDB with Mongoose
- Cloudinary
- Multer

## Project Structure

```txt
RentPE/
  server/
    config/          Cloudinary and MongoDB setup
    data/            Local seed data for development fallback
    models/          Mongoose models
    routes/          Express API routes
    utils/           Geocoding and distance helpers
  src/
    assets/          Room images
    components/      Shared React components
    lib/             API, formatting, and room normalization helpers
    pages/           App pages
    store/           Redux Toolkit slices and store
  index.html
  vite.config.js
  package.json
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create a local env file:

```bash
cp .env.example .env
```

Start the backend:

```bash
npm run server:dev
```

Start the frontend in another terminal:

```bash
npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

Vite is set to `strictPort`, so it fails instead of silently opening another project on a different port.

## Environment Variables

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/rentpe
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=rentpe/rooms
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=verified-sender@example.com
BREVO_SENDER_NAME=RoomRadar
GEOCODER_PROVIDER=nominatim
GEOCODER_USER_AGENT=RoomRadar local development
```

Notes:

- If `MONGODB_URI` is missing, the API uses in-memory seed data.
- If Cloudinary keys are missing, room posting still works, but uploaded images are not sent to Cloudinary.
- If Brevo keys are missing, the API returns a local development OTP in the response.
- Geocoding has built-in known locations for common demo searches such as `Bhopal`, `LNCT`, `MP Nagar`, and `Arera Colony`.

## App Routes

- `/` - Home page
- `/login` - Password login
- `/signup` - Password signup
- `/search?all=1` - All rooms
- `/search?filters=1` - All rooms with filters open
- `/search?query=LNCT` - Search nearby rooms
- `/rooms/:id` - Room details
- `/list-room` - Add room
- `/roommates` - Roommate finder
- `/dashboard` - User dashboard

## API Routes

Rooms:

```txt
GET    /api/rooms
GET    /api/rooms/nearby?query=LNCT&maxDistance=5000
GET    /api/rooms/:slug
POST   /api/rooms
PATCH  /api/rooms/:slug/availability
POST   /api/rooms/:slug/report
```

Roommates:

```txt
GET    /api/roommates
POST   /api/roommates
```

Auth:

```txt
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/request-otp
POST   /api/auth/verify-otp
```

System:

```txt
GET    /api/health
```

## Useful Commands

```bash
npm run dev        # Start Vite frontend
npm run server     # Start Express backend
npm run server:dev # Start Express backend with nodemon
npm run lint       # Run ESLint
npm run build      # Build frontend
npm run preview    # Preview production build
npm run format     # Format project files
```

## MongoDB Location Model

Rooms store a GeoJSON point for nearby search:

```js
location: {
  type: "Point",
  coordinates: [77.4126, 23.2599]
}
```

The room model includes:

```js
roomSchema.index({ location: "2dsphere" });
```

This supports distance-based search while keeping the frontend simple and list-focused.
