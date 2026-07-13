# Implementation Prompt — Bulk SMS, Driver, Attendance & Bus Tracking Modules

## Context

This is a follow-up implementation phase for the School Transport Management System (Next.js App Router + Node.js/Express + MongoDB backend, as established in the prior Zones/Bus module work). This phase adds four new modules: **Bulk SMS**, **Driver**, **Attendance**, and **Bus Tracking**. Build them in the order below, since Attendance depends on Driver (trips/sessions) and the Term entity, and Bus Tracking depends on data captured by the Driver module.

---

## 1. Term Module (new supporting entity)

Introduced to define term boundaries, since transport enrollment renews per term and attendance/absenteeism calculations need a bounded period to work against.

```javascript
const TermSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g. "Term 1 2026"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isActive: { type: Boolean, default: false } // only one term should be active at a time
}, { timestamps: true });
```

- Only a **Superior Admin** should be able to create/edit Terms and mark one as active.
- Student transport enrollment (via Approvals) should be understood as renewing per active Term — this doesn't need full renewal workflow built now, just make sure Term is a first-class entity other modules can reference.

---

## 2. Bulk SMS Module

### 2.1 Entry points
- A button in the **Quick Actions** section (dashboard/home)
- A link in the **navigation bar**
- Both lead to the same **Compose** page

### 2.2 Compose page
- Recipient targeting, selectable by:
  - Specific **Bus/Trip**
  - **Grade/Stream**
  - Individual **student/parent** selection
