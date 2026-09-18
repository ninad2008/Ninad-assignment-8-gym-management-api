# 🏋️‍♂️ Assignment 08: Gym & Fitness Club Management REST API

A full-featured backend REST API for a **Gym & Fitness Center Management System** built with **Node.js, Express.js, MongoDB, Mongoose, and Passport.js (Local Strategy)**.

---

## 📌 Features

- **Membership Lifecycle Management**: Automatic calculation of expiry dates (e.g. 30 days per month), status auto-expiration checks, renewals with tier upgrades, and queries for expired memberships.
- **Fitness Class Scheduling & Capacity Controls**: Class creation, duration, capacity constraints, enrollment logic, capacity saturation guards (`400 Class capacity reached`), and cancellation.
- **Relational Population**: Enrolled members linked via Mongoose `ObjectId` references and populated with member profiles.
- **Stateful Session Authentication**: Passport Local strategy with Bcrypt password hashing and Express-Session protection.
- **MongoDB Compass Integration**: Live database inspection for `users`, `fitnessclasses`, and session collections.

---

## 🗄️ Project Architecture

```text
assignment-08-gym-api/
├── config/
│   ├── db.js                # Mongoose database connection
│   └── passport.js          # Passport Local strategy configuration
├── controllers/
│   ├── authController.js    # Register with auto-expiry calculation, login, logout, me
│   ├── classController.js   # Class CRUD, booking capacity validation, cancel
│   └── memberController.js  # Renewal & expired query handlers
├── middleware/
│   ├── authMiddleware.js    # Ensure session authentication
│   └── checkActiveMember.js # Check member is not expired or frozen
├── models/
│   ├── FitnessClass.js      # Class schema with enrolled members references
│   └── User.js              # Member schema with bcrypt pre-save hook
├── routes/
│   ├── authRoutes.js        # /api/auth routes
│   ├── classRoutes.js       # /api/classes routes
│   └── memberRoutes.js      # /api/members routes
├── test/
│   └── api.test.js          # Automated end-to-end test suite
├── .env                     # Local environment variables
├── .env.example             # Example environment variables
├── package.json             # Project dependencies and npm scripts
├── seed.js                  # Sample data populator for MongoDB Compass
└── server.js                # Express app entry point
```

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) running locally (or a MongoDB Atlas connection string)
- [MongoDB Compass](https://www.mongodb.com/products/compass) for database inspection

### 2. Installation
```bash
# Clone or navigate to the project directory
cd "Assignment 8"

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory (or use the provided `.env`):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/gym_db
SESSION_SECRET=gym_super_secret_session_key_2026
NODE_ENV=development
```

### 4. Seed Sample Data (Optional for MongoDB Compass)
To populate sample members and fitness classes for immediate inspection in MongoDB Compass:
```bash
node seed.js
```

### 5. Start the Server
```bash
# For development with nodemon
npm run dev

# Or start directly
npm start
```
The server will run at `http://localhost:5000`.

---

## 🧭 Using MongoDB Compass

To inspect and manage your data visually with **MongoDB Compass**:

1. **Open MongoDB Compass**.
2. In the **New Connection** screen, enter your connection string:
   ```text
   mongodb://127.0.0.1:27017
   ```
   *(Or your custom MongoDB Atlas URI if using cloud MongoDB).*
3. Click **Connect**.
4. In the left database sidebar, locate the **`gym_db`** database.
5. Explore the collections:
   - **`users`**: Contains member profiles, hashed passwords, `membershipTier`, `membershipStatus`, `membershipExpiryDate`, and `emergencyContact`.
   - **`fitnessclasses`**: Contains workout sessions, trainer names, schedule dates, `maxCapacity`, and the array of `enrolledMembers` `ObjectId`s.
   - **`sessions`** (when active): Stores stateful user session records.

---

## 📋 API Endpoints Reference

### 🔐 1. Authentication Endpoints

#### Register Member
- **POST** `/api/auth/register`
- **Body**:
  ```json
  {
    "username": "fit_sam",
    "email": "sam@fit.com",
    "password": "mypassword",
    "membershipTier": "Gold",
    "durationMonths": 3,
    "emergencyContact": "+1-555-0199"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Member registered successfully",
    "data": {
      "_id": "6601abc123456789...",
      "username": "fit_sam",
      "email": "sam@fit.com",
      "membershipTier": "Gold",
      "membershipStatus": "active",
      "membershipExpiryDate": "2026-06-17T16:38:00.000Z",
      "emergencyContact": "+1-555-0199"
    }
  }
  ```

#### Login Member
- **POST** `/api/auth/login`
- **Body**:
  ```json
  {
    "username": "fit_sam",
    "password": "mypassword"
  }
  ```
- **Response (200 OK)**: Sets session cookie `connect.sid`.

#### Get Logged-in Profile & Remaining Days
- **GET** `/api/auth/me`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "6601abc123456789...",
      "username": "fit_sam",
      "email": "sam@fit.com",
      "membershipTier": "Gold",
      "membershipStatus": "active",
      "membershipExpiryDate": "2026-06-17T16:38:00.000Z",
      "remainingDays": 90,
      "isExpired": false
    }
  }
  ```

#### Logout
- **POST** `/api/auth/logout`

---

### 🏋️‍♂️ 2. Fitness Class Endpoints

#### Fetch All Classes (Supports Filter by Trainer)
- **GET** `/api/classes`
- **GET** `/api/classes?trainer=Marcus`

#### Fetch Class By ID
- **GET** `/api/classes/:id`

#### Create a Class
- **POST** `/api/classes`
- **Body**:
  ```json
  {
    "title": "HIIT Bootcamp",
    "trainerName": "Marcus Vance",
    "scheduleDate": "2026-04-15T09:00:00Z",
    "durationMinutes": 60,
    "maxCapacity": 20
  }
  ```

#### Book a Class
- **POST** `/api/classes/:id/book`
- Requires active authenticated session.
- Automatically prevents over-enrollment when capacity is reached.

#### Cancel Booking
- **DELETE** `/api/classes/:id/cancel`

---

### 💳 3. Membership Management Endpoints

#### Renew Membership
- **PATCH** `/api/members/:id/renew`
- **Body**:
  ```json
  {
    "additionalMonths": 6,
    "tier": "Platinum"
  }
  ```
- **Response (200 OK)**: Extends expiry date by `additionalMonths * 30` days and updates tier & status.

#### Get All Expired Members
- **GET** `/api/members/expired`
- **Response (200 OK)**: Returns all users whose `membershipExpiryDate < new Date()` or status is `'expired'`.

---

## 🧪 Testing & Verification

Run the automated test suite:
```bash
npm test
```
The test suite validates:
1. Registration with 1-month duration calculates `membershipExpiryDate` exactly 30 days ahead.
2. Passport login, session authorization, and `/api/auth/me` calculations.
3. Class creation with capacity constraints (`maxCapacity = 2`).
4. Over-enrollment rejection on the 3rd booking (`400 Bad Request: Class capacity reached`).
5. Class booking cancellation & seat freeing.
6. Expired member querying & membership renewal.
