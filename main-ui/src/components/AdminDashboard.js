import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import Header from './Header';

const API_BASE = '/api';

const AdminDashboard = () => {
  const { auth } = useAuth();
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      // Fetch all data in parallel
      const [usersRes, driversRes, bookingsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/users`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE}/admin/drivers`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE}/admin/bookings`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${API_BASE}/admin/stats`, {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      if (driversRes.ok) {
        const driversData = await driversRes.json();
        setDrivers(driversData);
      }

      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookings(bookingsData);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

    } catch (err) {
      setError('Error fetching admin data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const response = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchAdminData(); // Refresh data
      }
    } catch (err) {
      setError('Error updating user status: ' + err.message);
    }
  };

  const toggleDriverStatus = async (driverId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const response = await fetch(`${API_BASE}/admin/drivers/${driverId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${auth.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchAdminData(); // Refresh data
      }
    } catch (err) {
      setError('Error updating driver status: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Header />
        <div className="dashboard-content">
          <div className="loading">Loading admin dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header />
      <div className="dashboard-content">
        <h2>Admin Dashboard</h2>
        
        {error && <div className="error">{error}</div>}
        
        <div className="card">
          <h3>Admin Information</h3>
          <div className="grid grid-2">
            <div>
              <p><strong>Username:</strong> {auth.username}</p>
              <p><strong>Role:</strong> {auth.role}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>System Statistics</h3>
          <div className="stats-grid">
            <div className="stats-card">
              <div className="stats-number">{stats.totalUsers || 0}</div>
              <div className="stats-label">Total Users</div>
            </div>
            <div className="stats-card">
              <div className="stats-number">{stats.totalDrivers || 0}</div>
              <div className="stats-label">Total Drivers</div>
            </div>
            <div className="stats-card">
              <div className="stats-number">{stats.totalBookings || 0}</div>
              <div className="stats-label">Total Bookings</div>
            </div>
            <div className="stats-card">
              <div className="stats-number">{stats.activeBookings || 0}</div>
              <div className="stats-label">Active Bookings</div>
            </div>
            <div className="stats-card">
              <div className="stats-number">{stats.systemStatus || 'OPERATIONAL'}</div>
              <div className="stats-label">System Status</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Rider Management</h3>
          {users.length === 0 ? (
            <p>No riders found.</p>
          ) : (
            <div className="table-container">
              <table className="table table-responsive">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={index}>
                      <td data-label="Username">{user.username}</td>
                      <td data-label="Email">{user.email}</td>
                      <td data-label="Status">{user.status}</td>
                      <td data-label="Action">
                        <button 
                          onClick={() => toggleUserStatus(user.id, user.status)}
                          className={`btn ${user.status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'}`}
                        >
                          {user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Driver Management</h3>
          {drivers.length === 0 ? (
            <p>No drivers found.</p>
          ) : (
            <div className="table-container">
              <table className="table table-responsive">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Vehicle Type</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((driver, index) => (
                    <tr key={index}>
                      <td data-label="Username">{driver.username}</td>
                      <td data-label="Email">{driver.email}</td>
                      <td data-label="Status">{driver.status}</td>
                      <td data-label="Vehicle Type">{driver.vehicleType || 'N/A'}</td>
                      <td data-label="Action">
                        <button 
                          onClick={() => toggleDriverStatus(driver.id, driver.status)}
                          className={`btn ${driver.status === 'ACTIVE' ? 'btn-danger' : 'btn-secondary'}`}
                        >
                          {driver.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <h3>Booking Management</h3>
          {bookings.length === 0 ? (
            <p>No bookings found.</p>
          ) : (
            <div className="table-container">
              <table className="table table-responsive">
                <thead>
                  <tr>
                    <th>Booking ID</th>
                    <th>User</th>
                    <th>Driver</th>
                    <th>Pickup</th>
                    <th>Destination</th>
                    <th>Status</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, index) => (
                    <tr key={index}>
                      <td data-label="Booking ID">{booking.id}</td>
                      <td data-label="User">{booking.userId}</td>
                      <td data-label="Driver">{booking.driverId || 'Unassigned'}</td>
                      <td data-label="Pickup">{booking.pickupLocation}</td>
                      <td data-label="Destination">{booking.destination}</td>
                      <td data-label="Status">{booking.status}</td>
                      <td data-label="Price">₹{booking.estimatedPrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 