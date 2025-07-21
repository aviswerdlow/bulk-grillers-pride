import { SignIn } from '@clerk/nextjs';
import { Suspense } from 'react';
import { AuthLoading } from '@/components/auth/auth-loading';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your Bulk account</p>
        </div>

        <Suspense fallback={<AuthLoading text="Loading sign in..." />}>
          <SignIn
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'shadow-lg border-0',
              },
            }}
            path="/sign-in"
            routing="path"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/onboarding"
          />
        </Suspense>
      </div>
    </div>
  );
}
