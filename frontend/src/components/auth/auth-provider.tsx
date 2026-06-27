"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTheme } from "@/components/theme-provider";
import {
  AuthApiError,
  type AuthUser,
  getCurrentUser,
  logout as logoutRequest,
} from "@/lib/auth-api";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((currentUser) => {
        if (isMounted) setUser(currentUser);
      })
      .catch((error: unknown) => {
        if (isMounted && error instanceof AuthApiError && error.status === 401) {
          setTheme("system");
        }
        if (
          isMounted &&
          (!(error instanceof AuthApiError) || error.status !== 401)
        ) {
          console.error("Nu s-a putut verifica sesiunea curentă.", error);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [setTheme]);

  useEffect(() => {
    if (user) {
      setTheme(user.theme_preference);
    }
  }, [setTheme, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      setUser,
      logout: async () => {
        await logoutRequest();
        setUser(null);
        setTheme("system");
      },
    }),
    [isLoading, setTheme, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth trebuie folosit în interiorul AuthProvider.");
  }
  return context;
}
