# FaithFrames Admin Panel

The web control center for the **FaithFrames** mobile app — a Next.js application that combines a public marketing site with a full-featured, Firebase-backed admin dashboard for managing every piece of content the mobile app displays: wallpapers, Bible/Jesus/Prayers/Worship content, daily verses & prayers, scripture videos, quizzes, community stories, premium subscriptions, and more.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication Model](#authentication-model)
- [Firebase & Cloudinary Setup](#firebase--cloudinary-setup)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

FaithFrames Admin is a single Next.js 16 application with two halves:

1. **Public marketing site** (`/`, `/about`, `/pricing`, `/contact`, `/privacy-policy`, `/terms-and-conditions`, `/refund-policy`) — an animated, responsive landing experience built with Framer Motion and Tailwind CSS that introduces the FaithFrames app, its plans, and legal/support pages.
2. **Admin dashboard** (`/admin/**`) — a session-protected control panel that reads and writes directly to the same Firebase project used by the FaithFrames mobile app (React Native/Expo), so every change made here is reflected in the app in real time.

The dashboard is organized around the app's core content "kinds" — **Bible, Jesus, Prayers, and Worship** — each with its own mini-suite of tools (dashboard, carousel manager, content manager, plans, analytics, banners, announcements), plus dedicated sections for wallpapers, quizzes, scripture videos, community testimonials, and premium/subscription management.

## Key Features

### 📊 Dashboard & Analytics
- At-a-glance stats on content volume, uploads, and app engagement
- Per-content-kind analytics pages (e.g. `/admin/bible/analytics`) with charts powered by Recharts

### 🖼️ Wallpaper & Media Management
- Upload, tag, categorize, and delete wallpapers
- Direct, signed Cloudinary uploads (`/api/admin/cloudinary-sign`) with server-side cleanup on delete (`/api/admin/cloudinary-delete`)

### 📖 Faith Content Suites (Bible · Jesus · Prayers · Worship)
Each content kind ships with a consistent set of tools:
- **Content Dashboard** — overview of that kind's content
- **Content Manager** — full CRUD for articles/entries
- **Carousel Manager** — manage the featured/hero carousel shown in-app
- **Reading Plans** *(Bible)* — multi-day scripture plans with progress tracking
- **Daily Verses** *(Bible)* — the app's daily verse rotation
- **Banners & Announcements** *(Bible)* — in-app promotional and informational banners
- **Analytics** — engagement metrics per content kind

### 🎬 Scripture Videos (Witness)
- Dedicated dashboard, carousel manager, and video manager for short-form scripture/testimony videos

### ❓ Quizzes & Daily Content
- Upload and manage quiz questions, daily verses, and daily prayers shown to app users

### 🙌 Community & Stories
- Manage witness testimonials, "Meet & Share" submissions, faith stories, and featured "Women of the Bible" stories

### 👑 Premium & Payments
- Premium user management (`/admin/premium-users`)
- Transaction history and payment tracking, with support for **Razorpay** and **Stripe**

### 🔐 Secure Session-Based Auth
- Email/password login with two fallback strategies (env-configured admin, or Firebase Auth + custom role claim) — see [Authentication Model](#authentication-model)
- Signed, HMAC-verified session cookies (no third-party session store required)

### 🎨 Polished, Responsive UI
- Built with Tailwind CSS and Framer Motion for smooth transitions, animated sidebars, and a fully responsive layout across desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI Library | [React 19](https://react.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) |
| Animation | [Framer Motion](https://www.framer.com/motion/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Charts | [Recharts](https://recharts.org/) |
| Backend / DB | [Firebase](https://firebase.google.com/) (Firestore, Auth) + [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) |
| Media Storage | [Cloudinary](https://cloudinary.com/) |
| Payments | [Razorpay](https://razorpay.com/) & [Stripe](https://stripe.com/) (optional) |
| Fonts | [Geist](https://vercel.com/font) |
| Linting | ESLint (Next.js config) |

## Project Structure

```
FaithFrames/
└── my-app/
    ├── src/
    │   ├── app/
    │   │   ├── page.js                    # Public landing page
    │   │   ├── about/, pricing/, contact/ # Marketing pages
    │   │   ├── privacy-policy/, terms-and-conditions/, refund-policy/
    │   │   ├── login/, signup/, logout/   # Auth pages
    │   │   ├── admin/                     # Admin dashboard (session-protected)
    │   │   │   ├── page.js                # Main dashboard
    │   │   │   ├── bible/                 # Bible content suite
    │   │   │   │   ├── manager/, carousel/, plans/
    │   │   │   │   ├── daily-verses/, banners/, announcements/, analytics/
    │   │   │   ├── bible-content/         # Bible article content (Explore Faith)
    │   │   │   ├── jesus/, jesus-content/
    │   │   │   ├── prayers/, prayers-content/
    │   │   │   ├── worship/, worship-content/
    │   │   │   ├── witness-videos/        # Scripture videos
    │   │   │   ├── uploads/               # Wallpapers, quiz, daily verse/prayer, stories, etc.
    │   │   │   └── premium-users/         # Subscription/premium management
    │   │   └── api/
    │   │       ├── login/, logout/, session/    # Auth endpoints
    │   │       ├── contact/                     # Contact form handler
    │   │       └── admin/
    │   │           ├── cloudinary-sign/, cloudinary-delete/
    │   │           ├── content/, collection/
    │   │           ├── users/, premium-users/
    │   │           ├── payments/transactions/
    │   │           └── stats/
    │   ├── components/            # Feature-organized UI components
    │   │   ├── Navbar/, Hero/, About/, Description/, FaqSection/, Testimonial/, Newsletter/, Footer/
    │   │   ├── Sidebar/, Dashboard/                       # Admin shell
    │   │   ├── UploadWallpaper/, UploadQuiz/, UploadPrayers/, UploadQuotesPanel/
    │   │   ├── UploadStories/, UploadFeaturedStory/, UploadWitness/, UploadmeetShare/
    │   │   ├── Bible/, Content/, DailyVerseAdminPanel/, WitnessVideos/, PremiumUsers/
    │   │   ├── Profilemanager/, Signin/, Signup/
    │   │   └── ui/, shared/
    │   ├── context/                # React context providers
    │   ├── hooks/                  # Custom hooks
    │   ├── lib/                    # Firebase Admin, auth helpers, utilities
    │   ├── services/                # Data-access/service layer
    │   └── firebase.js             # Firebase client SDK setup
    ├── public/                     # Static assets
    ├── firestore.rules             # Firestore security rules
    ├── firestore.indexes.json      # Firestore composite indexes
    ├── firebase.json               # Firebase project config
    ├── netlify.toml                # Netlify build/deploy config
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm (or yarn/pnpm)
- Access to the **same Firebase project** used by the FaithFrames mobile app
- A Cloudinary account (for media uploads)
- (Optional) Razorpay and/or Stripe accounts, if you plan to manage payments

### Installation

1. Navigate to the admin panel app directory:
   ```bash
   cd "D:\Final\FaithFrames\my-app"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your local environment file:
   ```bash
   cp .env.example .env.local
   ```
   Fill in your Firebase, Cloudinary, admin, and (optional) payment credentials — see [Environment Variables](#environment-variables).

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the public site, or [http://localhost:3000/admin](http://localhost:3000/admin) for the dashboard (you'll be redirected to `/login` first).

### Production Build

```bash
npm run build
npm start
```

## Environment Variables

All variables live in `.env.local` (never committed) and are documented with placeholders in `.env.example`:

| Group | Variables |
|---|---|
| **Firebase Client (public)** | `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` |
| **Cloudinary** | `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **Firebase Admin (server-only)** | `FIREBASE_SERVICE_ACCOUNT_JSON` — full service account JSON, on a single line |
| **Admin Credentials (server-only)** | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` |
| **Payments (optional)** | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` |

Generate a strong session secret with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

> ⚠️ **Never commit `.env`, `.env.local`, or the Firebase service account JSON.** Confirm they're listed in `.gitignore` before pushing.

## Authentication Model

Admin login (`POST /api/login`) supports two strategies, tried in order:

1. **Env-configured admin** — the submitted email/password are compared directly against `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Fast to set up for a single admin.
2. **Firebase Auth admin** — the credentials are verified against Firebase Authentication; the user must either have a custom `admin` role claim or match the `ADMIN_EMAIL` account.

On success, the server issues an **HMAC-SHA256 signed session token** (`ADMIN_SESSION_SECRET`) stored in an `httpOnly`, `secure` (in production), 7-day cookie — no external session store required. `/api/logout` clears the cookie, and `/api/session` can be used to check the current session state.

## Firebase & Cloudinary Setup

The admin panel talks to the **same Firebase project** as the FaithFrames mobile app, so changes made here appear in the app immediately.

1. **Firestore rules** — deploy `firestore.rules` so the admin SDK (server-side, privileged) can write freely while client access stays locked down appropriately for the mobile app.
2. **Composite indexes** — deploy `firestore.indexes.json` for any queries that require them.
3. **Service account** — create a Firebase service account (Project Settings → Service Accounts → Generate new private key) and paste the JSON into `FIREBASE_SERVICE_ACCOUNT_JSON`.
4. **Cloudinary** — create an unsigned upload preset for client-side uploads (`NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`) and keep the API secret server-side only for signed operations and deletions.

```bash
# Deploy rules & indexes with the Firebase CLI
firebase deploy --only firestore:rules,firestore:indexes
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create an optimized production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint over the project |

## Deployment

The app is preconfigured for **Netlify** (`netlify.toml` + `@netlify/plugin-nextjs`), but as a standard Next.js app it can also be deployed to:

- **Vercel** — zero-config Next.js hosting
- **Firebase Hosting** (with Cloud Functions/Cloud Run for SSR)
- Any Node.js-capable host (Docker, Railway, Render, etc.)

Whichever platform you choose, make sure **all environment variables** from `.env.example` are configured in that platform's dashboard/CLI before deploying.

## Contributing

1. Create a feature branch from `main`
2. Make your changes and run `npm run lint`
3. Commit with a clear message and open a pull request

```bash
git add .
git commit -m "feat: describe your change"
git push origin your-branch
```

## License

MIT
