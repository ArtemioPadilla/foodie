import React, { useState, createContext, useContext } from 'react';
import { cn } from '@utils/cn';

type AccordionType = 'single' | 'multiple';

interface AccordionContextValue {
  type: AccordionType;
  openItems: string[];
  toggleItem: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextValue | null>(null);

const useAccordionContext = () => {
  const context = useContext(AccordionContext);
  if (!context) {
    throw new Error('Accordion components must be used within Accordion');
  }
  return context;
};

export interface AccordionProps {
  type?: AccordionType;
  defaultValue?: string | string[];
  children: React.ReactNode;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({
  type = 'single',
  defaultValue,
  children,
  className,
}) => {
  const [openItems, setOpenItems] = useState<string[]>(() => {
    if (!defaultValue) return [];
    return Array.isArray(defaultValue) ? defaultValue : [defaultValue];
  });

  const toggleItem = (value: string) => {
    setOpenItems((prev) => {
      if (type === 'single') {
        return prev.includes(value) ? [] : [value];
      } else {
        return prev.includes(value)
          ? prev.filter((item) => item !== value)
          : [...prev, value];
      }
    });
  };

  return (
    <AccordionContext.Provider value={{ type, openItems, toggleItem }}>
      <div className={cn('w-full space-y-2', className)}>{children}</div>
    </AccordionContext.Provider>
  );
};

// Context for passing value to nested components
const AccordionItemContext = createContext<string | null>(null);

export interface AccordionItemProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const AccordionItemInternal: React.FC<AccordionItemProps> = ({
  value: _value,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
};

export interface AccordionTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const AccordionTrigger: React.FC<AccordionTriggerProps> = ({
  children,
  className,
}) => {
  const { openItems, toggleItem } = useAccordionContext();
  const value = React.useContext(AccordionItemContext);

  if (!value) {
    throw new Error('AccordionTrigger must be used within AccordionItem');
  }

  const isOpen = openItems.includes(value);

  return (
    <button
      onClick={() => toggleItem(value)}
      className={cn(
        'flex w-full items-center justify-between px-4 py-3 text-left font-medium transition-all',
        'hover:bg-gray-50 dark:hover:bg-gray-800',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
        className
      )}
    >
      {children}
      <svg
        className={cn(
          'h-4 w-4 transition-transform duration-200',
          isOpen && 'rotate-180'
        )}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>
  );
};

export interface AccordionContentProps {
  children: React.ReactNode;
  className?: string;
}

export const AccordionContent: React.FC<AccordionContentProps> = ({
  children,
  className,
}) => {
  const { openItems } = useAccordionContext();
  const value = React.useContext(AccordionItemContext);

  if (!value) {
    throw new Error('AccordionContent must be used within AccordionItem');
  }

  const isOpen = openItems.includes(value);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'px-4 py-3 border-t border-gray-200 dark:border-gray-700',
        'animate-in slide-in-from-top-2',
        className
      )}
    >
      {children}
    </div>
  );
};

// Export the wrapped version with context
export const AccordionItem: React.FC<AccordionItemProps> = ({
  value,
  children,
  ...props
}) => {
  return (
    <AccordionItemContext.Provider value={value}>
      <AccordionItemInternal value={value} {...props}>
        {children}
      </AccordionItemInternal>
    </AccordionItemContext.Provider>
  );
};
