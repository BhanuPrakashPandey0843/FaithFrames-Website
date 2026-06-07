# FaithFrames Admin Panel

A powerful admin dashboard for managing the FaithFrames mobile app's content, including wallpapers, daily verses, prayers, quotes, study plans, and more.

## Features

- 🔐 **Secure Admin Login**: Protected authentication for admin users
- 📊 **Dashboard**: Real-time analytics and content overview
- 🖼️ **Wallpaper Management**: Upload, edit, and delete wallpapers
- 📖 **Content Management**: Manage daily verses, prayers, quotes, and study plans
- 💬 **Community Moderation**: Review and manage user-shared content
- 📱 **Notifications**: Send push notifications to app users
- 📈 **Analytics**: Track app performance and user engagement

## Tech Stack

- **Next.js 15**: Full-stack React framework
- **React 19**: UI library
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations
- **Firebase 12.1**: Backend integration
- **Cloudinary**: Image management
- **Lucide React**: Beautiful icons
- **Recharts**: Data visualization

## Getting Started

### Prerequisites

- Node.js 20 or later
- npm or yarn
- Same Firebase project as the mobile app

### Installation

1. Navigate to the admin panel directory:
```bash
cd "FaithFrames Website/my-app"
```

2. Install dependencies:
```bash
npm install
```

3. Create your `.env.local` file:
```bash
cp .env.example .env.local
```
Then fill in your Firebase, Cloudinary, and admin credentials.

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
FaithFrames Website/
└── my-app/
    ├── src/
    │   ├── app/            # Next.js App Router pages
    │   ├── components/     # Reusable UI components
    │   ├── lib/            # Utility functions & configs
    │   └── firebase.js     # Firebase setup
    ├── public/             # Static assets
    └── package.json
```

## Environment Variables

Required variables in `.env.local`:
- Firebase configuration (public & admin SDK)
- Cloudinary credentials
- Admin email & password
- Session secret

See `.env.example` for full list.

## Firebase Setup

The admin panel uses the **same Firebase project** as the mobile app. Make sure:
1. Firestore rules allow admin write access
2. Create a Firebase service account for admin SDK
3. Store the service account credentials securely

## Deployment

The admin panel can be deployed to:
- Vercel
- Netlify
- Firebase Hosting
- Any Node.js hosting provider

## License

MIT
