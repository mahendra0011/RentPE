# RentPE

RentPE is a room rental marketplace for students, interns, job seekers, and people moving to a new city. Room seekers can search and compare PGs, hostels, flats, and private rooms, while owners can publish and manage their own listings.

The app uses owner-entered text for discovery: city, area, landmark, address, title, amenities, rules, and description. A map or exact coordinates are not required to publish a listing.

## Features

### Room Seeker
- Fast keyword search with FlexSearch
- Smooth result rendering with batched `Load more` listings
- Filters for budget, property type, tenant type, amenities, furnished status, and availability
- Room details with gallery, rent, amenities, house rules, local essentials, owner contact, report action, wishlist, and sharing
- **Reviews & Ratings** - Read reviews from other tenants, view average star ratings, and submit your own review with star rating and comment
- **In-app Chat** - Real-time messaging with owners including typing indicators, read receipts, file/image sharing, emoji reactions, and message edit/delete
- **Inquiry System** - Send inquiries to owners, owner can accept/reject inquiries, daily inquiry limit enforcement
- **Schedule a Visit** - Send a date/time visit request directly in chat
- **Safety Features** - Automatic detection of suspicious payment requests, safety tips banner, report conversations, block users
- Wishlist and dashboard pages for seekers

### Room Owner
- Owner signup/login with role-aware navigation
- Owner listing creation with photos, details, location, amenities, house rules, and WhatsApp lead preference
- Owner `My Rooms` page for editing listings, replacing photos, changing availability, updating rules, and deleting listings
- **In-app Chat Management** - Respond to inquiries, set away mode with auto-reply, quick reply templates, mute/archive conversations
- **Response Time Tracking** - Automatic tracking of owner response time displayed as a badge in chat

### Admin Dashboard
- **Overview** - Stats cards (total users, rooms, available rooms, owners), room status breakdown with progress bars (live/reported/occupied)
- **Users Management** - Card-based layout with colored avatars, role badges, role switching (seeker/owner/admin), email/mobile display, delete user with cascade delete of their rooms
- **Rooms Management** - Card-based layout with room images, status badges, status switching (live/reported), price display, report count, delete room
- **Cities Management** - Dedicated tab to add/delete cities, auto-populated from existing rooms, city+state input, grid layout with MapPinned icons
- **Reports** - Severity-based cards (high/medium/low) with colored left borders and progress bars, status management, delete actions
- **Flagged Messages** - Card-based view of flagged messages, flag reason display, dismiss functionality
- **Reviews Moderation** - View and manage user-submitted reviews

### Authentication & Security
- Forgot password flow: email OTP, reset-password page, new password, confirm password, then login redirect
- Email OTP through Brevo Transactional Email API
- Role-based access control (seeker, owner, admin)
- Block/unblock users
- Report conversations with reason
- Auto-flagging of payment-related keywords

### Platform
- Cloudinary-ready image upload
- MongoDB Atlas support with Mongoose
- In-memory fallback when MongoDB is unavailable
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
- Socket.io Client (real-time chat)

Backend:

- Node.js
- Express.js
- MongoDB with Mongoose
- Socket.io (real-time messaging)
- Multer for multipart uploads
- Cloudinary for room images
- Brevo Transactional Email REST API for OTP email

## Project Structure

```txt
RentPE/
  server/
    config/          MongoDB and Cloudinary configuration
    data/            Seed listings used when MongoDB is unavailable
    middleware/      Auth middleware (requireAdmin, requireAuth)
    models/          Mongoose models (Room, User, Message, Conversation, Review, City)
    routes/          Express API routes (rooms, auth, chat, admin, reviews, cities, geo)
    services/        Brevo email service, Nominatim geocoding
    socket.js        Socket.io real-time setup
  src/
    assets/          Local fallback room images
    components/      Shared React components (ChatDrawer, RatingStars, ReviewsSection, etc.)
    context/         React contexts (ChatContext)
    data/            Static fallback room data
    lib/             API client, formatting, search, adapters, rule helpers
    pages/           App pages (Home, RoomDetails, AdminDashboard, etc.)
    store/           Redux Toolkit store and slices
  index.html
  vite.config.js
  package.json
```

Generated/local-only folders such as `dist/`, `node_modules/`, and `.env` are ignored by Git.

## Core Flows

### Room Seeker

1. Open `Home` or `Find Room`.
2. Search by keyword such as city, area, PG, hostel, flat, WiFi, rule text, landmark, or owner-entered address.
3. Apply filters for price, type, tenant, amenities, furnished status, and availability.
4. Open room details, check house rules, read reviews, save to wishlist, share the listing, call the owner, or message on WhatsApp.
5. **Chat** - Use in-app chat to message the owner directly (real-time).

### Room Owner

