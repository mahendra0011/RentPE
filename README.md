# RentPE

RentPE is a room rental marketplace for students, interns, job seekers, and people shifting to a new city. Room owners can list PGs, hostels, flats, and private rooms. Room seekers can search by keyword, compare listings, save rooms, share links, and contact owners directly on WhatsApp.

RentPE intentionally does not use maps or geocoding. Search is based on owner-entered text such as city, area, landmark, address, title, and description, so any location can be listed without latitude or longitude.

## Features

- Room, PG, hostel, and flat listings
- Keyword-based room search
- Inline filters for budget, property type, tenant type, amenities, furnished status, and availability
- Owner signup/login with role-based navbar actions
- Email OTP verification through the Brevo Transactional Email API
- Forgot password flow with email OTP
- Owner room posting with photos, rent, address, amenities, and contact details
- Owner `My Rooms` page to edit listed rooms and replace photos
- Room details page with gallery, amenities, owner details, report action, call, and WhatsApp CTA
- Wishlist page for saved rooms
- Share buttons for room links
- User dashboard for saved rooms and contacted owners
- Dark mode with local browser persistence
- Cloudinary-ready image upload
- MongoDB Atlas support with Mongoose
- Render deployment friendly frontend and backend setup

## Tech Stack

Frontend:

- React
- React Router
- Redux Toolkit
- Tailwind CSS
- Framer Motion
- Lucide React icons
- ReactBits-style animated UI components

Backend:

- Node.js
- Express.js
- MongoDB with Mongoose
- Multer for image upload handling
- Cloudinary for image storage
- Brevo Transactional Email REST API for OTP email

## Project Structure

```txt
RentPE/
  server/
    config/          MongoDB and Cloudinary configuration
    data/            Seed data used when MongoDB is unavailable
    models/          Mongoose models
    routes/          Express API routes
    services/        Brevo email service
  src/
    assets/          Static room images
    components/      Shared React components
      reactbits/     Animated UI primitives
    lib/             API client, format helpers, room adapters
    pages/           App pages
    store/           Redux Toolkit store and slices
  index.html
  vite.config.js
  package.json
```

## Core User Flows

Room seeker:

1. Open home or `Find Room`.
2. Search by keyword like `LNCT`, `MP Nagar`, `PG`, `WiFi`, or any owner-entered address text.
3. Apply filters for price, type, tenant, amenities, furnished status, and availability.
4. Open room details, save to wishlist, share the room, call owner, or message on WhatsApp.

Room owner:

1. Sign up or log in with the owner checkbox selected.
2. Use `List Your Room` to publish a listing.
3. After posting, RentPE redirects to `My Rooms`.
4. Edit details, price, availability, address, amenities, contact number, WhatsApp status, and photos from `My Rooms`.

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

Vite uses a fixed frontend port. If `5180` is already busy, stop the old process or change `vite.config.js`.

## Environment Variables

Create `.env` from `.env.example` and fill these values.

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
- If `MONGODB_URI` is missing or invalid, the API falls back to in-memory seed rooms.
- If Cloudinary keys are missing, the app can still run, but uploaded listing photos are not sent to Cloudinary.
- If Brevo keys are missing, OTP routes return a development OTP in the API response.

## App Routes

```txt
/                 Home
/find-room        Find rooms with keyword search and filters
/rooms/:id        Room details
/list-room        Owner room posting form
/my-rooms         Owner listing management and edit page
/wishlist         Saved rooms
/dashboard        User dashboard
/login            Login
/signup           Signup
/forgot-password  OTP password reset
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
POST   /api/auth/reset-password
POST   /api/auth/verify-otp
```

Rooms:

```txt
GET    /api/rooms
GET    /api/rooms/mine
GET    /api/rooms/:slug
POST   /api/rooms
PATCH  /api/rooms/:slug
PATCH  /api/rooms/:slug/availability
POST   /api/rooms/:slug/report
```

Owner-only room routes use the logged-in user's bearer token from local auth storage. Frontend API calls attach it automatically.

## MongoDB Model Notes

Rooms store searchable owner-entered text:

- `title`
- `description`
- `address`
- `city`
- `landmark`
- `locationLabel`

There is no required map coordinate, no geocoding step, and no `2dsphere` index requirement. This lets owners list any real address or local area text immediately.

Owner listings are connected to `ownerEmail`, which powers the `My Rooms` management page.

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

1. Backend as a Web Service
2. Frontend as a Static Site

### Backend Web Service

Recommended settings:

```txt
Runtime: Node
Build Command: npm install
Start Command: npm start
```

Required backend environment variables:

```env
CLIENT_URL=https://your-frontend.onrender.com
CORS_ORIGINS=https://your-frontend.onrender.com
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/rentPE?retryWrites=true&w=majority
MONGODB_DB_NAME=rentPE
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=rentpe/rooms
BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=verified-sender@example.com
BREVO_SENDER_NAME=RentPE
```

After deploy, this URL should return JSON:

```txt
https://your-backend.onrender.com/api/health
```

If the backend URL shows a Vite `Blocked request. This host is not allowed` message, the backend service is running the wrong command. Change Render backend `Start Command` to:

```txt
npm start
```

### Frontend Static Site

Recommended settings:

```txt
Build Command: npm install && npm run build
Publish Directory: dist
```

Required frontend environment variable:

```env
VITE_API_URL=https://your-backend.onrender.com
```

Add this rewrite in Render Static Site settings:

```txt
Source: /*
Destination: /index.html
Action: Rewrite
```

## Security Notes

- Never expose `CLOUDINARY_API_SECRET`, `BREVO_API_KEY`, or MongoDB passwords in frontend code.
- Keep all secrets in Render backend environment variables.
- Rotate any secret that was shared publicly or committed by mistake.
- Use the owner checkbox only for owner accounts, because it unlocks listing management actions.

## Development Status

RentPE currently supports the complete MVP flow:

- seeker search and filters
- room details
- owner signup/login
- room listing creation
- owner listing edits
- Cloudinary-ready uploads
- Brevo OTP email
- MongoDB Atlas storage
- Render deployment setup
