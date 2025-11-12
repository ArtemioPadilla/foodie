# Deployment Guide

This guide covers deploying Foodie PWA to production on various platforms including Vercel, Netlify, and GitHub Pages.

---

## Pre-Deployment Checklist

Before deploying to production, ensure all checks pass:

### Code Quality

```bash
# TypeScript compilation
npm run build

# ESLint checks
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Run tests
npm test
npm run test:e2e
```

**Requirements:**
- [ ] Zero TypeScript errors
- [ ] Zero ESLint errors
- [ ] All tests passing (unit, integration, E2E)
- [ ] Build succeeds without warnings
- [ ] No console errors in production build

### Security

- [ ] Security headers configured (`vercel.json` or `netlify.toml`)
- [ ] Content Security Policy implemented
- [ ] HTTPS enforced on hosting platform
- [ ] Environment variables secured (not in code)
- [ ] No API keys or secrets committed to Git
- [ ] `.env` file in `.gitignore`

### Performance

- [ ] Bundle size < 1MB (check with `npm run build`)
- [ ] Images optimized (WebP with JPEG fallback)
- [ ] Code splitting configured (automatic with Vite)
- [ ] Lazy loading for routes
- [ ] PWA caching strategies configured

### SEO

- [ ] Meta tags implemented (see `src/utils/seo.tsx`)
- [ ] Structured data for recipes (JSON-LD)
- [ ] `robots.txt` in `public/`
- [ ] Sitemap generation script ready
- [ ] 404 page exists (`NotFoundPage.tsx`)

### Accessibility

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1)
- [ ] Focus indicators visible
- [ ] Skip links implemented

### Testing

```bash
# Preview production build locally
npm run preview

# Test on localhost:4173
# Verify:
# - All routes work
# - Authentication works
# - PWA installable
# - Offline mode works
# - No console errors
```

---

## Environment Variables

### Required Variables

Set these in your deployment platform:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Optional Variables

```env
# Google Analytics
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# GitHub Integration (for recipe contributions)
VITE_GITHUB_CLIENT_ID=your-github-oauth-client-id
VITE_GITHUB_REDIRECT_URI=https://yourdomain.com/auth/callback

# Error Monitoring (Sentry)
VITE_SENTRY_DSN=your-sentry-dsn

# Feature Flags
VITE_ENABLE_FIREBASE=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_GITHUB_INTEGRATION=true
```

---

## Vercel Deployment

### Method 1: Vercel CLI

**Step 1: Install Vercel CLI**
```bash
npm install -g vercel
```

**Step 2: Login**
```bash
vercel login
```

**Step 3: Deploy**
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

### Method 2: GitHub Integration (Recommended)

**Step 1: Connect Repository**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Select **"foodie"** repository

**Step 2: Configure Build Settings**
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

