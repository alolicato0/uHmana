import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useSymptomsStore } from '../store/symptoms';
import { apiGoogleAuth, apiLogin, apiRegister, type AuthUser } from '../services/auth';

const ONBOARDED_KEY = 'uhmana_onboarded';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  hasOnboarded: boolean;
  hasPickedMode: boolean;
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
  // hasPickedMode: solo in memoria — si azzera ad ogni avvio/logout, forza sempre la schermata welcome.
  const [hasPickedMode, setHasPickedMode] = useState(false);
  // Sessione solo in memoria: nessuna persistenza, login richiesto ad ogni avvio.
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(ONBOARDED_KEY).then((onboarded) => {
      setHasOnboarded(onboarded === '1');
      setIsLoaded(true);
    });
  }, []);

  const setOnboarded = useCallback(async () => {
    await SecureStore.setItemAsync(ONBOARDED_KEY, '1');
    setHasOnboarded(true);
    setHasPickedMode(true);
  }, []);

  const persist = useCallback(async (t: string, u: AuthUser) => {
    // Se l'account cambia, pulisce i dati locali del vecchio utente
    const store = useSymptomsStore.getState();
    if (store.ownerId !== null && store.ownerId !== u.id) {
      store.clearAll();
    }
    store.setOwner(u.id);
    tokenRef.current = t;
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
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    setHasPickedMode(false);
    // Rimuove il flag onboarded così il welcome riappare al prossimo login.
    // I dati sintomi NON vengono cancellati: stesso utente che rientra li ritrova.
    // Se cambia account, la pulizia avviene in persist() al momento del nuovo login.
    await SecureStore.deleteItemAsync(ONBOARDED_KEY);
    setHasOnboarded(false);
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    return tokenRef.current;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoaded,
        isSignedIn: !!token,
        hasOnboarded,
        hasPickedMode,
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

