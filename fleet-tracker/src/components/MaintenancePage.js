import React, { useState, useEffect } from 'react';
import { maintenanceAPI, trucksAPI } from '../services/api';
import './MaintenancePage.css';

const MaintenancePage = () => {
  const [records, setRecords] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [formData, setFormData] = useState({
    truck_id: '',
    type: 'oil_change',
    title: '',
    description: '',
    scheduled_date: '',
    priority: 'medium',
    estimated_cost: '',
    service_provider: '',
    notes: '',
  });

  const maintenanceTypes = [
    { value: 'oil_change', label: 'Oil Change' },
    { value: 'tire_rotation', label: 'Tire Rotation' },
    { value: 'tire_replacement', label: 'Tire Replacement' },
    { value: 'brake_service', label: 'Brake Service' },
    { value: 'engine_service', label: 'Engine Service' },
    { value: 'transmission_service', label: 'Transmission Service' },
    { value: 'inspection', label: 'Inspection' },
    { value: 'repair', label: 'Repair' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [recordsRes, trucksRes, statsRes] = await Promise.all([
        maintenanceAPI.getAll(),
        trucksAPI.getAll(),
        maintenanceAPI.getStats(),
      ]);
      setRecords(recordsRes.records || []);
      setTrucks(trucksRes.trucks || []);
      setStats(statsRes.stats);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      };

      if (editingRecord) {
        await maintenanceAPI.update(editingRecord.id, data);
      } else {
        await maintenanceAPI.create(data);
      }
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      truck_id: record.truck_id,
      type: record.type,
      title: record.title,
      description: record.description || '',
      scheduled_date: record.scheduled_date?.split('T')[0] || '',
      priority: record.priority,
      estimated_cost: record.estimated_cost || '',
      service_provider: record.service_provider || '',
      notes: record.notes || '',
    });
    setShowModal(true);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await maintenanceAPI.update(id, { status: newStatus });
      fetchData();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this maintenance record?')) {
      try {
        await maintenanceAPI.delete(id);
        fetchData();
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormData({
      truck_id: '',
      type: 'oil_change',
      title: '',
      description: '',
      scheduled_date: '',
      priority: 'medium',
      estimated_cost: '',
      service_provider: '',
      notes: '',
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return 'blue';
      case 'in_progress':
        return 'orange';
      case 'completed':
        return 'green';
      case 'cancelled':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
        return 'red';
      case 'high':
        return 'orange';
      case 'medium':
        return 'blue';
      case 'low':
        return 'green';
      default:
        return 'gray';
    }
  };

  const filteredRecords = records.filter((record) => {
    const matchesStatus = filter === 'all' || record.status === filter;
    const matchesType = typeFilter === 'all' || record.type === typeFilter;
    return matchesStatus && matchesType;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return <div className="loading">Loading maintenance records...</div>;
  }

  return (
    <div className="maintenance-page">
      <div className="page-header">
        <div>
          <h2>Maintenance Tracking</h2>
          <p>Schedule and track vehicle maintenance and repairs</p>
        </div>
        <button
          className="add-btn"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Schedule Maintenance
        </button>
      </div>

      {stats && (
        <div className="maintenance-stats">
          <div className="stat-box">
            <span className="stat-icon blue">📅</span>
            <div>
              <span className="stat-number">{stats.scheduled}</span>
              <span className="stat-label">Scheduled</span>
            </div>
          </div>
          <div className="stat-box">
            <span className="stat-icon orange">🔧</span>
            <div>
              <span className="stat-number">{stats.inProgress}</span>
              <span className="stat-label">In Progress</span>
            </div>
          </div>
          <div className="stat-box">
            <span className="stat-icon green">✅</span>
            <div>
              <span className="stat-number">{stats.completedLast30Days}</span>
              <span className="stat-label">Completed (30d)</span>
            </div>
          </div>
          <div className="stat-box">
            <span className="stat-icon purple">💰</span>
            <div>
              <span className="stat-number">
                {formatCurrency(stats.totalCostLast30Days)}
              </span>
              <span className="stat-label">Total Cost (30d)</span>
            </div>
          </div>
        </div>
      )}

      <div className="maintenance-toolbar">
        <div className="filter-group">
          <label>Status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Type:</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {maintenanceTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="maintenance-list">
        {filteredRecords.map((record) => (
          <div key={record.id} className="maintenance-card">
            <div className="card-header">
              <div className="card-title-section">
                <h3>{record.title}</h3>
                <div className="card-badges">
                  <span className={`status-badge ${getStatusColor(record.status)}`}>
                    {record.status?.replace('_', ' ')}
                  </span>
                  <span className={`priority-badge ${getPriorityColor(record.priority)}`}>
                    {record.priority}
                  </span>
                </div>
              </div>
              <div className="card-actions">
                <button className="icon-btn" onClick={() => handleEdit(record)}>
                  ✏️
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => handleDelete(record.id)}
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="card-body">
              <div className="card-info-grid">
                <div className="info-item">
                  <span className="info-label">Truck</span>
                  <span className="info-value">
                    {record.truck_id} ({record.plate_number})
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Type</span>
                  <span className="info-value">
                    {maintenanceTypes.find((t) => t.value === record.type)?.label ||
                      record.type}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Scheduled Date</span>
                  <span className="info-value">{formatDate(record.scheduled_date)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Est. Cost</span>
                  <span className="info-value">
                    {formatCurrency(record.estimated_cost)}
                  </span>
                </div>
                {record.service_provider && (
                  <div className="info-item">
                    <span className="info-label">Service Provider</span>
                    <span className="info-value">{record.service_provider}</span>
                  </div>
                )}
                {record.completed_date && (
                  <div className="info-item">
                    <span className="info-label">Completed</span>
                    <span className="info-value">
                      {formatDate(record.completed_date)}
                    </span>
                  </div>
                )}
              </div>

              {record.description && (
                <p className="card-description">{record.description}</p>
              )}
            </div>

            <div className="card-footer">
              {record.status === 'scheduled' && (
                <button
                  className="action-btn start"
                  onClick={() => handleStatusChange(record.id, 'in_progress')}
                >
                  Start Maintenance
                </button>
              )}
              {record.status === 'in_progress' && (
                <button
                  className="action-btn complete"
                  onClick={() => handleStatusChange(record.id, 'completed')}
                >
                  Mark Complete
                </button>
              )}
              {['scheduled', 'in_progress'].includes(record.status) && (
                <button
                  className="action-btn cancel"
                  onClick={() => handleStatusChange(record.id, 'cancelled')}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRecords.length === 0 && (
        <div className="no-results">
          <p>No maintenance records found matching your criteria.</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingRecord ? 'Edit Maintenance' : 'Schedule Maintenance'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Truck *</label>
                  <select
                    value={formData.truck_id}
                    onChange={(e) =>
                      setFormData({ ...formData, truck_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Select Truck</option>
                    {trucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.id} - {truck.plate_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    required
                  >
                    {maintenanceTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Scheduled Oil Change"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Scheduled Date</label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduled_date: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: e.target.value })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Estimated Cost ($)</label>
                  <input
                    type="number"
                    value={formData.estimated_cost}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_cost: e.target.value })
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Service Provider</label>
                  <input
                    type="text"
                    value={formData.service_provider}
                    onChange={(e) =>
                      setFormData({ ...formData, service_provider: e.target.value })
                    }
                    placeholder="e.g., TruckPro Service Center"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    placeholder="Describe the maintenance work needed..."
                  />
                </div>
                <div className="form-group full-width">
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={2}
                    placeholder="Additional notes..."
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
                  {editingRecord ? 'Update' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenancePage;
