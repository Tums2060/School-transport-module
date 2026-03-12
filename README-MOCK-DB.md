# School Transport Management System - Mock Database Setup

## Overview
This document describes the temporary mock database system created for testing authentication and authorization flows before implementing a production database.

## Database Structure

### Data Files Location
All mock data is stored in JSON files under the `/data` directory:
- `data/users.json` - User accounts and authentication
- `data/students.json` - Student records
- `data/buses.json` - Fleet management data
- `data/routes.json` - Route assignments and stops

---

## Users Data (`users.json`)

### Total Users: 6

#### 1. Superior Admin
- **Username:** `superadmin`
- **Password:** `super@2026`
- **Full Name:** James Mwangi
- **Email:** superadmin@company.edu
- **Role:** superior_Admin
- **Permissions:** Full access (all permissions enabled)

#### 2-3. Admins (2 accounts)
- **Admin 1:**
  - Username: `admin1`
  - Password: `admin@2026`
  - Full Name: Sarah Wanjiru
  - Email: admin1@company.edu
  
- **Admin 2:**
  - Username: `admin2`
  - Password: `admin@2026`
  - Full Name: Peter Kamau
  - Email: admin2@company.edu

- **Permissions:** All except user management and system settings

#### 4-6. Bus Drivers (3 accounts)
- **Driver 1:**
  - Username: `driver1`
  - Password: `driver@2026`
  - Full Name: John Omondi
  - Phone: +254 712 345 004
  - Assigned Bus: B-001 (bus_001)
  - Assigned Route: North Route
  
- **Driver 2:**
  - Username: `driver2`
  - Password: `driver@2026`
  - Full Name: David Kipchoge
  - Phone: +254 712 345 005
  - Assigned Bus: B-002 (bus_002)
  - Assigned Route: East Route
  
- **Driver 3:**
  - Username: `driver3`
  - Password: `driver@2026`
  - Full Name: Michael Njoroge
  - Phone: +254 712 345 006
  - Assigned Bus: B-003 (bus_003)
  - Assigned Route: South & West Route

- **Permissions:** View-only dashboard access

---

## Students Data (`students.json`)

### Total Students: 100 (Active)

### Admission Number Patterns

#### Foundation - Grade 5 (64 students)
- **Pattern:** 4-digit numbers (0001-0064)
- **Grades:**
  - Foundation (Fnd): 8 students
  - Pre-Primary 1 (PP1): 8 students
  - Pre-Primary 2 (PP2): 8 students
  - Grade 1: 10 students
  - Grade 2: 10 students
  - Grade 3: 10 students
  - Grade 4: 5 students
  - Grade 5: 5 students

- **Streams (Fnd-PP2):** Red, Yellow, Green, Blue
- **Streams (Grade 1-5):** North, South, East, West

#### Grade 6-9 (32 students)
- **Pattern:** JS#### (JS0001-JS0032)
- **Distribution:** 8 students per grade
- **Streams:** Q, R, S, T

#### Grade 10 (4 students)
- **Pattern:** SS#### (SS0001-SS0004)
- **Stream:** None

### Student Data Fields
Each student record includes:
- Admission number
- Full name (first & last)
- Grade and stream
- Date of birth
- Gender
- Address (various Nairobi locations)
- Parent/guardian information (name, email, phone)
- Emergency contact
- Bus assignment
- Route assignment
- Pickup point
- Enrollment date
- Status (Active/Inactive)
- Medical conditions (if any)

---

## Buses Data (`buses.json`)

### Total Buses: 12

### Active Buses (3)
1. **B-001 (KCA 001A)**
   - Capacity: 45 seats
   - Driver: John Omondi
   - Route: North Route
   - Features: GPS, A/C, CCTV

2. **B-002 (KCB 002B)**
   - Capacity: 52 seats
   - Driver: David Kipchoge
   - Route: East Route
   - Features: GPS, A/C, CCTV

3. **B-003 (KCC 003C)**
   - Capacity: 45 seats
   - Driver: Michael Njoroge
   - Route: South & West Route
   - Features: GPS, A/C, CCTV

### Maintenance (1)
4. **B-004 (KCD 004D)**
   - Capacity: 48 seats
   - Status: Under maintenance
   - Issue: Engine overhaul required

### Inactive/Reserve (8)
- B-005 through B-012
- Various capacities (35-52 seats)
- Models: Toyota Coaster, Isuzu NQR, Mitsubishi Rosa
- Years: 2018-2024

### Bus Data Fields
- Registration number
- Capacity
- Model and year
- Status (Active/Maintenance/Inactive)
- Driver assignment
- Route assignment
- Maintenance schedules
- Odometer reading
- Features (GPS/A/C/CCTV)
- Insurance & roadworthiness expiry dates

---

## Routes Data (`routes.json`)

### Total Routes: 5 (3 Active, 2 Inactive)

### Active Routes

#### 1. North Route (NR-001)
- **Bus:** B-001
- **Driver:** John Omondi
- **Pickup Time:** 06:30 AM
- **Distance:** 28 km
- **Students:** 35
- **Stops:** 5 (Ruaka, Roysambu, Kahawa Sukari, Kahawa West, Kilimani)

#### 2. East Route (ER-002)
- **Bus:** B-002
- **Driver:** David Kipchoge
- **Pickup Time:** 06:45 AM
- **Distance:** 32 km
- **Students:** 33
- **Stops:** 6 (Zimmerman, Kasarani, Mirema, Ruiru, Thika Road, Donholm)

