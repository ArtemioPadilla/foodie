import * as React from 'react';
import { useStore } from '@nanostores/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CalendarIcon, HeartIcon, LogOutIcon, MailIcon, SaveIcon, Trash2Icon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { DownloadTrigger } from '@/components/ui/download-trigger';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster, toast } from '@/components/ui/toast';
import { LOCALES, LOCALE_NAMES, isLocale, localizedRoute, t, type Locale } from '@/i18n';
import { withBase } from '@/lib/href';
import { rememberLocale } from '@/lib/locale-preference';
import { RouteGuard, hasRole } from '@/lib/route-guard';
import { useHydrated } from '@/lib/use-hydrated';
import { clearUserData, exportFileName, exportUserDataBlob } from '@/lib/user-data';
import { ProfileFormSchema, UNIT_SYSTEMS, type AuthUser, type ProfileFormValues, type UnitSystem } from '@/schemas';
import { $favoriteCount } from '@/stores/favorites';
import { $preferences, setDietaryRestrictions, setUnitSystem, updatePreferences } from '@/stores/preferences';
import { $authReady, $user, SIGNED_IN_ROLE, authErrorKey, signOut, toGuardUser, updateProfile } from '@/stores/user';
import { initials } from '@/lib/account-initials';
import ErrorBoundary from './ErrorBoundary';

/**
 * Profile — the `/profile/` island (roadmap Issue 036; port of legacy
 * `ProfilePage`).
 *
 * Gated with the template's `RouteGuard` (deny by default, explicit
 * `allow={[SIGNED_IN_ROLE]}`) fed by `toGuardUser($user)`. The guard only
 * decides once `$authReady` is true, so a restoring session never flashes a
 * redirect; a visitor without a session is sent home with `?signin=1`, which
 * makes the header's AccountMenu open the sign-in dialog.
 *
 * Sections: identity (name + avatar URL, saved through the auth provider),
 * preferences (units, diet, preferred language — `$preferences`, saved as
 * they change), and "Your data" (ADR 0002 §4): export every store as one
 * JSON (`DownloadTrigger`) and clear everything after an `AlertDialog`.
 */
export interface ProfileProps {
  lang: Locale;
  /** Full-page navigation (redirect / language switch). Injected by tests. */
  navigate?: (url: string, mode: 'replace' | 'assign') => void;
}

const browserNavigate = (url: string, mode: 'replace' | 'assign') => {
  if (mode === 'replace') window.location.replace(url);
  else window.location.assign(url);
};

/** Dietary restriction ids (the catalog's `categories.dietaryTags`) → `dietary.*` label keys. */
export const DIET_OPTIONS = [
  ['vegetarian', 'dietary.vegetarian'],
  ['vegan', 'dietary.vegan'],
  ['gluten-free', 'dietary.glutenFree'],
  ['dairy-free', 'dietary.dairyFree'],
  ['nut-free', 'dietary.nutFree'],
  ['low-carb', 'dietary.lowCarb'],
  ['keto', 'dietary.keto'],
  ['paleo', 'dietary.paleo'],
  ['whole30', 'dietary.whole30'],
  ['kosher', 'dietary.kosher'],
  ['halal', 'dietary.halal'],
] as const;

const UNIT_LABEL: Record<UnitSystem, string> = {
  auto: 'profile.unitSystemAuto',
  metric: 'profile.unitSystemMetric',
  imperial: 'profile.unitSystemImperial',
};

const ALLOWED = [SIGNED_IN_ROLE] as const;

export default function Profile(props: ProfileProps) {
  return (
    <ErrorBoundary name="Profile">
      <ProfileView {...props} />
    </ErrorBoundary>
  );
}

export function ProfileView({ lang, navigate = browserNavigate }: ProfileProps) {
  const hydrated = useHydrated();
  const user = useStore($user);
  const ready = useStore($authReady);
  const guardUser = toGuardUser(user);
  const decided = hydrated && ready;
  const allowed = hasRole(guardUser, ALLOWED);

  React.useEffect(() => {
    if (decided && !allowed) navigate(`${withBase(localizedRoute('/', lang))}?signin=1`, 'replace');
  }, [decided, allowed, lang, navigate]);

  return (
    <div data-testid="profile" data-status={!decided ? 'loading' : allowed ? 'ready' : 'denied'}>
      {!decided ? (
        <ProfileSkeleton lang={lang} />
      ) : (
        <RouteGuard
          user={guardUser}
          allow={ALLOWED}
          fallback={
            <p role="status" className="text-muted-foreground" data-testid="profile-redirect">
              {t(lang, 'profile.redirecting')}
            </p>
          }
        >
          {user ? <ProfileContent lang={lang} user={user} navigate={navigate} /> : null}
        </RouteGuard>
      )}
      <Toaster closeLabel={t(lang, 'common.close')} />
    </div>
  );
}