**Step 3: Add Environment Variables**
1. Go to Project Settings > Environment Variables
2. Add each variable from the [Environment Variables](#environment-variables) section
3. Select environments: Production, Preview, Development

**Step 4: Deploy**
- Push to `main` branch triggers automatic deployment
- PRs create preview deployments

### Vercel Configuration

The project includes `vercel.json` with:
- Security headers (CSP, HSTS, X-Frame-Options)
- SPA routing configuration
- Static asset serving

### Features

✅ Automatic HTTPS
✅ Global CDN (300+ edge locations)
✅ Serverless functions support
✅ Preview deployments for PRs
✅ Analytics (optional)
✅ Web Vitals tracking
✅ Zero configuration needed

### Custom Domain

1. Go to Project Settings > Domains
2. Add your domain (e.g., `foodie.example.com`)
3. Configure DNS:
   - **A Record**: `76.76.21.21`
   - **CNAME**: `cname.vercel-dns.com`
4. Wait for DNS propagation (~24 hours)

---

## Netlify Deployment

### Method 1: Netlify CLI

**Step 1: Install Netlify CLI**
```bash
npm install -g netlify-cli
```

**Step 2: Login**
```bash
netlify login
```

**Step 3: Initialize**
```bash
netlify init
```

**Step 4: Deploy**
```bash
# Draft deployment
netlify deploy

# Production deployment
netlify deploy --prod
```

### Method 2: GitHub Integration (Recommended)

**Step 1: Connect Repository**
1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click **"Add new site"** > **"Import an existing project"**
3. Choose GitHub and select **"foodie"** repository

**Step 2: Configure Build Settings**
- **Base directory**: (leave empty)
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Node version**: 20

**Step 3: Add Environment Variables**
1. Go to Site Settings > Environment variables
2. Add variables (same as Vercel section)

**Step 4: Deploy**
- Push to `main` branch triggers deployment
- PRs create deploy previews

### Netlify Configuration

The project includes `netlify.toml` with:
- Security headers
- Cache-Control for static assets (1 year)
- SPA redirects
- Build configuration

### Features

✅ Automatic HTTPS
✅ Global CDN
✅ Form handling (if needed)
✅ Split testing A/B
✅ Deploy previews
✅ Rollbacks
✅ Environment variables

### Custom Domain

1. Go to Domain Settings > Add custom domain
2. Add your domain
3. Configure DNS:
   - **A Record**: Netlify load balancer IP
   - **CNAME**: `your-site.netlify.app`
4. SSL automatically provisioned

---

## GitHub Pages Deployment

### Configuration

**Step 1: Update vite.config.ts**

Change the `base` path to match your repository name:

```typescript
export default defineConfig({
  base: '/foodie/', // Replace with your repo name
  // ... rest of config
});
```

**Step 2: Install gh-pages**
```bash
npm install -D gh-pages
```

**Step 3: Add Deploy Script**

Add to `package.json`:
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

**Step 4: Deploy**
```bash
npm run deploy
```

### GitHub Actions (Automated)

Create `.github/workflows/deploy-pages.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### Enable GitHub Pages

1. Go to Repository Settings > Pages
2. Source: **GitHub Actions**
3. Save

Your site will be at: `https://username.github.io/foodie/`

### Limitations

⚠️ No environment variables (sensitive data)
⚠️ No server-side functions
⚠️ Static hosting only
✅ Free for public repositories
✅ Custom domains supported

---

## Post-Deployment Verification

### Automated Checks

```bash
# Lighthouse CI (if configured)
npm run lighthouse

# Or use web.dev/measure
# Enter your production URL
```

### Manual Checks

Visit your production site and verify:

**Functionality:**
- [ ] Site loads correctly
- [ ] All routes work (/, /recipes, /planner, etc.)
- [ ] Recipe search and filters work
- [ ] Meal planner drag-and-drop works
- [ ] Shopping list generation works
- [ ] Authentication works (if enabled)
- [ ] Language switching works (EN/ES/FR)
- [ ] Dark mode toggle works

**PWA:**
- [ ] PWA installable (install prompt appears)
- [ ] Offline mode works (disable network in DevTools)
- [ ] Service Worker registered
- [ ] App works after installation

**Performance:**
- [ ] Lighthouse Performance score > 90
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Cumulative Layout Shift < 0.1

**Security:**
- [ ] HTTPS enforced (no mixed content warnings)
- [ ] Security headers present (check DevTools Network tab)
- [ ] CSP working (no violations in console)
- [ ] No exposed secrets in source code

**SEO:**
- [ ] Meta tags present (view source)
- [ ] Open Graph tags for social sharing
- [ ] JSON-LD structured data for recipes
- [ ] robots.txt accessible
- [ ] Sitemap generated

**Accessibility:**
- [ ] Lighthouse Accessibility score = 100
- [ ] Keyboard navigation works (Tab through site)
- [ ] Screen reader compatible (test with NVDA/JAWS)
- [ ] Color contrast meets WCAG AA

**Mobile:**
- [ ] Responsive on mobile devices
- [ ] Touch targets ≥ 44px
- [ ] No horizontal scrolling
- [ ] Fast loading on 3G/4G

### Browser Testing

Test on:
- [ ] Chrome (desktop & mobile)
- [ ] Firefox
- [ ] Safari (desktop & iOS)
- [ ] Edge

---

## Monitoring Setup

### Google Analytics

Already configured in Phase 12. Verify tracking:

1. Go to [Google Analytics](https://analytics.google.com/)
2. Check Real-Time reports
3. Visit your site and see active users

### Error Monitoring (Sentry - Optional)

**Step 1: Install Sentry**
```bash
npm install @sentry/react
```

**Step 2: Initialize in src/main.tsx**
```typescript
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

**Step 3: Wrap App**
```typescript
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</Sentry.ErrorBoundary>
```

### Uptime Monitoring

Use [UptimeRobot](https://uptimerobot.com/) (free tier):

1. Create account
2. Add new monitor (HTTPS)
3. Enter your production URL
4. Set check interval (5 minutes)
5. Add alert contacts (email, Slack)

### Performance Monitoring

**Lighthouse CI** (already configured):
- Runs on every PR
- Alerts on performance regressions
- See `.lighthouserc.json`

**Web Vitals Tracking:**

Already implemented in Phase 12 (`useAnalytics` hook). Tracks:
- **LCP** (Largest Contentful Paint)
- **FID** (First Input Delay)
- **CLS** (Cumulative Layout Shift)
- **FCP** (First Contentful Paint)
- **TTFB** (Time to First Byte)

---

## Rollback Procedures

### Vercel

```bash
# List deployments
vercel ls

# Promote a previous deployment
vercel promote <deployment-url>
```

Or use the Vercel Dashboard:
1. Go to Deployments
2. Find the working deployment
3. Click "Promote to Production"

### Netlify

```bash
# List deploys
netlify deploy:list

# Restore a deploy
netlify deploy:restore <deploy-id>
```

Or use Netlify Dashboard:
1. Go to Deploys
2. Find the working deploy
3. Click "Publish deploy"

### GitHub Pages

```bash
# Revert the last commit
git revert HEAD

# Push to trigger redeployment
git push origin main
```

---

## Troubleshooting

### Build Fails

**Check:**
- Node version (should be 18.x or 20.x)
- npm version (should be 9.x+)
- No TypeScript errors (`npm run build`)
- No missing dependencies

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Routes Don't Work (404 on Refresh)

**Cause:** SPA routing not configured

**Solution:**
- Vercel: Already handled by `vercel.json`
- Netlify: Already handled by `netlify.toml`
- GitHub Pages: Use hash routing or add 404.html

### Environment Variables Not Working

**Check:**
- Variables prefixed with `VITE_`
- Variables set in deployment platform
- Rebuild after adding variables
- No typos in variable names

### PWA Not Installing

**Check:**
- HTTPS enabled
- `manifest.webmanifest` accessible
- Service Worker registered
- No console errors
- Icons (192x192, 512x512) present

### Images Not Loading

**Check:**
- Base path correct in `vite.config.ts`
- Images in `public/` folder
- Image paths relative to public (don't include /public/)
- No 404s in Network tab

### CORS Errors

**For Firebase:**
- Check Firebase Security Rules
- Verify allowed domains in Firebase Console

**For API calls:**
- Add domain to API CORS whitelist
- Check CSP headers not blocking requests

---

## Performance Optimization

### Bundle Size

Check bundle size:
```bash
npm run build

# Output shows chunk sizes
# Target: < 1MB total
```

**Optimize:**
- Code splitting (automatic with Vite)
- Tree shaking (automatic)
- Lazy load routes
- Dynamic imports for large libraries

### Image Optimization

**Current:**
- Images in `public/images/`
- WebP format with JPEG fallback
- Responsive images with srcset

**Further optimization:**
```bash
# Use the image optimization script
node scripts/optimizeImages.js
```

### Caching Strategy

**Static Assets:**
- Cache-Control: 1 year (immutable)
- Configured in `netlify.toml`

**Service Worker:**
- App shell: Cache-First
- Images: Cache-First with fallback
- API calls: Network-First with cache fallback

---

## Security Hardening

### Headers Verification

Check your production site:
```bash
curl -I https://yourdomain.com

# Should see:
# Strict-Transport-Security: max-age=31536000
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy: ...
```

### CSP Testing

Test Content Security Policy:
1. Open DevTools Console
2. Look for CSP violations
3. Adjust policy in `vercel.json` or `netlify.toml` if needed

### Dependency Auditing

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Update dependencies
npm update
```

---

## Next Steps

After successful deployment:

1. **Monitor**: Set up analytics and error tracking
2. **Test**: Conduct user testing
3. **Iterate**: Collect feedback and improve
4. **Scale**: Optimize based on real usage data
5. **Maintain**: Regular updates and security patches

---

## Additional Resources

- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Web.dev Performance Guide](https://web.dev/performance/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

---

**Deployment Complete! 🚀**

Your Foodie PWA is now live and accessible to users worldwide!
