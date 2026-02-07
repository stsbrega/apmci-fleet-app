import React, { useState, useEffect } from 'react';
import { trucksAPI } from '../services/api';
import './FleetPage.css';

function FleetPage() {
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchTrucks();
  }, []);

  const fetchTrucks = async () => {
    try {
      setLoading(true);
      const response = await trucksAPI.getAll();
      setTrucks(response.trucks || []);
    } catch (err) {
      console.error('Failed to fetch fleet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTrucks = trucks.filter(truck => {
    const matchesSearch =
      (truck.plate_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (truck.make || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (truck.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (truck.vin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (truck.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (truck.driver_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || truck.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status) => trucks.filter(t => t.status === status).length;

  const formatWeight = (kg) => {
    if (!kg) return '-';
    return `${Number(kg).toLocaleString()} kg`;
  };

  if (loading) {
    return <div className="loading">Loading fleet inventory...</div>;
  }

  return (
    <div className="fleet-page">
      <div className="page-header">
        <div>
          <h2>Fleet Inventory</h2>
          <p>Complete vehicle registry - APMCI truck fleet</p>
        </div>
      </div>

      <div className="fleet-stats">
        <div className="stat-box" onClick={() => setStatusFilter('all')}>
          <span className="stat-number">{trucks.length}</span>
          <span className="stat-label">Total Vehicles</span>
        </div>
        <div className="stat-box green" onClick={() => setStatusFilter('active')}>
          <span className="stat-number">{getStatusCount('active')}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-box orange" onClick={() => setStatusFilter('idle')}>
          <span className="stat-number">{getStatusCount('idle')}</span>
          <span className="stat-label">Idle</span>
        </div>
        <div className="stat-box red" onClick={() => setStatusFilter('maintenance')}>
          <span className="stat-number">{getStatusCount('maintenance')}</span>
          <span className="stat-label">Maintenance</span>
        </div>
      </div>

      <div className="fleet-toolbar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by plate, make, model, VIN, driver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          {['all', 'active', 'idle', 'maintenance'].map(f => (
            <button
              key={f}
              className={`filter-btn ${statusFilter === f ? 'active' : ''}`}
              onClick={() => setStatusFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="fleet-table-container">
        <table className="fleet-table">
          <thead>
            <tr>
              <th>Plate No.</th>
              <th>Truck ID</th>
              <th>Make</th>
              <th>Series/Model</th>
              <th>Body Type</th>
              <th>Year</th>
              <th>Chassis/VIN</th>
              <th>Engine No.</th>
              <th>MV File No.</th>
              <th>Gross Wt.</th>
              <th>Net Capacity</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Odometer</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrucks.map(truck => (
              <tr
                key={truck.id}
                className={`${selectedTruck?.id === truck.id ? 'selected' : ''} status-${truck.status}`}
                onClick={() => setSelectedTruck(selectedTruck?.id === truck.id ? null : truck)}
              >
                <td className="plate-cell">{truck.plate_number}</td>
                <td className="id-cell">{truck.id}</td>
                <td>{truck.make}</td>
                <td>{truck.model}</td>
                <td>{truck.body_type || '-'}</td>
                <td className="center">{truck.year}</td>
                <td className="vin-cell">{truck.vin}</td>
                <td>{truck.engine_no || '-'}</td>
                <td>{truck.mv_file_no || '-'}</td>
                <td className="right">{formatWeight(truck.gross_weight)}</td>
                <td className="right">{formatWeight(truck.net_capacity)}</td>
                <td>{truck.driver_name || <span className="unassigned">Unassigned</span>}</td>
                <td>
                  <span className={`status-badge ${truck.status}`}>
                    {truck.status}
                  </span>
                </td>
                <td className="right">{truck.odometer ? `${Number(truck.odometer).toLocaleString()} km` : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTrucks.length === 0 && (
        <div className="no-results">
          <p>No vehicles found matching your criteria.</p>
        </div>
      )}

      {selectedTruck && (
        <div className="truck-detail-panel">
          <div className="detail-header">
            <h3>{selectedTruck.plate_number} - {selectedTruck.make} {selectedTruck.model}</h3>
            <button className="close-btn" onClick={() => setSelectedTruck(null)}>&times;</button>
          </div>
          <div className="detail-grid">
            <div className="detail-section">
              <h4>Vehicle Information</h4>
              <div className="detail-row"><span className="label">Truck ID</span><span className="value">{selectedTruck.id}</span></div>
              <div className="detail-row"><span className="label">Plate No.</span><span className="value">{selectedTruck.plate_number}</span></div>
              <div className="detail-row"><span className="label">Make</span><span className="value">{selectedTruck.make}</span></div>
              <div className="detail-row"><span className="label">Series/Model</span><span className="value">{selectedTruck.model}</span></div>
              <div className="detail-row"><span className="label">Body Type</span><span className="value">{selectedTruck.body_type || '-'}</span></div>
              <div className="detail-row"><span className="label">Year</span><span className="value">{selectedTruck.year}</span></div>
              <div className="detail-row"><span className="label">Status</span><span className={`value status-text ${selectedTruck.status}`}>{selectedTruck.status}</span></div>
            </div>
            <div className="detail-section">
              <h4>Registration</h4>
              <div className="detail-row"><span className="label">Chassis/VIN</span><span className="value mono">{selectedTruck.vin}</span></div>
              <div className="detail-row"><span className="label">Engine No.</span><span className="value mono">{selectedTruck.engine_no || '-'}</span></div>
              <div className="detail-row"><span className="label">MV File No.</span><span className="value mono">{selectedTruck.mv_file_no || '-'}</span></div>
            </div>
            <div className="detail-section">
              <h4>Specifications</h4>
              <div className="detail-row"><span className="label">Gross Weight</span><span className="value">{formatWeight(selectedTruck.gross_weight)}</span></div>
              <div className="detail-row"><span className="label">Net Capacity</span><span className="value">{formatWeight(selectedTruck.net_capacity)}</span></div>
              <div className="detail-row"><span className="label">Fuel Capacity</span><span className="value">{selectedTruck.fuel_capacity ? `${selectedTruck.fuel_capacity} L` : '-'}</span></div>
              <div className="detail-row"><span className="label">Odometer</span><span className="value">{selectedTruck.odometer ? `${Number(selectedTruck.odometer).toLocaleString()} km` : '-'}</span></div>
            </div>
            <div className="detail-section">
              <h4>Assignment</h4>
              <div className="detail-row"><span className="label">Driver</span><span className="value">{selectedTruck.driver_name || 'Unassigned'}</span></div>
              <div className="detail-row"><span className="label">GPS Device</span><span className="value">{selectedTruck.gps_device_id || 'Not assigned'}</span></div>
              <div className="detail-row"><span className="label">Fuel Level</span><span className="value">{selectedTruck.current_fuel_level ? `${selectedTruck.current_fuel_level}%` : '-'}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FleetPage;
