import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSocket } from './hooks/useSocket';
import { trucksAPI, alertsAPI } from './services/api';
import Login from './components/Login';
import DriversPage from './components/DriversPage';
import MaintenancePage from './components/MaintenancePage';
import DevicesPage from './components/DevicesPage';
import CanDataPage from './components/CanDataPage';
import MapView from './components/MapView';
import './App.css';

// Main App Component wrapped with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

// App Content with authentication check
function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Dashboard />;
}

// Mock data generators - APMCI Laguna-Batangas delivery routes (15-truck fleet)
const generateMockTrucks = () => [
  {
    id: 'TRK-001',
    driver: 'Juan Dela Cruz',
    status: 'active',
    location: { lat: 14.1450, lng: 121.1200, city: 'SLEX - Southbound' },
    fuel: 78,
    speed: 85,
    mileage: 125000,
    lastUpdate: '2 min ago',
    route: 'Calamba → LIMA Technopark (Yamaha Delivery)'
  },
  {
    id: 'TRK-002',
    driver: 'Maria Santos',
    status: 'active',
    location: { lat: 14.0400, lng: 121.0700, city: 'STAR Tollway' },
    fuel: 72,
    speed: 90,
    mileage: 165000,
    lastUpdate: '1 min ago',
    route: 'LIMA Technopark → Calamba (Return Trip)'
  },
  {
    id: 'TRK-003',
    driver: 'Pedro Reyes',
    status: 'active',
    location: { lat: 13.9700, lng: 121.0450, city: 'LIMA Technopark' },
    fuel: 65,
    speed: 25,
    mileage: 180000,
    lastUpdate: '3 min ago',
    route: 'Calamba → Tanauan (Via SLEX)'
  },
  {
    id: 'TRK-004',
    driver: 'Ana Garcia',
    status: 'active',
    location: { lat: 14.1700, lng: 121.2200, city: 'Los Baños Proper' },
    fuel: 68,
    speed: 40,
    mileage: 155000,
    lastUpdate: '3 min ago',
    route: 'Calamba → Los Baños (Local Delivery)'
  },
  {
    id: 'TRK-005',
    driver: 'Jose Mendoza',
    status: 'maintenance',
    location: { lat: 14.2114, lng: 121.1653, city: 'APMCI Factory - Service Bay' },
    fuel: 30,
    speed: 0,
    mileage: 385000,
    lastUpdate: '2 hours ago',
    route: 'Under Maintenance'
  },
  {
    id: 'TRK-006',
    driver: 'Rosa Villanueva',
    status: 'active',
    location: { lat: 14.2250, lng: 121.0800, city: 'Silang Boundary' },
    fuel: 85,
    speed: 45,
    mileage: 280000,
    lastUpdate: '4 min ago',
    route: 'Calamba → Silang, Cavite'
  },
  {
    id: 'TRK-007',
    driver: 'Carlos Ramos',
    status: 'idle',
    location: { lat: 14.2114, lng: 121.1653, city: 'APMCI Factory, Calamba' },
    fuel: 90,
    speed: 0,
    mileage: 160000,
    lastUpdate: '1 hour ago',
    route: 'Idle - Awaiting Dispatch'
  },
  {
    id: 'TRK-008',
    driver: 'Elena Flores',
    status: 'active',
    location: { lat: 14.0750, lng: 121.0900, city: 'Tanauan City' },
    fuel: 62,
    speed: 75,
    mileage: 140000,
    lastUpdate: '2 min ago',
    route: 'Calamba → Lipa City (Batangas Delivery)'
  },
  {
    id: 'TRK-009',
    driver: 'Miguel Torres',
    status: 'active',
    location: { lat: 14.2725, lng: 121.1250, city: 'Cabuyao, Laguna' },
    fuel: 80,
    speed: 55,
    mileage: 65000,
    lastUpdate: '1 min ago',
    route: 'Cabuyao → Biñan (Local Delivery)'
  },
  {
    id: 'TRK-010',
    driver: 'Sofia Aquino',
    status: 'active',
    location: { lat: 14.3500, lng: 121.0450, city: 'Biñan, Laguna' },
    fuel: 55,
    speed: 60,
    mileage: 135000,
    lastUpdate: '3 min ago',
    route: 'Biñan → Santa Rosa (Laguna Loop)'
  },
  {
    id: 'TRK-011',
    driver: 'Roberto Cruz',
    status: 'active',
    location: { lat: 13.8800, lng: 121.0200, city: 'Lipa City, Batangas' },
    fuel: 48,
    speed: 80,
    mileage: 95000,
    lastUpdate: '2 min ago',
    route: 'LIMA → Lipa → Batangas City'
  },
  {
    id: 'TRK-012',
    driver: 'Patricia Lim',
    status: 'active',
    location: { lat: 14.1100, lng: 121.1050, city: 'Sto. Tomas, Batangas' },
    fuel: 70,
    speed: 65,
    mileage: 145000,
    lastUpdate: '4 min ago',
    route: 'Calamba → Sto. Tomas → Tanauan'
  },
  {
    id: 'TRK-013',
    driver: 'Dennis Reyes',
    status: 'idle',
    location: { lat: 14.2114, lng: 121.1653, city: 'APMCI Factory, Calamba' },
    fuel: 88,
    speed: 0,
    mileage: 35000,
    lastUpdate: '45 min ago',
    route: 'Idle - Awaiting Dispatch'
  },
  {
    id: 'TRK-014',
    driver: 'Grace Navarro',
    status: 'active',
    location: { lat: 14.3100, lng: 121.0550, city: 'Santa Rosa, Laguna' },
    fuel: 92,
    speed: 50,
    mileage: 8000,
    lastUpdate: '1 min ago',
    route: 'Santa Rosa → Calamba (New Truck)'
  },
  {
    id: 'TRK-015',
    driver: 'Mark Villanueva',
    status: 'active',
    location: { lat: 14.0000, lng: 121.0550, city: 'Malvar, Batangas' },
    fuel: 60,
    speed: 70,
    mileage: 55000,
    lastUpdate: '2 min ago',
    route: 'Calamba → Malvar → LIMA Technopark'
  }
];

