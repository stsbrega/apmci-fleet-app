# APMCI Enterprise Resource Planning (ERP) System

A modular ERP system for Atlantic Plastics & Metal Crafts, Inc.

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
| Fleet | Active | GPS tracking, vehicle management, driver assignments |
| Inventory | Planned | Stock management, purchasing, suppliers |
| Accounting | Planned | Invoicing, payments, financial reports |
| HR | Planned | Employee records, payroll, attendance |
| Production | Planned | Work orders, scheduling, quality control |

## Tech Stack

- **Frontend:** React, Leaflet, Recharts
- **Backend:** Node.js, Express, Socket.IO
- **Database:** PostgreSQL with Knex.js
- **Deployment:** Railway
- **Domain:** www.fleet-apmci.com

## Getting Started

### Fleet Module

```bash
# Backend
cd modules/fleet/backend
npm install
npm start

# Frontend
cd modules/fleet/frontend
npm install
npm start
```

## Deployment

Currently deployed on Railway:
- Backend: fleet-backend-production
- Frontend: fleet-frontend-production

## License

Proprietary - APMCI Internal Use Only
