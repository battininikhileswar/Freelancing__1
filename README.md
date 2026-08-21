# 🏛️ Jan Shakti — India Grievance Redressal Portal

A production-ready, full-stack grievance redressal portal for India with **smart complaint routing**, **role-based access control**, and **real-time updates**.

---

## 📁 Project Structure

```
grievance-portal/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── firebase.js        # Firebase Admin SDK + Firestore helpers
│   │   │   └── cloudinary.js      # File upload config + helpers
│   │   ├── controllers/
│   │   │   ├── authController.js  # Register, Login, Profile, Notifications
│   │   │   ├── complaintController.js # Submit, Track, Update Status
│   │   │   └── adminController.js # Users, Authorities, Analytics
│   │   ├── middleware/
│   │   │   ├── auth.js            # JWT verify + RBAC authorize
│   │   │   ├── validate.js        # express-validator rules
│   │   │   └── errorHandler.js    # Global error handler + Winston logger
│   │   ├── routes/
│   │   │   └── index.js           # All Express routes mounted here
│   │   ├── services/
│   │   │   └── routingEngine.js   # Smart complaint routing + geo logic
│   │   ├── utils/
│   │   │   ├── generateId.js      # Unique Complaint ID generator
│   │   │   ├── notifications.js   # Email (Nodemailer) + SMS (Twilio)
│   │   │   └── seedData.js        # Seed Firestore with demo data
│   │   ├── app.js                 # Express app + security middleware
│   │   └── server.js              # HTTP server + Socket.IO + Cron jobs
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx         # With dark mode, language, user menu
│   │   │   ├── Sidebar.jsx        # Role-based navigation sidebar
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── ComplaintCard.jsx
│   │   │   └── StatusBadge.jsx    # Status + Category badges
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx    # Public home with stats & CTA
│   │   │   ├── auth/
│   │   │   │   ├── Login.jsx      # With demo credential buttons
│   │   │   │   └── Register.jsx   # With password strength meter
│   │   │   ├── citizen/
│   │   │   │   ├── Dashboard.jsx  # Citizen home with stats
│   │   │   │   ├── SubmitComplaint.jsx # 5-step wizard with GPS
│   │   │   │   ├── TrackComplaint.jsx  # Public tracking page
│   │   │   │   └── ComplaintDetail.jsx # Full detail with timeline
│   │   │   ├── authority/
│   │   │   │   ├── AuthorityDashboard.jsx # Shared authority dashboard
│   │   │   │   ├── PSDashboard.jsx
│   │   │   │   ├── ACBDashboard.jsx
│   │   │   │   └── MunicipalDashboard.jsx
│   │   │   └── admin/
│   │   │       └── AdminPanel.jsx # Analytics + User Mgmt + All Complaints
│   │   ├── store/
│   │   │   ├── authStore.js       # Zustand auth state + JWT handling
│   │   │   └── themeStore.js      # Dark/light mode persistence
│   │   └── utils/
│   │       ├── api.js             # Axios with interceptors + auto-refresh
│   │       └── constants.js       # Categories, states, status labels
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── nginx.conf
│   ├── Dockerfile
│   └── .env.example
└── docker-compose.yml
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase Project (Firestore + Storage enabled)
- Cloudinary account (for file uploads)
- Optional: Twilio (SMS) + Gmail SMTP (email)

---

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Firestore Database** (Native mode)
4. Enable **Firebase Storage**
5. Go to **Project Settings → Service Accounts → Generate new private key**
6. Download the JSON file — use its values in your `.env`

**Firestore Security Rules** (paste in Firebase console):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // All reads/writes via server-side admin SDK only
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your Firebase credentials, JWT secret, etc.
npm install
npm run seed     # Seed demo data
npm run dev      # Development server on :5000
```

---

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL if not using proxy
npm install
npm run dev      # Development server on :3000
```

---

### 4. Docker Deployment

```bash
# At project root
cp .env.example .env
# Fill in all values
docker-compose up --build -d
```

**Services:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

---

## 🔑 Test Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | admin@grievanceportal.gov.in | Admin@1234 |
| **PS Officer** | ps.guntur@ap.gov.in | Authority@1234 |
| **ACB Officer** | acb.guntur@ap.gov.in | Authority@1234 |
| **Municipal** | municipal.guntur@ap.gov.in | Authority@1234 |
| **Citizen** | citizen@example.com | Citizen@1234 |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register citizen |
| POST | `/api/auth/login` | Public | Login all roles |
| POST | `/api/auth/refresh` | Public | Refresh JWT |
| GET | `/api/auth/profile` | 🔐 Any | Get profile |
| PUT | `/api/auth/profile` | 🔐 Any | Update profile |
| GET | `/api/auth/notifications` | 🔐 Any | Get notifications |

### Complaints
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/complaints` | Public/Auth | Submit complaint |
| GET | `/api/complaints/track/:id` | Public | Track by complaint ID |
| GET | `/api/complaints/my` | 🔐 Citizen | My complaints |
| GET | `/api/complaints/:id` | 🔐 Owner/Auth | Full details |
| GET | `/api/complaints/authority/assigned` | 🔐 Authority | Assigned complaints |
| PUT | `/api/complaints/:id/status` | 🔐 Authority | Update status |
| GET | `/api/complaints/admin/analytics` | 🔐 Admin | Basic analytics |