const generateMockAlerts = () => [
  {
    id: 1,
    type: 'critical',
    title: 'Low Fuel Alert - TRK-005 (ZBJ-997)',
    description: 'Fuel level at 30%. Isuzu NQR under maintenance at APMCI Factory.',
    time: '5 minutes ago'
  },
  {
    id: 2,
    type: 'warning',
    title: 'Maintenance Due - TRK-003 (NCF-2403)',
    description: 'Hino WU730L scheduled maintenance in 200 km. Book service appointment.',
    time: '1 hour ago'
  },
  {
    id: 3,
    type: 'info',
    title: 'Route Optimization - TRK-011 (NGX 3840)',
    description: 'Isuzu GIGA can save 45 min via STAR Tollway to Batangas City.',
    time: '2 hours ago'
  },
  {
    id: 4,
    type: 'warning',
    title: 'Speed Alert - TRK-008 (NDN 3363)',
    description: 'Hino Profia exceeded speed limit on SLEX Southbound.',
    time: '3 hours ago'
  },
  {
    id: 5,
    type: 'info',
    title: 'New Truck Online - TRK-014 (CCE 5647)',
    description: 'Isuzu Forward 2025 now active on Santa Rosa-Calamba route.',
    time: '4 hours ago'
  }
];

const generateMockFuelData = () => [
  { day: 'Mon', consumption: 420, cost: 672 },
  { day: 'Tue', consumption: 380, cost: 608 },
  { day: 'Wed', consumption: 450, cost: 720 },
  { day: 'Thu', consumption: 390, cost: 624 },
  { day: 'Fri', consumption: 430, cost: 688 },
  { day: 'Sat', consumption: 280, cost: 448 },
  { day: 'Sun', consumption: 250, cost: 400 }
];

