import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    return token && userData ? { token, ...JSON.parse(userData) } : null;
  });

  const login = (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userData', JSON.stringify(user));
    setAuth({ token, ...user });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 