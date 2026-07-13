# Implementation Prompt — School Transport Management System

## Context

This is a Next.js (App Router) school transport management system currently running on mock JSON data via `lib/dataUtils.ts`. The goal of this task is twofold:

1. **Restructure the Routes module into a Zones module**, and update the Bus module's trip form to match.
2. **Initialize a production backend** using Node.js + Express + MongoDB (Mongoose), replacing the mock JSON data layer.

Work through this in the order laid out below. Do not skip the schema/data-model work to jump straight to UI — the backend model is the source of truth for everything else.



## 2\. Zones Module (replaces the Routes module)

The current `app/routes` module is **route-centric** (route → places, fare, buses, status). This must become **zone-centric**.

### 2.1 New data model

* **Zone** is the top-level entity: name (unique), one-way fare, two-way fare, status (Active/Inactive), and an `isCatchAll` flag.
* **Place/Stop** belongs to exactly one Zone. Place names must be **globally unique** — the same place name cannot exist in two different zones.
* Fare is **never stored on a Place** — it is always derived from the parent Zone, and always computed live (not snapshotted) wherever it's displayed or used.
* A special **catch-all Zone** must be seeded into the database on initialization (`isCatchAll: true`), and cannot be deleted. Any Place created without an explicit zone assignment is automatically assigned to this zone.

### 2.2 Mongoose schemas

```javascript
const ZoneSchema = new mongoose.Schema({
  zoneName: { type: String, required: true, unique: true, trim: true },
  oneWayFare: { type: Number, required: true },
  twoWayFare: { type: Number, required: true },
  isCatchAll: { type: Boolean, default: false },
  status: { type: String, enum: \['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

const PlaceSchema = new mongoose.Schema({
  placeName: { type: String, required: true, unique: true, trim: true },
  zoneId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true }
}, { timestamps: true });
```

### 2.3 UI changes

* Rework the existing list/add/edit pages under `app/routes` (rename the directory/route to reflect Zones, e.g. `app/zones`) to manage Zones and their Places instead of Routes.
* Zone list/detail views should show: zone name, one-way fare, two-way fare, status, and the list of places under that zone.
* Provide a way to add/edit Places and assign them to a Zone via dropdown (no free-text zone entry).
* The catch-all zone should be visible and its fare editable like any other zone, but it should not be deletable, and its `isCatchAll` flag should not be editable via the UI.
* Enforce global uniqueness of place names at the form level (surface a clear validation error if a duplicate is entered).

\---

## 3\. Bus Module (Trips → Add/Edit Bus) Changes

* **Remove** the standalone "Route" field/dropdown currently used when adding/editing a bus's trips.
* **Replace it** with an ordered **Pickup Points** list on each trip. Each pickup point is selected from existing Places (enforced dropdown/autocomplete — no free text), not typed manually.
* Pickup points must be reorderable (drag-and-drop or up/down controls) since order reflects the physical trip sequence.
* A single bus/trip can include pickup points from multiple different Zones — this is expected and valid.
* Fare/zone exposure for a trip is derived dynamically from whichever Zones its pickup points belong to; it is not fixed to a single zone or stored separately.

### 3.1 Updated Bus/Trip schema

```javascript
const TripSchema = new mongoose.Schema({
  tripNumber: { type: Number, required: true },
  time: { type: String, required: true }, // e.g. "06:30"
  pickupPoints: \[{ type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true }], // ordered array
  notes: String
});

const BusSchema = new mongoose.Schema({
  busNumber: { type: String, required: true, unique: true }, // e.g. "KCA 123A"
  name: { type: String, required: true }, // e.g. "Scania - Kiserian"
  capacity: { type: Number, required: true },
  status: { type: String, enum: \['Active', 'Maintenance', 'Out of Service'], default: 'Active' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  trips: \[TripSchema]
}, { timestamps: true });
```

\---

## 4\. Other Core Schemas

### User Schema

