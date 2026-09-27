# Contributing to Foodie

Thank you for your interest in contributing to Foodie! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Contributing Recipes](#contributing-recipes)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Migration to Inceptor — temporary branching policy](#migration-to-inceptor--temporary-branching-policy)
- [Submitting Changes](#submitting-changes)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## 📜 Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## 🤝 How to Contribute

There are many ways to contribute to Foodie:

1. **Report Bugs**: Submit detailed bug reports via [GitHub Issues](https://github.com/yourusername/foodie/issues)
2. **Suggest Features**: Propose new features or improvements
3. **Add Recipes**: Contribute delicious recipes to our database
4. **Fix Issues**: Pick up issues labeled `good-first-issue` or `help-wanted`
5. **Improve Documentation**: Help improve our docs
6. **Add Translations**: Help translate the app to more languages

## 🍽️ Contributing Recipes

### Using the In-App Wizard (Recommended)

The easiest way to contribute recipes is through our in-app contribution wizard:

1. Visit `/contribute` in the app
2. Sign in with GitHub (required for PR creation)
3. Follow the 7-step wizard:
   - Basic Information
   - Times & Servings
   - Ingredients
   - Instructions
   - Nutrition & Tags
   - Preview
   - Submit
4. The wizard will automatically create a Pull Request

### Manual Recipe Submission

If you prefer to submit recipes manually:

1. **Fork the repository**
2. **Create a new recipe file** in `/public/data/recipes/` named `{recipe-id}.json`
3. **Follow the recipe schema**:

```json
{
  "id": "rec_###",
  "name": {
    "en": "Recipe Name",
    "es": "Nombre de la Receta",
    "fr": "Nom de la Recette"
  },
  "description": { "en": "...", "es": "...", "fr": "..." },
  "type": "breakfast|lunch|dinner|snack|dessert",
  "cuisine": ["mediterranean", "mexican", etc.],
  "prepTime": 15,
  "cookTime": 30,
  "totalTime": 45,
  "servings": 4,
  "difficulty": "easy|medium|hard",
  "tags": ["gluten-free", "vegetarian", etc.],
  "dietaryLabels": {
    "glutenFree": true,
    "vegetarian": false,
    ...
  },
  "nutrition": {
    "calories": 350,
    "protein": 20,
    ...
  },
  "ingredients": [
    {
      "ingredientId": "ing_###",
      "quantity": 2,
      "unit": "cup",
      "preparation": "chopped",
      "optional": false
    }
  ],
  "instructions": [
    {
      "step": 1,
      "text": { "en": "...", "es": "...", "fr": "..." },
      "time": 5
    }
  ],
  "equipment": ["oven", "mixing-bowl"],
  "author": "your-github-username",
  "dateAdded": "2025-01-10",
  "rating": 0,
  "reviewCount": 0
}
```

4. **Validate your recipe**:
   ```bash
   npm run validate:json
   ```

5. **Submit a Pull Request** with:
   - Clear title: "Add recipe: {Recipe Name}"
   - Description of the recipe
   - Any special notes or variations

### Recipe Guidelines

- **Original or Properly Attributed**: Only submit recipes you created or have permission to share
- **Complete Information**: Include all required fields
- **Accurate Nutrition**: Provide reasonable nutrition estimates
- **Clear Instructions**: Write step-by-step instructions anyone can follow
- **Quality Images**: Use high-quality, well-lit photos (if available)
- **Multilingual**: Provide translations for at least English and Spanish

## 💻 Development Setup

### Prerequisites

- Node.js 18+ and npm
- Git
- A code editor (VS Code recommended)

### Setup Steps

```bash
# Fork and clone the repository
git clone https://github.com/artemiopadilla/foodie.git
cd foodie

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Project Structure

```
foodie/
├── public/           # Static assets and data
├── src/
│   ├── components/   # React components
│   ├── contexts/     # State management
│   ├── hooks/        # Custom React hooks
│   ├── pages/        # Page components
│   ├── services/     # Business logic
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
└── tests/            # Test files
```

## 🎨 Coding Standards

### TypeScript

- **Use strict mode**: All code must pass TypeScript strict checks
- **Type everything**: Avoid `any` types
- **Use interfaces**: Define interfaces for all data structures
- **Export types**: Keep types in `/src/types/index.ts`

### React

- **Functional Components**: Use functional components with hooks
- **TypeScript with React**: Always use `.tsx` extension
- **Props**: Define prop types with interfaces
- **Hooks**: Follow React hooks rules
- **No inline styles**: Use Tailwind CSS classes

### Code Style

- **Prettier**: Run `npm run format` before committing
- **ESLint**: Run `npm run lint` and fix all warnings
- **Naming Conventions**:
  - Components: PascalCase (`RecipeCard.tsx`)
  - Functions: camelCase (`calculateTotal`)
  - Constants: UPPER_SNAKE_CASE (`MAX_SERVINGS`)
  - Files: kebab-case for utils (`unit-conversions.ts`)

### Git Commits

Use semantic commit messages:

```
feat: Add recipe scaling functionality
fix: Correct nutrition calculation
docs: Update README with new features
style: Format code with Prettier
refactor: Simplify ingredient filtering
test: Add tests for meal planner
chore: Update dependencies
```

## 🚧 Migration to Inceptor — temporary branching policy

> **Temporary section** (roadmap Phase 0 → Phase 3). It is removed at the
> cutover (roadmap Issue 030). Canonical plan:
> [`docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`](docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md).

Foodie is being rebuilt on the [Inceptor](https://github.com/ArtemioPadilla/inceptor)
template (Astro 5 + React 19 + Tailwind v4 + Base UI). While that happens the
repository has **two live lines of development**:

| Branch | What it holds | Deploys? |
|---|---|---|
| `main` | The **legacy** React 18 + Vite SPA, frozen at `ac89bf1` (tag `legacy-vite-1.0.0`, mirrored by the `legacy` branch) | Yes — `https://artemiopadilla.github.io/foodie/` keeps serving legacy until the cutover |
| `inceptor` | The **integration branch** for the new app (roadmap Phases 0–3). Created by the maintainer from the Phase-0 working branch; protected (PR required, checks `build`, `test`, `type-check`) | Not yet — enabled at the cutover |

### Where do PRs go?

- **Migration work** (any roadmap issue `001`–`030`): branch from `inceptor` as
  `phase-N/issue-NNN-short-slug` and open the PR **against `inceptor`**, not
  `main`. Example: `phase-0/issue-003-rebrand-foodie` → PR base `inceptor`.
- **Legacy hotfixes only** (something broken on the live site): PR against
  `main`. Keep them minimal — `main` is frozen apart from urgent fixes and the
  legacy code is not being ported line-by-line.
- **Never** merge `inceptor` into `main` or vice-versa outside the cutover PR
  (roadmap Issue 030). `main` stays the legacy deploy until the new app reaches
  parity on catalog + planner + shopping + pantry (end of Phase 3).

### Conventions on `inceptor`

- Commit messages: Conventional Commits with the roadmap id —
  `type(scope): summary (roadmap #NNN)`.
- Every PR must keep `npm run check` green (astro check + tsc + vitest + eslint
  + pragmas + build) and follow the Inceptor rules listed in `CLAUDE.md`
  (no `@astrojs/tailwind`, no React Context across islands, `withBase()` for
  every href/asset, Zod schemas in `src/schemas/` for cross-boundary types).
- Labels `phase-0`…`phase-6`, `type:chore|feat|docs|test`, `risk:high` and
  milestones `v0.1`…`v1.0` classify the work (created by
  `scripts/create-issues.sh`, roadmap Issue 007).
- Reading legacy code from the `inceptor` branch: `git show main:src/<path>`
  (or `git show legacy:src/<path>`); while Phase 0 is in progress a read-only
  copy also lives under `legacy/` (removed in roadmap Issue 008).

### After the cutover

Once Issue 030 lands, `inceptor` is merged into `main`, `main` deploys the new
app and all PRs target `main` again. This section is deleted in that PR.

## 🚀 Submitting Changes

### Before Submitting

1. **Run tests**: `npm test`
2. **Run linter**: `npm run lint`
3. **Build successfully**: `npm run build`
4. **Check TypeScript**: `tsc --noEmit`
5. **Update documentation** if needed

### Pull Request Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** with clear, atomic commits

3. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request**:
   - Use a clear, descriptive title
   - Reference any related issues (#123)
   - Describe what changed and why
   - Include screenshots for UI changes
   - Check the boxes in the PR template

5. **Respond to feedback**: Address review comments promptly

6. **Wait for approval**: Maintainers will review and merge

### PR Title Format

```
[Type] Brief description

Types: feat, fix, docs, style, refactor, test, chore
```

Examples:
- `[feat] Add pantry management system`
- `[fix] Correct recipe scaling calculation`
- `[docs] Improve installation instructions`

## 🧪 Testing Guidelines

### Writing Tests

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test component interactions
- **E2E Tests**: Test complete user flows

### Test Files

```
tests/
├── unit/
│   ├── utils/
│   ├── services/
│   └── hooks/
├── integration/
│   └── components/
└── e2e/
    └── flows/
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- path/to/test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Test Guidelines

- **Test file naming**: `ComponentName.test.tsx` or `utilName.test.ts`
- **Test structure**: Use `describe` and `it` blocks
- **Assertions**: Be specific with assertions
- **Mocking**: Mock external dependencies
- **Coverage**: Aim for >80% coverage on new code

## 📚 Documentation

### When to Update Docs

- Adding new features
- Changing APIs
- Modifying configuration
- Adding dependencies

### Documentation Files

- `README.md`: User-facing documentation
- `CLAUDE.md`: Technical architecture
- `docs/`: Detailed guides
- Code comments: Complex logic explanation
- JSDoc: Function and component documentation

### JSDoc Example

```typescript
/**
 * Scales recipe ingredients based on target servings
 * @param recipe - The recipe to scale
 * @param targetServings - Desired number of servings
 * @returns Scaled recipe with adjusted ingredient quantities
 */
export function scaleRecipe(recipe: Recipe, targetServings: number): Recipe {
  // Implementation
}
```

## 🐛 Reporting Bugs

### Before Reporting

1. **Search existing issues**: Check if it's already reported
2. **Try latest version**: Update to the latest version
3. **Reproduce consistently**: Can you reproduce it?
4. **Check browser console**: Any error messages?

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What should happen instead?

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. macOS, Windows]
 - Browser: [e.g. Chrome 120, Safari 17]
 - Version: [e.g. 1.0.0]

**Additional context**
Any other relevant information.
```

## 💡 Feature Requests

### Before Requesting

1. **Check existing requests**: Search issues and discussions
2. **Consider scope**: Is it aligned with project goals?
3. **Provide details**: Be specific about the feature

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
Describe the problem you're trying to solve.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Any alternative solutions or features?

**Additional context**
Mockups, examples, or references.
```

## 🌍 Adding Translations

### Supported Languages

- English (en)
- Spanish (es)
- French (fr)

### Adding a New Language

1. **Create translation file**: `public/locales/{code}/translation.json`
2. **Add to i18n config**: Update `src/i18n.ts`
3. **Update types**: Add to `MultiLangText` interface
4. **Test thoroughly**: Ensure all strings are translated
5. **Submit PR**: Include screenshots of translated UI

### Translation Guidelines

- **Keep context**: Translations should make sense in context
- **Preserve formatting**: Maintain placeholders like `{{count}}`
- **Cultural adaptation**: Adapt for cultural differences
- **Consistency**: Use consistent terminology
- **Native speakers**: Have translations reviewed by native speakers

## 📞 Getting Help

- **Questions**: Use [GitHub Discussions](https://github.com/artemiopadilla/foodie/discussions)
- **Chat**: Join our community chat (if available)
- **Email**: Contact maintainers at foodie@example.com

## 🙏 Recognition

Contributors will be:
- Listed in CHANGELOG.md
- Credited in release notes
- Added to GitHub's contributors page
- Featured on our website (with permission)

---

**Thank you for contributing to Foodie! Your contributions help make meal planning easier for everyone.** 🍽️❤️
