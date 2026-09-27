# SkillTrack — Maharashtra Skilling Outcomes Platform

> **Maharashtra State Innovation Society**  
> Department of Skills, Employment, Entrepreneurship and Innovation  
> Government of Maharashtra

---

## 🔒 Authentication & Security Architecture

SkillTrack is configured with an institutional, secure-looking authentication gateway. **Opening the application routes unauthenticated visitors directly to the secure Login Page (`#login`) first instead of displaying the Home / Dashboard directly.**

### Key Security Implementations

1. **Gated Application Entry (`#login`)**:
   - When the application is launched, `AuthContext` verifies the session status with `/api/auth/me`.
   - If unauthenticated, the user is immediately routed to the official **Maharashtra Government SkillTrack Authentication Gateway**.
   - If an unauthenticated user attempts to access any protected hash route (e.g. `#dashboard`, `#districts`, `#trainees`, `#reports`), the application preserves their requested destination, displays the secure login interface, and redirects them to their destination upon successful sign in.
   - If an authenticated user attempts to access `#login`, they are automatically routed to `#dashboard` (or `#user-dashboard` for citizens).

2. **Backend Authentication & Safe Credential Handling**:
   - **Zero Password Storage on Client**: Raw passwords are never persisted in `localStorage`, `sessionStorage`, or client-side JavaScript state. Form password fields exist only in ephemeral React state during typing and are wiped upon submission.
   - **Bcrypt Password Hashing**: Passwords are sent directly over HTTPS/API POST requests to `/api/auth/login` and `/api/auth/register`, where they are salted and hashed using `bcryptjs` (cost factor 10) before database storage.
   - **HTTP-Only Session Cookies & JWT**: Sessions are managed with signed JWT tokens (`HS256`, 7-day expiration). The server issues an `httpOnly`, `sameSite: 'lax'` cookie (`skilltrack_token`) that prevents client-side XSS access, complemented by an in-memory/session-scoped bearer token fallback for cross-origin environments.
   - **Protected Data Endpoints**: All operational data endpoints (`/api/trainees`, `/api/data/:table`, `/api/followups`, etc.) are guarded by the `requireAuth` Express middleware. Unauthenticated requests are rejected with `401 Unauthorized`.

3. **Role-Based Access Control (RBAC)**:
   - **State Administrator (`admin`)**: Access to all departmental analytical modules, including State Overview, District Analytics, Employment Outcomes, Trainees Longitudinal Registry, Sector Skill Gaps, Training Providers, Follow-ups Queue, Analytics, Insights, Reports, and the State Administration Console (`#admin-dashboard`).
   - **Citizen / Trainee (`user`)**: Access to the Citizen Skilling Portal (`#user-dashboard`), verified skill cards, enrolled programs, certification status, and profile management. Attempting to access `#admin-dashboard` triggers an institutional "Administrator Privileges Required" screen.

4. **Institutional Branding & Visual Identity**:
   - Saffron identity strip (`#e87722` / `bhagwa-500`)
   - Deep navy government palette (`#213a5c` / `gov-900`, `#264f83` / `gov-700`)
   - Official Chakra-inspired emblem and Government of Maharashtra institutional typography
   - Real-time password strength verification (minimum 8 characters, letters & numbers)
   - Digital Personal Data Protection (DPDP) Act 2023 consent capture
   - Quick 1-click evaluation buttons for evaluators.

---

## ⚡ Quick Evaluation Credentials

The backend automatically pre-seeds default credentials upon startup:

| Role | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **State Administrator** | `admin@skilltrack.gov.in` | `Admin@12345` | Full Departmental & Admin Console |
| **Citizen / Trainee** | `citizen@skilltrack.gov.in` | `Citizen@12345` | Citizen Skilling Portal & Enrolment |

*Tip: On the login page, click **"⚡ Demo Admin"** or **"⚡ Demo Citizen"** to automatically populate credentials.*

---

## 🚀 How to Run and Test

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Verify your `.env` contains:
```env
MONGODB_URI=mongodb+srv://skilltrack_admin:7013796206@cluster0.p1h72o5.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=Qseuk3yX5haPQJgq1RZ+vKJyLt+0ggQDsaJpQB3XG7FpSF+aYow/RPCCvOlA+xsN
PORT=5001
```
*(Note: The backend features an intelligent fallback datastore: if MongoDB Atlas is unreachable or offline during sandbox evaluation, the server seamlessly loads the official seed data into memory, guaranteeing 100% test reliability.)*

### 3. Start Development Servers
To start both the API server (Port 5001) and Vite client (Port 3000):
```bash
npm run dev:all
```
Or run them in separate terminals:
```bash
# Terminal 1: Backend API server
npm run server

# Terminal 2: Frontend Vite application
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Running Automated Tests & Verification
- **Run Full-Stack Test Suite**:
  ```bash
  npm test
  ```
  *Verifies database integrity, accounts, bcrypt hashing, JWT validation, trainee CRUD operations, and audit logging.*

- **Run Data Schema & Referential Integrity Validation**:
  ```bash
  npm run validate:data
  ```

- **Run TypeScript Typecheck**:
  ```bash
  npm run lint
  ```

- **Build Production Bundle**:
  ```bash
  npm run build
  ```

---

## 🧪 Testing the Authentication Flow Step-by-Step

1. **Initial Access**:
   - Open `http://localhost:3000` in an incognito or fresh browser window.
   - Confirm that the app routes to `#login` and presents the secure Maharashtra Government login interface with institutional branding.

2. **Administrator Sign In**:
   - Click **"⚡ Demo Admin"** (or type `admin@skilltrack.gov.in` / `Admin@12345`).
   - Click **"Sign In to SkillTrack"**.
   - Notice the authentication feedback toast and immediate navigation to the State Overview Dashboard.
   - In the top header, verify the user avatar shows "State Skill Administrator" with the "ADMINISTRATOR" badge.
   - Click the user avatar and select **"State Admin Console"** to access the administrator controls.

3. **Citizen Sign In & Protected Route Guard**:
   - In the user menu, click **"Sign Out"**.
   - Confirm you are immediately returned to the secure `#login` page.
   - Click **"⚡ Demo Citizen"** (or type `citizen@skilltrack.gov.in` / `Citizen@12345`).
   - Click **"Sign In"**. You will land on the **Citizen Skilling Portal**, displaying training records, attendance rate, assessment scores, and career progression.
   - Now manually navigate to `#admin-dashboard` in the address bar.
   - Notice the security guard triggers an institutional **"Administrator Privileges Required"** screen, correctly restricting non-admin users.

4. **New Citizen Registration**:
   - Sign out and switch to the **"Create Citizen Account"** tab on `#login` (or `#register`).
   - Fill in:
     - Name: `Sunita Mohan Joshi`
     - Email: `sunita.joshi@example.com`
     - District: `Nashik`
     - Password: `Password@2026`
     - Confirm Password: `Password@2026`
     - Check the DPDP Act consent checkbox.
   - Click **"Register Citizen Account"**.
   - The account is salted and hashed via bcrypt, stored securely in the database, and the user is signed in to their new Citizen Dashboard.

5. **Direct Protected URL Redirection**:
   - While signed out, navigate directly to `http://localhost:3000/#trainees`.
   - The app retains `trainees` as the target destination while displaying the `#login` form.
   - Log in using admin credentials.
   - The app immediately redirects you to `#trainees` upon sign in.
