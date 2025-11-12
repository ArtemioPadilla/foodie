# Configuration Guide

This guide covers all configuration options for Foodie PWA, including environment variables, Firebase setup, deployment settings, and customization options.

---

## Environment Variables

Foodie uses environment variables for configuration. All variables must be prefixed with `VITE_` to be accessible in the browser.

### .env File Structure

Create a `.env` file in the project root:

```env
# =======================
# APP CONFIGURATION
# =======================
VITE_APP_NAME=Foodie
VITE_APP_URL=http://localhost:5173
VITE_APP_DESCRIPTION=Your Personal Meal Planning Assistant

# =======================
# FIREBASE CONFIGURATION
# =======================
VITE_ENABLE_FIREBASE=false
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# =======================
# GITHUB INTEGRATION
# =======================
VITE_ENABLE_GITHUB_INTEGRATION=false
VITE_GITHUB_CLIENT_ID=
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_GITHUB_REPO_OWNER=artemiopadilla
VITE_GITHUB_REPO_NAME=foodie

# =======================
# ANALYTICS
# =======================
VITE_ENABLE_ANALYTICS=false
VITE_GA_MEASUREMENT_ID=

# =======================
# FEATURE FLAGS
# =======================
VITE_ENABLE_PANTRY=true
VITE_ENABLE_MEAL_PLANNER=true
VITE_ENABLE_SHOPPING_LIST=true
VITE_ENABLE_RECIPE_CONTRIBUTIONS=true
VITE_ENABLE_SOCIAL_SHARING=true

# =======================
# PWA CONFIGURATION
# =======================
VITE_PWA_SHORT_NAME=Foodie
VITE_PWA_THEME_COLOR=#10b981
VITE_PWA_BACKGROUND_COLOR=#ffffff

# =======================
# API ENDPOINTS (if using external APIs)
# =======================
VITE_API_BASE_URL=
VITE_NUTRITION_API_KEY=
VITE_RECIPE_API_KEY=
```

---

## Variable Reference

### App Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_APP_NAME` | string | "Foodie" | Application name shown in UI |
| `VITE_APP_URL` | string | - | Base URL for the app |
| `VITE_APP_DESCRIPTION` | string | - | Meta description for SEO |

### Firebase Configuration

Enable cloud features like authentication and data sync.

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `VITE_ENABLE_FIREBASE` | boolean | No | Enable/disable Firebase features |
| `VITE_FIREBASE_API_KEY` | string | Yes* | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | string | Yes* | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | string | Yes* | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | string | Yes* | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | string | Yes* | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | string | Yes* | Firebase app ID |

*Required only if `VITE_ENABLE_FIREBASE=true`

**Getting Firebase Credentials:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings > Your apps
4. Copy the config object values

### GitHub Integration

Enable recipe contributions via GitHub PRs.

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `VITE_ENABLE_GITHUB_INTEGRATION` | boolean | No | Enable GitHub features |
| `VITE_GITHUB_CLIENT_ID` | string | Yes* | GitHub OAuth client ID |
| `VITE_GITHUB_REDIRECT_URI` | string | Yes* | OAuth callback URL |
| `VITE_GITHUB_REPO_OWNER` | string | No | GitHub username/org |
| `VITE_GITHUB_REPO_NAME` | string | No | Repository name |

*Required only if `VITE_ENABLE_GITHUB_INTEGRATION=true`

**Setting up GitHub OAuth:**
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth app
3. Set callback URL to match `VITE_GITHUB_REDIRECT_URI`
4. Copy the Client ID

### Analytics Configuration

Track user interactions with Google Analytics.

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `VITE_ENABLE_ANALYTICS` | boolean | No | Enable Google Analytics |
| `VITE_GA_MEASUREMENT_ID` | string | Yes* | GA4 Measurement ID (G-XXXXXXXXXX) |

*Required only if `VITE_ENABLE_ANALYTICS=true`

### Feature Flags

