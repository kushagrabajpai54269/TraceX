# TraceX v2

Blockchain investigation and transaction-tracing prototype.

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB Atlas account (for Phase 3+)
- Etherscan API key (for Phase 2+)

## Project Structure

```
tracex/
├── client/    # React + TypeScript + Vite (port 5173)
└── server/    # Node.js + Express + TypeScript (port 3001)
```

## Setup

### 1. Configure Server Environment

```bash
cd server
cp .env.example .env
# Edit .env and fill in your MONGODB_URI and ETHERSCAN_API_KEY
```

### 2. Install Dependencies

```bash
# Server
cd server && npm install

# Client
cd ../client && npm install
```

### 3. Run Development Servers

Open two terminals:

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:3001  
Health check: http://localhost:3001/api/health

## Environment Variables

### Server (`server/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3001) |
| `NODE_ENV` | `development` or `production` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `ETHERSCAN_API_KEY` | Etherscan API V2 key |
| `CLIENT_ORIGIN` | Frontend URL for CORS (default: http://localhost:5173) |

### Client (`client/.env`)

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL (default: http://localhost:3001) |

> **Security:** Never commit `.env` files. Never expose `ETHERSCAN_API_KEY` in frontend code.
