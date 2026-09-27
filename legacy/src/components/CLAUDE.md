# Components Architecture - Foodie PWA

**Last Updated**: 2025-01-10
**Component Count**: 60+ planned
**Current Status**: Early development

---

## Overview

This directory contains all React components for the Foodie application, organized by feature domain. Components follow a consistent pattern and are fully typed with TypeScript.

## Directory Structure

```
components/
├── common/          # Shared UI components (buttons, inputs, modals)
├── layout/          # Layout components (Header, Footer, Sidebar)
├── recipe/          # Recipe-related components
├── planner/         # Meal planner components
├── shopping/        # Shopping list components
├── contribute/      # Recipe contribution wizard
│   └── steps/       # Multi-step form components
├── auth/            # Authentication components
└── pantry/          # Pantry management components
```

---

## Component Standards

### File Naming
- **Components**: PascalCase with `.tsx` extension
- **Example**: `RecipeCard.tsx`, `MealPlannerCalendar.tsx`

### Component Structure

```typescript
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

interface ComponentNameProps {
  // Props with JSDoc comments
  /** The recipe to display */
  recipe: Recipe;
  /** Callback when clicked */
  onClick?: () => void;
}

/**
 * Brief description of what this component does
 *
 * @example
 * <ComponentName recipe={recipe} onClick={handleClick} />
 */
export const ComponentName: FC<ComponentNameProps> = ({ recipe, onClick }) => {
  const { t } = useTranslation();

  return (
    <div className="component-classes">
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
```

### Props Guidelines

1. **Always define prop interfaces**
2. **Use JSDoc comments for complex props**
3. **Mark optional props with `?`**
4. **Provide default values when appropriate**
5. **Destructure props in function signature**

### Styling

- **Use Tailwind CSS classes exclusively**
- **No inline styles**
- **Use custom CSS classes from globals.css when needed**
- **Responsive: mobile-first approach**
- **Dark mode: use `dark:` variants**

---

## Component Categories

### Common Components (`/common`)

**Purpose**: Reusable UI primitives used across the app

**Components**:
- `Button.tsx` - Button with variants (primary, secondary, ghost)
- `Input.tsx` - Text input with validation states
- `Select.tsx` - Dropdown select component
- `Modal.tsx` - Dialog/modal system
- `Card.tsx` - Card container
- `Badge.tsx` - Tag/label component
- `Spinner.tsx` - Loading spinner
- `Toast.tsx` - Notification system
- `Tabs.tsx` - Tab navigation
- `Checkbox.tsx` - Checkbox input
- `RadioGroup.tsx` - Radio button group
- `Accordion.tsx` - Collapsible accordion
- `ErrorBoundary.tsx` - Error boundary wrapper
- `LoadingState.tsx` - Loading placeholders
- `EmptyState.tsx` - Empty state illustrations

**Design Principles**:
- Fully accessible (ARIA labels, keyboard navigation)
- Support all Tailwind size variants
- Consistent API across components
- Composable and flexible

### Layout Components (`/layout`)

**Purpose**: App-level layout and navigation

**Current Components**:
- ✅ `Header.tsx` - Top navigation bar
- ✅ `Footer.tsx` - Footer with links
- ❌ `Sidebar.tsx` - Side navigation (desktop)
- ❌ `MobileNav.tsx` - Mobile navigation drawer

**Responsibilities**:
- Application navigation
- User menu
- Language/theme switching
- Responsive breakpoints

### Recipe Components (`/recipe`)

**Purpose**: Display and interact with recipes

**Components Needed**:
- `RecipeCard.tsx` - Recipe preview card
- `RecipeGrid.tsx` - Grid of recipe cards
- `RecipeList.tsx` - List view of recipes
- `RecipeFilters.tsx` - Filter UI
- `RecipeDetail.tsx` - Full recipe view
- `RecipeIngredients.tsx` - Ingredient list
- `RecipeInstructions.tsx` - Step-by-step instructions
- `RecipeTimer.tsx` - Cooking timer
- `RecipeNutrition.tsx` - Nutrition facts panel
- `RecipeScaler.tsx` - Servings adjustment
- `RecipeRating.tsx` - Star rating display

**Data Flow**:
```
RecipeContext → RecipesPage → RecipeGrid → RecipeCard
                           ↓
                      RecipeDetailPage → RecipeDetail
                                       → RecipeIngredients
                                       → RecipeInstructions
```

### Planner Components (`/planner`)

**Purpose**: Meal planning interface with drag-and-drop

**Components Needed**:
- `MealPlannerCalendar.tsx` - Main calendar view
- `WeekView.tsx` - Weekly grid
- `MonthView.tsx` - Monthly overview
- `DayMealSlot.tsx` - Individual meal slot
- `DraggableRecipe.tsx` - Draggable recipe (React DnD)
- `DroppableSlot.tsx` - Drop target (React DnD)
- `PlannerControls.tsx` - Toolbar (save, share, etc.)
- `PlanSummary.tsx` - Cost/nutrition summary
- `PlanTemplates.tsx` - Template selector

**Key Features**:
- React DnD for drag-and-drop
- Touch support for mobile
- Auto-save to localStorage
- Cloud sync (optional)

### Shopping Components (`/shopping`)

**Purpose**: Shopping list generation and management

**Components Needed**:
- `ShoppingList.tsx` - Main list view
- `ShoppingListItem.tsx` - Single checkable item
- `CategoryGroup.tsx` - Grouped by category
- `ListControls.tsx` - Add, clear, filter controls
- `ExportOptions.tsx` - Export menu

