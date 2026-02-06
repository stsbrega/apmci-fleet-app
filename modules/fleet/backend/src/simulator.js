/**
 * APMCI Fleet Simulator
 * Atlantic Plastics & Metal Crafts, Inc.
 *
 * Simulates trucks on actual delivery routes:
 * - Calamba, Laguna (Factory) to LIMA Technopark, Batangas (Yamaha)
 * - Uses real coordinates from SLEX and STAR Tollway
 */

const http = require('http');

const API_HOST = 'localhost';
const API_PORT = 5000;
const API_PATH = '/api/gps';
const API_KEY = 'gps_device_key_2024';

// Actual APMCI delivery routes: Laguna Factory to Yamaha (LIMA Technopark, Batangas)
const routes = {
  'TRK-001': {
    name: 'Calamba → LIMA Technopark (Yamaha Delivery)',
    driver: 'Juan Dela Cruz',
    waypoints: [
      { lat: 14.2114, lng: 121.1653, city: 'APMCI Factory, Calamba' },
      { lat: 14.2080, lng: 121.1590, city: 'Calamba City Proper' },
      { lat: 14.1950, lng: 121.1480, city: 'Calamba SLEX Entry' },
      { lat: 14.1750, lng: 121.1350, city: 'SLEX - Canlubang' },
      { lat: 14.1450, lng: 121.1200, city: 'SLEX - Southbound' },
      { lat: 14.1100, lng: 121.1050, city: 'Sto. Tomas, Batangas' },
      { lat: 14.0750, lng: 121.0900, city: 'Tanauan City' },
      { lat: 14.0400, lng: 121.0700, city: 'STAR Tollway' },
      { lat: 14.0000, lng: 121.0550, city: 'Malvar, Batangas' },
      { lat: 13.9700, lng: 121.0450, city: 'LIMA Technopark Entry' },
      { lat: 13.9550, lng: 121.0400, city: 'Yamaha Motor Philippines' },
    ]
  },
  'TRK-002': {
    name: 'LIMA Technopark → Calamba (Return Trip)',
    driver: 'Maria Santos',
    waypoints: [
      { lat: 13.9550, lng: 121.0400, city: 'Yamaha Motor Philippines' },
      { lat: 13.9700, lng: 121.0450, city: 'LIMA Technopark Exit' },
      { lat: 14.0000, lng: 121.0550, city: 'Malvar, Batangas' },
      { lat: 14.0400, lng: 121.0700, city: 'STAR Tollway' },
      { lat: 14.0750, lng: 121.0900, city: 'Tanauan City' },
      { lat: 14.1100, lng: 121.1050, city: 'Sto. Tomas, Batangas' },
      { lat: 14.1450, lng: 121.1200, city: 'SLEX - Northbound' },
      { lat: 14.1750, lng: 121.1350, city: 'SLEX - Canlubang' },
      { lat: 14.1950, lng: 121.1480, city: 'Calamba SLEX Exit' },
      { lat: 14.2080, lng: 121.1590, city: 'Calamba City Proper' },
      { lat: 14.2114, lng: 121.1653, city: 'APMCI Factory, Calamba' },
    ]
  },
  'TRK-003': {
    name: 'Cabuyao → LIMA (Via SLEX)',
    driver: 'Pedro Reyes',
    waypoints: [
      { lat: 14.2725, lng: 121.1250, city: 'Cabuyao, Laguna' },
      { lat: 14.2500, lng: 121.1300, city: 'Cabuyao SLEX Entry' },
      { lat: 14.2114, lng: 121.1500, city: 'Passing Calamba' },
      { lat: 14.1750, lng: 121.1350, city: 'SLEX - Southbound' },
      { lat: 14.1100, lng: 121.1050, city: 'Sto. Tomas Exit' },
      { lat: 14.0400, lng: 121.0700, city: 'STAR Tollway' },
      { lat: 13.9700, lng: 121.0450, city: 'LIMA Technopark' },
      { lat: 13.9550, lng: 121.0400, city: 'Yamaha Motor Philippines' },
    ]
  },
  'TRK-004': {
    name: 'Calamba → Los Baños (Local Delivery)',
    driver: 'Ana Garcia',
    waypoints: [
      { lat: 14.2114, lng: 121.1653, city: 'APMCI Factory, Calamba' },
      { lat: 14.2000, lng: 121.1800, city: 'Pansol, Calamba' },
      { lat: 14.1850, lng: 121.2000, city: 'Crossing, Los Baños' },
      { lat: 14.1700, lng: 121.2200, city: 'Los Baños Proper' },
      { lat: 14.1650, lng: 121.2400, city: 'UPLB Campus' },
      { lat: 14.1600, lng: 121.2500, city: 'Los Baños Delivery' },
    ]
  },
  'TRK-005': {
    name: 'Maintenance - APMCI Service Bay',
    driver: 'Jose Mendoza',
    status: 'maintenance',
    waypoints: [
      { lat: 14.2114, lng: 121.1653, city: 'APMCI Factory - Service Bay' },
    ]
  },
  'TRK-006': {
    name: 'Calamba → Silang, Cavite',
    driver: 'Rosa Villanueva',
    waypoints: [
      { lat: 14.2114, lng: 121.1653, city: 'APMCI Factory, Calamba' },
      { lat: 14.2100, lng: 121.1400, city: 'Calamba Junction' },
      { lat: 14.2150, lng: 121.1100, city: 'Tagaytay Road' },
      { lat: 14.2250, lng: 121.0800, city: 'Silang Boundary' },
      { lat: 14.2350, lng: 121.0500, city: 'Silang, Cavite' },
      { lat: 14.2400, lng: 121.0300, city: 'Silang Delivery Point' },
    ]
  }
};

