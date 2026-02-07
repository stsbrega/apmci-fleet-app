import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom truck icons based on status
const createTruckIcon = (status, truckNumber) => {
  const colors = {
    active: '#48bb78',
    idle: '#ed8936',
    maintenance: '#f56565'
  };

  const color = colors[status] || colors.active;

  return L.divIcon({
    className: 'custom-truck-marker',
    html: `
      <div class="truck-marker-icon" style="background-color: ${color}; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
        <span class="truck-number">${truckNumber}</span>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

// Factory marker icon - large prominent marker
const factoryIcon = L.divIcon({
  className: 'custom-factory-marker',
  html: `
    <div style="
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #0077b6 0%, #023e8a 100%);
      border: 4px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 4px 15px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="
        transform: rotate(45deg);
        font-size: 24px;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
      ">🏭</span>
    </div>
  `,
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50]
});

// APMCI Factory location
const FACTORY_LOCATION = {
  lat: 14.2114,
  lng: 121.1653,
  name: 'APMCI Factory',
  address: 'Lot 48, Brgy. Majada Out, Calamba City, Laguna, Philippines'
};

// Yamaha Motor Philippines location
const YAMAHA_LOCATION = {
  lat: 13.9550,
  lng: 121.0400,
  name: 'Yamaha Motor Philippines',
  address: 'Lot 1&2 Block 17, LIMA Technology Center, Malvar, Batangas, Philippines'
};

// Honda Philippines location
const HONDA_LOCATION = {
  lat: 14.0847,
  lng: 121.1456,
  name: 'Honda Philippines',
  address: 'First Philippine Industrial Park, Tanauan City, Batangas, Philippines'
};

// Yamaha customer marker icon with logo
const yamahaIcon = L.divIcon({
  className: 'custom-yamaha-marker',
  html: `
    <div style="
      width: 50px;
      height: 50px;
      background: white;
      border: 3px solid #9b59b6;
      border-radius: 50%;
      box-shadow: 0 4px 15px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    ">
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Yamaha_Motor_Logo.svg/200px-Yamaha_Motor_Logo.svg.png"
        alt="Yamaha"
        style="width: 38px; height: auto; object-fit: contain;"
        onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=color:#9b59b6;font-weight:bold;font-size:10px>YAMAHA</span>'"
      />
    </div>
  `,
  iconSize: [50, 50],
  iconAnchor: [25, 25],
  popupAnchor: [0, -25]
});

// Honda customer marker icon with logo
const hondaIcon = L.divIcon({
  className: 'custom-honda-marker',
  html: `
    <div style="
      width: 50px;
      height: 50px;
      background: white;
      border: 3px solid #9b59b6;
      border-radius: 50%;
      box-shadow: 0 4px 15px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    ">
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Honda.svg/200px-Honda.svg.png"
        alt="Honda"
        style="width: 38px; height: auto; object-fit: contain;"
        onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=color:#9b59b6;font-weight:bold;font-size:10px>HONDA</span>'"
      />
    </div>
  `,
  iconSize: [50, 50],
  iconAnchor: [25, 25],
  popupAnchor: [0, -25]
});

// Component to handle map center updates
function MapUpdater({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

function MapView({ trucks, selectedTruck, onSelectTruck, useRealData }) {
  // Laguna-Batangas area center (Calamba to LIMA Technopark route)
  // Center point between Calamba (14.21) and LIMA Technopark (13.95)
  const defaultCenter = [14.08, 121.10];
  const defaultZoom = 10; // Zoom out to see full route

  return (
    <div className="map-view-container">
      <div className="map-header">
        <h3 className="map-title">Live GPS Tracking</h3>
        <span className="map-status">
          {useRealData ? '🟢 Live' : '🟡 Demo Mode'} • {new Date().toLocaleTimeString()}
        </span>
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="leaflet-map"
        scrollWheelZoom={true}
        worldCopyJump={true}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        minZoom={3}
      >
        {/* OpenStreetMap tiles - free and no API key needed */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Alternative: CartoDB tiles for a cleaner look */}
        {/*
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        */}

        {/* APMCI Factory Marker */}
        <Marker
          position={[FACTORY_LOCATION.lat, FACTORY_LOCATION.lng]}
          icon={factoryIcon}
        >
          <Popup>
            <div className="factory-popup">
              <h4>🏭 {FACTORY_LOCATION.name}</h4>
              <p><strong>Atlantic Plastics & Metal Crafts, Inc.</strong></p>
              <p className="factory-address">{FACTORY_LOCATION.address}</p>
              <p className="factory-note">Main Operations Hub</p>
            </div>
          </Popup>
        </Marker>

        {/* Yamaha Motor Philippines Marker */}
        <Marker
          position={[YAMAHA_LOCATION.lat, YAMAHA_LOCATION.lng]}
          icon={yamahaIcon}
        >
          <Popup>
            <div className="customer-popup yamaha">
              <h4>{YAMAHA_LOCATION.name}</h4>
              <p><strong>Key Customer</strong></p>
              <p className="customer-address">{YAMAHA_LOCATION.address}</p>
              <p className="customer-note">LIMA Technology Center</p>
            </div>
          </Popup>
        </Marker>

        {/* Honda Philippines Marker */}
        <Marker
          position={[HONDA_LOCATION.lat, HONDA_LOCATION.lng]}
          icon={hondaIcon}
        >
          <Popup>
            <div className="customer-popup honda">
              <h4>{HONDA_LOCATION.name}</h4>
              <p><strong>Key Customer</strong></p>
              <p className="customer-address">{HONDA_LOCATION.address}</p>
              <p className="customer-note">First Philippine Industrial Park</p>
            </div>
          </Popup>
        </Marker>

        {trucks.map(truck => {
          const lat = truck.location?.lat;
          const lng = truck.location?.lng;

          if (!lat || !lng) return null;

          const truckNumber = truck.id.split('-')[1];

          return (
            <Marker
              key={truck.id}
              position={[lat, lng]}
              icon={createTruckIcon(truck.status, truckNumber)}
              eventHandlers={{
                click: () => onSelectTruck(truck)
              }}
            >
              <Popup>
                <div className="truck-popup">
                  <h4>{truck.plate_number || truck.id}</h4>
                  <p><strong>Vehicle:</strong> {truck.make} {truck.model} {truck.year ? `(${truck.year})` : ''}</p>
                  {truck.body_type && <p><strong>Body:</strong> {truck.body_type}{truck.gross_weight ? ` - ${(truck.gross_weight / 1000).toFixed(1)}t GVW` : ''}</p>}
                  <p><strong>ID:</strong> {truck.id}</p>
                  <p><strong>Driver:</strong> {truck.driver}</p>
                  <p><strong>Location:</strong> {truck.location?.city || 'Unknown'}</p>
                  <p><strong>Speed:</strong> {truck.speed || 0} km/h</p>
                  <p><strong>Fuel:</strong> {truck.fuel?.toFixed(1) || 0}%</p>
                  <p><strong>Route:</strong> {truck.route || 'N/A'}</p>
                  <p><strong>Status:</strong>
                    <span className={`popup-status ${truck.status}`}>
                      {truck.status?.toUpperCase()}
                    </span>
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {selectedTruck && selectedTruck.location?.lat && (
          <MapUpdater center={[selectedTruck.location.lat, selectedTruck.location.lng]} />
        )}
      </MapContainer>
    </div>
  );
}

export default MapView;
