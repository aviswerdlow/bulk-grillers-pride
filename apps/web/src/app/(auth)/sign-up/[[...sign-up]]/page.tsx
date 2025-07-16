import { SignUp } from '@clerk/nextjs';
import { Suspense } from 'react';
import { AuthLoading } from '@/components/auth/auth-loading';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Get started with Bulk</h1>
          <p className="text-gray-600 mt-2">Create your account and start managing products</p>
        </div>

        <Suspense fallback={<AuthLoading text="Loading sign up..." />}>
          <SignUp
            appearance={{
              elements: {
                rootBox: 'mx-auto',
                card: 'shadow-lg border-0',
              },
            }}
            path="/sign-up"
            routing="path"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/onboarding"
          />
        </Suspense>

        <div className="text-center mt-6 text-sm text-gray-500">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </div>
      </div>
    </div>
  );
}
