import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { User } from "@docflow/shared";
import { api, getStoredUser, setStoredUser } from "../api/client";

interface UserContextValue {
  user: User | null;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getStoredUser());

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      login: async (email: string) => {
        const loggedIn = await api.login(email);
        setStoredUser(loggedIn);
        setUser(loggedIn);
      },
      logout: () => {
        setStoredUser(null);
        setUser(null);
      },
    }),
    [user]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}
