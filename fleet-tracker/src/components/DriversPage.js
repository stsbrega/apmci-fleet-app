import React, { useState, useEffect } from 'react';
import { driversAPI, trucksAPI } from '../services/api';
import './DriversPage.css';

const DriversPage = () => {
  const [drivers, setDrivers] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    license_number: '',
    license_expiry: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [driversRes, trucksRes] = await Promise.all([
        driversAPI.getAll(),
        trucksAPI.getAll(),
      ]);
      setDrivers(driversRes.drivers || []);
      setTrucks(trucksRes.trucks || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDriver) {
        await driversAPI.update(editingDriver.id, formData);
      } else {
        await driversAPI.create(formData);
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleEdit = (driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      email: driver.email || '',
      phone: driver.phone || '',
      license_number: driver.license_number,
      license_expiry: driver.license_expiry?.split('T')[0] || '',
      emergency_contact_name: driver.emergency_contact_name || '',
      emergency_contact_phone: driver.emergency_contact_phone || '',
      notes: driver.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      try {
        await driversAPI.delete(id);
        fetchData();
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const handleAssign = async (driverId, truckId) => {
    try {
      await driversAPI.assign(driverId, truckId || null);
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const resetForm = () => {
    setEditingDriver(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      license_number: '',
      license_expiry: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      notes: '',
    });
  };

  const filteredDrivers = drivers.filter((driver) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'assigned' && driver.assigned_truck_id) ||
      (filter === 'available' && !driver.assigned_truck_id) ||
      driver.status === filter;

    const matchesSearch =
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.license_number.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'on_duty':
        return 'green';
      case 'available':
        return 'blue';
      case 'off_duty':
        return 'orange';
      case 'inactive':
        return 'red';
      default:
        return 'gray';
    }
  };

  const isLicenseExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow;
  };

  // eslint-disable-next-line no-unused-vars
  const availableTrucks = trucks.filter(
    (truck) =>
      truck.status !== 'inactive' &&
      !drivers.some(
        (d) => d.assigned_truck_id === truck.id && d.id !== editingDriver?.id
      )
  );

  if (loading) {
    return <div className="loading">Loading drivers...</div>;
  }

  return (
    <div className="drivers-page">
      <div className="page-header">
        <div>
          <h2>Driver Management</h2>
          <p>Manage your fleet drivers and truck assignments</p>
        </div>
        <button
          className="add-btn"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Add Driver
        </button>
      </div>

      <div className="drivers-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          {['all', 'on_duty', 'available', 'off_duty', 'assigned'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="drivers-stats">
        <div className="stat-box">
          <span className="stat-number">{drivers.length}</span>
          <span className="stat-label">Total Drivers</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">
            {drivers.filter((d) => d.status === 'on_duty').length}
          </span>
          <span className="stat-label">On Duty</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">
            {drivers.filter((d) => d.assigned_truck_id).length}
          </span>
          <span className="stat-label">Assigned</span>
        </div>
        <div className="stat-box warning">
          <span className="stat-number">
            {drivers.filter((d) => isLicenseExpiringSoon(d.license_expiry)).length}
          </span>
          <span className="stat-label">License Expiring</span>
        </div>
      </div>

      <div className="drivers-grid">
        {filteredDrivers.map((driver) => (
          <div key={driver.id} className="driver-card">
            <div className="driver-header">
              <div className="driver-avatar">
                {driver.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div className="driver-info">
                <h3>{driver.name}</h3>
                <span className={`status-badge ${getStatusColor(driver.status)}`}>
                  {driver.status?.replace('_', ' ')}
                </span>
              </div>
              <div className="driver-actions">
                <button className="icon-btn" onClick={() => handleEdit(driver)}>
                  ✏️
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => handleDelete(driver.id)}
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="driver-details">
              <div className="detail-row">
                <span className="detail-label">📧 Email</span>
                <span className="detail-value">{driver.email || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">📱 Phone</span>
                <span className="detail-value">{driver.phone || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">🪪 License</span>
                <span className="detail-value">{driver.license_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">📅 Expiry</span>
                <span
                  className={`detail-value ${
                    isLicenseExpiringSoon(driver.license_expiry) ? 'warning-text' : ''
                  }`}
                >
                  {driver.license_expiry?.split('T')[0] || 'N/A'}
                  {isLicenseExpiringSoon(driver.license_expiry) && ' ⚠️'}
                </span>
              </div>
            </div>

            <div className="driver-assignment">
              <label>Assigned Truck:</label>
              <select
                value={driver.assigned_truck_id || ''}
                onChange={(e) => handleAssign(driver.id, e.target.value)}
              >
                <option value="">-- Not Assigned --</option>
                {trucks
                  .filter(
                    (t) =>
                      t.status !== 'inactive' &&
                      (!t.driver_id || t.id === driver.assigned_truck_id)
                  )
                  .map((truck) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.id} - {truck.plate_number}
                    </option>
                  ))}
              </select>
            </div>

            {driver.assigned_truck_id && (
              <div className="assigned-truck-info">
                <span>🚛 {driver.truck_plate}</span>
                <span>
                  {driver.truck_make} {driver.truck_model}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredDrivers.length === 0 && (
        <div className="no-results">
          <p>No drivers found matching your criteria.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>License Number *</label>
                  <input
                    type="text"
                    value={formData.license_number}
                    onChange={(e) =>
                      setFormData({ ...formData, license_number: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>License Expiry *</label>
                  <input
                    type="date"
                    value={formData.license_expiry}
                    onChange={(e) =>
                      setFormData({ ...formData, license_expiry: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Emergency Contact Name</label>
                  <input
                    type="text"
                    value={formData.emergency_contact_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Emergency Contact Phone</label>
                  <input
                    type="tel"
                    value={formData.emergency_contact_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact_phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingDriver ? 'Update Driver' : 'Add Driver'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversPage;
