import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (!auth) return null;

  return (
    <header className="card" style={{ 
      background: 'var(--primary-color)', 
      color: 'white', 
      marginBottom: 0,
      borderRadius: 0
    }}>
      <div className="nav-responsive">
        <div className="flex align-center">
          <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>Bike Ride App</h3>
          <div className="visible-mobile">
            <button 
              onClick={toggleMenu}
              className="btn btn-outline"
              style={{ 
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                marginLeft: 'var(--spacing-sm)'
              }}
            >
              ☰
            </button>
          </div>
        </div>
        
        <div className={`flex align-center ${isMenuOpen ? 'visible-mobile' : 'hidden-mobile'}`}>
          <div className="text-center-mobile" style={{ marginBottom: 'var(--spacing-sm)' }}>
            <small>Welcome, {auth.username || 'User'} ({auth.role})</small>
          </div>
          <button 
            onClick={handleLogout}
            className="btn btn-outline"
            style={{
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)'
            }}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 