function ProfileSkeleton({ lang }: { lang: Locale }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3" aria-busy="true">
      <p className="sr-only">{t(lang, 'profile.loading')}</p>
      <Skeleton className="h-64 w-full" />
      <div className="space-y-6 lg:col-span-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}

const BCP47: Record<Locale, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR' };

type Navigate = NonNullable<ProfileProps['navigate']>;

function ProfileContent({ lang, user, navigate }: { lang: Locale; user: AuthUser; navigate: Navigate }) {
  const favorites = useStore($favoriteCount);
  const name = user.displayName || user.email || t(lang, 'auth.anonymousName');
  const since = user.createdAt ? new Intl.DateTimeFormat(BCP47[lang], { dateStyle: 'long' }).format(new Date(user.createdAt)) : null;

  const onSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      toast({ title: t(lang, authErrorKey(e)), data: { variant: 'destructive' } });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6">
        <Card data-testid="profile-identity">
          <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
            <Avatar className="size-24 text-2xl">
              {user.photoURL ? <AvatarImage src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : null}
              <AvatarFallback className="bg-primary/15 font-semibold text-primary">{initials(user)}</AvatarFallback>
            </Avatar>
            <h2 className="font-display text-2xl font-semibold text-foreground" data-testid="profile-name">
              {name}
            </h2>
            {user.email ? (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MailIcon className="size-4" aria-hidden="true" />
                {user.email}
              </p>
            ) : null}
            {since ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarIcon className="size-3.5" aria-hidden="true" />
                {t(lang, 'profile.memberSince', { date: since })}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t(lang, 'profile.statistics')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <HeartIcon className="size-4" aria-hidden="true" />
                {t(lang, 'profile.favorites')}
              </span>
              <span className="font-semibold tabular-nums text-foreground" data-testid="profile-favorites">
                {favorites}
              </span>
            </p>
          </CardContent>
        </Card>

        <div className="space-y-1">
          <Button type="button" variant="outline" className="w-full" onClick={onSignOut} data-testid="profile-signout">
            <LogOutIcon aria-hidden="true" />
            {t(lang, 'auth.signOut')}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t(lang, 'profile.signOutHint')}</p>
        </div>
      </div>

      <div className="space-y-6 lg:col-span-2">
        <AccountForm lang={lang} user={user} />
        <PreferencesCard lang={lang} navigate={navigate} />
        <DataCard lang={lang} user={user} />
      </div>
    </div>
  );
}

// ── Account (name + avatar URL) ──────────────────────────────────────────────

