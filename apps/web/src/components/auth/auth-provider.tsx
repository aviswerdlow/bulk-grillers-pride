"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { isSignedIn, user } = useUser();
  const storeUser = useMutation(api.functions.auth.users.store);

  useEffect(() => {
    // Automatically store user in Convex when they're authenticated
    if (isSignedIn && user) {
      storeUser().catch((error) => {
        // Error will be handled by error boundary or toast system
        console.error("Failed to store user in Convex:", error);
      });
    }
  }, [isSignedIn, user, storeUser]);

  return <>{children}</>;
} 