```javascript
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true }, // bcrypt hashed
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  role: {
    type: String,
    enum: \['Superior\_Admin', 'Admin', 'Finance\_Manager', 'Bus\_Driver'],
    required: true
  },
  phone: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
```

### Student Schema

```javascript
const StudentSchema = new mongoose.Schema({
  admissionNumber: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  grade: String,
  stream: String,
  parentName: String,
  parentContact: String,
  address: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
```

### Transport Approval Schema

```javascript
const TransportApprovalSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  tripNumber: { type: Number, required: true },
  placeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true }, // resolves zone/fare live
  tripType: { type: String, enum: \['one\_way', 'two\_way'], required: true },
  direction: { type: String, enum: \['morning', 'evening', 'both'], required: true },
  status: { type: String, enum: \['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date
}, { timestamps: true });
```

Note: `routeId` is dropped entirely from this schema. Fare for an approval is computed live at read-time by resolving `placeId → zoneId → fare`, never stored or snapshotted.

\---

## 5\. Finance Module

Keep `app/finance` as-is structurally for now — it exists to **simulate the flow of data** (collected/outstanding fees) for the Finance Manager role, not to be a fully wired production feature yet. Wire it to read live computed fare data from Zones/Places/Approvals once the backend is in place, but don't over-build it beyond what's already scaffolded.

\---

## 6\. Backend Initialization (Node.js + Express + MongoDB)

1. Set up a Node.js + Express backend (separate from or alongside the Next.js app, per current project structure) with a MongoDB connection via Mongoose.
2. Implement all schemas above (`User`, `Zone`, `Place`, `Bus` w/ nested `Trip`, `Student`, `TransportApproval`).
3. **Authentication**: Hash passwords with `bcrypt`. Implement JWT-based auth issued as an HTTP-only cookie, carrying role claims. Protect sensitive endpoints with role-based middleware (`Superior\_Admin`, `Admin`, `Finance\_Manager`, `Bus\_Driver`).
4. **Capacity auditing**: When approving a student for a trip, use an atomic operation (e.g. `findOneAndUpdate` with a capacity guard condition) to prevent two concurrent approvals from exceeding a bus's `capacity`.
5. **Indexes**: Add unique indexes on `Zone.zoneName`, `Place.placeName`, `User.username`, `Student.admissionNumber`, and a compound index on `{ busId: 1, status: 1 }` in `TransportApproval` for fast roster queries.
6. **Seeding**: On first run/migration, seed the reserved catch-all `Zone` document (`isCatchAll: true`) before any Places can be created.
7. **Data migration**: Write a one-time migration script that reads the existing mock JSON files (`data/routes.json`, `data/buses.json`, `data/students.json`, `data/users.json`) and transforms them into the new schema shape — mapping old routes/places into Zones/Places, and old bus route assignments into pickup point arrays. Flag any place names that don't cleanly map so they can be manually reviewed rather than silently dropped into the catch-all zone.
8. Replace `lib/dataUtils.ts`'s JSON file CRUD operations with API calls to the new Express/MongoDB backend, keeping the function signatures as close to the original as possible to minimize churn in the components that consume them.

\---

## 7\. Acceptance Checklist

* \[ ] `app/imports` and `app/errors` removed, no dangling references
* \[ ] `app/routes` reworked into a Zones module (rename directory if appropriate)
* \[ ] Zones have name, one-way/two-way fare, status; Places belong to one Zone with globally unique names
* \[ ] Catch-all Zone seeded, non-deletable, fare editable
* \[ ] Bus/Trip form: Route field removed, replaced with ordered, dropdown-selected Pickup Points
* \[ ] All fare displays compute live from the current Zone — nothing snapshotted
* \[ ] Node.js + Express + MongoDB backend running with all schemas above
* \[ ] Auth: bcrypt + JWT + role middleware in place
* \[ ] Capacity-safe approval endpoint
* \[ ] Indexes applied
* \[ ] Migration script converts existing mock JSON into the new schema shape
* \[ ] `lib/dataUtils.ts` calls the new backend instead of reading local JSON

