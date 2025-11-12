import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Offline Indicator - Shows banner when user loses internet connection
 * Uses navigator.onLine and online/offline events
 */
export const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Hide banner after 3 seconds when back online
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner && isOnline) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transform transition-transform duration-300 ${
        showBanner ? 'translate-y-0' : '-translate-y-full'
      }`}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`${
          isOnline
            ? 'bg-green-500 dark:bg-green-600'
            : 'bg-yellow-500 dark:bg-yellow-600'
        } text-white px-4 py-3 shadow-lg`}
      >
        <div className="container mx-auto flex items-center justify-center gap-2">
          {!isOnline && <WifiOff className="h-5 w-5" />}
          <p className="text-sm font-medium">
            {isOnline
              ? '✓ Connection restored'
              : 'You are offline. Some features may be limited.'}
          </p>
        </div>
      </div>
    </div>
  );
};

OfflineIndicator.displayName = 'OfflineIndicator';
