# GitHub Pages Setup Guide

This guide explains how to configure GitHub repository settings for automated deployment of both the Foodie PWA app and documentation.

---

## Overview

The deployment workflow builds and deploys:
- **React App** → Root: `https://artemiopadilla.github.io/foodie/`
- **MkDocs Documentation** → Subdirectory: `https://artemiopadilla.github.io/foodie/docs/`

Both are deployed together to GitHub Pages from a single workflow.

---

## Required GitHub Repository Settings

### 1. Enable GitHub Actions Write Permissions

**Steps:**
1. Go to your repository on GitHub
2. Navigate to: **Settings** > **Actions** > **General**
3. Scroll to: **Workflow permissions**
4. Select: **"Read and write permissions"**
5. Check: **"Allow GitHub Actions to create and approve pull requests"**
6. Click: **Save**

**Why needed:** Allows the workflow to deploy to the `gh-pages` branch and create deployment artifacts.

---

### 2. Configure GitHub Pages

**Steps:**
1. Go to: **Settings** > **Pages**
2. Under **Source**:
   - Select: **"Deploy from a branch"**
   - Branch: **`gh-pages`**
   - Folder: **`/ (root)`**
3. Click: **Save**

**Result:** GitHub Pages will serve your site from the `gh-pages` branch.

---

### 3. Wait for Initial Deployment

**After pushing to `main`:**
1. Go to: **Actions** tab
2. Find the **"Deploy to GitHub Pages"** workflow
3. Wait for it to complete (usually 2-4 minutes)
4. Check the **Pages** section in Settings to see the deployment URL

**Initial URL:** `https://artemiopadilla.github.io/foodie/`

---

## Workflow Triggers

The deployment workflow runs when:

1. **Automatic Triggers:**
   - Push to `main` branch
   - Changes to any of these paths:
     - `src/**` (React app code)
     - `public/**` (Static assets)
     - `docs/**` (Documentation)
     - `mkdocs.yml` (Docs config)
     - `requirements.txt` (Python dependencies)
     - `package.json` (Node dependencies)
     - `vite.config.ts` (Build config)
     - `.github/workflows/deploy.yml` (Workflow itself)

2. **Manual Trigger:**
   - Go to: **Actions** > **Deploy to GitHub Pages** > **Run workflow**
   - Select branch: `main`
   - Click: **Run workflow**

---

## Workflow Steps

The deployment process:

1. ✅ Checkout code with full git history
2. ✅ Setup Node.js and cache npm dependencies
3. ✅ Install Node dependencies (`npm ci`)
4. ✅ Build React app → `dist/`
5. ✅ Setup Python and cache pip dependencies
6. ✅ Install MkDocs dependencies (`pip install -r requirements.txt`)
7. ✅ Build MkDocs documentation → `site/`
8. ✅ Merge builds (copy `site/` into `dist/docs/`)
9. ✅ Upload combined artifact to GitHub
10. ✅ Deploy artifact to GitHub Pages

---

## Verifying Deployment

### Check Build Status

**GitHub Actions:**
1. Go to: **Actions** tab
2. Click on latest workflow run
3. Check all steps are green ✅
4. Look for any errors in logs

### Test Deployed Sites

**React App:**
```
https://artemiopadilla.github.io/foodie/
```

**Expected:**
- Foodie PWA loads
- Recipe browsing works
- Meal planner accessible
- All features functional

**Documentation:**
```
https://artemiopadilla.github.io/foodie/docs/
```

**Expected:**
- MkDocs Material theme
- Dark mode toggle works
- Search functionality works
- All documentation pages accessible
- Navigation works correctly

### Common URLs to Test

```bash
# Main app
https://artemiopadilla.github.io/foodie/

# Docs home
https://artemiopadilla.github.io/foodie/docs/

# Getting started
https://artemiopadilla.github.io/foodie/docs/getting-started/quick-start/

# API reference
https://artemiopadilla.github.io/foodie/docs/reference/api/

# Deployment guide
https://artemiopadilla.github.io/foodie/docs/guides/deployment/
```

---

## Troubleshooting

### Issue 1: Workflow Fails with Permissions Error

**Error:** `refusing to allow a GitHub App to create or update workflow`

