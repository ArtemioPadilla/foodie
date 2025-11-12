import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button } from '@components/common';
import { cn } from '@utils/cn';

export interface SignUpFormProps {
  onSubmit: (email: string, password: string, displayName: string) => Promise<void>;
  loading?: boolean;
  error?: string;
  className?: string;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({
  onSubmit,
  loading = false,
  error,
  className,
}) => {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!displayName || !email || !password || !confirmPassword) {
      setLocalError(t('auth.fillAllFields', 'Please fill in all fields'));
      return;
    }

    if (password !== confirmPassword) {
      setLocalError(t('auth.passwordMismatch', 'Passwords do not match'));
      return;
    }

    if (password.length < 6) {
      setLocalError(t('auth.passwordTooShort', 'Password must be at least 6 characters'));
      return;
    }

    try {
      await onSubmit(email, password, displayName);
    } catch (err: any) {
      setLocalError(err?.message || t('auth.signUpError', 'Failed to create account'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <Input
        type="text"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder={t('auth.displayName', 'Display Name')}
        autoComplete="name"
        disabled={loading}
      />

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
        autoComplete="new-password"
        disabled={loading}
      />

      <Input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder={t('auth.confirmPassword', 'Confirm Password')}
        autoComplete="new-password"
        disabled={loading}
      />

      {(error || localError) && (
        <p className="text-sm text-red-600 dark:text-red-400">{error || localError}</p>
      )}

      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? t('common.loading', 'Loading...') : t('auth.signUp', 'Sign Up')}
      </Button>
    </form>
  );
};

SignUpForm.displayName = 'SignUpForm';
