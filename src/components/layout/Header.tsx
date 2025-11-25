import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@contexts/ThemeContext';
import { useAuth } from '@contexts/AuthContext';
import { useLanguage } from '@contexts/LanguageContext';
import {
  Home,
  ChefHat,
  Carrot,
  Calendar,
  ShoppingCart,
  Package,
  PlusCircle,
  User,
  Sun,
  Moon,
  Menu,
  ChevronDown,
  X
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  name: string;
  items: NavItem[];
}

export default function Header() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, signOut } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary navigation items (shown directly in navbar)
  const primaryNav: NavItem[] = [
    { name: t('nav.home'), href: '/', icon: Home },
  ];

  // Grouped navigation items for dropdowns
  const navGroups: NavGroup[] = [
    {
      name: t('nav.browse'),
      items: [
        { name: t('nav.recipes'), href: '/recipes', icon: ChefHat },
        { name: t('nav.ingredients'), href: '/ingredients', icon: Carrot },
      ],
    },
    {
      name: t('nav.plan'),
      items: [
        { name: t('nav.planner'), href: '/planner', icon: Calendar },
        { name: t('nav.shopping'), href: '/shopping', icon: ShoppingCart },
        { name: t('nav.pantry'), href: '/pantry', icon: Package },
      ],
    },
  ];

  // Standalone items
  const contributeNav: NavItem = { name: t('nav.contribute'), href: '/contribute', icon: PlusCircle };

  // Flat navigation for mobile menu (in logical order)
  const mobileNavigation: NavItem[] = [
    { name: t('nav.home'), href: '/', icon: Home },
    { name: t('nav.recipes'), href: '/recipes', icon: ChefHat },
    { name: t('nav.ingredients'), href: '/ingredients', icon: Carrot },
    { name: t('nav.planner'), href: '/planner', icon: Calendar },
    { name: t('nav.shopping'), href: '/shopping', icon: ShoppingCart },
    { name: t('nav.pantry'), href: '/pantry', icon: Package },
    { name: t('nav.contribute'), href: '/contribute', icon: PlusCircle },
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
  ];

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <nav className="container-custom py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-primary-500" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('app.name')}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1" ref={dropdownRef}>
            {/* Primary nav items */}
            {primaryNav.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Dropdown groups */}
            {navGroups.map(group => (
              <div key={group.name} className="relative">
                <button
                  onClick={() => toggleDropdown(group.name)}
                  className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-expanded={openDropdown === group.name}
                  aria-haspopup="true"
                >
                  <span>{group.name}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === group.name ? 'rotate-180' : ''}`} />
                </button>
                {openDropdown === group.name && (
                  <div className="absolute left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    {group.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setOpenDropdown(null)}
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Contribute link */}
            <Link
              to={contributeNav.href}
              className="flex items-center space-x-1 px-3 py-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-primary-500 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <contributeNav.icon className="h-5 w-5" />
              <span>{contributeNav.name}</span>
            </Link>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Language Selector */}
            <select
              value={language}
              onChange={e => changeLanguage(e.target.value)}
              className="hidden sm:block px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
              aria-label="Select language"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('accessibility.toggleTheme')}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Sun className="h-5 w-5 text-gray-700 dark:text-gray-100" />
              )}
            </button>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative group">
                <button 
                  className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label={t('nav.userMenu') || 'User menu'}
                >
                  <User className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  <span className="hidden sm:inline text-sm text-gray-700 dark:text-gray-300">
                    {user?.displayName}
                  </span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all border border-gray-200 dark:border-gray-700">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {t('nav.profile')}
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {t('nav.signOut')}
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/profile"
                className="px-3 py-2 rounded-md bg-primary-700 text-white hover:bg-primary-600 transition-colors text-sm font-medium"
              >
                {t('nav.signIn')}
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('nav.toggleMenu') || 'Toggle menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 space-y-1 border-t border-gray-200 dark:border-gray-700 pt-4">
            {mobileNavigation.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center space-x-3 px-4 py-3 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            {/* Mobile Language Selector */}
            <div className="sm:hidden px-4 pt-4 border-t border-gray-200 dark:border-gray-700 mt-2">
              <select
                value={language}
                onChange={e => changeLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                aria-label="Select language"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
