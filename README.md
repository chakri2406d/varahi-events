# Varahi Events Website

> *Turning Events Into Experiences* — A full-stack event management & booking platform.

## Tech Stack
- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS with custom brand tokens
- **Animations**: Framer Motion
- **Backend**: Firebase (Auth + Firestore + Storage)
- **Routing**: React Router v6

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Authentication** → Sign-in methods → Email/Password + Google
4. Create **Firestore Database** (start in test mode)
5. Enable **Storage**
6. Copy your project config from Project Settings

### 3. Environment Variables
```bash
cp .env.example .env
# Fill in your Firebase config values in .env
```

### 4. Run Dev Server
```bash
npm run dev
# Opens at http://localhost:3000
```

### 5. Build for Production
```bash
npm run build
```

---

## Setting Up Admin Access

To make a user admin:
1. Register normally through the website
2. In Firebase Console → Firestore → `users` collection
3. Find your user document
4. Add/update field: `role: "admin"`

Admin portal is accessible at `/admin`

---

## Firebase Security Rules (Firestore)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public read for events, gallery, machines
    match /events/{doc}   { allow read: if true; allow write: if isAdmin(); }
    match /gallery/{doc}  { allow read: if true; allow write: if isAdmin(); }
    match /machines/{doc} { allow read: if true; allow write: if isAdmin(); }

    // Authenticated users can create bookings
    match /bookings/{doc} {
      allow create: if request.auth != null;
      allow read:   if request.auth.uid == resource.data.userId || isAdmin();
      allow update: if isAdmin();
    }

    // Expenses and pricing — admin only
    match /expenses/{doc}      { allow read, write: if isAdmin(); }
    match /notifications/{doc} { allow read, write: if request.auth != null; }

    // User profiles
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid || isAdmin();
    }

    function isAdmin() {
      return request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## Project Structure

```
src/
├── components/
│   ├── layout/        # Navbar, Footer, MobileNav, LoadingScreen
│   ├── home/          # Hero, Stats, Works, FutureEvents, CallToAction
│   ├── booking/       # EquipmentCard, BookingFlow, PaymentSection
│   ├── user/          # (Invoice component)
│   └── admin/         # AdminDashboard, BookingManagement, MachineManagement,
│                      #   PricingManagement, ExpenseManagement, PnLDashboard
├── pages/             # Home, Events, Equipment, Calendar, Gallery,
│                      #   Contact, Login, Dashboard, AdminPortal, NotFound
├── firebase/          # config.js, auth.js, firestore.js, storage.js
├── context/           # AuthContext.jsx
├── utils/             # constants.js, invoiceGenerator.js, dateUtils.js
└── styles/            # globals.css
```

---

## WhatsApp Integration

Update the WhatsApp number in:
- `src/pages/Contact.jsx`
- `src/components/home/CallToAction.jsx`

Replace `91XXXXXXXXXX` with your actual number (with country code, no +).

---

## UPI / Payment

Update UPI ID in `src/utils/constants.js`:
```js
export const BUSINESS_INFO = {
  upiId: 'yourbusiness@upi',
  ...
}
```

---

## Customization

- **Brand colors**: `tailwind.config.js` → `theme.extend.colors.brand`
- **Business info**: `src/utils/constants.js` → `BUSINESS_INFO`
- **Equipment**: Add via Admin Portal → Equipment, or seed Firestore
- **Events**: Add via Admin Portal or Firestore `events` collection
