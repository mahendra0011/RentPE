# RentPE

RentPE is a room rental marketplace for students, interns, job seekers, and people moving to a new city. Room seekers can search and compare PGs, hostels, flats, and private rooms, while owners can publish and manage their own listings.

The app uses owner-entered text for discovery: city, area, landmark, address, title, amenities, rules, and description. A map or exact coordinates are not required to publish a listing.

## Features

- Fast keyword search with FlexSearch
- Smooth result rendering with batched `Load more` listings
- Filters for budget, property type, tenant type, amenities, furnished status, and availability
- Room details with gallery, rent, amenities, house rules, local essentials, owner contact, report action, wishlist, and sharing
- Owner signup/login with role-aware navigation
- Owner listing creation with photos, details, location, amenities, house rules, and WhatsApp lead preference
- Owner `My Rooms` page for editing listings, replacing photos, changing availability, updating rules, and deleting listings
- Wishlist and dashboard pages for seekers
- Forgot password flow: email OTP, reset-password page, new password, confirm password, then login redirect
- Email OTP through Brevo Transactional Email API
- Cloudinary-ready image upload
- MongoDB Atlas support with Mongoose
- Render-friendly frontend and backend deployment

## Tech Stack

Frontend:

- React
- React Router
- Redux Toolkit
- Tailwind CSS
- Framer Motion
- Lucide React icons
- FlexSearch

Backend:

- Node.js
- Express.js
- MongoDB with Mongoose
- Multer for multipart uploads
- Cloudinary for room images
- Brevo Transactional Email REST API for OTP email

## Project Structure

```txt
RentPE/
  server/
    config/          MongoDB and Cloudinary configuration
    data/            Seed listings used when MongoDB is unavailable
    models/          Mongoose models
    routes/          Express API routes
    services/        Brevo email service
  src/
    assets/          Local fallback room images
    components/      Shared React components
    data/            Static fallback room data
    lib/             API client, formatting, search, adapters, rule helpers
    pages/           App pages
    store/           Redux Toolkit store and slices
  index.html
  vite.config.js
  package.json
```

Generated/local-only folders such as `dist/`, `node_modules/`, and `.env` are ignored by Git.

## Core Flows

Room seeker:

1. Open `Home` or `Find Room`.
2. Search by keyword such as city, area, PG, hostel, flat, WiFi, rule text, landmark, or owner-entered address.
3. Apply filters for price, type, tenant, amenities, furnished status, and availability.
4. Open room details, check house rules, save to wishlist, share the listing, call the owner, or message on WhatsApp.

Room owner:

1. Sign up or login with owner mode selected.
2. Use `List Your Room` to publish a listing.
3. Add details, house rules, photos, location, and contact information.
4. Use `My Rooms` to edit, delete, update availability, replace photos, and update rules.

Forgot password:

1. Open `/forgot-password`.
2. Enter email and verify OTP.
3. Continue to `/reset-password`.
4. Enter new password and confirm password.
5. After reset, the app redirects to `/login`.

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

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

Default local URLs:

- Frontend: `http://localhost:5180`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

Vite uses a fixed frontend port. If `5180` is busy, stop the old process or change `vite.config.js`.

## Environment Variables

Create `.env` from `.env.example` and fill the values needed for your environment.

```env
PORT=5000
CLIENT_URL=http://localhost:5180
CORS_ORIGINS=http://localhost:5180
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
```

Notes:

- Do not commit `.env`.
- `VITE_API_URL` is used by the frontend in production.
- `CLIENT_URL` and `CORS_ORIGINS` are used by the backend for CORS.
- If MongoDB is unavailable, the API falls back to in-memory seed listings.
- If Cloudinary keys are missing, the app still runs, but uploaded listing photos are not stored in Cloudinary.
- If Brevo keys are missing, OTP routes return a development OTP in the API response.

## App Routes

```txt
/                 Home
/find-room        Search and filter room listings
/rooms/:id        Room details
/list-room        Owner listing form
/my-rooms         Owner listing management
/wishlist         Saved rooms
/dashboard        User dashboard
/login            Login
/signup           Signup
/forgot-password  Email OTP for password reset
/reset-password   New password and confirm password
/search           Redirects to /find-room
```

## API Routes

System:

```txt
GET    /api/health
```

Auth:

```txt
POST   /api/auth/request-otp
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/verify-otp
POST   /api/auth/verify-reset-otp
POST   /api/auth/reset-password
```

Rooms:

```txt
GET    /api/rooms
GET    /api/rooms/mine
GET    /api/rooms/:slug
POST   /api/rooms
PATCH  /api/rooms/:slug
DELETE /api/rooms/:slug
PATCH  /api/rooms/:slug/availability
POST   /api/rooms/:slug/report
```

Owner-only room routes use the logged-in user's bearer token from local auth storage. Frontend API calls attach it automatically.

## Data Model Notes

Room listings store searchable owner-entered fields:

- `title`
- `description`
- `rules`
- `amenities`
- `address`
- `city`
- `landmark`
- `locationLabel`

Owner listings are connected to `ownerEmail`, which powers the `My Rooms` management page and owner-scoped edits/deletes.

## Image Upload Notes

Room photos are submitted as multipart form data through Multer.

- New listings upload images through `POST /api/rooms`.
- Owner edits can replace listing photos through `PATCH /api/rooms/:slug`.
- Cloudinary folder defaults to `rentpe/rooms`.
- If no new photos are uploaded during edit, existing photos stay unchanged.

## Useful Commands

```bash
npm start          # Start Express backend for production
npm run dev        # Start Vite frontend
npm run server     # Start Express backend
npm run server:dev # Start Express backend with nodemon
npm run lint       # Run ESLint
npm run build      # Build frontend
npm run preview    # Preview production frontend build
npm run format     # Format project files
```

## Deploying On Render

Use two Render services:

1. Backend Web Service
2. Frontend Static Site

Backend settings:

```txt
Runtime: Node
Build Command: npm install
Start Command: npm start
```

Frontend static site settings:

```txt
Build Command: npm install && npm run build
Publish Directory: dist
```

Frontend environment variable:

```env
VITE_API_URL=https://your-backend.onrender.com
```

Static site rewrite:

```txt
Source: /*
Destination: /index.html
Action: Rewrite
```

Backend health check:

```txt
https://your-backend.onrender.com/api/health
```

## Security Notes

- Never expose `CLOUDINARY_API_SECRET`, `BREVO_API_KEY`, or MongoDB passwords in frontend code.
- Keep secrets in local `.env` and Render backend environment variables.
- Rotate any secret that was shared publicly or committed by mistake.
- Owner mode unlocks listing management actions, including edit and delete.

## Current Status

RentPE supports the complete MVP flow:

- seeker search and filters
- fast search with FlexSearch
- room details with house rules
- owner signup/login
- room listing creation
- owner listing edit and delete
- password reset through OTP and confirm-password page
- Cloudinary-ready uploads
- Brevo OTP email
- MongoDB Atlas storage
- Render deployment setup
