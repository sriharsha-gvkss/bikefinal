import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import config from '../config';

const API_URL = `${config.bookingServiceUrl}/api/auth/register`;

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    role: 'RIDER',
    phoneNumber: '',
    vehicleType: '',
    licenseNumber: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // If role is changing and it's not DRIVER, clear driver-specific fields
    if (name === 'role' && value !== 'DRIVER') {
      setFormData({
        ...formData,
        [name]: value,
        vehicleType: '',
        licenseNumber: ''
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      console.log('Sending registration data:', formData);
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      setSuccess('Registration successful! Please login.');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError('Registration failed: ' + err.message);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-content">
        <div className="card" style={{ maxWidth: '400px', margin: '60px auto' }}>
          <h2 className="text-center">Register</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username:</label>
              <input 
                type="text" 
                name="username"
                className="form-input"
                value={formData.username} 
                onChange={handleChange} 
                required 
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email:</label>
              <input 
                type="email" 
                name="email"
                className="form-input"
                value={formData.email} 
                onChange={handleChange} 
                required 
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password:</label>
              <input 
                type="password" 
                name="password"
                className="form-input"
                value={formData.password} 
                onChange={handleChange} 
                required 
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number:</label>
              <input 
                type="tel" 
                name="phoneNumber"
                className="form-input"
                value={formData.phoneNumber} 
                onChange={handleChange} 
                required 
                autoComplete="tel"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role:</label>
              <select 
                name="role"
                className="form-input"
                value={formData.role} 
                onChange={handleChange}
              >
                <option value="RIDER">Rider</option>
                <option value="DRIVER">Driver</option>
                <option value="ADMIN">Admin</option>
              </select>
              {formData.role === 'DRIVER' && (
                <div style={{ 
                  color: 'var(--primary-color)', 
                  fontSize: 'var(--font-size-sm)', 
                  marginTop: 'var(--spacing-xs)', 
                  fontWeight: 'bold' 
                }}>
                  ✓ Driver fields will appear below
                </div>
              )}
            </div>
            {formData.role === 'DRIVER' && (
              <>
                <div className="card" style={{ 
                  background: '#f0f8ff', 
                  border: '1px solid var(--primary-color)'
                }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    color: 'var(--primary-color)', 
                    marginBottom: 'var(--spacing-sm)',
                    fontSize: 'var(--font-size-sm)'
                  }}>
                    🚗 Driver Information Required
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Type: <span style={{ color: 'red' }}>*</span></label>
                    <select 
                      name="vehicleType"
                      className="form-input"
                      value={formData.vehicleType} 
                      onChange={handleChange} 
                      required={formData.role === 'DRIVER'}
                    >
                      <option value="">Select Vehicle Type</option>
                      <option value="BIKE_1_SEATER">Bike 1 Seater</option>
                      <option value="AUTO_3_SEATER">Auto 3 Seater</option>
                      <option value="CAR_4_SEATER">Car 4 Seater</option>
                      <option value="XUV_7_SEATER">XUV 7 Seater</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">License Number: <span style={{ color: 'red' }}>*</span></label>
                    <input 
                      type="text" 
                      name="licenseNumber"
                      className="form-input"
                      value={formData.licenseNumber} 
                      onChange={handleChange} 
                      required={formData.role === 'DRIVER'}
                      placeholder="Enter your driving license number"
                    />
                  </div>
                </div>
              </>
            )}
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}
            <button 
              type="submit" 
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              Register
            </button>
            <div className="text-center" style={{ marginTop: 'var(--spacing-md)' }}>
              Already have an account? <Link to="/" style={{ color: 'var(--primary-color)' }}>Login here</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 