**Solution:**
- Check workflow permissions are set to "Read and write"
- Ensure Actions are enabled for the repository

### Issue 2: Pages Not Deploying

**Error:** No site appears after successful workflow

**Solution:**
1. Go to Settings > Pages
2. Ensure source is set to `gh-pages` branch
3. Wait 1-2 minutes for DNS propagation
4. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

### Issue 3: 404 on Documentation Pages

**Error:** `/docs/` returns 404

**Solution:**
- Check that `mkdocs build` step succeeded in workflow
- Verify `dist/docs/` folder was created
- Check `mkdocs.yml` has `site_url` ending with `/docs`

### Issue 4: Build Fails on MkDocs Step

**Error:** Python dependency installation fails

**Solution:**
- Check `requirements.txt` is valid
- Ensure Python version is 3.x
- Check for plugin compatibility issues

### Issue 5: Missing Git History

**Error:** Git-based plugins fail

**Solution:**
- Ensure `fetch-depth: 0` is set in checkout step
- This fetches full git history for git-revision-date plugin

---

## Monitoring Deployment

### Build Times

**Expected durations:**
- Node.js setup + install: ~30-45 seconds
- React build: ~45-60 seconds
- Python setup + install: ~30-45 seconds
- MkDocs build: ~20-30 seconds
- Upload + Deploy: ~20-30 seconds
- **Total: ~2-4 minutes**

### Cache Effectiveness

**First build:** ~3-4 minutes (no cache)
**Subsequent builds:** ~2-3 minutes (with cache)

**Cache benefits:**
- npm dependencies cached by Node action
- pip dependencies cached manually
- Speeds up builds by ~30%

---

## Custom Domain Setup (Optional)

### Using a Custom Domain

**Steps:**
1. Add `CNAME` file to `public/` directory with your domain
2. Configure DNS at your domain provider:
   - Add A records pointing to GitHub Pages IPs
   - Or add CNAME record pointing to `artemiopadilla.github.io`
3. Go to Settings > Pages > Custom domain
4. Enter your domain and click Save
5. Wait for DNS verification and HTTPS provisioning

**Example CNAME file:**
```
foodie.example.com
```

---

## Performance Optimization

### Workflow Optimization

**Already implemented:**
- Path-based triggers (only builds when needed)
- npm cache (via actions/setup-node)
- pip cache (via actions/cache)
- Concurrency control (prevents duplicate runs)

### Further Optimizations

**Optional improvements:**
- Use `cache: 'pip'` in actions/setup-python@v5 (when available)
- Implement build artifacts reuse between jobs
- Use matrix builds for parallel testing

---

## Security Considerations

### Repository Secrets

**No secrets needed for basic deployment!**

**Optional secrets:**
- `GH_TOKEN` - For git-committers plugin API access (auto-provided)
- `VITE_*` - For production environment variables

**Adding secrets:**
1. Go to: Settings > Secrets and variables > Actions
2. Click: New repository secret
3. Add name and value
4. Reference in workflow: `${{ secrets.SECRET_NAME }}`

---

## CI/CD Best Practices

### ✅ Implemented

- Automated deployment on push to main
- Manual workflow dispatch for testing
- Path-based triggers to save CI minutes
- Proper permissions scoping
- Concurrency control
- Caching for faster builds
- Full git history for git-based plugins

### ⚠️ Recommended

- Add status badges to README
- Set up deployment notifications (Slack, email)
- Implement deployment previews for PRs
- Add performance budgets
- Monitor deployment failures

---

## Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [MkDocs Deployment Guide](https://www.mkdocs.org/user-guide/deploying-your-docs/)
- [Material for MkDocs Setup](https://squidfunk.github.io/mkdocs-material/setup/)

---

## Need Help?

If you encounter issues:

1. Check the [Actions tab](https://github.com/artemiopadilla/foodie/actions) for build logs
2. Review this troubleshooting guide
3. [Open an issue](https://github.com/artemiopadilla/foodie/issues) on GitHub
4. Check [MkDocs discussions](https://github.com/squidfunk/mkdocs-material/discussions)

---

**Setup Complete!** Your Foodie PWA and documentation will now automatically deploy to GitHub Pages on every push to `main`. 🚀
