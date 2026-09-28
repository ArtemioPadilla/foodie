import { enUS } from 'react-day-picker/locale/en-US';
import { es } from 'react-day-picker/locale/es';
import { fr } from 'react-day-picker/locale/fr';
import { DatePicker } from '@/components/ui/date-picker';
import type { Locale } from '@/i18n';
import { formatDate, parseDateKey, toDateKey, todayKey } from '@/lib/format-date';

const DAY_PICKER_LOCALES = { en: enUS, es, fr } as const;

export interface ExpiryDatePickerProps {
  lang: Locale;
  /** `YYYY-MM-DD`, or `''` for no date. */
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** id / aria-describedby / aria-invalid from `<FormControl>`, forwarded onto the trigger button. */
  triggerProps?: React.ComponentPropsWithoutRef<'button'>;
}

/**
 * The pantry form's expiration field: the kit's `date-picker` (Popover +
 * Calendar) speaking the page locale — month names, weekdays and day labels
 * from react-day-picker's `es`/`fr`/`en-US` locales, trigger text through
 * `formatDate`. Values are `YYYY-MM-DD` keys in the local calendar; past days
 * are disabled (legacy `min={today}`).
 *
 * Default export so `PantryItemDialog` can `React.lazy` it: react-day-picker
 * (and its locales) then load in their own chunk, only when the dialog opens.
 */
export default function ExpiryDatePicker({ lang, value, onChange, placeholder, triggerProps }: ExpiryDatePickerProps) {
  return (
    <DatePicker
      value={value ? parseDateKey(value) : undefined}
      onValueChange={(date) => onChange(date ? toDateKey(date) : '')}
      placeholder={placeholder}
      className="w-full"
      formatValue={(date) => formatDate(date, lang)}
      calendarProps={{ locale: DAY_PICKER_LOCALES[lang], disabled: { before: parseDateKey(todayKey()) } }}
      triggerProps={{ ...triggerProps, 'data-testid': 'pantry-expiry-trigger' } as React.ComponentPropsWithoutRef<'button'>}
    />
  );
}
