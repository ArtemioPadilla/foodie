# Firebase Setup Guide - Foodie PWA

This guide explains how to configure Firebase for the Foodie application to enable cloud-based meal plan sharing.

## Overview

Firebase is currently configured with live credentials in `src/services/firebaseService.ts`. The application will automatically:
- ✅ Upload shared meal plans to Firestore when users generate share links
- ✅ Load shared meal plans from Firestore when accessed via shared URLs
- ✅ Fall back to localStorage if Firebase is unavailable

## Current Configuration

The app is already configured with a Firebase project (`foodie-cc553`). No additional setup is required for basic functionality.

### Active Services

1. **Firebase Authentication** - User sign-in with Google, GitHub, and email/password
2. **Cloud Firestore** - Shared meal plan storage
3. **Firebase Hosting** (optional) - Can be used instead of GitHub Pages

## How It Works

### Sharing a Meal Plan

When a user clicks "Generate Share Link" in the planner:

1. A unique share token is generated locally
2. The plan is saved to localStorage
3. **Automatically**: The plan is uploaded to Firestore (`sharedPlans` collection)
4. A shareable URL is generated: `https://yourapp.com/shared/plan/{token}`

### Accessing a Shared Plan

When someone visits a shared plan URL:

1. **First**: App attempts to load from Firestore using the token
2. **Fallback**: If Firestore is unavailable, loads from localStorage (same device only)
3. Displays a "Loaded from cloud" indicator when successfully loaded from Firestore

## Firebase Console Access

**Project URL**: https://console.firebase.google.com/project/foodie-cc553

### Security Rules

Current Firestore rules allow:
- ✅ Anyone to read shared plans (public sharing)
- ❌ Only authenticated users to write/update plans

**Recommended Firestore Rules** (`firestore.rules`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Shared meal plans - public read, authenticated write
    match /sharedPlans/{planId} {
      allow read: if true;  // Anyone can read shared plans
      allow write: if request.auth != null;  // Only authenticated users can create/update
      allow delete: if request.auth != null && request.auth.uid == resource.data.createdBy;
    }
  }
}
```

## Optional: Setting Up Your Own Firebase Project

If you want to use your own Firebase project instead:

### Step 1: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click "Add project"
3. Enter project name (e.g., "my-foodie-app")
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Register Web App

1. In your Firebase project, click the web icon (`</>`)
2. Register app name: "Foodie PWA"
3. ✅ Check "Also set up Firebase Hosting"
4. Click "Register app"
5. **Copy the config object** - you'll need this

### Step 3: Enable Firestore

1. In Firebase console, go to "Firestore Database"
2. Click "Create database"
3. Start in **production mode**
4. Choose a Cloud Firestore location (pick closest to your users)
5. Click "Enable"
6. Go to "Rules" tab and update with the recommended rules above

### Step 4: Enable Authentication (Optional)

1. Go to "Authentication" in Firebase console
2. Click "Get started"
3. Enable sign-in methods:
   - Email/Password
   - Google
   - GitHub (requires GitHub OAuth app setup)

### Step 5: Update Firebase Config

Replace the config in `src/services/firebaseService.ts`:

```typescript
const firebaseConfig: FirebaseOptions = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"  // Optional
};
```

### Step 6: Deploy Firestore Indexes (If Needed)

If you add queries with multiple filters:

```bash
firebase deploy --only firestore:indexes
```

## Features Enabled

### ✅ Already Working

1. **Shared Meal Plans**
   - Automatic cloud sync when sharing
   - Public URLs that work across devices
   - Graceful fallback to localStorage

2. **Authentication** (infrastructure ready)
   - Email/password sign-up and login
   - Google OAuth
   - GitHub OAuth

### 🔄 Ready to Enable

1. **User-specific Data**
   - Save favorites to cloud
   - Sync meal plans across devices
   - Cloud backup of custom prices

2. **Collaboration**
   - Share editable plans with specific users
   - Team meal planning

## Monitoring & Analytics

### View Firestore Usage

1. Go to Firebase Console > Firestore Database
2. Click "Usage" tab
3. Monitor:
   - Document reads/writes
   - Storage used
   - Network egress

### Free Tier Limits

- **Firestore**: 50,000 reads/day, 20,000 writes/day, 1GB storage
- **Authentication**: Unlimited users
- **Hosting**: 10GB bandwidth/month

For most users, these limits are sufficient.

## Troubleshooting

### Issue: "Cloud sync unavailable" message

**Causes**:
- Firebase config is incorrect
- Firestore is not enabled
- Network/connectivity issues

**Solution**:
1. Check browser console for Firebase errors
2. Verify Firestore is enabled in Firebase console
3. Check Firestore security rules allow writes

### Issue: Shared plans not loading on other devices

**Causes**:
- Plan was shared before Firebase integration
- Firestore upload failed (user saw warning)

**Solution**:
- Re-generate the share link to upload to Firestore
- Check Firestore console to see if document exists

### Issue: Build errors related to Firebase

**Causes**:
- Missing Firebase dependencies

**Solution**:
```bash
npm install firebase
```

## Cost Optimization

### Reduce Reads

Current implementation is already optimized:
- ✅ Single read per shared plan view
- ✅ No real-time listeners (would use reads continuously)
- ✅ localStorage fallback reduces cloud reads

### Reduce Writes

- Plans are only written once when share link is generated
- No automatic re-syncing

## Security Best Practices

### ✅ Currently Implemented

1. **Public data is truly public** - No PII in shared plans
2. **Write authentication** - Only authenticated users can create plans
3. **Client-side validation** - Data validated before upload

### 🔒 Recommendations

1. **Add user ownership**:
   ```typescript
   await setDoc(planRef, {
     ...plan,
     createdBy: user.uid,  // Track owner
     sharedAt: serverTimestamp(),
   });
   ```

2. **Implement rate limiting** - Prevent spam/abuse
3. **Add plan expiration** - Auto-delete old shared plans

## Next Steps

1. ✅ **Working Now**: Cloud sharing is live and functional
2. **Optional**: Set up your own Firebase project using steps above
3. **Future**: Enable user-specific features (sync favorites, etc.)

## Support

- Firebase Documentation: https://firebase.google.com/docs/web/setup
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Firebase Console: https://console.firebase.google.com

---

**Last Updated**: 2025-11-25
**Firebase SDK Version**: 10.x
**Project**: foodie-cc553