**Features**:
- Checkbox state persistence
- Category grouping
- Export to various formats
- Share via WhatsApp

### Contribute Components (`/contribute`)

**Purpose**: Recipe contribution wizard

**Components Needed**:
- `ContributionWizard.tsx` - Multi-step form container
- `WizardProgress.tsx` - Progress indicator
- `BasicInfoStep.tsx` - Name, description, cuisine
- `TimingsStep.tsx` - Prep/cook times
- `IngredientsStep.tsx` - Ingredient list builder
- `InstructionsStep.tsx` - Step-by-step editor
- `NutritionStep.tsx` - Nutrition calculator
- `PreviewStep.tsx` - Final review
- `SubmitStep.tsx` - GitHub PR creation
- `ValidationSummary.tsx` - Validation errors

**Wizard Flow**:
```
Step 1 → Step 2 → Step 3 → Step 4 → Step 5 → Step 6 → Step 7
  ↓        ↓        ↓        ↓        ↓        ↓        ↓
Basic   Timings  Ingr.   Instr.   Nutr.   Preview  Submit
```

### Auth Components (`/auth`)

**Purpose**: User authentication

**Components Needed**:
- `SignInForm.tsx` - Login form
- `SignUpForm.tsx` - Registration form
- `SocialLogin.tsx` - OAuth buttons
- `AuthModal.tsx` - Modal wrapper
- `ProtectedRoute.tsx` - Route guard

### Pantry Components (`/pantry`)

**Purpose**: Pantry inventory management

**Components Needed**:
- `PantryInventory.tsx` - Item list
- `PantryItem.tsx` - Single item row
- `ExpirationTracker.tsx` - Expiring items alert
- `RecipeSuggestions.tsx` - Recipes using pantry items
- `AddItemModal.tsx` - Add/edit item form

---

## Component Patterns

### State Management

**Local State** (useState):
```typescript
const [open, setOpen] = useState(false);
const [value, setValue] = useState('');
```

**Context** (useContext):
```typescript
const { recipes, loading } = useRecipes();
const { t } = useTranslation();
const { theme } = useTheme();
```

**Custom Hooks**:
```typescript
const deboundcedValue = useDebounce(searchTerm, 300);
const isOnline = useOnlineStatus();
const isMobile = useMediaQuery('(max-width: 768px)');
```

### Data Fetching

Use React Query for server data:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['recipes'],
  queryFn: fetchRecipes,
});
```

### Form Handling

Use React Hook Form with Zod:
```typescript
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

### Error Handling

Wrap components in ErrorBoundary:
```typescript
<ErrorBoundary fallback={<ErrorState />}>
  <ComponentThatMightError />
</ErrorBoundary>
```

---

## Component Testing

### Unit Tests

Test component rendering and interactions:

```typescript
describe('RecipeCard', () => {
  it('renders recipe name', () => {
    render(<RecipeCard recipe={mockRecipe} />);
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<RecipeCard recipe={mockRecipe} onClick={handleClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Tests

Test component interactions:

```typescript
describe('Recipe Filter Flow', () => {
  it('filters recipes when tags are selected', async () => {
    render(<RecipesPage />);
    await userEvent.click(screen.getByText('Vegetarian'));
    expect(screen.queryByText('Chicken Recipe')).not.toBeInTheDocument();
  });
});
```

---

## Accessibility

### WCAG 2.1 AA Requirements

1. **Semantic HTML**: Use proper HTML elements
2. **ARIA Labels**: Add labels for screen readers
3. **Keyboard Navigation**: All interactive elements keyboard accessible
4. **Focus Indicators**: Visible focus states
5. **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
6. **Alt Text**: Descriptive alt text for images

### Example

```typescript
<button
  onClick={handleClick}
  aria-label="Add recipe to favorites"
  className="focus:ring-2 focus:ring-primary-500"
>
  <Heart className="h-5 w-5" />
</button>
```

---

## Performance

### Optimization Techniques

1. **Lazy Loading**:
   ```typescript
   const RecipeDetail = lazy(() => import('./RecipeDetail'));
   ```

2. **Memoization**:
   ```typescript
   const expensiveValue = useMemo(() => calculate(data), [data]);
   const memoizedCallback = useCallback(() => doSomething(), [dep]);
   ```

3. **Virtual Scrolling**: For long lists
   ```typescript
   import { FixedSizeList } from 'react-window';
   ```

4. **Image Optimization**:
   ```typescript
   <img
     src={recipe.imageUrl}
     alt={recipe.name}
     loading="lazy"
     srcSet="..."
   />
   ```

---

## Common Issues & Solutions

### Issue: Context re-renders causing performance problems
**Solution**: Split contexts, use memo, or use a state management library

### Issue: Deep prop drilling
**Solution**: Use Context or composition

### Issue: Component too large
**Solution**: Extract sub-components

### Issue: Hard to test
**Solution**: Inject dependencies, use smaller components

---

## Next Steps

### Immediate Priorities
1. Build all common components
2. Create recipe display components
3. Implement meal planner with React DnD
4. Build shopping list interface

### Future Enhancements
- Component library (Storybook)
- Animation with Framer Motion
- Virtualized lists for performance
- Progressive enhancement

---

**For Questions**: See main CLAUDE.md or create a GitHub Discussion
