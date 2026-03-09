# Wealth Wellness Hub

**Team:** [Insert Team Name]
**Hackathon:** FinTech Innovators Hackathon 2026

Wealth Wellness Hub is a financial wellness platform that **unifies fragmented assets into a single Wealth Wallet and evaluates an investor’s overall financial health**.

Instead of acting as just another portfolio tracker, the platform analyzes **diversification, liquidity, and financial resilience** to provide actionable insights and recommendations that help users make better long-term financial decisions.

> Demo / educational prototype only — not financial advice.

---

# Problem

Investors increasingly manage wealth across **fragmented financial ecosystems**:

* Bank accounts
* Brokerage portfolios
* Cryptocurrency wallets
* Private investments
* Property and alternative assets

Because these assets exist across multiple platforms, investors often **lack a clear view of their total financial health**, making it difficult to assess risk exposure, liquidity, and portfolio resilience.

---

# Our Solution

Wealth Wellness Hub consolidates assets into a **single Wealth Wallet dashboard** and transforms portfolio data into **financial wellness analytics**.

The platform:

• Aggregates traditional and digital assets
• Calculates financial wellness scores
• Simulates market stress scenarios
• Generates actionable recommendations

This allows investors to move from **passive tracking → proactive financial decision-making**.

---

# Key Features (MVP)

### 1️⃣ Unified Wealth Wallet

Import and consolidate assets across categories:

* Cash
* Equities
* Bonds
* Crypto
* Private / alternative assets

Portfolio data can be loaded via **CSV upload or sample datasets**.

---

### 2️⃣ Financial Wellness Analytics

The platform calculates **three explainable financial health metrics (0–100)**.

#### Diversification Score

Measures concentration risk across asset classes.

Triggers:

Low < 40
Medium 40–70
High > 70

Example insight:

High concentration detected in Crypto assets.

---

#### Liquidity Score

Measures how much of the portfolio can be converted to cash quickly.

Assumption:

Liquid within **7 days**.

Triggers:

Low < 30
Medium 30–70
High > 70

Example insight:

Only 18% of portfolio is liquid within 7 days.

---

#### Resilience Score

Stress-test based score measuring how the portfolio performs under simulated market shocks.

Example scenarios:

Crypto −30%
Equities −10%
Bonds −5%

Example insight:

Worst-case drawdown is 21%.

---

### 3️⃣ Scenario Stress Testing

Users can simulate macro shocks instantly.

Examples:

• Crypto market crash
• Equity downturn
• Interest rate shock

The dashboard recalculates:

* Net worth
* Score changes
* Portfolio drivers of loss

This helps users understand **portfolio resilience before real crises occur**.

---

### 4️⃣ Actionable Recommendations

The system generates **3 prioritized recommendations** based on score outputs.

Examples:

• Reduce concentration in crypto assets
• Increase liquid reserves for short-term stability
• Rebalance towards diversified asset classes

---

# System Architecture

```
User
 ↓
Frontend Dashboard (React)
 ↓
Analytics Engine
 ├── Portfolio Aggregation
 ├── Financial Wellness Scoring
 ├── Scenario Simulation Engine
 └── Recommendation Engine
 ↓
Portfolio Data (CSV / Sample)
```

---

# Technology Stack

Frontend
React + TypeScript

Backend
Spring Boot (Java)

Data Processing
Custom analytics engine

Visualization
Chart libraries for allocation and scenario changes

Infrastructure (Demo)
Local processing

---

# Data Unification & Security (Demo)

### Asset Unification

Portfolio assets are standardized into a unified schema:

Cash / Equity / Bonds / Crypto / Private Assets

This allows all asset classes to be evaluated in one financial health model.

---

### Security Model (Demo)

For the hackathon prototype:

• Local-only processing
• Uploaded CSV processed in memory
• No persistent database storage
• No credentials or personal data required

This ensures safe demo use without exposing financial information.

---

### Data Validation

Strict CSV validation ensures:

• Required columns exist
• Data types are correct
• Invalid files are rejected with clear messages

---

# Demo Screenshots

### Baseline Portfolio (Crypto Heavy)

![Baseline Crypto Top](docs/screenshots/1_baseline_crypto/1_top.png)

![Baseline Crypto Bottom](docs/screenshots/1_baseline_crypto/1_bottom.png)

---

### Scenario Stress Test (Crypto −30%)

![Scenario Crypto Top](docs/screenshots/2_scenario_crypto30/2_top.png)

![Scenario Crypto Bottom](docs/screenshots/2_scenario_crypto30/2_bottom.png)

---

### Liquidity Risk Example (Property Heavy)

![Property Liquidity Top](docs/screenshots/3_property_liquidity/3_top.png)

![Property Liquidity Bottom](docs/screenshots/3_property_liquidity/3_bottom.png)

---

# Demo Script (60–90 seconds)

1️⃣ Load sample portfolio: `crypto_heavy`

2️⃣ Show:

* Net Worth
* Asset Allocation
* Diversification / Liquidity / Resilience scores

3️⃣ Run scenario:

Crypto −30%

4️⃣ Explain results:

* Net Worth change
* Portfolio loss drivers (BTC / ETH)
* Updated recommendations

5️⃣ Switch to sample portfolio:

`property_heavy`

6️⃣ Highlight liquidity risk and recommendation to increase liquid reserves.

---

# How To Run Locally

### Prerequisites

Java 17+
Maven
Node.js 18+

---

### Backend

```
cd backend
mvn spring-boot:run
```

Backend runs on:

```
http://localhost:8080
```

---

### Frontend

```
cd frontend
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:5173
```

---

# Repository Structure

```
wealth-wellness-hub

backend/
    Spring Boot API
    Portfolio analytics engine

frontend/
    React dashboard
    Charts and UI components

docs/
    Screenshots for demo

sample-data/
    Portfolio CSV examples
```

---

# Market Potential

The global wealth management industry manages **over $100 trillion in assets**, with increasing demand for tools that provide **holistic financial visibility across multiple platforms**.

Wealth Wellness Hub demonstrates how financial institutions could deliver **integrated financial health dashboards** for retail investors and advisory clients.

---

# Future Improvements

• Open Banking API integration
• Digital wallet integration
• AI financial advisor
• Personalized financial planning simulations
• Long-term wealth forecasting

---

# License

Demo prototype for educational and hackathon use.