// Truck state
const truckState = {};

// Initialize truck states
Object.keys(routes).forEach(truckId => {
  const route = routes[truckId];
  truckState[truckId] = {
    currentWaypointIndex: 0,
    progress: 0,
    fuel: 70 + Math.random() * 25, // 70-95%
    speed: 0,
    direction: 1,
    status: route.status || 'active',
    lastUpdate: Date.now()
  };
});

// Set TRK-005 to maintenance
truckState['TRK-005'].status = 'maintenance';
truckState['TRK-005'].speed = 0;
truckState['TRK-005'].fuel = 30;

// Interpolate between two points
function interpolate(p1, p2, t) {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * t,
    lng: p1.lng + (p2.lng - p1.lng) * t
  };
}

// Calculate heading between two points
function calculateHeading(from, to) {
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let heading = Math.atan2(y, x) * 180 / Math.PI;
  return (heading + 360) % 360;
}

// Send GPS data to API
function sendGpsData(truckId, data) {
  const postData = JSON.stringify({
    truck_id: truckId,
    latitude: data.lat,
    longitude: data.lng,
    speed: data.speed,
    heading: data.heading,
    fuel_level: data.fuel,
    city: data.city,
    route_info: data.route
  });

  const options = {
    hostname: API_HOST,
    port: API_PORT,
    path: API_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'x-api-key': API_KEY
    }
  };

  const req = http.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      if (res.statusCode === 201) {
        console.log(`  [OK] ${truckId}: ${data.city} | ${data.speed} km/h | Fuel: ${data.fuel.toFixed(1)}%`);
      } else {
        console.log(`  [FAIL] ${truckId}: Status ${res.statusCode}`);
      }
    });
  });

  req.on('error', (error) => {
    console.log(`  [ERROR] ${truckId}: ${error.message}`);
  });

  req.write(postData);
  req.end();
}

// Update truck position
function updateTruck(truckId) {
  const route = routes[truckId];
  const state = truckState[truckId];

  // Skip if maintenance
  if (state.status === 'maintenance') {
    const waypoint = route.waypoints[0];
    sendGpsData(truckId, {
      lat: waypoint.lat,
      lng: waypoint.lng,
      speed: 0,
      heading: 0,
      fuel: state.fuel,
      city: waypoint.city + ' (Maintenance)',
      route: 'Under Maintenance'
    });
    return;
  }

  const waypoints = route.waypoints;
  const currentIndex = state.currentWaypointIndex;
  const nextIndex = currentIndex + state.direction;

  // Check bounds - reverse when reaching end
  if (nextIndex >= waypoints.length || nextIndex < 0) {
    state.direction *= -1;
    // Refuel when returning to start
    if (currentIndex === 0 || currentIndex === waypoints.length - 1) {
      state.fuel = Math.min(95, state.fuel + 35);
    }
    return;
  }

  const currentWaypoint = waypoints[currentIndex];
  const nextWaypoint = waypoints[nextIndex];

  // Move progress - highway speeds vary
  const speedFactor = 0.12 + Math.random() * 0.12;
  state.progress += speedFactor;

  // Simulate realistic highway speeds (60-100 km/h on SLEX/STAR Tollway)
  const isHighway = currentWaypoint.city.includes('SLEX') ||
                    currentWaypoint.city.includes('STAR') ||
                    currentWaypoint.city.includes('Tollway');

  if (isHighway) {
    state.speed = Math.floor(70 + Math.random() * 30); // 70-100 km/h
  } else {
    state.speed = Math.floor(30 + Math.random() * 30); // 30-60 km/h city
  }

  // Reduce fuel based on speed
  const fuelConsumption = 0.03 + (state.speed / 2000);
  state.fuel = Math.max(15, state.fuel - fuelConsumption);

  if (state.progress >= 1) {
    state.progress = 0;
    state.currentWaypointIndex = nextIndex;
  }

  // Interpolate position
  const position = interpolate(currentWaypoint, nextWaypoint, state.progress);
  const heading = calculateHeading(currentWaypoint, nextWaypoint);

  // Determine city
  const city = state.progress < 0.5 ? currentWaypoint.city : nextWaypoint.city;

  sendGpsData(truckId, {
    lat: position.lat,
    lng: position.lng,
    speed: state.speed,
    heading: Math.round(heading),
    fuel: state.fuel,
    city: city,
    route: route.name
  });
}

// Main simulation loop
function runSimulation() {
  console.log('');
  console.log('=====================================================');
  console.log('   APMCI FLEET SIMULATOR');
  console.log('   Atlantic Plastics & Metal Crafts, Inc.');
  console.log('=====================================================');
  console.log('');
  console.log('Routes (Laguna-Batangas Area):');
  Object.keys(routes).forEach(truckId => {
    const route = routes[truckId];
    const status = route.status === 'maintenance' ? ' [MAINTENANCE]' : '';
    console.log(`  ${truckId}: ${route.name}${status}`);
  });
  console.log('');
  console.log('GPS Device: Teltonika FMC250 (4G LTE, IP67)');
  console.log('Update Interval: 10 seconds');
  console.log('');

  // Initial update
  console.log('[' + new Date().toLocaleTimeString() + '] Initial positions:');
  Object.keys(routes).forEach(truckId => {
    updateTruck(truckId);
  });

  // Update all trucks every 10 seconds
  setInterval(() => {
    console.log('');
    console.log('[' + new Date().toLocaleTimeString() + '] Updating positions...');
    Object.keys(routes).forEach(truckId => {
      updateTruck(truckId);
    });
  }, 10000);

  console.log('');
  console.log('Simulator running. Press Ctrl+C to stop.');
  console.log('');
}

// Start the simulator
runSimulation();
