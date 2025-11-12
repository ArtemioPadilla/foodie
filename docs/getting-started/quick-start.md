# Quick Start Guide

Get Foodie PWA running in just 5 minutes! This guide will help you set up the development environment and start using the application.

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18.x or 20.x)
- **npm** (comes with Node.js)
- **Git** for version control

### Check Your Installation

```bash
node --version  # Should show v18.x or v20.x
npm --version   # Should show 9.x or higher
git --version   # Any recent version
```

---

## 5-Minute Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/artemiopadilla/foodie.git
cd foodie
```

### Step 2: Install Dependencies

```bash
npm install
```

This will install all required packages including React, Vite, Tailwind CSS, and development tools.

### Step 3: Start the Development Server

```bash
npm run dev
```

You should see output like:

```
  VITE v5.0.0  ready in 324 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Step 4: Open Your Browser

Navigate to [http://localhost:5173](http://localhost:5173)

You should see the Foodie home page! 🎉

---

## Basic Usage

### Browse Recipes

1. Click **"Recipes"** in the navigation bar
2. Browse through 50+ curated recipes
3. Use filters to find recipes by:
   - Meal type (breakfast, lunch, dinner, snack, dessert)
   - Cuisine (Mediterranean, Mexican, Asian, etc.)
   - Dietary restrictions (vegan, gluten-free, etc.)
   - Prep/cook time

### View Recipe Details

1. Click on any recipe card
2. See ingredients, instructions, nutrition info
3. Adjust servings using the scaler
4. Use the built-in timer for cooking
5. Add to favorites (heart icon)

### Create a Meal Plan

1. Navigate to **"Meal Planner"**
2. Click **"Create New Plan"**
3. Drag recipes from the sidebar to calendar slots
4. Adjust servings for the entire plan
5. Save your plan

### Generate Shopping List

1. Open your meal plan
2. Click **"Generate Shopping List"**
3. View consolidated ingredients by category
4. Check off items as you shop
5. Export to print, CSV, or share via WhatsApp

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint for code quality |
| `npm test` | Run unit tests with Vitest |
| `npm run test:e2e` | Run end-to-end tests with Playwright |

---

## File Structure Overview

```
foodie/
├── public/              # Static assets
│   ├── images/          # Recipe and UI images
│   └── locales/         # Translation files (en, es, fr)
├── src/
│   ├── components/      # React components
│   ├── contexts/        # State management
│   ├── hooks/           # Custom hooks
│   ├── pages/           # Page components
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   └── types/           # TypeScript types
├── package.json         # Dependencies and scripts
└── vite.config.ts       # Vite configuration
```

---

## Development Tips

### Hot Module Replacement (HMR)

Vite provides instant HMR. Save any file and see changes immediately without full page reload.

### TypeScript Support

The project uses TypeScript for type safety. Your IDE will provide autocomplete and error checking.

### Tailwind CSS

Use Tailwind utility classes for styling. IntelliSense will suggest classes as you type.

### Dark Mode

Toggle dark mode using the moon/sun icon in the header. Preference is saved to localStorage.

### Language Switching

Change language using the language selector in the header. Supports English, Spanish, and French.

---

## Troubleshooting

### Port 5173 Already in Use

```bash
# Kill the process using port 5173
npx kill-port 5173

# Or specify a different port
npm run dev -- --port 3000
```

### Dependencies Not Installing

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

```bash
# Restart TypeScript server in VS Code
# Press: Cmd+Shift+P > "TypeScript: Restart TS Server"
```

### Build Errors

```bash
# Check for ESLint errors
npm run lint

# Fix auto-fixable errors
npm run lint -- --fix
```

---

## Next Steps

Now that you have Foodie running, here's what to explore next:

1. **[Installation Guide](installation.md)** - Set up Firebase and GitHub integration
2. **[Configuration Guide](configuration.md)** - Configure environment variables
3. **[Development Guide](../guides/development.md)** - Learn the development workflow
4. **[Contributing Guide](../contributing/guide.md)** - Contribute recipes or code

---

## Need Help?

- 📖 Read the [full documentation](../index.md)
- 🐛 Report issues on [GitHub](https://github.com/artemiopadilla/foodie/issues)
- 💬 Ask questions in [Discussions](https://github.com/artemiopadilla/foodie/discussions)

---

**Happy Coding! 🚀**
