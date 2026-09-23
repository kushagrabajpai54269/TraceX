# TraceX

> Ethereum blockchain investigation workspace for tracing suspicious wallet activity, analyzing fund flows, and generating investigation intelligence.

TraceX is a blockchain investigation platform designed to help investigators explore suspicious cryptocurrency wallets, trace connected transaction flows, identify behavioral patterns, and organize findings into an investigation workspace.

The current prototype focuses on **Ethereum Mainnet** and provides bounded multi-hop transaction tracing, graph-based visualization, deterministic investigation analytics, and explainable risk indicators.

---

## Overview

Investigating cryptocurrency transactions manually can require navigating large numbers of wallets, transactions, and relationships.

TraceX provides a structured workflow:

```text
Suspect Wallet
      ↓
Blockchain Data
      ↓
Transaction Tracing
      ↓
Graph Exploration
      ↓
Deterministic Analysis
      ↓
Investigation Intelligence
```

The system is designed to help an investigator move from raw blockchain transactions toward a structured understanding of the observed fund flow.

---

## Key Features

### 🔎 Wallet Investigation

- Ethereum wallet address validation
- Investigation creation and management
- Investigation metadata
- Address and transaction exploration
- Investigation notes

### ⛓️ Blockchain Data

- Ethereum Mainnet transaction retrieval
- Etherscan API V2 integration
- Transaction normalization
- ETH balance retrieval
- Paginated transaction data
- Backend-only API key handling

### 🕸️ Multi-Hop Transaction Tracing

- Bounded blockchain traversal
- Configurable trace depth
- Directed transaction graph
- Incoming and outgoing fund-flow visualization
- Address and transaction relationships
- Node and transaction limits to control investigation scope

### 📊 Investigation Intelligence

TraceX performs deterministic analysis over the retrieved trace.

Current analysis includes:

- Trace statistics
- Unique address and transaction counts
- Incoming/outgoing transaction analysis
- Transaction value observations
- Major transfers
- Fan-in detection
- Fan-out detection
- Rapid movement detection
- Repeated intermediary detection
- High-value transfer detection relative to the observed trace
- High transaction activity detection
- Deep movement detection
- Explainable risk indicators

### ⚠️ Explainable Risk Indicators

TraceX generates a deterministic score based on observed transaction patterns.

The score is intended as an **investigation aid**, not as a probability of fraud or a determination of criminal activity, ownership, or intent.

Partial traces and investigation limits are explicitly disclosed to the investigator.

---

## Architecture

TraceX is currently organized into a React frontend and Node.js backend.

```text
┌──────────────────────────────────────────┐
│                TraceX UI                 │
│          React + TypeScript              │
├──────────────────────────────────────────┤
│       Investigation Workspace             │
│       Intelligence Workspace              │
│       Graph Visualization                │
├──────────────────────────────────────────┤
│              REST API                    │
│          Node.js + Express               │
├──────────────────────────────────────────┤
│          Investigation Services          │
│      Tracing + Deterministic Analytics   │
├──────────────────────────────────────────┤
│              Data Layer                  │
│             MongoDB Atlas                │
├──────────────────────────────────────────┤
│           Blockchain Data                │
│           Etherscan API V2               │
│           Ethereum Mainnet               │
└──────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas |
| Blockchain | Ethereum Mainnet |
| Blockchain API | Etherscan API V2 |
| Graph Visualization | Cytoscape.js |
| Testing | Vitest |

---

## Investigation Workflow

### 1. Create an Investigation

An investigator starts by providing a suspicious Ethereum wallet address.

### 2. Retrieve Blockchain Activity

TraceX retrieves relevant blockchain transaction data through the backend.

API credentials remain on the server and are never exposed to the frontend.

### 3. Trace Connected Addresses

The tracing engine performs bounded multi-hop traversal of connected addresses.

The system limits traversal depth, transaction retrieval, and graph size to keep investigations manageable and reduce unnecessary API usage.

### 4. Explore the Graph

Transactions are represented as directed relationships between addresses.

Investigators can inspect:

- Wallets
- Transaction relationships
- Transfer direction
- Transaction details
- Connected addresses

### 5. Analyze the Trace

The Intelligence workspace processes the retrieved trace using deterministic analytics.

It identifies observable patterns such as:

- Fan-in
- Fan-out
- Rapid movement
- High-value transfers
- Repeated intermediary behavior
- High transaction activity
- Deep movement

### 6. Review Investigation Intelligence

The resulting metrics, patterns, evidence, and risk indicators are presented in a dedicated Intelligence workspace.

---

## Project Structure

```text
TraceX/
├── client/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── types/
│
├── server/
│   └── src/
│       ├── routes/
│       ├── services/
│       ├── types/
│       └── ...
│
├── README.md
├── .gitignore
└── ...
```

---

## Getting Started

### Prerequisites

- Node.js
- npm
- MongoDB Atlas account
- Etherscan API key

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/TraceX.git
cd TraceX
```

