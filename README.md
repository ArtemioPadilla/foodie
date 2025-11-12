# 🍽️ Foodie - Meal Planning PWA

A comprehensive, multilingual Progressive Web Application for meal planning, recipe management, and shopping list generation.

![Foodie Banner](https://via.placeholder.com/1200x400/10b981/ffffff?text=Foodie+Meal+Planner)

## ✨ Features

- 🔍 **Recipe Browser**: Search and filter recipes by cuisine, dietary tags, prep time, and more
- 📅 **Meal Planner**: Create weekly meal plans with drag-and-drop interface
- 🛒 **Shopping Lists**: Auto-generate organized shopping lists from meal plans
- 📦 **Pantry Management**: Track ingredients and get recipe suggestions
- 🌍 **Multilingual**: Full support for English, Spanish, and French
- 🌙 **Dark Mode**: Beautiful dark theme for comfortable viewing
- 📱 **PWA**: Install as an app, works offline
- 🔐 **User Accounts**: Save favorites and sync across devices (optional Firebase)
- 🤝 **Community**: GitHub-integrated recipe contribution system

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/artemiopadilla/foodie.git
cd foodie

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 📦 Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Internationalization**: i18next
- **PWA**: vite-plugin-pwa
- **Icons**: Lucide React
- **Backend (Optional)**: Firebase (Auth, Firestore, Storage)
- **Deployment**: GitHub Pages

## 📝 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm test             # Run unit tests
npm run test:e2e     # Run E2E tests
```

## 🏗️ Project Structure

```
foodie/
├── public/           # Static assets
│   ├── images/       # Images and icons
│   └── locales/      # Translation files
├── src/
│   ├── components/   # React components
│   ├── contexts/     # Context providers
│   ├── hooks/        # Custom hooks
│   ├── pages/        # Page components
│   ├── types/        # TypeScript types
│   ├── utils/        # Utility functions
│   ├── data/         # JSON data files
│   └── styles/       # Global styles
├── .github/
│   └── workflows/    # CI/CD workflows
└── scripts/          # Build scripts
```

## 🌍 Internationalization

Foodie supports multiple languages out of the box:

- 🇬🇧 English
- 🇪🇸 Spanish
- 🇫🇷 French

Translation files are located in `public/locales/{lang}/translation.json`.

### Adding a New Language

1. Create translation file: `public/locales/{code}/translation.json`
2. Add language to supported list in `src/i18n.ts`
3. Update `MultiLangText` interface in `src/types/index.ts`

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Contributing Recipes

Use the in-app recipe contribution wizard at `/contribute`. It will:
- Guide you through a 7-step process
- Validate your recipe
- Generate proper JSON
- Create a Pull Request automatically

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📖 Documentation

- [CLAUDE.md](CLAUDE.md) - Comprehensive technical documentation
- [Architecture Overview](CLAUDE.md#architecture)
- [API Documentation](CLAUDE.md#data-model)
- [Contributing Guide](CONTRIBUTING.md)

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Firebase (optional)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id

# GitHub OAuth (optional)
VITE_GITHUB_CLIENT_ID=your_client_id
VITE_GITHUB_REPO_OWNER=your_username
VITE_GITHUB_REPO_NAME=foodie
```

### Customization

- **Theme Colors**: Edit `tailwind.config.js`
- **App Config**: Edit `src/data/config.json`
- **Base Path**: Edit `vite.config.ts` for deployment URL

## 🚀 Deployment

### GitHub Pages

Push to `main` branch triggers automatic deployment via GitHub Actions.

### Custom Domain

1. Add `CNAME` file to `public/` directory
2. Configure DNS at your domain provider
3. Enable HTTPS in GitHub Pages settings

## 📊 Performance

- Lighthouse Score: >90 (Performance, Accessibility, Best Practices, SEO)
- Bundle Size: <500KB (gzipped)
- Time to Interactive: <3s on 3G
- Offline Support: Full app shell cached

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [Claude Code](https://claude.ai/claude-code) by Anthropic
- Icons by [Lucide](https://lucide.dev/)
- UI inspired by modern design systems

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/artemiopadilla/foodie/issues)
- **Discussions**: [GitHub Discussions](https://github.com/artemiopadilla/foodie/discussions)
- **Email**: foodie@example.com

---

**Made with ❤️ and Claude Code**
