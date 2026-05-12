import { useEffect, useState } from "react";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";

function App() {
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
    }
  }, [token]);

  const handleLogin = (payload) => {
    localStorage.setItem("acris_token", payload.token);
    localStorage.setItem("acris_user", JSON.stringify(payload.user));
    setToken(payload.token);
    setUser(payload.user);
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
