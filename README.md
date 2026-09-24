# ⚡ AgentBlazer Club Web Portal

[![React 19](https://img.shields.io/badge/React-19.0.0-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646cff?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22.5+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-node:sqlite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://nodejs.org/api/sqlite.html)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_Sync-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)

> The official web portal, events hub, membership management system, and administrative content management suite for **AgentBlazer Club** at **St Joseph Engineering College (SJEC)**, organized in collaboration with **Cipher (CSE Association)**.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
  - [Public Experience](#public-experience)
  - [Admin CMS Portal](#admin-cms-portal)
  - [Email & Notification Engine](#email--notification-engine)
  - [Security & Resilience](#security--resilience)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Repository Structure](#-repository-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Running the Backend Server](#3-running-the-backend-server)
  - [4. Running the Frontend Client](#4-running-the-frontend-client)
- [Admin Portal & Authentication](#-admin-portal--authentication)
- [API Reference](#-api-reference)
- [Deployment Guide](#-deployment-guide)
  - [Frontend (Vercel)](#frontend-vercel)
  - [Backend (Render / Cloud VM)](#backend-render--cloud-vm)
- [License & Credits](#-license--credits)

---

## 🌟 Overview

**AgentBlazer** is the premier student-driven AI and Agentic Engineering club at SJEC CSE. The portal bridges public engagement and administrative operations:

1. **Public-facing showcase**: Dynamic animations, interactive inauguration screen, event schedules, photo galleries, team showcases, and real-time application and query forms.
2. **Private Administrative CMS (`/admin`)**: A centralized management interface allowing club leads to review membership applications, resolve queries, manage past and upcoming events, upload media, configure email providers, and broadcast updates to members.

---

## 🚀 Key Features

### Public Experience
- **Interactive Inauguration Reveal**: Ceremonial screen intro with dynamic transition into the main portal.
- **Theme Customizer**: Three curated color schemes:
  - ⚡ **Violet** (Electric Violet / Cyberpunk)
  - 🔥 **Inferno** (Blazing Orange & Gold)
  - ❄️ **Frost** (Glacial Cyan & Deep Blue)
- **Theme-reactive Custom Cursor**: Smooth accent-matching custom cursor with interactive element triggers.
- **Dynamic Geometric Visuals**: Interactive Canvas Starfield particles and mathematical dynamic SVG geo-shapes.
- **Public Navigation**:
  - **Home**: Club identity, flagship mission pillars, highlights, and quick membership CTA.
  - **About Us**: Club narrative, faculty coordinators, student executive team, Core Working Committee (CWC), and distinguished keynote guests.
  - **Events & Workshops**: Masterclasses, hackathons (GSoC, PromptOps, Agentforce, Cybersecurity), and interactive multi-photo hover galleries.
  - **Upcoming Events**: Event countdowns, venue, session timings, and direct registration links.
  - **Join & Connect**: Digital membership application form and student query/inquiry desk with live feedback.
- **Offline & Fallback Resilience**: Client seamlessly falls back to bundled static seed data if the backend API is unreachable or waking up.

### Admin CMS Portal (`/admin`)
- **Dashboard Overview**: Real-time KPI counters (applications, approved members, active events, inquiries, media uploads).
- **Membership Application Review**:
  - Filter applicants by status: `Pending`, `Approved`, `Rejected`.
  - 1-click status transitions with automatic team member entry creation upon approval.
  - Automatic synchronization of approved club members to **MongoDB Atlas**.
- **Student Queries Desk**:
  - Review student inquiries with year categorization.
  - Integrated email replies and manual `mailto:` prefilled email actions.
- **Events Manager**:
  - Add, edit, toggle visibility, and delete upcoming or completed workshops.
  - Upload event banners and multi-image photo galleries.
- **Team & Leadership CMS**:
  - Update Faculty Coordinators, Student Core Leads, and CWC members.
  - Upload avatars or rely on automated stylish color-coded initial badges.
- **Media Asset Library**:
  - Drag-and-drop file upload manager with secure MIME-type sanitization.

### Email & Notification Engine
- **Dual Email Driver**:
  - **Resend HTTPS API**: Bypasses outbound SMTP port blocks (ports 25, 465, 587) common on cloud platforms like Render's free tier.
  - **Nodemailer SMTP**: Full support for Gmail (via Google App Passwords) or custom institutional SMTP relays with IPv4 enforcement.
- **Manual Prefilled Email Workflow**: Built-in 1-click `mailto:` launch and copy-to-clipboard actions so admins can communicate with applicants even when SMTP credentials are not configured.
- **Email Delivery Logs & Diagnostics**: Live test email connection tool and real-time delivery audit logs.

### Security & Resilience
- **Database Engine**: Built on Node's native `node:sqlite` (`DatabaseSync`), offering zero-dependency embedded database reliability. Serverless deployment automatically copies seed data to `/tmp/data` for full read/write support.
- **Brute-Force & DoS Mitigation**: Dedicated rate limiting via `express-rate-limit` for general API calls, administrative authentication, and public form submissions.
- **MIME & Upload Restrictions**: Multer file upload storage with strict image verification (SVG uploads disabled to block stored XSS vectors).
- **HTTP Hardening**: Helmet security headers configured with Cross-Origin Resource Policy (CORP) for secure asset delivery.

---

## 🛠 Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Frontend                        │
│   React 19 • TypeScript • Vite 8 • Tailwind CSS v4          │
│   Theme Engine (Violet / Inferno / Frost) • StarField       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON API
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Express 4 API                         │
│   Helmet • Rate Limiting • CORS • JWT Auth • Multer         │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐┌─────────────────────────────┐
│  SQLite (node:sqlite native) ││     External Services       │
│  - Admins & Passwords        ││  - MongoDB Atlas (Members)  │
│  - Events & Galleries        ││  - Resend API / SMTP        │
│  - Members & CWC             ││  - Static Media Storage     │
│  - Applications & Queries    ││                             │
└──────────────────────────────┘└─────────────────────────────┘
```

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Context API |
| **Backend** | Node.js (>= 22.5.0), Express 4, Multer, Helmet, CORS |
| **Primary Database** | Native `node:sqlite` (SQLite 3 via Node built-in `DatabaseSync`) |
| **Cloud Sync** | MongoDB Atlas (`mongodb` driver) for approved members |
| **Email Services** | Resend HTTPS API, Nodemailer (Gmail / Custom SMTP) |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`), Node `crypto` (scrypt / SHA-256) |
| **Deployment** | Vercel (Frontend), Render / Node runtime (Backend) |

---

## 📁 Repository Structure

```
agentblazer-buildblazer/
├── public/                     # Static public assets
├── server/                     # Backend API & Server Services
│   ├── data/                   # SQLite database directory (agentblazer.db)
│   ├── uploads/                # User uploaded images & banners
│   ├── .env.example            # Backend environment variables template
│   ├── auth.js                 # Authentication helpers & JWT middleware
│   ├── database.js             # SQLite initialization, schema, & migrations
│   ├── emailService.js         # Nodemailer & Resend HTTPS email delivery
│   ├── index.js                # Express app entrypoint, routes, & error handling
│   ├── mongoService.js         # MongoDB Atlas client & member synchronization
│   └── package.json            # Backend package manifest
├── src/                        # Frontend Application Source
│   ├── admin/                  # Admin CMS Portal components
│   │   ├── AdminAboutUs.tsx        # About page & keynote guests editor
│   │   ├── AdminApp.tsx            # Main Admin container & tab routing
│   │   ├── AdminApplications.tsx   # Membership applications workflow
│   │   ├── AdminAuthContext.tsx    # Admin authentication session provider
│   │   ├── AdminCreateEvent.tsx    # Event creation form with image upload
│   │   ├── AdminDashboard.tsx      # Overview statistics and metrics
│   │   ├── AdminEvents.tsx         # Event listing, toggles, & deletion
│   │   ├── AdminLogin.tsx          # Login & password recovery screens
│   │   ├── AdminMedia.tsx          # Asset & image upload manager
│   │   ├── AdminMembers.tsx        # Faculty, core team, & CWC editor
│   │   ├── AdminQueries.tsx        # Inquiries desk with reply management
│   │   └── admin.css               # Admin interface design tokens
│   ├── assets/                 # Brand logos, photography, and icons
│   ├── components/             # Reusable UI widgets (e.g. CWC committee)
│   ├── config/                 # Central API and Media URL configuration (api.ts)
│   ├── context/                # Global DataContext for public dynamic content
│   ├── imports/                # Bundled event galleries and image arrays
│   ├── App.tsx                 # Main public web app & routing
│   ├── DynamicGeoShape.tsx     # Animated SVG geometric shapes
│   ├── InaugurationSection.tsx # Ceremonial inauguration interactive screen
│   ├── IntroScreen.tsx         # Welcome splash animation
│   ├── StarField.tsx           # Interactive canvas particle starfield
│   ├── ThemeCursor.tsx         # Theme-reactive cursor component
│   ├── index.css               # Global CSS & Tailwind v4 configuration
│   └── main.tsx                # React DOM root entrypoint
├── index.html                  # HTML5 shell
├── package.json                # Project root manifest
├── tsconfig.json               # TypeScript compiler configuration
├── vercel.json                 # Vercel deployment & rewrite configuration
└── vite.config.ts              # Vite configuration (React, Tailwind v4, proxies)
```

---

## ⚙️ Prerequisites

- **Node.js**: `v22.5.0` or higher is **strictly required** (the backend utilizes the native `node:sqlite` module standard in Node 22.5+).
- **Package Manager**: `npm` (v10+), `pnpm`, or `yarn`.
- **Git** installed on your operating system.

Check your Node.js version before running:
```bash
node -v
# Output should be >= v22.5.0
```

---

## 🏁 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/thanukharvi27/agentblazer-buildblazer.git
cd agentblazer-buildblazer
```

### 2. Environment Configuration

#### Backend Configuration
Copy the sample environment file in `server/`:

```bash
cp server/.env.example server/.env
```

Configure `server/.env` with your credentials:

```ini
# Server Port & Auth
PORT=5000
JWT_SECRET=your_super_secret_jwt_random_key_here

# Allowed origins for CORS (comma separated)
CORS_ORIGIN=http://localhost:5173,http://localhost:8443,https://your-frontend.vercel.app

# Default Admin Account (created on first run if database is fresh)
ADMIN_DEFAULT_EMAIL=admin@agentblazer.ac.in
ADMIN_DEFAULT_PASSWORD=admin123

# Optional: MongoDB Atlas URI for Approved Member Syncing
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?appName=AgentBlazer

# Email Service: Choose 'resend' (recommended for cloud) or 'gmail' / 'smtp'
RESEND_API_KEY=re_your_resend_api_key_here
SMTP_SERVICE=gmail
SMTP_USER=your_club_email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM="AgentBlazer Club • SJEC CSE <your_club_email@gmail.com>"
```

#### Frontend Configuration (Optional)
By default, the Vite dev server proxies `/api` and `/uploads` directly to `http://localhost:5000`. If you wish to target a remote backend during development, create a `.env.local` in the project root:

```ini
VITE_API_URL=http://localhost:5000
```

### 3. Running the Backend Server

Install dependencies and start the backend:

```bash
cd server
npm install
npm run dev
```

The server will initialize the SQLite database (`server/data/agentblazer.db`), run migrations, seed initial admin credentials, and listen on `http://localhost:5000`.

### 4. Running the Frontend Client

In a separate terminal tab, install root dependencies and launch Vite:

```bash
# In the root repository directory
npm install
npm run dev
```

Open your browser at the preview URL printed by Vite (typically `http://localhost:5173` or `http://localhost:8443`).

---

## 🛡 Admin Portal & Authentication

1. Navigate to `http://localhost:5173/admin` (or click the subtle admin trigger in the footer).
2. Sign in with the configured credentials:
   - **Default Email**: `admin@agentblazer.ac.in`
   - **Default Password**: `admin123`
3. Upon first login, navigate to **Settings / Credentials** to update your password.
4. **Password Reset**: If password reset is requested, a one-time 6-digit verification code is generated and delivered to the admin's email.

---

## 🔌 API Reference

### Public Endpoints

| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `GET` | `/api/health` | Service health status and uptime | None |
| `GET` | `/api/public/data` | Fetches active events, members, CWC, and about content | 300 req / 15 min |
| `POST` | `/api/membership-applications` | Submit student membership application | 10 req / hour |
| `POST` | `/api/queries` | Submit student inquiry / question | 10 req / hour |
| `GET` | `/uploads/:filename` | Public access to uploaded media assets | None |

### Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate admin and receive JWT token |
| `POST` | `/api/auth/forgot-password` | Generate & email password reset verification code |
| `POST` | `/api/auth/reset-password` | Verify code and update password |
| `GET` | `/api/auth/me` | Validate active admin session *(Requires Bearer Token)* |
| `POST` | `/api/auth/logout` | Invalidate active session *(Requires Bearer Token)* |

### Admin Endpoints *(All require `Authorization: Bearer <token>`)*

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Dashboard counts and summary statistics |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/admin/members` | Full CRUD for faculty, students, and CWC |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/admin/events` | Full CRUD for events, galleries, and upcoming schedules |
| `GET`/`PUT` | `/api/admin/about` | Read and update club narrative and mission statement |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/admin/guests` | Manage keynote and distinguished guest profiles |
| `GET`/`POST`/`DELETE` | `/api/admin/media` | Upload (up to 20 files) and manage media gallery |
| `GET`/`PATCH`/`DELETE` | `/api/admin/applications` | Review applications, update status (`approved`/`rejected`) |
| `POST` | `/api/admin/applications/:id/send-email` | Trigger notification email to applicant |
| `GET` | `/api/admin/approved-members` | Fetch approved members synced in MongoDB Atlas |
| `GET`/`POST`/`PATCH`/`DELETE` | `/api/admin/queries` | Manage student inquiries and dispatch email replies |
| `GET`/`POST` | `/api/admin/email-settings` | Read and update email provider settings (Resend/SMTP) |
| `POST` | `/api/admin/email-settings/test` | Dispatch a live diagnostic test email |
| `GET` | `/api/admin/email-logs` | View delivery audit logs |

---

## 🌐 Deployment Guide

### Frontend (Vercel)

The repository includes a ready-to-deploy [`vercel.json`](./vercel.json) configured for Vite single-page application routing.

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set the build settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the environment variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://agentblazer-api.onrender.com`).
5. Deploy.

### Backend (Render / Cloud VM)

1. Create a new **Web Service** on [Render](https://render.com).
2. Configure repository settings:
   - **Root Directory**: `server` (or run from root with `npm run start`)
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Node Version**: Select `22.5.0` or higher in Render Environment settings (`NODE_VERSION=22.14.0`).
3. Set Environment Variables:
   - `JWT_SECRET`: Secure 64-character random string.
   - `CORS_ORIGIN`: Your Vercel frontend URL (e.g. `https://agentblazer-teal.vercel.app`).
   - `ADMIN_DEFAULT_EMAIL` and `ADMIN_DEFAULT_PASSWORD`.
   - `RESEND_API_KEY`: *(Recommended on Render free tier to bypass port 587 block)*.
   - `MONGODB_URI`: *(Optional)* Connection string for MongoDB Atlas sync.
4. Deploy the service and verify `/api/health`.

---

## 👥 License & Credits

- **Organized & Maintained by**: **AgentBlazer Club**, Department of Computer Science & Engineering, **St Joseph Engineering College (SJEC)**, Vamanjoor, Mangaluru.
- **In Collaboration with**: **Cipher (CSE Association)**, SJEC.
- **License**: Distributed under the [MIT License](./LICENSE).