### Admin
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/admin/users` | 🔐 Admin | All users |
| POST | `/api/admin/authorities` | 🔐 Admin | Create authority account |
| PUT | `/api/admin/users/:id/toggle` | 🔐 Admin | Toggle user active |
| GET | `/api/admin/complaints` | 🔐 Admin | All complaints |
| PUT | `/api/admin/complaints/:id/reassign` | 🔐 Admin | Reassign complaint |
| GET | `/api/admin/authorities` | 🔐 Admin | All authorities |
| GET | `/api/admin/analytics` | 🔐 Admin | Full analytics |

---

## 🔀 Smart Routing Engine

```
Crime (theft, assault, cybercrime, etc.)
  └─→ Police Station (PS) for that district

Corruption (bribery, embezzlement, etc.)
  └─→ Anti-Corruption Bureau (ACB) for that district

Civic Issues (roads, water, garbage, etc.)
  └─→ Municipal Authority for that district
```

Routing fallback chain:
1. Match by **district + state**
2. Match by **state only**
3. Assign to **unassigned queue** for manual Admin routing

---

## 🗄️ Firestore Schema

### `users`
```js
{
  name, email, password (hashed),
  phone, role, state, district,
  isActive, isVerified,
  authorityId,         // for authority users
  authorityType,       // ps | acb | municipal
  jurisdiction: { state, district, districts[] },
  complaintsCount,
  createdAt, updatedAt
}
```

### `complaints`
```js
{
  complaintId,         // PS-AP-20240115-A3X9K2
  category,            // crime | corruption | civic_issue
  subcategory,
  description,
  location: { address, state, district, pincode, lat, lng },
  isAnonymous,
  userId, userName,    // null if anonymous
  attachments[],       // Cloudinary URLs
  status,              // pending → ... → closed
  routing: {
    authorityId, authorityType, authorityName, assignedAt
  },
  statusHistory[],     // Full audit trail
  remarks[],           // Authority remarks visible to user
  proofUploads[],      // Authority proof documents
  escalationLevel, escalationDue, isEscalated,
  createdAt, updatedAt
}
```

### `authorities`
```js
{
  name, email, phone, type,
  jurisdiction: { state, district, districts[] },
  location: { lat, lng },
  isActive, createdAt
}
```

### `notifications`
```js
{ userId, type, title, message, metadata, isRead, createdAt }
```

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| Authentication | JWT (access 7d + refresh 30d) |
| RBAC | 5 roles — citizen, ps_officer, acb_officer, municipal_officer, super_admin |
| Rate Limiting | 100 req/15min global, 10 req/15min auth |
| XSS Protection | `xss-clean` middleware |
| Helmet | Security headers |
| File Upload | Type + size validation, Cloudinary storage |
| NoSQL Injection | Firestore parameterized queries |
| Complaint Privacy | Citizens cannot see other citizens' complaints; authorities see only assigned |

---

## 📦 Deployment

### Backend → Render / Railway / AWS EC2
```bash
# Set all env variables in your hosting dashboard
npm start
```

### Frontend → Vercel
```bash
cd frontend
vercel --prod
# Set VITE_API_URL=https://your-backend.render.com/api
```

### Full Stack → Docker Compose
```bash
docker-compose up -d
```

---

## 🌐 Multi-language Support

Languages configured: English, Hindi, Telugu, Tamil, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi

Language toggle is available in the Navbar. Full i18n strings can be extended via `src/utils/i18n.js`.

---

## ⏱️ Escalation System

- Complaints auto-escalate if no action within **72 hours**
- Escalation cron runs **every hour** via `node-cron`
- Authority receives WebSocket alert on escalation
- Escalated complaints highlighted with ⚡ in dashboards

---

## 📬 Notifications

| Event | Email | SMS | In-App |
|-------|-------|-----|--------|
| Complaint submitted | ✅ | ✅ | ✅ |
| Status updated | ✅ | ✅ | ✅ |
| Escalation | — | — | ✅ |
| Anonymous complaints | ❌ | ❌ | ❌ |
