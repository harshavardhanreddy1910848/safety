# SilentSOS — Standalone Real-Time Distress Tracking & Women's Safety Platform

SilentSOS is a modern, production-ready web application designed for real-time safety distress tracking, evidence collection (photos, video, and audio capture), live GPS path visualization with Google Maps, and instant multi-channel emergency notifications (Email & SMS).

The application is fully **self-contained and platform-independent**. It can be run locally on any machine, containerized using Docker, or deployed to any VPS/cloud provider without dependency on external hosted platforms.

---

## 🌟 Key Features

- **🚨 Instant Distress Trigger**: Single-click SOS activation with GPS coordinates, continuous breadcrumb location tracking, and auto-dispatch to emergency contacts.
- **🛰️ Live Google Maps Visualization**: Real-time distress radar marker, breadcrumb GPS path, and direct navigation links for responders.
- **📷 Covert Evidence Recording**: Automatic photo burst, video capture, and microphone recording securely encrypted and uploaded to the server.
- **✉️ Automated Multi-Channel Dispatch**: Emergency alert emails via SMTP (Nodemailer/Gmail) with attached evidence files, plus optional SMS dispatch.
- **🛡️ Industry-Standard Authentication**: HMAC-SHA256 JWT tokens with automatic expiry, PBKDF2 salted password hashing, and brute-force rate limiting.
- **👥 Emergency Contact Network**: Manage contacts with AES-256-CBC encrypted phone and email storage.
- **📊 Administrator Oversight Portal**: Secure admin dashboard with live alert monitoring, user account management, exportable audit reports, and global alert settings.
- **📱 Standalone Single-Process Architecture**: In production, the backend server directly serves both the REST API and the compiled React Single Page App from port 3001.

---

## 🏗️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 5, TypeScript, TailwindCSS, Lucide Icons, Framer Motion, React Router |
| **Backend** | Node.js (ES Modules), Express, WebSocket (`ws`), Multer, Nodemailer |
| **Database** | PostgreSQL (Neon Cloud Serverless or direct PostgreSQL connection pooling) |
| **Mapping & Location** | Google Maps JavaScript API with responsive dark mode styles & embed fallback |
| **Deployment** | Docker, Docker Compose, Node.js standalone runtime |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18+ (v20 LTS recommended)
- **Package Manager**: `npm` (v9+)
- **Database**: PostgreSQL database (e.g. [Neon](https://neon.tech), Supabase, or a local PostgreSQL instance)
- **Google Maps API Key**: For interactive satellite tracking and directions (obtainable from Google Cloud Console)

---

### Method 1: Local Node.js Development (Recommended)

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/harshavardhanreddy1910848/safety.git
   cd safety
   ```

2. **Install All Dependencies**:
   ```bash
   npm run install:all
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `backend/.env` (and optionally `frontend/.env`):
   ```bash
   cp .env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
   Fill in your PostgreSQL `DATABASE_URL` and `VITE_GOOGLE_MAPS_API_KEY`.

4. **Start Development Servers (Hot Reloading)**:
   ```bash
   npm run dev
   ```
   - **Frontend**: Accessible at `http://localhost:5173` (with built-in proxy to backend)
   - **Backend API**: Accessible at `http://localhost:3001`

---

### Method 2: Standalone Production Mode (Single Process)

In production mode, the backend compiles and serves the frontend as static assets:

1. **Build the Production Frontend**:
   ```bash
   npm run build
   ```

2. **Start the Standalone Server**:
   ```bash
   npm start
   ```
   The complete application (UI + API + WebSockets) will be live at:
   👉 **`http://localhost:3001`**

---

### Method 3: 1-Command Docker Deployment

You can build and launch the standalone containerized application with Docker Compose:

1. Create your `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

2. Run with Docker Compose:
   ```bash
   docker-compose up -d --build
   ```

3. Check health and logs:
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```
   The application will be running at `http://localhost:3001`.

---

## ⚙️ Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP & WebSocket server port | `3001` |
| `NODE_ENV` | Application environment | `production` / `development` |
| `FRONTEND_URL` | Base URL used in dispatched email links | `http://localhost:3001` |
| `APP_URL` | Server URL for media links | `http://localhost:3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db?sslmode=require` |
| `JWT_SECRET` | Secret key for signing HMAC-SHA256 JWT tokens | *(Random secure string)* |
| `JWT_EXPIRES_IN` | Token expiration duration in seconds | `604800` (7 days) |
| `ENCRYPTION_SECRET` | 32-byte secret key for AES-256-CBC PII encryption | *(Random secure string)* |
| `SMTP_HOST` | Outgoing email SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `465` (SSL) or `587` (TLS) |
| `SMTP_USER` | SMTP username / sender email | `your_email@gmail.com` |
| `SMTP_PASS` | SMTP password or Gmail App Password | `xxxx xxxx xxxx xxxx` |
| `FAST2SMS_API_KEY` | Optional Fast2SMS API key for India SMS | *(Optional)* |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key | `AIzaSy...` |

---

## 🗄️ Database Architecture & Schema

The PostgreSQL database initializes all tables automatically upon startup (`initDb()`):

1. **`users`**: User profiles, credentials, address, blood group, parent details, roles (`user`, `admin`), account status.
2. **`settings`**: User safety PIN, auto-delete durations, sensitivity thresholds, custom message templates, global responder emails.
3. **`contacts`**: Emergency contacts with AES-256-CBC encrypted phone (`phone_enc`) and email (`email_enc`), notification preferences (`JSONB`).
4. **`history`**: Logged distress events, duration, status, encrypted GPS route (`gps_path_enc`), attached evidence files (`JSONB`).
5. **`sos_locations`**: Granular coordinates recorded during active distress events with timestamps.
6. **`sos_notifications`**: Delivery audit trail for each notification channel (`sms`, `email`, `whatsapp`).
7. **`evidence_metadata`**: Record of stored media files (type, size, path, MIME type).
8. **`password_resets`**: 6-digit verification codes for secure password reset with 10-minute expiry.
9. **`audit_logs`**: System security and administration activity logs.

---

## 🧪 Testing & Verification

Run the built-in HTTP and database integration test suite:
```bash
npm test
```
Or run the full end-to-end simulation:
```bash
npm run test:e2e
```

### Health Check Endpoint
Query the live server status at any time:
```bash
curl http://localhost:3001/api/health
```
**Response:**
```json
{
  "status": "ok",
  "service": "SilentSOS Standalone API",
  "timestamp": "2026-09-04T13:00:00.000Z",
  "uptime": 120,
  "database": "connected",
  "activeSos": false
}
```

---

## 📦 Production Deployment Guide

### Deploying to Any Linux VPS (Ubuntu / Debian)
1. Install Node.js 20 and Git:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   ```
2. Clone repository and install dependencies:
   ```bash
   git clone https://github.com/harshavardhanreddy1910848/safety.git /var/www/silentsos
   cd /var/www/silentsos
   npm run install:all
   ```
3. Set up environment file:
   ```bash
   cp .env.example backend/.env
   nano backend/.env
   ```
4. Build frontend:
   ```bash
   npm run build
   ```
5. Run using PM2 (Process Manager):
   ```bash
   sudo npm install -g pm2
   pm2 start backend/server.js --name silentsos
   pm2 startup
   pm2 save
   ```
6. (Optional) Configure Nginx as reverse proxy with SSL via Let's Encrypt Certbot.

---

## 📄 License
This project is private and maintained for personal safety applications.
