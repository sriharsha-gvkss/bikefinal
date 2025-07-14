import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import config from '../config';

const API_URL = `${config.bookingServiceUrl}/api/auth/login`;

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('RIDER');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      console.log('Login response:', data); // Debug log
      // data: { sessionToken, user: { role, username, id, email } }
      login(data.sessionToken, data.user);
      console.log('Navigating to:', data.user.role); // Debug log
      if (data.user.role === 'RIDER') navigate('/user');
      else if (data.user.role === 'DRIVER') navigate('/driver');
      else if (data.user.role === 'ADMIN') navigate('/admin');
    } catch (err) {
      setError('Login failed: ' + err.message);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="card" style={{ maxWidth: '400px', margin: '60px auto' }}>
          <h2 className="text-center">Login</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username:</label>
              <input 
                type="text" 
                className="form-input"
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required 
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password:</label>
              <input 
                type="password" 
                className="form-input"
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                autoComplete="current-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role:</label>
              <select 
                className="form-input"
                value={role} 
                onChange={e => setRole(e.target.value)}
              >
                <option value="RIDER">Rider</option>
                <option value="DRIVER">Driver</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {error && <div className="error">{error}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Login
            </button>
            <div className="text-center" style={{ marginTop: 'var(--spacing-md)' }}>
              Don't have an account? <Link to="/register" style={{ color: 'var(--primary-color)' }}>Register here</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 