- Recipient types: **Parent** and **Driver** for now — design the schema so more recipient types can be added later without rework
- Message body: plain text input
- Sending is **mocked** — no real SMS gateway integration yet, but structure the send function as an isolated service so a real provider (e.g., Africa's Talking, Twilio) can be swapped in later without touching the surrounding flow
- The mock should **simulate realistic outcomes** — randomly mark some sends as `failed` rather than always succeeding, so the History UI can be built/tested against both states

### 2.3 SMS History
- Every send is logged: recipient reference (not a snapshot), target criteria (for audit/display), message, status, timestamp
- Recipient details (name/phone) are resolved **live** at display time from the referenced Student/User record, not stored redundantly

```javascript
const SmsLogSchema = new mongoose.Schema({
  recipientType: { type: String, enum: ['Parent', 'Driver'], required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'recipientModel' },
  recipientModel: { type: String, required: true, enum: ['Student', 'User'] }, // 'Student' for Parent contact, 'User' for Driver
  targetCriteria: { type: String }, // e.g. "Bus: KCA 123A - Trip 1" or "Grade 5, Stream B"
  message: { type: String, required: true },
  status: { type: String, enum: ['sent', 'delivered', 'failed'], default: 'sent' },
  sentAt: { type: Date, default: Date.now }
});
```

---

## 3. Driver Module

### 3.1 Login
- Credential is **bus number + admin-set password**, tied to the Bus, not to an individual driver identity. The driver cannot change this password.
- **Bus schema does not carry a fixed `driverId`.** Instead, on first login on a given device, the driver is prompted to enter their name/details, which is saved as a `DriverSession`.

```javascript
const DriverSessionSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  driverName: { type: String, required: true },
  deviceIdentifier: { type: String, required: true }, // persisted client-side identifier
  loginAt: { type: Date, default: Date.now }
}, { timestamps: true });
```

- This gives a natural "who drove which bus, when" audit trail that Trip and Attendance records can reference.

### 3.2 Trip Schema updates
Extend the existing `Trip` sub-schema (on `Bus`) to support:
- One active trip at a time per bus — enforce this at the API level (reject a Start Trip request if another trip on that bus is already active)
- Start Trip / End Trip actions, recording start time, end time, and distance covered. **Do not initialize the Maps API yet** — distance capture should be stubbed/placeholder for now, structured so live GPS distance calculation can be dropped in later.
- Trip visibility: all scheduled trips (Trip 1, Trip 2, etc.) are always visible to the driver. The trip currently within its active window (30 minutes before → ~1 hour after its scheduled time) should be visually emphasized (larger card, highlight color, "Active now" badge) — nothing outside the window is hidden or restricted.
- **Non-student trips**: a driver can Start/End a trip that isn't for carrying students, using the same Start/End mechanism, flagged with a trip-type distinction and one or more selected reasons:

```javascript
const NON_STUDENT_TRIP_REASONS = [
  'maintenance_service',
  'refueling_run',
  'repositioning_depot_transfer',
  'cleaning_washing',
  'driver_training_test_drive',
  'other'
];

// addition to TripSchema
const TripSchema = new mongoose.Schema({
  tripNumber: { type: Number, required: true },
  time: { type: String, required: true },
  pickupPoints: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Place' }], // not required for non-student trips
  tripType: { type: String, enum: ['scheduled', 'non_student'], default: 'scheduled' },
  nonStudentReasons: [{ type: String, enum: NON_STUDENT_TRIP_REASONS }], // multi-select checkbox list
  otherReasonText: { type: String }, // required when 'other' is included in nonStudentReasons
  driverSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DriverSession' },
  startTime: Date,
  endTime: Date,
  distanceCovered: Number, // placeholder until Maps API is wired in
  notes: String
});
```
Non-student trips should be excluded from Attendance entirely (no attendance records generated) and excluded from the scheduled Trip 1/Trip 2 list shown for attendance purposes.

### 3.3 Fuel & Odometer Logging
- **Odometer reading**: logged by the driver **once a week**
- **Fuel fill-up**: logged by the driver **whenever they refuel** (event-driven, not scheduled)

```javascript
const OdometerLogSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  reading: { type: Number, required: true },
  loggedAt: { type: Date, default: Date.now }
});

const FuelLogSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  litersFilled: { type: Number, required: true },
  cost: Number,
  odometerReading: { type: Number, required: true }, // reading at time of fill-up
  loggedAt: { type: Date, default: Date.now }
});
```

- Consumption rate (km/L) is derived from the distance between consecutive fill-ups' odometer readings divided by liters filled — computed live, not stored.
- Remaining fuel estimate, computed live: `(liters at last fill-up) − (distance since last fill-up ÷ consumption rate)`, where distance-since is derived from the latest Odometer log minus the odometer reading at last fill-up.

---

## 4. Attendance Module

### 4.1 Attendance recording
- Accessed by the driver under a dedicated **Attendance** section, listing the Bus's trips (Trip 1, Trip 2, etc. — scheduled trips only, non-student trips excluded)
- Selecting a trip shows the list of students assigned to that trip, each with a checkbox: **present (default checked)** / absent (unchecked)
- One attendance record per **(student, trip, date)** combination — a student on both morning and evening trips gets two separate records for the same date, distinguished by trip/time
- Once the trip is marked ended, attendance for that trip/date is **locked** — no direct edits
- Post-lock corrections: instead of editing, the driver (or admin) can flag/report an error, which routes to the **Superior Admin**

```javascript
const AttendanceRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  tripNumber: { type: Number, required: true },
  date: { type: Date, required: true }, // date only, normalized (no time component)
  present: { type: Boolean, default: true },
  locked: { type: Boolean, default: false },
}, { timestamps: true });
// Compound unique index on { studentId, tripNumber, busId, date }

const AttendanceErrorReportSchema = new mongoose.Schema({
  attendanceRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
}, { timestamps: true });
```

### 4.2 Absenteeism calculation & flagging
- Expected trip count for a student = number of scheduled occurrences of **the specific trip(s) they're assigned to**, within the boundaries of the currently active Term. A student assigned to both morning and evening trips has a higher expected count than one assigned to only one.
- Absenteeism % = (missed attendance records ÷ expected attendance records for that student's assigned trip(s) within the active term) × 100
- Threshold: hardcoded default of **50%**, editable only by **Superior Admin** (store as a configurable setting, not a hardcoded literal, so it can be changed without a redeploy)
- Flagged status is **computed live**, not stored as a static field on the student

### 4.3 Student detail view (Admin/Superior Admin)
- Clicking a student number under a trip's student list opens student details, including their live-computed absenteeism percentage and flagged status for the active term

### 4.4 Flagged Students Dashboard
- A separate dashboard, accessed via **Quick Actions**
- Organized into sections/headings by flag reason (absenteeism is the first reason; structure it so future flag types — e.g., fee defaulters — can be added as additional sections later)

### 4.5 Printable Absenteeism Report
- Scoped to a specific Bus: all students across its trips, their attendance %, and flagged status, generated on-demand from current data
- Exported as a downloadable PDF

---

## 5. Bus Tracking Module

### 5.1 Entry points
- An icon in the **Actions** column for each Bus in the Bus list (opens tracking scoped to that specific bus)
- A **Maps** button in the Home **Quick Actions** section (opens tracking in overview mode)

### 5.2 Overview mode (no bus selected)
- Lists all buses with a lightweight status per bus
- The right-hand detail column (Distance, Trip, Mileage, Fuel) stays **empty/unpopulated** until a specific bus is selected

### 5.3 Bus-selected mode
- **Map** takes the left side of the page (slightly more than half width) — this is a **mocked placeholder** for now (no real Maps API initialized), structured so a real map/live GPS can be substituted in later
- **Right-hand column** shows:
  - **Bus** — displayed by **Number Plate** (this should be the canonical display name for a bus everywhere in the UI, not a separate freeform name field)
  - **Distance** — from the trip's distance tracking (placeholder until Maps API is live)
  - **Trip** — only populated when a specific bus is selected
  - **Mileage** — derived from Odometer logs
  - **Fuel** — remaining fuel estimate, computed live per Section 3.3's formula

### 5.4 Bus display name change
- Update the Bus schema/UI so the **Number Plate** field is used as the primary display identifier across the app (Bus list, dropdowns, Tracking page, SMS targeting, etc.), replacing any separate freeform "name" field currently in use.

---

## 6. Acceptance Checklist

- [ ] `Term` entity created; only Superior Admin can create/edit/activate terms
- [ ] Bulk SMS: Quick Actions + nav bar entry points, Compose page with Bus/Trip, Grade/Stream, and individual targeting
- [ ] Bulk SMS: mocked sends with simulated failures; History log with live-resolved recipient details
- [ ] Driver login: bus number + admin-set password; first-login-per-device prompts for driver name → `DriverSession`
- [ ] Trip Start/End: one active trip per bus at a time; distance capture stubbed for future Maps API
- [ ] Trip window emphasis (30 min before → ~1 hr after) implemented as visual priority, not access restriction
- [ ] Non-student trips: same Start/End mechanism, trip-type flag, multi-select reason checkboxes + "Other" free text; excluded from Attendance
- [ ] Odometer logging (weekly) and Fuel fill-up logging (event-driven) implemented
- [ ] Consumption rate and remaining fuel computed live, not stored
- [ ] Attendance: one record per (student, trip, date); default present; locked after trip ends; error reports route to Superior Admin
- [ ] Absenteeism % computed live against active Term and student's specific assigned trip(s); 50% default threshold, configurable by Superior Admin only
- [ ] Flagged Students Dashboard accessible via Quick Actions, sectioned by flag reason
- [ ] Printable bus-scoped absenteeism report, exportable as downloadable PDF
- [ ] Bus Tracking: Actions-icon + Quick Actions entry points; overview mode vs. bus-selected mode; mocked map on left, detail column on right
- [ ] Bus display name changed to Number Plate everywhere in the UI
