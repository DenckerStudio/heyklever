'use client';
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  mode?: 'signin' | 'signup';
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onGoogleSignIn?: () => void;
  onMagicLink?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
  onGoToSignIn?: () => void;
  onModeChange?: (mode: 'signin' | 'signup') => void;
}

// --- SUB-COMPONENTS ---

const AnimatedInput = ({ 
  label, 
  name, 
  type = 'text', 
  placeholder, 
  showPasswordToggle = false,
  onTogglePassword,
  showPassword,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
  required?: boolean;
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <label 
        htmlFor={name}
        className="block text-sm font-medium text-foreground/80 mb-2"
      >
        {label}
        {required && <span className="text-violet-400 ml-1">*</span>}
      </label>
      <motion.div
        className="relative group"
        animate={{
          scale: isFocused ? 1.01 : 1,
        }}
        transition={{ duration: 0.2 }}
      >
        <div className="relative rounded-xl border-2 border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-300 focus-within:border-violet-400/70 focus-within:bg-violet-500/5 focus-within:shadow-lg focus-within:shadow-violet-500/20">
          <input
            id={name}
            name={name}
            type={showPasswordToggle ? (showPassword ? 'text' : 'password') : type}
            placeholder={placeholder}
            required={required}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full bg-transparent px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all duration-200"
          />
          {showPasswordToggle && (
            <button
              type="button"
              onClick={onTogglePassword}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
        {isFocused && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-violet-400/50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </motion.div>
    </motion.div>
  );
};

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  mode: initialMode = 'signin',
  title,
  description,
  heroImageSrc: _heroImageSrc,
  testimonials: _testimonials = [],
  onSignIn,
  onGoogleSignIn,
  onMagicLink,
  onResetPassword,
  onCreateAccount,
  onGoToSignIn,
  onModeChange,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    // Load remember me preference from localStorage
    const savedRememberMe = localStorage.getItem('rememberMe');
    if (savedRememberMe === 'true') {
      setRememberMe(true);
    }
  }, []);

  const handleRememberMeChange = (checked: boolean) => {
    setRememberMe(checked);
    // Save to localStorage immediately when toggled
    if (checked) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
    }
  };

  const handleModeSwitch = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    onModeChange?.(newMode);
    if (newMode === 'signin') {
      onGoToSignIn?.();
    } else {
      onCreateAccount?.();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const formData = new FormData(e.currentTarget);
      const rememberMeValue = formData.get('rememberMe') === 'on';
      
      // Store remember me preference
      if (rememberMeValue) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }
      
      // Call the onSignIn handler - if it returns a promise, wait for it
      const result = onSignIn?.(e);
      if (result && typeof result === 'object' && 'then' in result) {
        await (result as Promise<unknown>);
      }
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Sign in error:', error);
    } finally {
      // Reset loading state after a short delay to allow for smooth animation
      // The parent component should handle navigation/redirect which will unmount this component
      setTimeout(() => {
        setIsLoading(false);
      }, 100);
    }
  };

  const signInTitle = title || (
    <span className="font-light text-foreground tracking-tighter">Welcome back</span>
  );
  const signUpTitle = (
    <span className="font-light text-foreground tracking-tighter">Create your account</span>
  );
  const signInDescription = description || "Access your account and continue your journey with us";
  const signUpDescription = "Start your team, connect your drive, and chat with Klever AI";

  return (
    <div className="h-[100dvh] flex font-geist w-[100dvw] relative overflow-hidden">
      {/* Sign-in form */}
      <section className="flex-1 flex items-center justify-center p-8 relative z-10">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="space-y-2">
                <motion.h1
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl md:text-5xl font-semibold leading-tight"
                >
                  {mode === 'signin' ? signInTitle : signUpTitle}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-muted-foreground text-base"
                >
                  {mode === 'signin' ? signInDescription : signUpDescription}
                </motion.p>
              </div>

              <form className="space-y-5" onSubmit={handleFormSubmit}>
                <AnimatedInput
                  label="Email Address"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  required
                />

                <AnimatedInput
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  showPasswordToggle
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  showPassword={showPassword}
                  required
                />

                {mode === 'signup' && (
                  <AnimatedInput
                    label="Team / Organization"
                    name="teamName"
                    type="text"
                    placeholder="e.g. Acme Inc."
                    required
                  />
                )}

                {mode === 'signin' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-between text-sm"
                  >
                    <label 
                      htmlFor="rememberMe"
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="relative">
                        <input
                          id="rememberMe"
                          type="checkbox"
                          name="rememberMe"
                          checked={rememberMe}
                          onChange={(e) => handleRememberMeChange(e.target.checked)}
                          className="sr-only"
                          aria-label="Keep me signed in"
                        />
                        <div 
                          className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center pointer-events-none ${
                            rememberMe
                              ? 'bg-violet-500 border-violet-500'
                              : 'border-border group-hover:border-violet-400/50'
                          }`}
                        >
                          {rememberMe && (
                            <motion.svg
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-3 h-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </motion.svg>
                          )}
                        </div>
                      </div>
                      <span className="text-foreground/90 select-none">Keep me signed in</span>
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onResetPassword?.();
                      }}
                      className="hover:underline text-violet-400 transition-colors"
                    >
                      Reset password
                    </button>
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={isLoading ? {} : { scale: 1.02 }}
                  whileTap={isLoading ? {} : { scale: 0.98 }}
                  animate={{
                    opacity: isLoading ? 0.8 : 1,
                    scale: isLoading ? 0.98 : 1,
                  }}
                  transition={{ duration: 0.2 }}
                  className="relative z-20 w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 py-4 font-medium text-white hover:from-violet-600 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-80 flex items-center justify-center gap-2"
                >
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        key="loader"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2"
                      >
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Signing in...</span>
                      </motion.div>
                    ) : (
                      <motion.span
                        key="text"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {mode === 'signup' ? 'Create Account' : 'Sign In'}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="relative flex flex-col gap-3"
              >
                <div className="flex items-center justify-center mt-6 mb-4">
                  <span className="w-full border-t border-border relative z-0"></span>
                  <span className="px-4 -mt-1 text-sm text-muted-foreground bg-background absolute z-10">OR</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onMagicLink?.();
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-3 border-2 border-border rounded-xl py-3.5 hover:bg-secondary hover:border-violet-400/50 transition-all duration-200"
                  >
                    Get Magic Link
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={onGoogleSignIn}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-3 border-2 border-border rounded-xl py-3.5 hover:bg-secondary hover:border-violet-400/50 transition-all duration-200"
                  >
                    <GoogleIcon />
                    Google
                  </motion.button>
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-sm text-muted-foreground"
              >
                {mode === 'signup' ? (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleModeSwitch('signin');
                      }}
                      className="text-violet-400 hover:underline transition-colors font-medium"
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    New to our platform?{' '}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleModeSwitch('signup');
                      }}
                      className="text-violet-400 hover:underline transition-colors font-medium"
                    >
                      Create Account
                    </button>
                  </>
                )}
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
};