#### 3. South & West Route (SW-003)
- **Bus:** B-003
- **Driver:** Michael Njoroge
- **Pickup Time:** 06:30 AM
- **Distance:** 35 km
- **Students:** 32
- **Stops:** 8 (Garden Estate, Githurai, Pipeline, Embakasi, Umoja, Buru Buru, Westlands, Kileleshwa)

### Inactive Routes

#### 4. Central Route (CR-004)
- Status: Inactive (Low enrollment)
- 5 potential stops defined

#### 5. Emergency/Backup Route (ER-005)
- Flexible route for special trips

### Route Data Fields
- Route name and code
- Bus and driver assignment
- Status
- Pickup and dropoff times
- Distance and estimated duration
- Student count
- Stop details (location, time, student count)
- Creation and update timestamps

---

## API Endpoints

### Authentication
- `POST /api/auth/login`
  - Body: `{ username, password }`
  - Returns: User object (without password) and success status

### Statistics
- `GET /api/stats`
  - Returns: Dashboard stats (student count, bus count, route count)

### Students
- `GET /api/students` - List all students
- `GET /api/students?count=true` - Get active students count only
- `GET /api/students/[id]` - Get student by ID

### Buses
- `GET /api/buses` - List all buses
- `GET /api/buses?count=true` - Get active buses count only
- `GET /api/buses/[id]` - Get bus by ID

### Routes
- `GET /api/routes` - List all routes
- `GET /api/routes?count=true` - Get active routes count only
- `GET /api/routes/[id]` - Get route by ID

---

## Utility Functions (`lib/dataUtils.ts`)

### Available Functions:
- `readData<T>(fileName)` - Read from JSON file
- `writeData<T>(fileName, data)` - Write to JSON file
- `getUsers()` - Get all users
- `getUserByUsername(username)` - Find user by username
- `getUserById(id)` - Find user by ID
- `getStudents()` - Get all students
- `getStudentById(id)` - Find student by ID
- `getActiveStudentsCount()` - Count active students
- `getBuses()` - Get all buses
- `getBusById(id)` - Find bus by ID
- `getActiveBusesCount()` - Count active buses
- `getRoutes()` - Get all routes
- `getRouteById(id)` - Find route by ID
- `getActiveRoutesCount()` - Count active routes

---

## Testing the System

### 1. Login Testing
Visit `/login` and use any of the demo credentials:
- Superior Admin: `superadmin` / `super@2026`
- Admin: `admin1` / `admin@2026`
- Driver: `driver1` / `driver@2026`

### 2. Dashboard Testing
After login, the homepage displays:
- Real student count from data (100 students)
- Real bus count from data (3 active buses)
- User's full name and role
- Logout button
- Dark mode toggle

### 3. API Testing
Use tools like Postman or curl to test endpoints:
```bash
# Get stats
GET http://localhost:3000/api/stats

# Get all students
GET http://localhost:3000/api/students

# Get student count only
GET http://localhost:3000/api/students?count=true

# Login
POST http://localhost:3000/api/auth/login
Content-Type: application/json
{
  "username": "admin1",
  "password": "admin@2026"
}
```

---

## Security Notes

⚠️ **Important:** This is a mock system for development/testing only!

- Passwords are stored in **plain text** (never do this in production!)
- No JWT tokens or secure sessions
- No password hashing (bcrypt required for production)
- localStorage used for auth (insecure for production)
- No CSRF protection
- No rate limiting

### Production Requirements:
- Use a real database (PostgreSQL, MongoDB, etc.)
- Hash passwords with bcrypt or Argon2
- Implement JWT or secure session management
- Add CSRF protection
- Implement rate limiting
- Use HTTPS only
- Add input validation and sanitization
- Implement proper authorization middleware
- Add audit logging

---

## Next Steps

To migrate to a production database:

1. **Choose a Database:** PostgreSQL, MySQL, or MongoDB
2. **Set up ORM:** Prisma, TypeORM, or Mongoose
3. **Create Schema:** Based on the JSON structure
4. **Migrate Data:** Import from JSON files
5. **Update API Routes:** Replace file reads with DB queries
6. **Add Authentication:** Implement NextAuth.js or similar
7. **Add Security:** Password hashing, JWT, HTTPS
8. **Add Validation:** Zod or Joi for input validation
9. **Add Middleware:** Auth checks and role-based access control
10. **Add Logging:** Track all data changes

---

## File Structure
```
School-transport-module/
├── data/
│   ├── users.json          # 6 users (1 super admin, 2 admins, 3 drivers)
│   ├── students.json       # 100 students with proper admission numbers
│   ├── buses.json          # 12 buses (3 active, 1 maintenance, 8 inactive)
│   └── routes.json         # 5 routes (3 active, 2 inactive)
├── lib/
│   └── dataUtils.ts        # Helper functions for data access
├── app/
│   ├── api/
│   │   ├── auth/login/     # Authentication endpoint
│   │   ├── stats/          # Dashboard statistics
│   │   ├── students/       # Student CRUD operations
│   │   ├── buses/          # Bus CRUD operations
│   │   └── routes/         # Route CRUD operations
│   ├── login/
│   │   └── page.tsx        # Login page with demo credentials
│   └── page.tsx            # Dashboard with real data
└── README-MOCK-DB.md       # This file
```

---

## Questions or Issues?

If you encounter any issues with the mock database:
1. Check that all JSON files exist in the `/data` directory
2. Verify file permissions allow reading
3. Check browser console for errors
4. Verify API endpoints are accessible (check Network tab)
5. Ensure localStorage is enabled in your browser

---

**Created:** January 2026
**Last Updated:** January 2026
**Status:** Development/Testing Only
