import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiGoogleAuth, apiLogin, apiRegister, type AuthUser } from '../services/auth';

const TOKEN_KEY = 'uhmana_jwt';
const ONBOARDED_KEY = 'uhmana_onboarded';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  hasOnboarded: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  setOnboarded: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      SecureStore.getItemAsync(ONBOARDED_KEY),
    ]).then(async ([stored, onboarded]) => {
      if (stored) {
        try {
          const payload = parseJwtPayload(stored);
          setToken(stored);
          setUser({ id: payload.sub, email: payload.email, name: payload.name });
        } catch {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      }
      setHasOnboarded(onboarded === '1');
      setIsLoaded(true);
    });
  }, []);

  const setOnboarded = useCallback(async () => {
    await SecureStore.setItemAsync(ONBOARDED_KEY, '1');
    setHasOnboarded(true);
  }, []);

  const persist = useCallback(async (t: string, u: AuthUser) => {
    await SecureStore.setItemAsync(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    await persist(res.token, res.user);
  }, [persist]);

  const signUp = useCallback(async (email: string, password: string, name: string) => {
    const res = await apiRegister(email, password, name);
    await persist(res.token, res.user);
  }, [persist]);

  const signInWithGoogle = useCallback(async (accessToken: string) => {
    const res = await apiGoogleAuth(accessToken);
    await persist(res.token, res.user);
  }, [persist]);

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoaded,
        isSignedIn: !!token,
        hasOnboarded,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        setOnboarded,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider');
  return ctx;
}

function parseJwtPayload(token: string): { sub: string; email: string; name: string } {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  );
  return JSON.parse(json);
}
