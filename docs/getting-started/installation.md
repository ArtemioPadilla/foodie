# Installation Guide

This comprehensive guide will walk you through setting up Foodie PWA for local development, including optional Firebase and GitHub integrations.

---

## Prerequisites

### Required Software

1. **Node.js** (v18.x or v20.x)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify: `node --version`

2. **npm** (v9.x or higher)
   - Comes with Node.js
   - Verify: `npm --version`

3. **Git**
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify: `git --version`

### Optional Software

4. **VS Code** (recommended IDE)
   - Download from [code.visualstudio.com](https://code.visualstudio.com/)
   - Recommended extensions:
     - ESLint
     - Prettier
     - Tailwind CSS IntelliSense
     - TypeScript Vue Plugin (Volar)

5. **Python 3.8+** (for MkDocs documentation)
   - Download from [python.org](https://www.python.org/)
   - Verify: `python --version`

---

## Step 1: Clone the Repository

### Using HTTPS

```bash
git clone https://github.com/artemiopadilla/foodie.git
cd foodie
```

### Using SSH (if you have SSH keys configured)

```bash
git clone git@github.com:artemiopadilla/foodie.git
cd foodie
```

---

## Step 2: Install Dependencies

### Install Node.js Dependencies

```bash
npm install
```

This installs:
- React 18 and React DOM
- Vite 5
- TypeScript
- Tailwind CSS
- React Router
- i18next for internationalization
- Firebase SDK (optional)
- And all development dependencies

### Install Python Dependencies (Optional - for documentation)

```bash
pip install -r requirements.txt
```

This installs MkDocs and Material theme for building documentation.

---

## Step 3: Environment Configuration

### Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

### Edit .env File

Open `.env` in your editor and configure:

```env
# App Configuration
VITE_APP_NAME=Foodie
VITE_APP_URL=http://localhost:5173

# Firebase Configuration (Optional - for authentication and cloud sync)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# GitHub OAuth (Optional - for recipe contributions)
VITE_GITHUB_CLIENT_ID=your_github_oauth_client_id
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback

# Google Analytics (Optional - for analytics)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Feature Flags
VITE_ENABLE_FIREBASE=false
VITE_ENABLE_GITHUB_INTEGRATION=false
VITE_ENABLE_ANALYTICS=false
```

---

## Step 4: Firebase Setup (Optional)

If you want authentication and cloud sync features:

### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name (e.g., "foodie-app")
4. Follow the setup wizard

### Enable Authentication

1. In Firebase Console, navigate to **Authentication**
2. Click **"Get started"**
3. Enable sign-in methods:
   - **Email/Password**
   - **Google** (recommended)
4. Configure authorized domains

### Create Firestore Database

1. Navigate to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (for development)
4. Select a location close to your users

### Get Configuration Values

1. In Firebase Console, go to **Project Settings**
2. Scroll to **"Your apps"**
3. Click **"Web"** icon to add a web app
4. Copy the configuration values to your `.env` file

### Update .env with Firebase Config

```env
VITE_ENABLE_FIREBASE=true
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=foodie-app.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=foodie-app
VITE_FIREBASE_STORAGE_BUCKET=foodie-app.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
```

---

## Step 5: GitHub OAuth Setup (Optional)

For recipe contribution features via GitHub:

### Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in details:
   - **Application name**: Foodie Recipe Contributions
   - **Homepage URL**: http://localhost:5173
   - **Authorization callback URL**: http://localhost:5173/auth/callback
4. Click **"Register application"**
5. Copy the **Client ID**
6. Generate a **Client Secret**

### Update .env with GitHub Config

```env
VITE_ENABLE_GITHUB_INTEGRATION=true
VITE_GITHUB_CLIENT_ID=your_client_id_here
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/callback
```

---

## Step 6: Google Analytics Setup (Optional)

For tracking usage analytics:

### Create Google Analytics Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new property
3. Set up a **Web data stream**
4. Copy the **Measurement ID** (format: G-XXXXXXXXXX)

### Update .env with Analytics Config

```env
VITE_ENABLE_ANALYTICS=true
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Update index.html

The Google Analytics script is already in `index.html`. It will automatically use the measurement ID from your environment variables.

---

## Step 7: Verify Installation

### Start Development Server

```bash
npm run dev
```

Expected output:

```
  VITE v5.0.0  ready in 324 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Open in Browser

Navigate to [http://localhost:5173](http://localhost:5173)

### Check Console

Open browser DevTools (F12) and check:
- No console errors
- App loads successfully
- Recipes are visible

### Test Features

1. **Browse Recipes**: Navigate to Recipes page
2. **Search**: Try searching for "eggs"
3. **Filter**: Apply some filters
4. **Recipe Detail**: Click on a recipe
5. **Language Switch**: Change language (EN/ES/FR)
6. **Dark Mode**: Toggle dark mode

---

## Step 8: Run Tests

### Unit Tests

```bash
npm test
```

### E2E Tests (requires Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e
```

### Linting

```bash
npm run lint
```

---

## Common Issues and Solutions

### Issue: Port 5173 Already in Use

**Solution:**
```bash
# Kill the process
npx kill-port 5173

# Or use a different port
npm run dev -- --port 3000
```

### Issue: Module Not Found Errors

**Solution:**
```bash
# Delete and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript Errors

**Solution:**
```bash
# Rebuild TypeScript
npm run build

# If using VS Code, restart TS server:
# Cmd+Shift+P > "TypeScript: Restart TS Server"
```

### Issue: Firebase Not Working

**Checklist:**
- [ ] Firebase config values are correct in `.env`
- [ ] `VITE_ENABLE_FIREBASE=true` in `.env`
- [ ] Firestore rules allow read/write
- [ ] Browser allows third-party cookies
- [ ] No console errors in DevTools

### Issue: Styles Not Loading

**Solution:**
```bash
# Rebuild Tailwind
npm run build

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

### Issue: Images Not Loading

**Checklist:**
- [ ] Images exist in `public/images/`
- [ ] Image paths are correct (relative to `public/`)
- [ ] No typos in file names
- [ ] Images are in supported formats (JPG, PNG, WebP, SVG)

---

## Development Environment Setup

### VS Code Extensions (Recommended)

Install these extensions for the best development experience:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "usernamehw.errorlens",
    "christian-kohler.path-intellisense",
    "ms-playwright.playwright"
  ]
}
```

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## Next Steps

Now that installation is complete:

1. **[Quick Start Guide](quick-start.md)** - Learn basic usage
2. **[Configuration Guide](configuration.md)** - Advanced configuration
3. **[Development Guide](../guides/development.md)** - Start developing
4. **[Testing Guide](../guides/testing.md)** - Write tests

---

## Getting Help

If you encounter issues not covered here:

- 📖 Check the [troubleshooting section](#common-issues-and-solutions)
- 🐛 [Open an issue](https://github.com/artemiopadilla/foodie/issues)
- 💬 [Ask in discussions](https://github.com/artemiopadilla/foodie/discussions)
- 📧 Email: foodie@example.com

---

**Installation Complete! 🎉**

You're now ready to start developing with Foodie PWA!