1. Sign up or login with owner mode selected.
2. Use `List Your Room` to publish a listing.
3. Add details, house rules, photos, location, and contact information.
4. Use `My Rooms` to edit, delete, update availability, replace photos, and update rules.
5. **Chat** - Receive and respond to inquiries, set away mode, use quick replies.

### Admin

1. Login with admin role.
2. Access admin dashboard to manage users, rooms, cities, reports, and flagged messages.
3. Change user roles, update room statuses, add/delete cities, dismiss flagged messages.

### Forgot Password

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
/rooms/:id        Room details (includes reviews section)
/list-room        Owner listing form
/my-rooms         Owner listing management
/wishlist         Saved rooms
/dashboard        User dashboard
/admin            Admin dashboard (overview, users, rooms, cities, reports, flagged)
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

Reviews:

```txt
GET    /api/reviews/:roomSlug
POST   /api/reviews/:roomSlug
```

Chat:

```txt
GET    /api/chat/conversations
GET    /api/chat/conversations/:id/messages
POST   /api/chat/conversations/:id/messages
POST   /api/chat/conversations
PATCH  /api/chat/conversations/:id/read
PATCH  /api/chat/conversations/:id/mute
PATCH  /api/chat/conversations/:id/archive
DELETE /api/chat/conversations/with/:email
GET    /api/chat/unread-count
GET    /api/chat/quick-replies
PUT    /api/chat/quick-replies
GET    /api/chat/away-mode
PUT    /api/chat/away-mode
GET    /api/chat/inquiry-daily-limit
POST   /api/chat/inquiry
POST   /api/chat/inquiry/:id/respond
POST   /api/chat/messages/:id/react
PATCH  /api/chat/messages/:id
DELETE /api/chat/messages/:id
POST   /api/chat/upload
POST   /api/chat/report
POST   /api/chat/block/:email
POST   /api/chat/unblock/:email
GET    /api/chat/blocked
```

Admin:

```txt
GET    /api/admin/stats
GET    /api/admin/users
PATCH  /api/admin/users/:email/role
DELETE /api/admin/users/:email
GET    /api/admin/rooms
PATCH  /api/admin/rooms/:slug/status
DELETE /api/admin/rooms/:slug
GET    /api/admin/reports
GET    /api/admin/flagged-messages
PATCH  /api/admin/flagged-messages/:id/dismiss
GET    /api/admin/cities
POST   /api/admin/cities
DELETE /api/admin/cities/:name
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

### Reviews

Reviews are stored per-room with:
- `userName`, `userEmail`, `rating` (1-5), `comment` (max 1000 chars)
- Fetched and displayed on the room details page
- Sample reviews shown as fallback when no reviews exist
- New reviews are posted via `POST /api/reviews/:roomSlug`

### Chat

Real-time chat powered by Socket.io:
- Conversations are created per room between seeker and owner
- Inquiry system with accept/reject flow
- Messages support text, images, and files
- Typing indicators, read receipts, emoji reactions
- Message edit/delete within 15 minutes
- Auto-flagging of suspicious payment-related messages
- Away mode with auto-reply for owners
- Response time tracking for owners

## Image Upload Notes

Room photos are submitted as multipart form data through Multer.

- New listings upload images through `POST /api/rooms`.
- Owner edits can replace listing photos through `PATCH /api/rooms/:slug`.
- Cloudinary folder defaults to `rentpe/rooms`.
- If no new photos are uploaded during edit, existing photos stay unchanged.
- Chat file uploads go through `POST /api/chat/upload`.

## Real-time Events (Socket.io)

```txt
connect / disconnect          Socket connection lifecycle
user:online                   User online/offline status
message:new                   New message in a conversation
message:read                  Messages marked as read
message:delivered             Messages delivered
typing:start / typing:stop    Typing indicators
conversation:new              New conversation created
inquiry:responded             Inquiry accepted/rejected
room:status-changed           Room availability changed
```

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
- Chat messages with payment-related keywords are automatically flagged for review.
- Never pay any advance or deposit before visiting the property in person.

## Current Status

RentPE supports the complete MVP flow plus advanced features:

- ✅ seeker search and filters
- ✅ fast search with FlexSearch
- ✅ room details with house rules
- ✅ **reviews and ratings with user submissions**
- ✅ **in-app real-time chat with full messaging features**
- ✅ **inquiry system with accept/reject**
- ✅ **safety features (suspicious message detection, blocking, reporting)**
- ✅ owner signup/login
- ✅ room listing creation
- ✅ owner listing edit and delete
- ✅ password reset through OTP and confirm-password page
- ✅ **admin dashboard with users, rooms, cities, reports, flagged messages management**
- ✅ **city management (add/delete cities)**
- Cloudinary-ready uploads
- Brevo OTP email
- MongoDB Atlas storage
- Render deployment setup