### 2. Install Dependencies

Install dependencies for both the frontend and backend:

```bash
cd server
npm install

cd ../client
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the server directory.

```env
ETHERSCAN_API_KEY=your_etherscan_api_key
MONGODB_URI=your_mongodb_connection_string
```

Never commit `.env` or expose API credentials publicly.

### 4. Start the Backend

```bash
cd server
npm run dev
```

The backend runs on:

```text
http://localhost:3001
```

### 5. Start the Frontend

In another terminal:

```bash
cd client
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

## API Security

TraceX keeps external API credentials on the backend.

```text
Frontend
   │
   │ request
   ▼
TraceX Backend
   │
   │ API key
   ▼
Etherscan API
```

The Etherscan API key is never sent to the browser.

MongoDB credentials are also kept in environment variables and should never be committed to the repository.

---

## Investigation Limits

Blockchain investigations can become extremely large.

TraceX therefore uses bounded tracing and retrieval limits to control:

- Maximum trace depth
- Maximum graph nodes
- Maximum transactions retrieved per address
- API request volume

When a trace is incomplete because a configured limit is reached, the Intelligence workspace explicitly identifies the analysis as being based on the successfully retrieved portion of the trace.

---

## Risk Indicator Disclaimer

TraceX's risk score is an **explainable indicator based on observed transaction patterns**.

It does not establish:

- Fraud
- Criminal activity
- Wallet ownership
- Criminal intent
- Exchange affiliation

A detected pattern should be treated as an investigation lead requiring further review and evidence.

---

## Current Scope

The current prototype is focused on:

- Ethereum Mainnet
- Victim/suspect wallet investigation
- Transaction retrieval
- Bounded multi-hop tracing
- Graph visualization
- Deterministic transaction analysis
- Explainable risk indicators
- Investigation workspace
- Intelligence workspace

---

## Roadmap

Planned development includes:

- AI-assisted investigation summaries
- Evidence-grounded investigation reasoning
- Investigation report generation
- VASP/exchange intelligence
- Additional investigation patterns
- Expanded blockchain and attribution capabilities

These capabilities are planned development areas and are not represented as fully implemented in the current prototype.

---

## Project Context

TraceX was developed as a solution for **Smart India Hackathon 2026 Problem Statement 26183**:

> Real-Time Identification of Fraud-Linked Cryptocurrency Exchanges from Victim-Reported Suspect Wallet Addresses through Automated Blockchain Analytics

The project explores how blockchain analytics can support investigators in tracing cryptocurrency fund flows from victim-reported suspect wallet addresses toward potentially relevant entities.

---

## Disclaimer

TraceX is a research and prototype investigation tool.

Blockchain addresses and transaction patterns alone do not establish ownership, criminal activity, intent, or exchange affiliation. Any investigative conclusion requires appropriate evidence, verification, and human review.

---

## License

This project is licensed under the MIT License.
