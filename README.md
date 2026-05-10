# Campus Portal

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000.svg)](https://expressjs.com/)

**A unified academic operations console for students, faculty, and administrators — handling a full college's daily workflow in one place.**

Campus Portal replaces scattered spreadsheets, group chats, and email threads with a centralized, role-based platform designed for real-world academic workloads.


#### 🚀 Live Demo

The Campus Portal is live and fully functional at:
https://campus-hub-bishalmajumdar5.replit.app

### Test Credentials
- **Admin:** admin@campus.edu / admin123
- **Faculty:** (Use faculty ID from seeded data)
- **Student:** (Use roll number from seeded data)

> ⚠️ **Note:** The demo is hosted on Replit's free tier. The service may spin down after 15 minutes of inactivity. If the site doesn't load immediately, please wait 30 seconds for it to wake up.
## ✨ Key Features

### 🎓 For Students
- Form project groups (up to 4 members) with chosen faculty and domain
- Track attendance and performance trajectory over time
- Receive notifications (announcements, feedback, results)
- Forced first-time password change for security

### 👨‍🏫 For Faculty
- Create project domains and manage student groups (max 3 per faculty)
- One-click daily attendance marking
- Send notifications that land directly in student feeds
- Record performance scores with analytics (class averages, top performers, attendance vs. performance correlation)

### 👑 For Administrators
- Bulk-import students/faculty from Google Sheets (auto-syncs every 5 minutes)
- Manage admins, security policies, and login rules
- Browse all groups, domains, and attendance records
- Full audit log for accountability

### 🔒 Superadmin (Hidden Tier)
- Biometric login with WebAuthn (fingerprint/device PIN)
- Email + phone fallback after 5 failed attempts
- Bulk create/remove admins via CSV/Excel

## 🛠️ Tech Stack

### Monorepo Architecture (`pnpm workspace`)

| Layer | Technology |
|-------|------------|
| **Frontend** | React + Vite + TypeScript, wouter, TanStack Query, shadcn-ui, Tailwind CSS, Recharts, Framer Motion |
| **Backend** | Express 5 + TypeScript, Drizzle ORM, PostgreSQL, Pino logging |
| **Auth** | Cookie-based sessions, WebAuthn (`@simplewebauthn/server`) |
| **Shared** | OpenAPI 3 spec, generated Zod schemas, generated TanStack Query hooks |

### Architecture Highlights

- **Contract‑first API** – OpenAPI defined, fully code‑generated frontend/backend
- **Role‑aware UI** – Dynamic gradient themes per role (sky/cyan, amber/orange, rose/violet)
- **Background jobs** – Google Sheets sync (5 min), expired session purge (30 min)
- **Path‑based routing** – API at `/api/*`, SPA at `/`, reverse proxy

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- PostgreSQL 15+

### Installation

```bash
# Clone the repository
git clone https://github.com/NeuralBishal/Campus-Portal.git
cd Campus-Portal

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secrets

# Run database migrations
pnpm db:migrate

# Start development servers
pnpm dev
The app will be available at http://localhost:5173

Default Login Credentials (after first sync)

Role	Identifier	Initial Password
Admin	admin@campus.edu	admin123
Faculty	Faculty ID	Same as Faculty ID
Student	Roll number	Same as roll number
⚠️ Non-admin users are forced to change password on first login.
📊 Capacity & Performance

Hardened for full-college load (thousands of users):

Indexed database – Every filter/join column indexed
Rate limiting – 20 attempts/15 min per IP+account (HTTP 429 with Retry-After)
Session hygiene – Auto-purge every 30 minutes
Stateless API – Ready for horizontal scaling
Capacity: ~5,000–10,000 students with hundreds of concurrent users on a single instance. Scales horizontally by adding instances.

🔒 Security

HttpOnly + SameSite=None + Secure cookies
Password hashing with per-user salt
Forced password change on first login
Configurable session timeout and password policy
WebAuthn (biometric/device PIN) for superadmin tier
Full audit log of admin actions
📁 Project Structure

text
campus-portal/
├── artifacts/
│   ├── api-server/           # Express + Drizzle backend
│   ├── campus-portal/        # React + Vite frontend
│   └── mockup-sandbox/       # Component preview (dev only)
├── lib/
│   ├── api-spec/             # OpenAPI 3 contract
│   ├── api-zod/              # Generated Zod schemas
│   ├── api-client-react/     # Generated TanStack Query hooks
│   └── db/                   # Drizzle schema + migrations
└── pnpm-workspace.yaml
🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

Fork the repository
Create your feature branch (git checkout -b feature/AmazingFeature)
Commit your changes (git commit -m 'Add some AmazingFeature')
Push to the branch (git push origin feature/AmazingFeature)
Open a Pull Request
📄 License

Distributed under the MIT License. See LICENSE for more information.

📧 Contact

NeuralBishal - @NeuralBishal

Project Link: https://github.com/NeuralBishal/Campus-Portal

🌟 Acknowledgments

shadcn/ui for beautiful components
TanStack Query for data fetching
SimpleWebAuthn for biometric authentication
Drizzle ORM for type-safe database operations
