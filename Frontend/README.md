# PlaceHub — College Placement Portal Frontend

A polished, responsive React + Vite frontend for the College Placement Portal backend.

---

## Quick Start

### 1. Prerequisites
- Node.js >= 18
- The Backend must be running on `http://localhost:5000` (or update `.env`)

### 2. Environment
The `.env` file is already created with:
```
VITE_API_URL=http://localhost:5000/api
```
Change the URL if your backend runs on a different port.

### 3. Install & Run
```bash
cd Frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser.

### 4. Backend CORS (Required — see below)
The backend imports `cors` but does not use it. You must add it before the app runs.

---

## Available Screens

### Student (role: `student`)
| Route | Screen |
|-------|--------|
| `/login` | Sign in |
| `/register` | Create student account |
| `/dashboard` | Stats + recent applications |
| `/jobs` | Browse and apply for jobs (search, filter) |
| `/my-applications` | Application history + statuses |
| `/profile` | Profile info + PDF resume upload |

### Admin (role: `admin`)
| Route | Screen |
|-------|--------|
| `/admin` | Dashboard with company/job counts |
| `/admin/companies` | Create, edit, delete companies |
| `/admin/jobs` | Create, edit, delete job postings |
| `/admin/applications` | Update application statuses by ID |

---

## Project Structure
```
Frontend/
├── .env                         # VITE_API_URL
├── index.html
└── src/
    ├── main.jsx                 # React entry point
    ├── App.jsx                  # Router + route guards
    ├── index.css                # Complete design system (no framework)
    ├── context/
    │   └── AuthContext.jsx      # JWT + user state (localStorage)
    ├── services/
    │   └── api.js               # Centralized fetch client
    ├── components/
    │   ├── ProtectedRoute.jsx   # Role-based route guard
    │   ├── StudentLayout.jsx    # Sidebar for students
    │   ├── AdminLayout.jsx      # Sidebar for admins
    │   ├── StatusBadge.jsx      # Coloured status pills
    │   ├── Spinner.jsx          # Loading indicator
    │   └── Toast.jsx            # Auto-dismiss notifications
    └── pages/
        ├── Login.jsx
        ├── Register.jsx
        ├── StudentDashboard.jsx
        ├── Jobs.jsx
        ├── MyApplications.jsx
        ├── Profile.jsx
        ├── AdminDashboard.jsx
        ├── AdminCompanies.jsx
        ├── AdminJobs.jsx
        └── AdminApplications.jsx
```

---

## Creating an Admin Account
```bash
cd Backend
node createAdmin.js
```

---

## API Endpoints Used

| Method | Endpoint | Who |
|--------|----------|-----|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/users/profile` | Student, Admin |
| GET | `/api/companies` | Student, Admin |
| POST | `/api/companies` | Admin |
| PUT | `/api/companies/:id` | Admin |
| DELETE | `/api/companies/:id` | Admin |
| GET | `/api/jobs?search=&location=&branch=&minCGPA=` | Student, Admin |
| POST | `/api/jobs` | Admin |
| PUT | `/api/jobs/:id` | Admin |
| DELETE | `/api/jobs/:id` | Admin |
| GET | `/api/applications/my` | Student |
| POST | `/api/applications/:jobId` | Student |
| PATCH | `/api/applications/:id/status` | Admin |
| POST | `/api/resume/upload` (field: `resume`) | Student |

---

## Backend Changes Required (Do Not Make These Yourself)

### 1. CORS — BLOCKER (without this the browser blocks all requests)
Add to `Backend/server.js` after `const app = express();`:
```js
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
```

### 2. No "get all applications" endpoint for admins
The Admin Applications page can only update statuses, not list them.
Add to `applicationRoutes.js`:
```js
router.get('/', protect, authorizeRoles('admin'), getAllApplications);
```
And in `applicationController.js`:
```js
const getAllApplications = async (req, res) => {
  const apps = await Application.find()
    .populate({ path: 'job', populate: { path: 'company', select: 'name' } })
    .populate('student', 'name email branch cgpa')
    .sort({ createdAt: -1 });
  res.json({ count: apps.length, applications: apps });
};
```

### 3. Profile endpoint returns JWT payload only
`GET /api/users/profile` returns `req.user` (just `id` + `role`), not the full User document.
To show branch, CGPA, backlogs on the profile page, change `userController.js`:
```js
const getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json({ user });
};
```

### 4. Admin cannot see closed jobs
`getJobs` hardcodes `filter.status = 'open'`. For the admin job list, consider adding an `?includeAll=true` query param bypass.

---

## What Works
- Student registration and login with JWT
- Admin login (use `createAdmin.js`)
- Role-based route protection (student vs admin)
- Browse open jobs with canonical branch codes (CSE, ISE, AIML, etc.)
- Job categories (Internship, FTE, Internship + FTE) with formatted stipend & CTC
- Real-time client-side & server-side student eligibility checking (disables Apply Now with reason)
- My Applications with colour-coded status badges and duplicate application prevention
- Authenticated PDF resume upload & viewing (2 MB limit, PDF only)
- Admin: create/edit/delete companies with delete confirmation
- Admin: create/edit/delete jobs with categories, compensation, and branch checkboxes
- Admin: view all student applications with filters, student resume viewing, and status updates
- Toast notifications and form validation throughout
- Responsive for laptop, tablet, and mobile

## What Needs Backend Work
- Admin view of closed/all jobs (filter currently defaults to open)
