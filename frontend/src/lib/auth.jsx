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
  const [previousSession, setPreviousSession] = useState(null);
  const [lastLogout, setLastLogout] = useState(null);

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

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    setPreviousSession(data.previous_session ? { ...data.previous_session, duration_text: fmtDuration(data.previous_session.duration_sec) } : null);
    return { user: data.user, previous_session: data.previous_session };
  };

  const logout = async () => {
    let info = null;
    try {
      const { data } = await api.post("/auth/logout");
      info = {
        duration_sec: data.session_duration_sec,
        duration_text: fmtDuration(data.session_duration_sec),
        login_at: data.login_at,
        logout_at: data.logout_at,
      };
    } catch { /* ignore */ }
    clearToken();
    setUser(null);
    setLastLogout(info);
    return info;
  };

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refresh: fetchMe, previousSession, lastLogout, setLastLogout }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
