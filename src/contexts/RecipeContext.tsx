import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Recipe, RecipeFilters, SortOption } from '@/types';

interface RecipeContextType {
  recipes: Recipe[];
  filteredRecipes: Recipe[];
  loading: boolean;
  initialized: boolean;
  filters: RecipeFilters;
  sortBy: SortOption;
  setFilters: (filters: RecipeFilters) => void;
  setSortBy: (sort: SortOption) => void;
  getRecipeById: (id: string) => Recipe | undefined;
  searchRecipes: (query: string) => void;
  favoriteRecipes: string[];
  toggleFavorite: (recipeId: string) => void;
  initializeRecipes: () => Promise<void>;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const RecipeProvider = ({ children }: { children: ReactNode }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [filters, setFiltersState] = useState<RecipeFilters>({});
  const [sortBy, setSortByState] = useState<SortOption>('rating-desc');
  const [favoriteRecipes, setFavoriteRecipes] = useState<string[]>(() => {
    const stored = localStorage.getItem('favoriteRecipes');
    return stored ? JSON.parse(stored) : [];
  });

  // Lazy load recipes - call this from pages that need recipes
  const initializeRecipes = useCallback(async () => {
    // Skip if already initialized or currently loading
    if (initialized || loading) return;

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/recipes.json`);
      const data = await response.json();
      setRecipes(data.recipes || []);
      setFilteredRecipes(data.recipes || []);
      setInitialized(true);
    } catch (error) {
      // Only log errors in development
      if (import.meta.env.DEV) {
        console.error('Failed to load recipes:', error);
      }
      setRecipes([]);
      setFilteredRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [initialized, loading]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...recipes];

    // Apply search
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        recipe =>
          recipe.name.en.toLowerCase().includes(searchLower) ||
          recipe.name.es.toLowerCase().includes(searchLower) ||
          recipe.name.fr.toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter (support both 'type' and 'types')
    const types = filters.types || [];
    if (types.length > 0) {
      filtered = filtered.filter(recipe => types.includes(recipe.type));
    }

    // Apply cuisine filter (support both 'cuisine' and 'cuisines')
    const cuisines = filters.cuisines || [];
    if (cuisines.length > 0) {
      filtered = filtered.filter(recipe =>
        recipe.cuisine.some(c => cuisines.includes(c))
      );
    }

    // Apply dietary labels filter (support both 'dietaryTags' and 'dietaryLabels')
    const dietaryLabels = filters.dietaryLabels || [];
    if (dietaryLabels.length > 0) {
      filtered = filtered.filter(recipe =>
        dietaryLabels.some(label => recipe.tags.includes(label))
      );
    }

    // Apply difficulty filter (support both 'difficulty' and 'difficulties')
    const difficulties = filters.difficulties || [];
    if (difficulties.length > 0) {
      filtered = filtered.filter(recipe => difficulties.includes(recipe.difficulty));
    }

    // Apply tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(recipe =>
        filters.tags!.some(tag => recipe.tags.includes(tag))
      );
    }

    // Apply time filters (support both maxTime and specific maxPrepTime/maxCookTime)
    if (filters.maxTime) {
      filtered = filtered.filter(recipe => recipe.totalTime <= filters.maxTime!);
    }

    if (filters.maxPrepTime) {
      filtered = filtered.filter(recipe => recipe.prepTime <= filters.maxPrepTime!);
    }

    if (filters.maxCookTime) {
      filtered = filtered.filter(recipe => recipe.cookTime <= filters.maxCookTime!);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        // New detailed sort options
        case 'rating-desc':
        case 'rating':
          return b.rating - a.rating;
        case 'rating-asc':
          return a.rating - b.rating;
        case 'time-asc':
        case 'prepTime':
          return a.totalTime - b.totalTime;
        case 'time-desc':
          return b.totalTime - a.totalTime;
        case 'name-asc':
        case 'name':
          return a.name.en.localeCompare(b.name.en);
        case 'name-desc':
          return b.name.en.localeCompare(a.name.en);
        case 'difficulty-asc': {
          const difficultyOrder = { easy: 1, medium: 2, hard: 3 };
          return (difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0) -
                 (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0);
        }
        case 'difficulty-desc': {
          const difficultyOrder = { hard: 1, medium: 2, easy: 3 };
          return (difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 0) -
                 (difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 0);
        }
        case 'recent':
        case 'newest':
          return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
        case 'popular':
          return b.reviewCount - a.reviewCount;
        default:
          return 0;
      }
    });

    setFilteredRecipes(filtered);
  }, [recipes, filters, sortBy]);

  const setFilters = (newFilters: RecipeFilters) => {
    setFiltersState(newFilters);
  };

  const setSortBy = (sort: SortOption) => {
    setSortByState(sort);
  };

  const getRecipeById = (id: string) => {
    return recipes.find(recipe => recipe.id === id);
  };

  const searchRecipes = (query: string) => {
    setFiltersState(prev => ({ ...prev, search: query }));
  };

  const toggleFavorite = (recipeId: string) => {
    setFavoriteRecipes(prev => {
      const newFavorites = prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId];
      localStorage.setItem('favoriteRecipes', JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  return (
    <RecipeContext.Provider
      value={{
        recipes,
        filteredRecipes,
        loading,
        initialized,
        filters,
        sortBy,
        setFilters,
        setSortBy,
        getRecipeById,
        searchRecipes,
        favoriteRecipes,
        toggleFavorite,
        initializeRecipes,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useRecipes = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipes must be used within RecipeProvider');
  }
  return context;
};
