import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@components/common';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/common/Tabs';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { SocialLogin } from './SocialLogin';
import { useAuth } from '@contexts/AuthContext';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'signin',
}) => {
  const { t } = useTranslation();
  const { signIn, signUp, signInGoogle, signInGitHub } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleSignIn = async (email: string, password: string) => {
    setLoading(true);
    setError(undefined);
    const result = await signIn({ email, password });
    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error);
    }
  };

  const handleSignUp = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    setError(undefined);
    const result = await signUp({ email, password, displayName });
    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(undefined);
    const result = await signInGoogle();
    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error);
    }
  };

  const handleGitHubSignIn = async () => {
    setLoading(true);
    setError(undefined);
    const result = await signInGitHub();
    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('auth.welcome', 'Welcome to Foodie')}>
      <div className="space-y-6">
        <Tabs defaultValue={defaultTab} value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')}>
          <TabsList>
            <TabsTrigger value="signin">{t('auth.signIn', 'Sign In')}</TabsTrigger>
            <TabsTrigger value="signup">{t('auth.signUp', 'Sign Up')}</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <SignInForm
              onSubmit={handleSignIn}
              loading={loading}
              error={error}
            />
          </TabsContent>

          <TabsContent value="signup">
            <SignUpForm
              onSubmit={handleSignUp}
              loading={loading}
              error={error}
            />
          </TabsContent>
        </Tabs>

        <SocialLogin
          onGoogleSignIn={handleGoogleSignIn}
          onGitHubSignIn={handleGitHubSignIn}
          loading={loading}
        />
      </div>
    </Modal>
  );
};

AuthModal.displayName = 'AuthModal';
