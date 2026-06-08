import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

import { Auth, Profile as ProfileApi, setToken } from "@/src/lib/api";

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
};

export type ProfileData = {
  user_id: string;
  user_name: string;
  ai_name: string;
  wake_word: string;
  voice_id: string;
  theme: string;
  language: string;
  model_provider: string;
  model_name: string;
  onboarding_complete: boolean;
};

type AuthContextValue = {
  loading: boolean;
  user: User | null;
  profile: ProfileData | null;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: (name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfileLocal: (p: ProfileData) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const r: any = await ProfileApi.get();
      setProfile(r.profile);
    } catch (e) {
      setProfile(null);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    try {
      const r: any = await Auth.me();
      setUser(r.user);
      await loadProfile();
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    // Cold-start: parse web URL hash if a session_id is present (Emergent web flow)
    if (Platform.OS === "web") {
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const sid = params.get("session_id");
      if (sid) {
        (async () => {
          try {
            const r: any = await Auth.google(sid);
            await setToken(r.session_token);
            window.history.replaceState(null, "", window.location.pathname);
            await bootstrap();
          } catch {
            await bootstrap();
          }
        })();
        return;
      }
    }
    bootstrap();
  }, [bootstrap]);

  const signInWithGoogle = async () => {
    const redirect =
      Platform.OS === "web"
        ? `${window.location.origin}/`
        : Linking.createURL("auth");
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirect)}`;
    if (Platform.OS === "web") {
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirect);
    if (result.type !== "success" || !result.url) return;
    const url = result.url;
    // session_id can be in hash or query
    let sid: string | null = null;
    const hashIdx = url.indexOf("#");
    if (hashIdx !== -1) {
      const params = new URLSearchParams(url.slice(hashIdx + 1));
      sid = params.get("session_id");
    }
    if (!sid) {
      const qIdx = url.indexOf("?");
      if (qIdx !== -1) {
        const params = new URLSearchParams(url.slice(qIdx + 1));
        sid = params.get("session_id");
      }
    }
    if (!sid) return;
    const r: any = await Auth.google(sid);
    await setToken(r.session_token);
    await bootstrap();
  };

  const signInAsGuest = async (name = "Guest") => {
    const r: any = await Auth.guest(name);
    await setToken(r.session_token);
    await bootstrap();
  };

  const signOut = async () => {
    try {
      await Auth.logout();
    } catch {}
    await setToken(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        user,
        profile,
        signInWithGoogle,
        signInAsGuest,
        signOut,
        refreshProfile: loadProfile,
        setProfileLocal: setProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
