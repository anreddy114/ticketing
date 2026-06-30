import { createContext, useContext, useEffect, useState } from "react";
import { api, setToken, clearToken, getToken } from "./api";

const AuthCtx = createContext(null);

const fmtDuration = (sec) => {
  if (sec == null) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previousOnline, setPreviousOnline] = useState(null);

  const fetchMe = async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
      clearToken();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMe(); }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    const prev = data.previous_online_session
      ? { ...data.previous_online_session, duration_text: fmtDuration(data.previous_online_session.duration_sec) }
      : null;
    setPreviousOnline(prev);
    return { user: data.user, previous_online_session: prev };
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    clearToken();
    setUser(null);
    setPreviousOnline(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refresh: fetchMe, previousOnline, setPreviousOnline }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
export { fmtDuration };
