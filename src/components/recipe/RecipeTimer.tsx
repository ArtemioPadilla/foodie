import React, { useState, useEffect, useCallback } from 'react';
import { Button, Modal, ModalFooter } from '@components/common';
import { cn } from '@utils/cn';

export interface RecipeTimerProps {
  isOpen: boolean;
  onClose: () => void;
  duration: number; // in minutes
  stepName?: string;
  className?: string;
}

export const RecipeTimer: React.FC<RecipeTimerProps> = ({
  isOpen,
  onClose,
  duration,
  stepName,
  className,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // Reset timer when duration changes
  useEffect(() => {
    setSecondsLeft(duration * 60);
    setIsRunning(false);
    setHasStarted(false);
  }, [duration]);

  // Timer countdown
  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          playNotificationSound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const playNotificationSound = useCallback(() => {
    // Play browser notification sound
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Timer Complete!', {
        body: stepName ? `${stepName} is done!` : 'Your timer has finished.',
        icon: '/icons/icon-192x192.png',
      });
    }

    // Play audio sound (optional)
    const audio = new Audio('/notification.mp3');
    audio.play().catch(() => {
      // Ignore if audio can't play
    });
  }, [stepName]);

  const handleStart = () => {
    if (!hasStarted) setHasStarted(true);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setSecondsLeft(duration * 60);
    setIsRunning(false);
    setHasStarted(false);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration * 60 - secondsLeft) / (duration * 60)) * 100;
  const isComplete = secondsLeft === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={stepName || 'Cooking Timer'}
      size="sm"
      className={className}
    >
      <div className="flex flex-col items-center py-6">
        {/* Circular Progress */}
        <div className="relative w-48 h-48 mb-6">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* Progress circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 88}`}
              strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
              className={cn(
                'transition-all duration-1000',
                isComplete
                  ? 'text-green-500'
                  : isRunning
                  ? 'text-emerald-500'
                  : 'text-gray-400 dark:text-gray-600'
              )}
              strokeLinecap="round"
            />
          </svg>

          {/* Time Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div
              className={cn(
                'text-5xl font-bold tabular-nums',
                isComplete
                  ? 'text-green-500'
                  : 'text-gray-900 dark:text-gray-100'
              )}
            >
              {formatTime(secondsLeft)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {duration} min total
            </div>
          </div>
        </div>

        {/* Status Message */}
        {isComplete && (
          <div className="text-center mb-4">
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">
              Time's up!
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your timer has finished
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {!hasStarted || isComplete ? (
            <Button onClick={handleStart} size="lg">
              {isComplete ? 'Start Again' : 'Start Timer'}
            </Button>
          ) : (
            <>
              <Button onClick={isRunning ? handlePause : handleStart} size="lg">
                {isRunning ? 'Pause' : 'Resume'}
              </Button>
              <Button onClick={handleReset} variant="secondary" size="lg">
                Reset
              </Button>
            </>
          )}
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose} fullWidth>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

RecipeTimer.displayName = 'RecipeTimer';