// Helper functions
// Metro Manila bounds: Lat 14.35-14.75, Lng 120.90-121.15
function mapCoordinateToPercent(value, axis) {
  if (axis === 'x') {
    // Longitude: 120.90 to 121.15 -> 5% to 95%
    const minLng = 120.90;
    const maxLng = 121.15;
    return 5 + ((value - minLng) / (maxLng - minLng)) * 90;
  } else {
    // Latitude: 14.35 to 14.75 -> 95% to 5% (inverted for map)
    const minLat = 14.35;
    const maxLat = 14.75;
    return 95 - ((value - minLat) / (maxLat - minLat)) * 90;
  }
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// Main Dashboard Component
function Dashboard() {
  const { user, logout } = useAuth();
  const [trucks, setTrucks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [fuelData] = useState(generateMockFuelData());
  const [stats, setStats] = useState({
    totalTrucks: 0,
    activeTrucks: 0,
    avgFuel: 0,
    totalDistance: 0
  });
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useRealData, setUseRealData] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on nav click (mobile)
  const handleNavClick = (view) => {
    setActiveView(view);
    setSidebarOpen(false);
  };

  // Handle real-time updates
  const handleTruckUpdate = useCallback((data) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck =>
        truck.id === data.truckId
          ? {
              ...truck,
              location: data.latitude ? {
                ...truck.location,
                lat: data.latitude,
                lng: data.longitude,
                speed: data.speed,
                city: data.city || truck.location?.city
              } : truck.location,
              status: data.status || truck.status,
              fuel: data.fuel_level || truck.fuel
            }
          : truck
      )
    );
  }, []);

  const handleFuelUpdate = useCallback((data) => {
    setTrucks(prevTrucks =>
      prevTrucks.map(truck =>
        truck.id === data.truckId
          ? { ...truck, fuel: data.fuel_level }
          : truck
      )
    );
  }, []);

  const handleNewAlert = useCallback((alert) => {
    setAlerts(prevAlerts => [alert, ...prevAlerts].slice(0, 10));
  }, []);

  // Initialize socket connection
  useSocket(handleTruckUpdate, handleFuelUpdate, handleNewAlert);

  // Fetch initial data
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [trucksRes, alertsRes] = await Promise.all([
        trucksAPI.getAll().catch(() => null),
        alertsAPI.getActive().catch(() => null)
      ]);

      if (trucksRes && trucksRes.trucks && trucksRes.trucks.length > 0) {
        const formattedTrucks = trucksRes.trucks.map(truck => ({
          id: truck.id,
          driver: truck.driver_name || 'Unassigned',
          status: truck.status,
          location: truck.location ? {
            x: mapCoordinateToPercent(truck.location.longitude, 'x'),
            y: mapCoordinateToPercent(truck.location.latitude, 'y'),
            lat: truck.location.latitude,
            lng: truck.location.longitude,
            city: truck.location.city || 'Unknown',
            speed: truck.location.speed || 0
          } : { x: 50, y: 50, lat: 50, lng: -110, city: 'Unknown', speed: 0 },
          fuel: parseFloat(truck.current_fuel_level) || 50,
          speed: truck.location?.speed || 0,
          mileage: parseFloat(truck.odometer) || 0,
          lastUpdate: truck.location?.lastUpdate ? formatTimeAgo(truck.location.lastUpdate) : 'N/A',
          route: truck.location?.route || 'No route'
        }));

        setTrucks(formattedTrucks);
        setUseRealData(true);

        if (alertsRes && alertsRes.alerts) {
          setAlerts(alertsRes.alerts.map(a => ({
            id: a.id,
            type: a.severity,
            title: a.title,
            description: a.message,
            time: formatTimeAgo(a.created_at)
          })));
        }
      } else {
        loadMockData();
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setUseRealData(false);
    const mockTrucks = generateMockTrucks();
    setTrucks(mockTrucks);
    setAlerts(generateMockAlerts());
  };

  // Simulate real-time updates for mock data
  useEffect(() => {
    if (!useRealData && trucks.length > 0) {
      const interval = setInterval(() => {
        setTrucks(prevTrucks =>
          prevTrucks.map(truck => ({
            ...truck,
            fuel: truck.status === 'active'
              ? Math.max(20, truck.fuel - Math.random() * 0.5)
              : truck.fuel,
            speed: truck.status === 'active'
              ? Math.floor(60 + Math.random() * 20)
              : 0
          }))
        );
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [useRealData, trucks.length]);

  // Update stats when trucks change
  useEffect(() => {
    if (trucks.length > 0) {
      setStats({
        totalTrucks: trucks.length,
        activeTrucks: trucks.filter(t => t.status === 'active').length,
        avgFuel: Math.round(trucks.reduce((acc, t) => acc + t.fuel, 0) / trucks.length),
        totalDistance: trucks.reduce((acc, t) => acc + t.mileage, 0)
      });
    }
  }, [trucks]);

  const renderDashboard = () => (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon blue">🚛</div>
          </div>
          <div className="stat-value">{stats.totalTrucks}</div>
          <div className="stat-label">Total Vehicles</div>
          <div className="stat-change positive">↑ 2 new this month</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon green">✓</div>
          </div>
          <div className="stat-value">{stats.activeTrucks}</div>
          <div className="stat-label">Active Vehicles</div>
          <div className="stat-change positive">↑ 15% from yesterday</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon orange">⛽</div>
          </div>
          <div className="stat-value">{stats.avgFuel}%</div>
          <div className="stat-label">Avg Fuel Level</div>
          <div className="stat-change negative">↓ 8% since morning</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon red">📍</div>
          </div>
          <div className="stat-value">{(stats.totalDistance / 1000).toFixed(0)}k</div>
          <div className="stat-label">Total Distance (km)</div>
          <div className="stat-change positive">↑ 2,340 km today</div>
        </div>
      </div>

      <div className="content-grid">
        <MapView
          trucks={trucks}
          selectedTruck={selectedTruck}
          onSelectTruck={setSelectedTruck}
          useRealData={useRealData}
        />

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Active Alerts</h3>
            <span className="status-badge alert-badge">{alerts.length} Active</span>
          </div>
          <div className="alert-list">
            {alerts.map(alert => (
              <div key={alert.id} className={`alert-item ${alert.type}`}>
                <div className="alert-title">{alert.title}</div>
                <div className="alert-description">{alert.description}</div>
                <div className="alert-time">{alert.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="map-legend">
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-dot factory"></div>
            APMCI Factory
          </div>
          <div className="legend-item">
            <div className="legend-dot customer"></div>
            Customer
          </div>
          <div className="legend-item">
            <div className="legend-dot active"></div>
            Active
          </div>
          <div className="legend-item">
            <div className="legend-dot idle"></div>
            Idle
          </div>
          <div className="legend-item">
            <div className="legend-dot maintenance"></div>
            Maintenance
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Vehicle Status</h3>
        </div>
        <div className="vehicle-list">
          {trucks.map(truck => (
            <div key={truck.id} className="vehicle-item" onClick={() => setSelectedTruck(truck)}>
              <div className="vehicle-header">
                <span className="vehicle-name">{truck.id} - {truck.driver}</span>
                <span className={`status-badge ${truck.status}`}>
                  {truck.status.toUpperCase()}
                </span>
              </div>
              <div className="vehicle-details">
                <span>📍 {truck.location.city}</span>
                <span>⛽ {truck.fuel.toFixed(1)}%</span>
                <span>🚗 {truck.speed} km/h</span>
                <span>📊 {truck.mileage.toLocaleString()} km</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${truck.fuel}%`,
                    background: truck.fuel > 50 ? '#48bb78' :
                      truck.fuel > 30 ? '#ed8936' : '#f56565'
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderFuelTracking = () => (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">⛽</div>
          <div className="stat-value">2,600L</div>
          <div className="stat-label">Weekly Consumption</div>
          <div className="stat-change negative">↑ 12% vs last week</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">💰</div>
          <div className="stat-value">$4,160</div>
          <div className="stat-label">Fuel Costs (Week)</div>
          <div className="stat-change positive">↓ 5% savings</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">📊</div>
          <div className="stat-value">8.2 L/100km</div>
          <div className="stat-label">Fleet Avg Efficiency</div>
          <div className="stat-change positive">↓ 0.4 L improvement</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon red">🔋</div>
          <div className="stat-value">{stats.avgFuel}%</div>
          <div className="stat-label">Fleet Avg Fuel</div>
          <div className="stat-change negative">↓ Monitor ZBJ-997</div>
        </div>
      </div>

      <div className="card chart-card">
        <div className="card-header">
          <h3 className="card-title">Weekly Fuel Consumption & Costs</h3>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={fuelData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="consumption" fill="#4299e1" name="Consumption (L)" />
            <Bar yAxisId="right" dataKey="cost" fill="#48bb78" name="Cost ($)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Vehicle Fuel Efficiency Report</h3>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vehicle ID</th>
                <th>Driver</th>
                <th>Fuel Level</th>
                <th>Distance (km)</th>
                <th>Efficiency (L/100km)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {trucks.map(truck => {
                const efficiency = (7 + Math.random() * 3).toFixed(1);
                return (
                  <tr key={truck.id}>
                    <td className="font-semibold">{truck.id}</td>
                    <td>{truck.driver}</td>
                    <td>
                      <div className="fuel-cell">
                        {truck.fuel.toFixed(1)}%
                        <div className="fuel-bar-container">
                          <div
                            className="fuel-bar"
                            style={{
                              width: `${truck.fuel}%`,
                              background: truck.fuel > 50 ? '#48bb78' :
                                truck.fuel > 30 ? '#ed8936' : '#f56565'
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>{truck.mileage.toLocaleString()}</td>
                    <td>
                      <span
                        className="efficiency-value"
                        style={{
                          color: efficiency < 8 ? '#48bb78' :
                            efficiency < 9 ? '#ed8936' : '#f56565'
                        }}
                      >
                        {efficiency}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${truck.status}`}>
                        {truck.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return renderDashboard();
      case 'fuel':
        return renderFuelTracking();
      case 'drivers':
        return <DriversPage />;
      case 'maintenance':
        return <MaintenancePage />;
      case 'devices':
        return <DevicesPage />;
      case 'candata':
        return <CanDataPage />;
      default:
        return renderDashboard();
    }
  };

  const getPageTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return { title: 'Fleet Dashboard', subtitle: 'Atlantic Plastics & Metal Crafts, Inc. - Fleet Management System' };
      case 'fuel':
        return { title: 'Fuel Tracking & Analytics', subtitle: 'Monitor fuel consumption and costs across your fleet' };
      default:
        return { title: 'Fleet Dashboard', subtitle: 'Atlantic Plastics & Metal Crafts, Inc. - Fleet Management System' };
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading fleet data...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Mobile hamburger button */}
      <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="logo">
          <span className="logo-icon">🚛</span>
          <span className="logo-text">APMCI Fleet</span>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)}>&times;</button>
        </div>
        <div
          className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavClick('dashboard')}
        >
          <span>📊</span>
          <span>Dashboard</span>
        </div>
        <div
          className={`nav-item ${activeView === 'fuel' ? 'active' : ''}`}
          onClick={() => handleNavClick('fuel')}
        >
          <span>⛽</span>
          <span>Fuel Tracking</span>
        </div>
        <div className="nav-item disabled">
          <span>🗺️</span>
          <span>Routes</span>
        </div>
        <div
          className={`nav-item ${activeView === 'drivers' ? 'active' : ''}`}
          onClick={() => handleNavClick('drivers')}
        >
          <span>👥</span>
          <span>Drivers</span>
        </div>
        <div
          className={`nav-item ${activeView === 'maintenance' ? 'active' : ''}`}
          onClick={() => handleNavClick('maintenance')}
        >
          <span>🔧</span>
          <span>Maintenance</span>
        </div>
        <div
          className={`nav-item ${activeView === 'devices' ? 'active' : ''}`}
          onClick={() => handleNavClick('devices')}
        >
          <span>📡</span>
          <span>GPS Devices</span>
        </div>
        <div
          className={`nav-item ${activeView === 'candata' ? 'active' : ''}`}
          onClick={() => handleNavClick('candata')}
        >
          <span>🔌</span>
          <span>CAN Bus Data</span>
        </div>
        <div className="nav-item disabled">
          <span>📈</span>
          <span>Reports</span>
        </div>
        <div className="nav-item disabled">
          <span>⚙️</span>
          <span>Settings</span>
        </div>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.name?.charAt(0) || 'U'}</div>
            <div className="user-details">
              <span className="user-name">{user?.name || 'User'}</span>
              <span className="user-role">{user?.role || 'Viewer'}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        {activeView !== 'drivers' && activeView !== 'maintenance' && activeView !== 'devices' && activeView !== 'candata' && (
          <div className="header">
            <h1>{getPageTitle().title}</h1>
            <p>{getPageTitle().subtitle}</p>
          </div>
        )}

        {renderContent()}
      </div>

    </div>
  );
}

export default App;
