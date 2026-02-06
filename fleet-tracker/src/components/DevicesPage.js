import React, { useState, useEffect } from 'react';
import { trucksAPI } from '../services/api';
import './DevicesPage.css';

function DevicesPage() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTruck, setEditingTruck] = useState(null);
  const [formData, setFormData] = useState({ gps_device_id: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTrucks();
  }, []);

  const fetchTrucks = async () => {
    try {
      setLoading(true);
      const response = await trucksAPI.getAll();
      setTrucks(response.trucks || []);
    } catch (err) {
      console.error('Failed to fetch trucks:', err);
      setError('Failed to load trucks');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignDevice = (truck) => {
    setEditingTruck(truck);
    setFormData({ gps_device_id: truck.gps_device_id || '' });
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleRemoveDevice = async (truck) => {
    if (!window.confirm(`Remove GPS device from ${truck.id}?`)) return;

    try {
      await trucksAPI.update(truck.id, { gps_device_id: null });
      setSuccess(`Device removed from ${truck.id}`);
      fetchTrucks();
    } catch (err) {
      setError('Failed to remove device');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await trucksAPI.update(editingTruck.id, {
        gps_device_id: formData.gps_device_id.trim() || null
      });
      setSuccess(`Device ${formData.gps_device_id ? 'assigned to' : 'removed from'} ${editingTruck.id}`);
      setShowModal(false);
      fetchTrucks();
    } catch (err) {
      if (err.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else {
        setError('Failed to update device assignment');
      }
    }
  };

  const getDeviceStatus = (truck) => {
    if (!truck.gps_device_id) return 'not-assigned';
    if (truck.location?.timestamp) {
      const lastUpdate = new Date(truck.location.timestamp);
      const now = new Date();
      const diffMinutes = (now - lastUpdate) / (1000 * 60);
      if (diffMinutes < 5) return 'online';
      if (diffMinutes < 30) return 'delayed';
      return 'offline';
    }
    return 'unknown';
  };

  const formatLastSeen = (truck) => {
    if (!truck.location?.timestamp) return 'Never';
    const date = new Date(truck.location.timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="loading">Loading devices...</div>;
  }

  const assignedDevices = trucks.filter(t => t.gps_device_id);
  const unassignedTrucks = trucks.filter(t => !t.gps_device_id);

  return (
    <div className="devices-page">
      <div className="page-header">
        <div>
          <h2>GPS Device Management</h2>
          <p>Register and manage GPS tracking devices for your fleet</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {/* Device Stats */}
      <div className="device-stats">
        <div className="stat-box">
          <div className="stat-icon blue">📡</div>
          <div className="stat-info">
            <span className="stat-number">{assignedDevices.length}</span>
            <span className="stat-label">Devices Assigned</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon green">🟢</div>
          <div className="stat-info">
            <span className="stat-number">
              {assignedDevices.filter(t => getDeviceStatus(t) === 'online').length}
            </span>
            <span className="stat-label">Online</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon orange">🟡</div>
          <div className="stat-info">
            <span className="stat-number">
              {assignedDevices.filter(t => ['delayed', 'offline', 'unknown'].includes(getDeviceStatus(t))).length}
            </span>
            <span className="stat-label">Offline/Delayed</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon gray">⚪</div>
          <div className="stat-info">
            <span className="stat-number">{unassignedTrucks.length}</span>
            <span className="stat-label">Trucks Without Device</span>
          </div>
        </div>
      </div>

      {/* FMC250 Configuration Guide */}
      <div className="api-info-card">
        <h3>📡 Teltonika FMC250 Setup Guide</h3>
        <p className="device-model">Recommended Device: <strong>FMC250</strong> (4G LTE Cat 1, IP67 Waterproof)</p>

        <div className="config-section">
          <h4>1. Server Configuration</h4>
          <div className="endpoint-box">
            <code>POST http://YOUR_SERVER_IP:5000/api/gps/device/<span className="highlight">IMEI</span></code>
          </div>
          <p className="config-note">Replace YOUR_SERVER_IP with your server's public IP address. Use the device's IMEI as the Device ID.</p>
        </div>

        <div className="config-section">
          <h4>2. Teltonika Configurator Settings</h4>
          <div className="config-grid">
            <div className="config-item">
              <span className="config-label">Protocol:</span>
              <span className="config-value">HTTP</span>
            </div>
            <div className="config-item">
              <span className="config-label">Domain:</span>
              <span className="config-value">YOUR_SERVER_IP</span>
            </div>
            <div className="config-item">
              <span className="config-label">Port:</span>
              <span className="config-value">5000</span>
            </div>
            <div className="config-item">
              <span className="config-label">APN (Globe):</span>
              <span className="config-value">internet.globe.com.ph</span>
            </div>
            <div className="config-item">
              <span className="config-label">APN (Smart):</span>
              <span className="config-value">internet</span>
            </div>
          </div>
        </div>

        <div className="config-section">
          <h4>3. Data Format</h4>
          <div className="format-info">
            <strong>Supported formats:</strong>
            <ul>
              <li><code>{'{ "lat": 14.21, "lng": 121.16, "speed": 45, "fuel": 75 }'}</code></li>
              <li><code>{'{ "latitude": 14.21, "longitude": 121.16, "speed": 45 }'}</code></li>
            </ul>
          </div>
        </div>

        <div className="config-section features">
          <h4>4. FMC250 Key Features</h4>
          <div className="feature-tags">
            <span className="feature-tag">4G LTE Cat 1</span>
            <span className="feature-tag">IP67 Waterproof</span>
            <span className="feature-tag">CAN Bus</span>
            <span className="feature-tag">Fuel Monitoring</span>
            <span className="feature-tag">3G/2G Fallback</span>
          </div>
          <p className="config-note">Ideal for Manila-Laguna-Batangas routes with harsh weather conditions.</p>
        </div>
      </div>

      {/* Assigned Devices */}
      <div className="section">
        <h3>Assigned Devices ({assignedDevices.length})</h3>
        {assignedDevices.length === 0 ? (
          <div className="empty-state">No devices assigned yet. Click "Assign Device" on a truck below.</div>
        ) : (
          <div className="devices-grid">
            {assignedDevices.map(truck => {
              const status = getDeviceStatus(truck);
              return (
                <div key={truck.id} className="device-card">
                  <div className="device-header">
                    <div className="device-id">
                      <span className={`status-dot ${status}`}></span>
                      {truck.gps_device_id}
                    </div>
                    <span className={`status-badge ${status}`}>{status}</span>
                  </div>
                  <div className="device-body">
                    <div className="device-info-row">
                      <span className="label">Truck:</span>
                      <span className="value">{truck.id}</span>
                    </div>
                    <div className="device-info-row">
                      <span className="label">Plate:</span>
                      <span className="value">{truck.plate_number}</span>
                    </div>
                    <div className="device-info-row">
                      <span className="label">Driver:</span>
                      <span className="value">{truck.driver_name || 'Unassigned'}</span>
                    </div>
                    <div className="device-info-row">
                      <span className="label">Last Seen:</span>
                      <span className="value">{formatLastSeen(truck)}</span>
                    </div>
                    {truck.location && (
                      <div className="device-info-row">
                        <span className="label">Location:</span>
                        <span className="value">{truck.location.city || 'Unknown'}</span>
                      </div>
                    )}
                  </div>
                  <div className="device-actions">
                    <button className="btn-edit" onClick={() => handleAssignDevice(truck)}>
                      Change Device
                    </button>
                    <button className="btn-remove" onClick={() => handleRemoveDevice(truck)}>
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Unassigned Trucks */}
      <div className="section">
        <h3>Trucks Without GPS Device ({unassignedTrucks.length})</h3>
        {unassignedTrucks.length === 0 ? (
          <div className="empty-state success">All trucks have GPS devices assigned!</div>
        ) : (
          <div className="trucks-table">
            <table>
              <thead>
                <tr>
                  <th>Truck ID</th>
                  <th>Plate Number</th>
                  <th>Make/Model</th>
                  <th>Driver</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {unassignedTrucks.map(truck => (
                  <tr key={truck.id}>
                    <td className="truck-id">{truck.id}</td>
                    <td>{truck.plate_number}</td>
                    <td>{truck.make} {truck.model}</td>
                    <td>{truck.driver_name || <span className="muted">Unassigned</span>}</td>
                    <td>
                      <span className={`status-badge ${truck.status}`}>{truck.status}</span>
                    </td>
                    <td>
                      <button className="btn-assign" onClick={() => handleAssignDevice(truck)}>
                        Assign Device
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Device Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTruck?.gps_device_id ? 'Change' : 'Assign'} GPS Device</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="truck-info">
                  <strong>Truck:</strong> {editingTruck?.id} ({editingTruck?.plate_number})
                </div>

                <div className="form-group">
                  <label>GPS Device ID</label>
                  <input
                    type="text"
                    value={formData.gps_device_id}
                    onChange={e => setFormData({ gps_device_id: e.target.value })}
                    placeholder="e.g., GPS-001, IMEI number, or device serial"
                  />
                  <small>
                    Enter the unique identifier of your GPS device. This should match
                    what the device sends in its API requests.
                  </small>
                </div>

                {editingTruck?.gps_device_id && (
                  <div className="current-device">
                    <strong>Current Device:</strong> {editingTruck.gps_device_id}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {formData.gps_device_id ? 'Save Device' : 'Remove Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DevicesPage;
