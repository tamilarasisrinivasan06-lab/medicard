# MediCard

**MediCard** — A digital healthcare record management platform that securely connects patients, doctors, pharmacies, and diagnostic centers.

## Technology Stack

- **Frontend:** React 19, React Router v7, Vite, Lucide Icons, html5-qrcode
- **Backend:** Node.js, Express 5, JSON Web Token (JWT), bcryptjs, Multer
- **Database:** PostgreSQL (with connection pooling via `pg`)

---

## Role Portals & Architecture

MediCard is organized into dedicated role-based portals:

- **Patient Portal (`/patient`):** MediCard QR, medical history, consultations, prescriptions, blood tests, scan reports, doctor access authorizations, and appointment scheduling.
- **Doctor Portal (`/doctor`):** Patient lookup, camera/QR scanner check-in, electronic consultation note creation, prescription writing, lab test ordering, follow-up scheduling, and audit logs.
- **Pharmacy Portal (`/pharmacy`):** Prescription dispensing queue, status tracking, and fulfilled order history.
- **Diagnostic / Lab Portal (`/lab`):** Test request queue, sample processing, and report/scan document uploads.
- **Hospital Admin Portal (`/hospital`):** Department management, staff oversight, and hospital activity audits.
- **Super Admin Portal (`/super-admin`):** System-wide administration across all patients, doctors, pharmacies, labs, and system users.

---

## Project Structure

```
medicard/
├── backend/
│   ├── controllers/      # Route controllers for all domains
│   ├── db/               # Pool connection, schema migrations, and queries
│   │   ├── migrations/   # SQL schema migrations
│   │   └── queries/      # Modular SQL query models
│   ├── middleware/       # Auth, role-validation, upload middlewares
│   ├── routes/           # Express route definitions
│   ├── services/         # QR code generation & background services
│   ├── .env.example      # Environment variables template
│   └── server.js         # Express server entry point
│
├── frontend/
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── components/   # Reusable layouts, auth forms, portal navbars
│   │   ├── pages/        # Portals: patient, doctor, pharmacy, lab, admin, super-admin
│   │   ├── api.js        # Centralized API service layer
│   │   ├── App.jsx       # Client router and route guards
│   │   └── main.jsx      # React DOM initialization
│   └── .env.example      # Frontend environment template
│
└── README.md
```

---

## Getting Started

### 1. Database Setup (PostgreSQL)

Make sure PostgreSQL is running (default port `5432`). Create the database:

```sql
CREATE DATABASE medicard;
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env  # Configure DATABASE_URL and JWT_SECRET
npm install
npm run db:migrate    # Run schema migrations
npm run db:seed:demo  # (Optional) Seed with demo data across all roles
npm start
```

* Backend runs on: `http://localhost:5000`
* Health check: `GET http://localhost:5000/api/health`

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env  # Configure VITE_API_URL (defaults to http://localhost:5000/api)
npm install
npm run dev
```

* Frontend runs on: `http://localhost:5173`