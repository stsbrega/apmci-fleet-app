# APMCI Enterprise Resource Planning (ERP) System

A modular ERP system for Atlantic Plastics & Metal Crafts, Inc.

## Live Demo

- **Fleet Management:** [www.fleet-apmci.com](https://www.fleet-apmci.com)
- **Login:** admin@fleettrack.com / admin123

## Project Structure

```
apmci-erp/
├── modules/
│   ├── fleet/              # Fleet Management (Active)
│   │   ├── frontend/       # React app
│   │   └── backend/        # Node.js API
│   ├── inventory/          # Inventory Management (Planned)
│   ├── accounting/         # Accounting & Finance (Planned)
│   ├── hr/                 # Human Resources (Planned)
│   └── production/         # Production Management (Planned)
├── shared/
│   ├── components/         # Shared React components
│   ├── auth/               # Unified authentication
│   └── utils/              # Common utilities
└── docs/                   # Documentation
```

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| Fleet | **Active** | GPS tracking, vehicle management, driver assignments, fuel monitoring, maintenance scheduling |
| Inventory | Planned | Stock management, purchasing, suppliers, warehouse locations |
| Accounting | Planned | Invoicing, payments, financial reports, budgeting |
| HR | Planned | Employee records, payroll, attendance, leave management |
| Production | Planned | Work orders, scheduling, quality control, BOM management |

## Fleet Module Features

- Real-time GPS tracking with interactive map
- Vehicle status monitoring (Active, Idle, Maintenance)
- Driver management and assignment
- Fuel consumption tracking
- Maintenance scheduling and alerts
- Mobile-responsive design
- WebSocket-based live updates

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Leaflet Maps, Recharts, Socket.IO Client |
| Backend | Node.js, Express, Socket.IO, Knex.js |
| Database | PostgreSQL |
| Deployment | Railway |
| Domain | Squarespace DNS |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Fleet Module - Local Development

```bash
# Backend
cd modules/fleet/backend
npm install
# Create .env file with DATABASE_URL, JWT_SECRET, PORT
npm start

# Frontend (new terminal)
cd modules/fleet/frontend
npm install
npm start
```

### Environment Variables

**Backend (.env)**
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-secret-key
PORT=5000
FRONTEND_URL=http://localhost:3000
```

## Deployment

### Railway (Current)

| Service | URL |
|---------|-----|
| Backend | fleet-backend-production-a6ad.up.railway.app |
| Frontend | www.fleet-apmci.com |
| Database | PostgreSQL on Railway |

### Deploy Updates

```bash
# Deploy backend
cd modules/fleet/backend
railway up --service fleet-backend

# Deploy frontend
cd modules/fleet/frontend
railway up --service fleet-frontend
```

## Roadmap

### Phase 1 - Fleet Management (Current)
- [x] Dashboard with KPIs
- [x] Live GPS tracking map
- [x] Vehicle status monitoring
- [x] Driver management
- [x] Maintenance page
- [x] Mobile responsive design
- [ ] Fuel tracking reports
- [ ] Route history and playback
- [ ] Geofencing alerts

### Phase 2 - Inventory Management
- [ ] Product catalog
- [ ] Stock levels and alerts
- [ ] Purchase orders
- [ ] Supplier management
- [ ] Warehouse locations

### Phase 3 - Integration
- [ ] Unified authentication across modules
- [ ] Shared dashboard
- [ ] Cross-module reporting

## Contributing

Internal APMCI development only.

## License

Proprietary - APMCI Internal Use Only
