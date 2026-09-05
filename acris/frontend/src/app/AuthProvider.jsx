import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem("acris_token") || "",
  );
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("acris_user");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (!token) {
      localStorage.removeItem("acris_token");
      localStorage.removeItem("acris_user");
      setUser(null);
      return;
    }

    localStorage.setItem("acris_token", token);
  }, [token]);

  const login = (payload) => {
    localStorage.setItem("acris_token", payload.token);
    localStorage.setItem("acris_user", JSON.stringify(payload.user));
    setToken(payload.token);
    setUser(payload.user);
  };

  const logout = () => {
    localStorage.removeItem("acris_token");
    localStorage.removeItem("acris_user");
    setToken("");
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      logout,
      isAuthenticated: Boolean(token),
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
