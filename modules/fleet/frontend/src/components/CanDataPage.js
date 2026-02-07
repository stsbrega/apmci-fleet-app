import React, { useState, useEffect, useCallback } from 'react';
import { canAPI, trucksAPI } from '../services/api';
import './CanDataPage.css';

function CanDataPage() {
  const [, setTrucks] = useState([]);
  const [fleetCanData, setFleetCanData] = useState([]);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [truckStats, setTruckStats] = useState(null);
  const [canHistory, setCanHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFleetData();
  }, []);

  const fetchFleetData = async () => {
    try {
      setLoading(true);
      const [trucksRes, canRes] = await Promise.all([
        trucksAPI.getAll().catch(() => null),
        canAPI.getFleetSummary().catch(() => null)
      ]);

      if (trucksRes?.trucks) {
        setTrucks(trucksRes.trucks);
      }
      if (canRes?.fleet) {
        setFleetCanData(canRes.fleet);
      }
    } catch (err) {
      console.error('Failed to fetch fleet CAN data:', err);
      setError('Failed to load CAN data');
    } finally {
      setLoading(false);
    }
  };

  const selectTruck = useCallback(async (truckId) => {
    setSelectedTruck(truckId);
    try {
      const [statsRes, historyRes] = await Promise.all([
        canAPI.getStats(truckId, { hours: 24 }).catch(() => null),
        canAPI.getHistory(truckId, { limit: 50 }).catch(() => null)
      ]);
      if (statsRes) setTruckStats(statsRes);
      if (historyRes) setCanHistory(historyRes.history || []);
    } catch (err) {
      console.error('Failed to fetch truck CAN data:', err);
    }
  }, []);

  const getEngineStatusColor = (temp) => {
    if (temp === null || temp === undefined) return '#a0aec0';
    if (temp >= 110) return '#e53e3e';
    if (temp >= 100) return '#ed8936';
    if (temp >= 70) return '#48bb78';
    return '#4299e1';
  };

  const getRpmStatusColor = (rpm) => {
    if (rpm === null || rpm === undefined) return '#a0aec0';
    if (rpm >= 3500) return '#e53e3e';
    if (rpm >= 2500) return '#ed8936';
    return '#48bb78';
  };

  const getVoltageStatusColor = (v) => {
    if (v === null || v === undefined) return '#a0aec0';
    if (v < 11.5 || v > 15.0) return '#e53e3e';
    if (v < 12.2 || v > 14.5) return '#ed8936';
    return '#48bb78';
  };

  if (loading) {
    return <div className="loading">Loading CAN bus data...</div>;
  }

  const trucksWithCan = fleetCanData.filter(t => t.can_data);
  const trucksWithoutCan = fleetCanData.filter(t => !t.can_data);

  return (
    <div className="can-data-page">
      <div className="page-header">
        <div>
          <h2>CAN Bus Data</h2>
          <p>Real-time engine and vehicle diagnostics from Teltonika FMC150 trackers</p>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {/* Fleet CAN Overview Stats */}
      <div className="device-stats">
        <div className="stat-box">
          <div className="stat-icon blue">
            <span role="img" aria-label="engine">&#9881;</span>
          </div>
          <div className="stat-info">
            <span className="stat-number">{trucksWithCan.length}</span>
            <span className="stat-label">Trucks with CAN Data</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon green">
            <span role="img" aria-label="check">&#10003;</span>
          </div>
          <div className="stat-info">
            <span className="stat-number">
              {trucksWithCan.filter(t => t.can_data && t.can_data.dtc_count === 0).length}
            </span>
            <span className="stat-label">No Active DTCs</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon orange">
            <span role="img" aria-label="warning">&#9888;</span>
          </div>
          <div className="stat-info">
            <span className="stat-number">
              {trucksWithCan.filter(t => t.can_data && t.can_data.dtc_count > 0).length}
            </span>
            <span className="stat-label">Active DTC Alerts</span>
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-icon gray">
            <span role="img" aria-label="pending">&#9711;</span>
          </div>
          <div className="stat-info">
            <span className="stat-number">{trucksWithoutCan.length}</span>
            <span className="stat-label">Awaiting CAN Data</span>
          </div>
        </div>
      </div>

      {/* FMC150 Info Banner */}
      <div className="api-info-card">
        <h3>Teltonika FMC150 - CAN Bus Integration</h3>
        <p className="device-model">
          Device: <strong>FMC150</strong> (4G LTE Cat 1, GNSS, CAN Bus Reader, IP67)
        </p>
        <div className="config-section features">
          <h4>CAN Bus Parameters Collected</h4>
          <div className="feature-tags">
            <span className="feature-tag">Engine RPM</span>
            <span className="feature-tag">Coolant Temp</span>
            <span className="feature-tag">Engine Load</span>
            <span className="feature-tag">Fuel Level (CAN)</span>
            <span className="feature-tag">Fuel Rate</span>
            <span className="feature-tag">Vehicle Speed (CAN)</span>
            <span className="feature-tag">Battery Voltage</span>
            <span className="feature-tag">Odometer</span>
            <span className="feature-tag">DTC Codes</span>
            <span className="feature-tag">Oil Pressure</span>
            <span className="feature-tag">Intake Air Temp</span>
            <span className="feature-tag">Accelerator Position</span>
          </div>
          <p className="config-note">
            Data received via Teltonika Codec 8E TCP protocol on port {process.env.REACT_APP_TELTONIKA_TCP_PORT || '5027'}.
            FMC150 reads CAN data directly from the vehicle OBD-II port.
          </p>
        </div>
      </div>

      {/* Fleet CAN Data Grid */}
      <div className="section">
        <h3>Fleet Engine Status ({fleetCanData.length} vehicles)</h3>
        <div className="can-grid">
          {fleetCanData.map(item => (
            <div
              key={item.truck_id}
              className={`can-card ${selectedTruck === item.truck_id ? 'selected' : ''} ${!item.can_data ? 'no-data' : ''}`}
              onClick={() => item.can_data && selectTruck(item.truck_id)}
            >
              <div className="can-card-header">
                <span className="can-truck-id">{item.truck_id}</span>
                <span className={`status-badge ${item.status}`}>
                  {item.status}
                </span>
              </div>

              {item.can_data ? (
                <div className="can-card-body">
                  <div className="can-gauge-row">
                    <div className="can-gauge">
                      <div className="gauge-label">RPM</div>
                      <div className="gauge-value" style={{ color: getRpmStatusColor(item.can_data.engine_rpm) }}>
                        {item.can_data.engine_rpm ?? '--'}
                      </div>
                    </div>
                    <div className="can-gauge">
                      <div className="gauge-label">Coolant</div>
                      <div className="gauge-value" style={{ color: getEngineStatusColor(item.can_data.engine_coolant_temp) }}>
                        {item.can_data.engine_coolant_temp != null ? `${item.can_data.engine_coolant_temp}°C` : '--'}
                      </div>
                    </div>
                    <div className="can-gauge">
                      <div className="gauge-label">Speed</div>
                      <div className="gauge-value">
                        {item.can_data.vehicle_speed_can != null ? `${item.can_data.vehicle_speed_can}` : '--'}
                        <span className="gauge-unit">km/h</span>
                      </div>
                    </div>
                  </div>

                  <div className="can-details">
                    <div className="can-detail-row">
                      <span className="detail-label">Fuel (CAN)</span>
                      <span className="detail-value">
                        {item.can_data.fuel_level_can != null ? `${item.can_data.fuel_level_can.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="can-detail-row">
                      <span className="detail-label">Battery</span>
                      <span className="detail-value" style={{ color: getVoltageStatusColor(item.can_data.battery_voltage) }}>
                        {item.can_data.battery_voltage != null ? `${item.can_data.battery_voltage.toFixed(1)}V` : 'N/A'}
                      </span>
                    </div>
                    <div className="can-detail-row">
                      <span className="detail-label">DTC</span>
                      <span className={`detail-value ${item.can_data.dtc_count > 0 ? 'dtc-warning' : ''}`}>
                        {item.can_data.dtc_count || 0} codes
                      </span>
                    </div>
                  </div>

                  <div className="can-timestamp">
                    Last: {item.can_data.recorded_at ? new Date(item.can_data.recorded_at).toLocaleString() : 'N/A'}
                  </div>
                </div>
              ) : (
                <div className="can-card-body no-data-body">
                  <div className="no-data-text">
                    {item.device_model === 'FMC150'
                      ? 'Awaiting first CAN data transmission...'
                      : 'No FMC150 assigned - CAN data unavailable'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Selected Truck Detail */}
      {selectedTruck && truckStats && (
        <div className="section">
          <h3>24-Hour Engine Statistics - {selectedTruck}</h3>
          <div className="stats-detail-grid">
            <div className="stat-detail-card">
              <h4>Engine RPM</h4>
              <div className="stat-detail-values">
                <div className="stat-pair">
                  <span className="pair-label">Average</span>
                  <span className="pair-value">{truckStats.stats?.avg_rpm ?? 'N/A'}</span>
                </div>
                <div className="stat-pair">
                  <span className="pair-label">Maximum</span>
                  <span className="pair-value">{truckStats.stats?.max_rpm ?? 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="stat-detail-card">
              <h4>Coolant Temperature</h4>
              <div className="stat-detail-values">
                <div className="stat-pair">
                  <span className="pair-label">Average</span>
                  <span className="pair-value">
                    {truckStats.stats?.avg_coolant_temp != null ? `${truckStats.stats.avg_coolant_temp}°C` : 'N/A'}
                  </span>
                </div>
                <div className="stat-pair">
                  <span className="pair-label">Maximum</span>
                  <span className="pair-value" style={{ color: getEngineStatusColor(truckStats.stats?.max_coolant_temp) }}>
                    {truckStats.stats?.max_coolant_temp != null ? `${truckStats.stats.max_coolant_temp}°C` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="stat-detail-card">
              <h4>Engine Load</h4>
              <div className="stat-detail-values">
                <div className="stat-pair">
                  <span className="pair-label">Average</span>
                  <span className="pair-value">
                    {truckStats.stats?.avg_engine_load != null ? `${truckStats.stats.avg_engine_load}%` : 'N/A'}
                  </span>
                </div>
                <div className="stat-pair">
                  <span className="pair-label">Peak</span>
                  <span className="pair-value">
                    {truckStats.stats?.max_engine_load != null ? `${truckStats.stats.max_engine_load}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="stat-detail-card">
              <h4>Vehicle Speed</h4>
              <div className="stat-detail-values">
                <div className="stat-pair">
                  <span className="pair-label">Average</span>
                  <span className="pair-value">
                    {truckStats.stats?.avg_speed != null ? `${truckStats.stats.avg_speed} km/h` : 'N/A'}
                  </span>
                </div>
                <div className="stat-pair">
                  <span className="pair-label">Maximum</span>
                  <span className="pair-value">
                    {truckStats.stats?.max_speed != null ? `${truckStats.stats.max_speed} km/h` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="stat-detail-card">
              <h4>Fuel Consumption</h4>
              <div className="stat-detail-values">
                <div className="stat-pair">
                  <span className="pair-label">Avg Rate</span>
                  <span className="pair-value">
                    {truckStats.stats?.avg_fuel_rate != null ? `${truckStats.stats.avg_fuel_rate} L/h` : 'N/A'}
                  </span>
                </div>
                <div className="stat-pair">
                  <span className="pair-label">Total Used</span>
                  <span className="pair-value">
                    {truckStats.stats?.fuel_consumed_l != null ? `${truckStats.stats.fuel_consumed_l} L` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="stat-detail-card">
              <h4>Battery & Distance</h4>
              <div className="stat-detail-values">
                <div className="stat-pair">
                  <span className="pair-label">Avg Voltage</span>
                  <span className="pair-value" style={{ color: getVoltageStatusColor(truckStats.stats?.avg_battery_voltage) }}>
                    {truckStats.stats?.avg_battery_voltage != null ? `${truckStats.stats.avg_battery_voltage}V` : 'N/A'}
                  </span>
                </div>
                <div className="stat-pair">
                  <span className="pair-label">Distance</span>
                  <span className="pair-value">
                    {truckStats.stats?.distance_covered_km != null ? `${truckStats.stats.distance_covered_km} km` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CAN History Table */}
          {canHistory.length > 0 && (
            <div className="can-history-section">
              <h4>Recent CAN Data Records ({canHistory.length})</h4>
              <div className="can-history-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>RPM</th>
                      <th>Coolant</th>
                      <th>Load</th>
                      <th>Speed</th>
                      <th>Fuel</th>
                      <th>Battery</th>
                      <th>DTC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {canHistory.slice(0, 20).map((record, idx) => (
                      <tr key={idx}>
                        <td className="timestamp-cell">
                          {new Date(record.recorded_at).toLocaleTimeString()}
                        </td>
                        <td>{record.engine_rpm ?? '--'}</td>
                        <td style={{ color: getEngineStatusColor(record.engine_coolant_temp) }}>
                          {record.engine_coolant_temp != null ? `${record.engine_coolant_temp}°C` : '--'}
                        </td>
                        <td>{record.engine_load != null ? `${record.engine_load}%` : '--'}</td>
                        <td>{record.vehicle_speed_can != null ? `${record.vehicle_speed_can}` : '--'}</td>
                        <td>{record.fuel_level_can != null ? `${record.fuel_level_can}%` : '--'}</td>
                        <td style={{ color: getVoltageStatusColor(record.battery_voltage) }}>
                          {record.battery_voltage != null ? `${record.battery_voltage}V` : '--'}
                        </td>
                        <td className={record.dtc_count > 0 ? 'dtc-warning' : ''}>
                          {record.dtc_count || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CanDataPage;