function AccountForm({ lang, user }: { lang: Locale; user: AuthUser }) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: { displayName: user.displayName ?? '', photoURL: user.photoURL ?? '' },
  });
  const [error, setError] = React.useState<string | null>(null);
  const { isSubmitting } = form.formState;

  const onSubmit = async (values: ProfileFormValues) => {
    setError(null);
    try {
      const next = await updateProfile({ displayName: values.displayName, photoURL: values.photoURL || null });
      form.reset({ displayName: next.displayName ?? '', photoURL: next.photoURL ?? '' });
      toast({ title: t(lang, 'profile.profileSaved') });
    } catch (e) {
      setError(t(lang, authErrorKey(e)));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t(lang, 'profile.accountTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="profile-account-form">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(lang, 'profile.displayName')}</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="name" placeholder={t(lang, 'profile.displayName')} />
                  </FormControl>
                  <FormMessage format={(key) => t(lang, key)} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="photoURL"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(lang, 'profile.avatarUrl')}</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" inputMode="url" autoComplete="photo" placeholder="https://" />
                  </FormControl>
                  <FormDescription>{t(lang, 'profile.avatarUrlHint')}</FormDescription>
                  <FormMessage format={(key) => t(lang, key)} />
                </FormItem>
              )}
            />
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={isSubmitting} data-testid="profile-save">
              <SaveIcon aria-hidden="true" />
              {t(lang, 'profile.saveProfile')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ── Preferences (units, diet, language) ──────────────────────────────────────

function PreferencesCard({ lang, navigate }: { lang: Locale; navigate: Navigate }) {
  const prefs = useStore($preferences);
  const [status, setStatus] = React.useState('');
  const saved = () => setStatus(t(lang, 'profile.preferencesSaved'));
  const unitsId = React.useId();
  const dietId = React.useId();
  const langId = React.useId();
  const preferredLanguage = isLocale(prefs.language.slice(0, 2)) ? (prefs.language.slice(0, 2) as Locale) : lang;

  const toggleDiet = (id: string) => {
    const current = prefs.dietaryRestrictions;
    setDietaryRestrictions(current.includes(id) ? current.filter((d) => d !== id) : [...current, id]);
    saved();
  };

  const changeLanguage = (next: Locale) => {
    updatePreferences({ language: next });
    // The same explicit-choice record the header LangSwitcher writes.
    rememberLocale(next);
    saved();
    if (next !== lang) navigate(withBase(localizedRoute('/profile/', next)), 'assign');
  };

  return (
    <Card data-testid="profile-preferences">
      <CardHeader>
        <CardTitle className="text-lg">{t(lang, 'profile.preferences')}</CardTitle>
        <CardDescription>{t(lang, 'profile.preferencesHint')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <fieldset className="space-y-2">
          <legend id={unitsId} className="text-sm font-medium text-foreground">
            {t(lang, 'profile.unitSystem')}
          </legend>
          <RadioGroup
            value={prefs.unitSystem}
            onValueChange={(value) => {
              setUnitSystem(value as UnitSystem);
              saved();
            }}
            aria-labelledby={unitsId}
            data-testid="profile-units"
          >
            {UNIT_SYSTEMS.map((system) => (
              <ChoiceRow key={system} value={system} label={t(lang, UNIT_LABEL[system])} testId={`profile-units-${system}`} />
            ))}
          </RadioGroup>
        </fieldset>

        <fieldset className="space-y-2" aria-describedby={`${dietId}-hint`}>
          <legend id={dietId} className="text-sm font-medium text-foreground">
            {t(lang, 'profile.dietaryRestrictions')}
          </legend>
          <p id={`${dietId}-hint`} className="text-xs text-muted-foreground">
            {t(lang, 'profile.dietHint')}
          </p>
          <div className="grid gap-2 sm:grid-cols-2" data-testid="profile-diet">
            {DIET_OPTIONS.map(([id, key]) => (
              <DietRow key={id} id={id} label={t(lang, key)} checked={prefs.dietaryRestrictions.includes(id)} onToggle={() => toggleDiet(id)} />
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" aria-describedby={`${langId}-hint`}>
          <legend id={langId} className="text-sm font-medium text-foreground">
            {t(lang, 'profile.preferredLanguage')}
          </legend>
          <p id={`${langId}-hint`} className="text-xs text-muted-foreground">
            {t(lang, 'profile.preferredLanguageHint')}
          </p>
          <RadioGroup
            value={preferredLanguage}
            onValueChange={(value) => changeLanguage(value as Locale)}
            aria-labelledby={langId}
            className="sm:grid-cols-3"
            data-testid="profile-language"
          >
            {LOCALES.map((locale) => (
              <ChoiceRow key={locale} value={locale} label={LOCALE_NAMES[locale]} lang={locale} testId={`profile-language-${locale}`} />
            ))}
          </RadioGroup>
        </fieldset>

        <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted-foreground" data-testid="profile-preferences-status">
          {status}
        </p>
      </CardContent>
    </Card>
  );
}

/** Base UI radios/checkboxes are `<span role>`: name them with `aria-labelledby` (see RecipeBrowser). */
function ChoiceRow({ value, label, lang, testId }: { value: string; label: string; lang?: Locale; testId: string }) {
  const id = React.useId();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <RadioGroupItem value={value} aria-labelledby={id} data-testid={testId} />
      <span id={id} lang={lang}>
        {label}
      </span>
    </label>
  );
}

function DietRow({ id, label, checked, onToggle }: { id: string; label: string; checked: boolean; onToggle: () => void }) {
  const labelId = React.useId();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <Checkbox checked={checked} onCheckedChange={onToggle} value={id} aria-labelledby={labelId} data-testid={`profile-diet-${id}`} />
      <span id={labelId}>{label}</span>
    </label>
  );
}

// ── Your data (ADR 0002 §4) ──────────────────────────────────────────────────

function DataCard({ lang, user }: { lang: Locale; user: AuthUser }) {
  const onExport = React.useCallback(async () => exportUserDataBlob(user), [user]);
  const onExportError = React.useCallback(() => toast({ title: t(lang, 'profile.exportFailed'), data: { variant: 'destructive' } }), [lang]);
  const exportButton = (testId: string) => (
    <DownloadTrigger
      onExport={onExport}
      filename={exportFileName()}
      label={t(lang, 'profile.exportData')}
      onError={onExportError}
      data-testid={testId}
    />
  );

  const onClear = () => {
    clearUserData();
    toast({ title: t(lang, 'profile.dataCleared') });
  };

  return (
    <Card data-testid="profile-data">
      <CardHeader>
        <CardTitle className="text-lg">{t(lang, 'profile.yourData')}</CardTitle>
        <CardDescription>{t(lang, 'profile.yourDataDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        {exportButton('profile-export')}
        <AlertDialog>
          <AlertDialogTrigger render={<Button type="button" variant="destructive" data-testid="profile-clear" />}>
            <Trash2Icon aria-hidden="true" />
            {t(lang, 'profile.clearData')}
          </AlertDialogTrigger>
          <AlertDialogContent lang={lang} data-testid="profile-clear-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{t(lang, 'profile.clearConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t(lang, 'profile.clearConfirmBody')}</AlertDialogDescription>
            </AlertDialogHeader>
            <div>{exportButton('profile-clear-export')}</div>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</AlertDialogClose>
              <AlertDialogClose render={<Button type="button" variant="destructive" onClick={onClear} data-testid="profile-clear-confirm" />}>
                {t(lang, 'profile.clearConfirm')}
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