Toggle specific features on/off.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_ENABLE_PANTRY` | boolean | true | Enable pantry management |
| `VITE_ENABLE_MEAL_PLANNER` | boolean | true | Enable meal planning |
| `VITE_ENABLE_SHOPPING_LIST` | boolean | true | Enable shopping lists |
| `VITE_ENABLE_RECIPE_CONTRIBUTIONS` | boolean | true | Enable recipe submissions |
| `VITE_ENABLE_SOCIAL_SHARING` | boolean | true | Enable social share buttons |

---

## Firebase Configuration

### Authentication Setup

1. **Enable Authentication Providers**
   ```
   Firebase Console > Authentication > Sign-in method
   ```

2. **Enable Email/Password**
   - Toggle on "Email/Password"
   - Optionally enable "Email link (passwordless sign-in)"

3. **Enable Google Sign-In**
   - Toggle on "Google"
   - Add your project's support email

4. **Configure Authorized Domains**
   ```
   Add: localhost, your-domain.com
   ```

### Firestore Database Setup

1. **Create Database**
   ```
   Firebase Console > Firestore Database > Create database
   ```

2. **Set Security Rules**

   For development:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

   For production:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // User data
       match /users/{userId} {
         allow read, write: if request.auth.uid == userId;
       }

       // Meal plans
       match /mealPlans/{planId} {
         allow read: if resource.data.isPublic == true
                    || request.auth.uid == resource.data.userId;
         allow write: if request.auth.uid == resource.data.userId;
       }

       // Recipes (read-only for users)
       match /recipes/{recipeId} {
         allow read: if true;
         allow write: if false; // Only admins via admin SDK
       }
     }
   }
   ```

3. **Create Indexes** (if needed)
   ```
   Firestore will suggest indexes when queries fail.
   Click the link in console errors to auto-create.
   ```

### Storage Setup

1. **Create Storage Bucket**
   ```
   Firebase Console > Storage > Get started
   ```

2. **Set Storage Rules**

   For development:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read: if true;
         allow write: if request.auth != null;
       }
     }
   }
   ```

   For production:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       // User profile images
       match /users/{userId}/profile/{imageId} {
         allow read: if true;
         allow write: if request.auth.uid == userId
                     && request.resource.size < 5 * 1024 * 1024 // 5MB
                     && request.resource.contentType.matches('image/.*');
       }

       // Recipe images (user-contributed)
       match /recipes/{recipeId}/{imageId} {
         allow read: if true;
         allow write: if request.auth != null
                     && request.resource.size < 10 * 1024 * 1024 // 10MB
                     && request.resource.contentType.matches('image/.*');
       }
     }
   }
   ```

---

## Vite Configuration

### vite.config.ts

Main configuration file for Vite:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Foodie - Meal Planning PWA',
        short_name: 'Foodie',
        description: 'Your Personal Meal Planning Assistant',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  base: '/foodie/', // Change this for GitHub Pages deployment
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui-vendor': ['framer-motion']
        }
      }
    }
  }
});
```

### Key Configuration Options

**Base Path:**
- For root domain: `base: '/'`
- For subdirectory: `base: '/foodie/'`
- For GitHub Pages: `base: '/repo-name/'`

**Build Optimization:**
- Manual chunks split large bundles
- Sourcemaps disabled in production
- Assets minified automatically

**Server Options:**
- Port: 5173 (default)
- Host: true (expose to network)
- strictPort: false (use next available)

---

## Tailwind Configuration

### tailwind.config.js

Customize the design system:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Add custom colors here
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Add custom fonts here
      },
      spacing: {
        // Add custom spacing values
      },
      borderRadius: {
        // Add custom border radius values
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

---

## Internationalization (i18n)

### src/i18n.ts

Configure supported languages:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: require('../public/locales/en/translation.json') },
      es: { translation: require('../public/locales/es/translation.json') },
      fr: { translation: require('../public/locales/fr/translation.json') }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'fr'],
    interpolation: {
      escapeValue: false
    }
  });
```

---

## Deployment Configuration

### For Vercel

See `vercel.json` for security headers and routing.

### For Netlify

See `netlify.toml` for build settings and headers.

### For GitHub Pages

Update `base` in `vite.config.ts` to match your repo name.

---

## Next Steps

- **[Deployment Guide](../guides/deployment.md)** - Deploy to production
- **[Development Guide](../guides/development.md)** - Start developing
- **[API Reference](../reference/api.md)** - API documentation

---

**Configuration Complete! ⚙️**
