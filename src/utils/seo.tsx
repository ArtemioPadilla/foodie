import { useEffect } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * SEO utility to manage meta tags
 * Usage: useSEO({ title: 'My Page', description: '...' })
 */
export function useSEO({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  author,
  publishedTime,
  modifiedTime,
}: SEOProps) {
  useEffect(() => {
    // Set document title
    if (title) {
      document.title = `${title} | Foodie`;
    }

    // Helper to set or update meta tag
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.setAttribute('content', content);
    };

    // Basic meta tags
    if (description) {
      setMetaTag('description', description);
    }

    if (keywords) {
      setMetaTag('keywords', keywords);
    }

    if (author) {
      setMetaTag('author', author);
    }

    // Open Graph tags
    if (title) {
      setMetaTag('og:title', title, true);
    }

    if (description) {
      setMetaTag('og:description', description, true);
    }

    if (image) {
      setMetaTag('og:image', image, true);
    }

    if (url) {
      setMetaTag('og:url', url, true);
    }

    setMetaTag('og:type', type, true);

    if (publishedTime) {
      setMetaTag('article:published_time', publishedTime, true);
    }

    if (modifiedTime) {
      setMetaTag('article:modified_time', modifiedTime, true);
    }

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');

    if (title) {
      setMetaTag('twitter:title', title);
    }

    if (description) {
      setMetaTag('twitter:description', description);
    }

    if (image) {
      setMetaTag('twitter:image', image);
    }
  }, [title, description, keywords, image, url, type, author, publishedTime, modifiedTime]);
}

/**
 * Generate structured data (JSON-LD) for recipes
 */
export function generateRecipeStructuredData(recipe: any) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Recipe',
    name: recipe.name.en,
    image: recipe.imageUrl ? [recipe.imageUrl] : [],
    author: {
      '@type': 'Organization',
      name: 'Foodie',
    },
    datePublished: recipe.dateAdded,
    description: recipe.description.en,
    prepTime: `PT${recipe.prepTime}M`,
    cookTime: `PT${recipe.cookTime}M`,
    totalTime: `PT${recipe.totalTime}M`,
    keywords: recipe.tags?.join(', '),
    recipeYield: `${recipe.servings} servings`,
    recipeCategory: recipe.category,
    recipeCuisine: recipe.cuisine,
    nutrition: {
      '@type': 'NutritionInformation',
      calories: `${recipe.nutrition.calories} calories`,
      proteinContent: `${recipe.nutrition.protein}g`,
      carbohydrateContent: `${recipe.nutrition.carbs}g`,
      fatContent: `${recipe.nutrition.fat}g`,
      fiberContent: `${recipe.nutrition.fiber}g`,
      sugarContent: `${recipe.nutrition.sugar}g`,
      sodiumContent: `${recipe.nutrition.sodium}mg`,
    },
    recipeIngredient: recipe.ingredients.map((ing: any) =>
      `${ing.quantity} ${ing.unit} ${ing.ingredientId}`
    ),
    recipeInstructions: recipe.instructions.map((step: any) => ({
      '@type': 'HowToStep',
      text: step.text.en,
    })),
    aggregateRating: recipe.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: recipe.rating,
      reviewCount: recipe.reviewCount,
    } : undefined,
  };
}

/**
 * Inject structured data script into page
 */
export function injectStructuredData(data: any) {
  const scriptId = 'structured-data';
  let script = document.getElementById(scriptId) as HTMLScriptElement;

  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(data);
}
