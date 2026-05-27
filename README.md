# RentPE

RentPE is a room rental marketplace for students, interns, job seekers, and people moving to a new city. Owners can list rooms, PGs, hostels, and flats. Seekers can compare rooms, apply filters, and connect directly with owners on WhatsApp.

The frontend intentionally does not include a map screen. Location is still stored in the backend for nearby search and distance-based results.

## Current UI Flow

- Home page opens with hero search, ReactBits-style trust ticker, room card preview, `How it Works` with one electric border around the full section, then the tilt discovery cards, smart shortlist board, roommate CTA, owner CTA, stats, and footer.
- Header navigation uses `Home`, `Find Room`, and `Find Roommate`.
- Logged-out users see `Login` and `Signup` buttons in the navbar.
- `List Your Room` appears in the navbar only after logging in or signing up as a room owner.
- Header `Find Room` opens the dedicated find room page.
- Home `Filter` and `See all` open the dedicated find room page.
- The dedicated find room page uses the same room-card layout as the home room section, with a top search bar and inline filters instead of a side filter column.
- Find room filters include location search, quick location chips, city chips, distance, budget, tenant, property type, furnished, availability, and amenities.
- Room cards include WhatsApp owner contact, Wishlist, and Share actions.
- Wishlist has its own navbar link and page for saved rooms.
- Old `/search` URLs redirect to the find room page.
- Room cards show photos, room type, distance, price, amenities, WhatsApp owner CTA, and save action.
- Signup uses name, email, mobile number, password, owner checkbox, and email OTP verification.
- Login uses only email, password, and owner checkbox.
- If a user continues as owner, `List Your Room` appears in the navbar and opens the room posting flow.
- Forgot password uses email OTP verification before setting a new password.
- Header includes a dark mode toggle, saved locally in the browser.

## Features

- Room, PG, hostel, and flat listings
- Owner room posting flow with photos, price, amenities, address, and contact
- Dedicated find room page with all listings and filter controls
- Location filters for city, area, college, office, quick locations, and distance
- Nearby search using city, area, college, office, or landmark
- Room details page with gallery, owner card, amenities, nearby essentials, report action, and WhatsApp contact
- Roommate finder with budget, city, area, college or office, and move-in fields
- Wishlist page for saved rooms
- Shareable room links from cards and room details
- User dashboard for wishlist rooms, contacted owners, and posted listings
- Password login/signup with owner role support
- Signup email verification with OTP delivered through the Brevo Transactional Email REST API using `BREVO_API_KEY`
- Forgot-password OTP reset flow
- Dark mode with a persistent header toggle
- ReactBits-style UI components for electric borders, spotlight panels, infinite tickers, tilt cards, and animated counters
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
- Brevo transactional email support

## Project Structure

```txt
RentPE/
  server/
    config/          Cloudinary and MongoDB setup
    data/            Local seed data for development fallback
    models/          Mongoose models
    routes/          Express API routes
    services/        Brevo email service
    utils/           Geocoding and distance helpers
  src/
    assets/          Room images
    components/      Shared React components
      reactbits/     Animated UI primitives
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

- Frontend: `http://localhost:5180`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

If you run the backend on another port, point Vite at it:

```bash
API_PROXY_TARGET=http://localhost:5001 npm run dev
```

Vite uses `strictPort`, so it fails instead of silently opening another project on a different frontend port.

## Environment Variables

```env
PORT=5000
CLIENT_URL=http://localhost:5180
VITE_API_URL=http://localhost:5000
MONGODB_URI=mongodb://127.0.0.1:27017/rentPE
MONGODB_DB_NAME=rentPE
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=rentpe/rooms
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=verified-sender@example.com
BREVO_SENDER_NAME=RentPE
GEOCODER_PROVIDER=nominatim
GEOCODER_USER_AGENT=RentPE local development
```

Notes:

- If `MONGODB_URI` is missing, the API uses in-memory seed data.
- If Cloudinary keys are missing, room posting still works, but uploaded images are not sent to Cloudinary.
- If Brevo keys are missing, OTP routes return a local development OTP in the response.
- Geocoding has built-in known locations for common demo searches such as `Bhopal`, `LNCT`, `MP Nagar`, and `Arera Colony`.

## App Routes

- `/` - Home page with search, room preview, and owner/roommate sections
- `/find-room` - Dedicated find room page with all rooms and location filters
- `/login` - Password login
- `/signup` - Password signup
- `/forgot-password` - Email OTP password reset
- `/search` - Redirects to `/find-room` for old links
- `/rooms/:id` - Room details
- `/list-room` - Owner room posting flow
- `/roommates` - Roommate finder
- `/wishlist` - Saved room wishlist
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
POST   /api/auth/reset-password
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
