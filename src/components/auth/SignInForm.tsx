import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button } from '@components/common';
import { cn } from '@utils/cn';

export interface SignInFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword?: () => void;
  loading?: boolean;
  error?: string;
  className?: string;
}

export const SignInForm: React.FC<SignInFormProps> = ({
  onSubmit,
  onForgotPassword,
  loading = false,
  error,
  className,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError(t('auth.fillAllFields', 'Please fill in all fields'));
      return;
    }

    try {
      await onSubmit(email, password);
    } catch (err: any) {
      setLocalError(err?.message || t('auth.signInError', 'Failed to sign in'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={t('auth.email', 'Email')}
        autoComplete="email"
        disabled={loading}
      />

      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t('auth.password', 'Password')}
        autoComplete="current-password"
        disabled={loading}
      />

      {(error || localError) && (
        <p className="text-sm text-red-600 dark:text-red-400">{error || localError}</p>
      )}

      {onForgotPassword && (
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          disabled={loading}
        >
          {t('auth.forgotPassword', 'Forgot password?')}
        </button>
      )}

      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? t('common.loading', 'Loading...') : t('auth.signIn', 'Sign In')}
      </Button>
    </form>
  );
};

SignInForm.displayName = 'SignInForm';
