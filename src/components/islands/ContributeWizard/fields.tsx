import * as React from 'react';
import { useFormContext, type FieldPath } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Locale } from '@/i18n';
import { translateSubmissionMessage, type PickerOption } from '@/lib/domain/contribute';
import type { RecipeSubmission } from '@/schemas';

/**
 * Field building blocks of the contribute wizard (roadmap Issue 038): the kit
 * `Form` (`FormField` → rhf `Controller`) with messages translated through
 * `translateSubmissionMessage`. All of them live inside the one
 * `ContributeWizard` island, under its `<Form>` provider.
 */

export type SubmissionPath = FieldPath<RecipeSubmission>;

interface BaseFieldProps {
  lang: Locale;
  name: SubmissionPath;
  label: React.ReactNode;
  description?: React.ReactNode;
  placeholder?: string;
  testId?: string;
  className?: string;
}

export function useFormatMessage(lang: Locale) {
  return React.useCallback((message: string) => translateSubmissionMessage(lang, message), [lang]);
}

/** Text input or textarea bound to a string field. */
export function TextField({
  lang,
  name,
  label,
  description,
  placeholder,
  testId,
  className,
  multiline = false,
  type = 'text',
}: BaseFieldProps & { multiline?: boolean; type?: 'text' | 'url' }) {
  const { control } = useFormContext<RecipeSubmission>();
  const format = useFormatMessage(lang);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {multiline ? (
              <Textarea
                name={field.name}
                value={typeof field.value === 'string' ? field.value : ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                rows={3}
                placeholder={placeholder}
                data-testid={testId}
              />
            ) : (
              <Input
                name={field.name}
                type={type}
                value={typeof field.value === 'string' ? field.value : ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                placeholder={placeholder}
                data-testid={testId}
              />
            )}
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage format={format} />
        </FormItem>
      )}
    />
  );
}

/**
 * Number input bound to a numeric field. An empty box is `undefined` for an
 * optional field and `0` for a required one (shown empty, so the schema's
 * "must be greater than 0" message applies); never `NaN`.
 */
export function NumberInput({
  lang,
  name,
  label,
  description,
  placeholder,
  testId,
  className,
  optional = false,
  min = 0,
  step = 'any',
}: BaseFieldProps & { optional?: boolean; min?: number; step?: number | 'any' }) {
  const { control } = useFormContext<RecipeSubmission>();
  const format = useFormatMessage(lang);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === 'number' ? field.value : undefined;
        const shown = value === undefined || (!optional && value === 0) ? '' : String(value);
        return (
          <FormItem className={className}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                name={field.name}
                type="number"
                inputMode="decimal"
                min={min}
                step={step}
                value={shown}
                onChange={(event) => {
                  const raw = event.target.value;
                  const parsed = raw === '' ? Number.NaN : Number(raw);
                  field.onChange(Number.isFinite(parsed) ? parsed : optional ? undefined : 0);
                }}
                onBlur={field.onBlur}
                ref={field.ref}
                placeholder={placeholder}
                data-testid={testId}
              />
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage format={format} />
          </FormItem>
        );
      }}
    />
  );
}

/** Kit `Select` bound to a string field; `''` shows `placeholder`. */
export function SelectField({
  lang,
  name,
  label,
  description,
  placeholder,
  testId,
  className,
  options,
}: BaseFieldProps & { options: ReadonlyArray<PickerOption> }) {
  const { control } = useFormContext<RecipeSubmission>();
  const format = useFormatMessage(lang);
  const labels = React.useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <Select
            value={typeof field.value === 'string' && field.value ? field.value : null}
            onValueChange={(value) => {
              field.onChange(typeof value === 'string' ? value : '');
              field.onBlur();
            }}
            items={options}
          >
            <FormControl>
              <SelectTrigger ref={field.ref} data-testid={testId}>
                <SelectValue>
                  {(value: string | null) => (value ? (labels.get(value) ?? value) : placeholder)}
                </SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage format={format} />
        </FormItem>
      )}
    />
  );
}
