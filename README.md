<h1 align="center"> Trainer Sync </h1>
<p align="center"> Seamless Synchronization for Modern Workforce Management and Operational Oversight </p>

<p align="center">
  <img alt="Build" src="https://img.shields.io/badge/Build-Passing-brightgreen?style=for-the-badge">
  <img alt="Issues" src="https://img.shields.io/badge/Issues-0%20Open-blue?style=for-the-badge">
  <img alt="Contributions" src="https://img.shields.io/badge/Contributions-Welcome-orange?style=for-the-badge">
  <img alt="License" src="https://img.shields.io/badge/License-MIT-yellow?style=for-for-the-badge">
</p>
<!-- 
  **Note:** These are static placeholder badges. Replace them with your project's actual badges.
  You can generate your own at https://shields.io
-->

## 📖 Table of Contents

*   [⭐ Overview](#-overview)
*   [✨ Key Features](#-key-features)
*   [🛠️ Tech Stack & Architecture](#-tech-stack--architecture)
*   [📁 Project Structure](#-project-structure)
*   [📸 Demo & Screenshots](#-demo--screenshots)
*   [🚀 Getting Started](#-getting-started)
*   [🔧 Usage](#-usage)
*   [🤝 Contributing](#-contributing)
*   [📝 License](#-license)

---

## ⭐ Overview

Trainer Sync is a comprehensive, real-time administrative system designed to modernize workforce management, with a sharp focus on employee attendance tracking, secure authentication, and streamlined leave processing. It provides robust tools for administrators to oversee operations and offers trainers an intuitive platform for managing their time and professional profile.

### The Problem

> Traditional methods of tracking attendance and processing leave requests are often manual, prone to error, and lack immediate synchronization between administrators and employees. This inefficiency leads to delayed approvals, inaccurate payroll calculations, and significant administrative overhead. Organizations require a single source of truth for employee status, location-verified attendance records, and immediate notification of critical events to maintain operational compliance and efficiency.

### The Solution

Trainer Sync provides an end-to-end digital solution built upon a highly responsive, component-based architecture. By integrating location-aware clock-in/out functionality (`useGeolocation.js`) and real-time communication (`socket.io`), the platform eliminates ambiguity in time management. It provides segregated interfaces (`AdminDashboard.jsx` vs. `TrainerDashboard.jsx`) ensuring users only interact with relevant data, transforming cumbersome HR processes into fast, auditable workflows.

### Architecture Overview

The system follows a classic **REST API** architecture augmented by **Real-Time Communication**. The presentation layer is managed by a single-page application built with **React**, providing a dynamic and interactive user interface (Component-based Architecture). The application logic and data handling are managed by a robust **Express** backend, utilizing **Mongoose** for data modeling and **Socket.io** for instant, bidirectional synchronization, ensuring administrators always have the most current view of the workforce.

---

## ✨ Key Features

Trainer Sync delivers critical functionality focused on reducing administrative burden, improving data accuracy, and enhancing the overall user experience for both trainers and managing personnel.

### 📍 Location-Aware Attendance Tracking

*   **Benefit:** Ensures high accountability and accuracy for time records by verifying the physical location of trainers during clock-in and clock-out.
*   **Mechanism:** Leverages integrated geolocation utilities (`useGeolocation.js`) and dedicated attendance services (`AttendanceService.js`) to record precise location stamps when using the `ClockedIn.jsx` component, preventing fraudulent time logging and ensuring compliance with shift schedules.

### 📧 Real-Time System Synchronization and Notifications

*   **Benefit:** Keeps all users—trainers and admins—instantly informed of status changes, system updates, and critical actions, minimizing delays in decision-making.
*   **Mechanism:** Utilizes robust `socket.io` integration and dedicated notification stores (`notificationStore.js`) to push instantaneous updates, such as successful attendance clock-ins, leave approval status changes, and new administrative announcements, all accessible via the `NotificationBell.jsx` component.

### 🛡️ Robust Security and Role-Based Access

*   **Benefit:** Protects sensitive HR data and ensures that users only access functionality appropriate for their role, maintaining system integrity and privacy.
*   **Mechanism:** Implements industry-standard encryption (`bcryptjs`) for password hashing and uses JSON Web Tokens (`jsonwebtoken`) managed by `AuthService.js` and `auth.middleware.js` to secure all routes. The `ProtectedRoute.jsx` component guarantees only authorized users can view dashboards, with access tiered using `authorize.middleware.js` and `HierarchyService.js`.

### 📅 Comprehensive Leave Management Workflow

*   **Benefit:** Digitizes the entire leave lifecycle, from submission to final approval, providing transparency and automating necessary record-keeping.
*   **Mechanism:** Trainers use the `LeaveApplicationForm.jsx` to submit requests, which are processed by the `LeaveController.js` and stored in the `Leave.model.js`. Administrators gain a consolidated view for review and decision-making through the dedicated `LeavePage.jsx` component.

### 📊 Administrative Oversight and Reporting

*   **Benefit:** Provides administrators with a single, consolidated interface to manage the entire workforce and generate vital operational reports.
*   **Mechanism:** The `AdminDashboard.jsx` grants access to tools for managing user accounts (`CreateAdminForm.jsx`, `CreateTrainerForm.jsx`), viewing detailed trainer records (`TrainerDetails.jsx`), reviewing the roster (`TrainersList.jsx`), and generating auditable time reports (`AttendanceReport.jsx`).

### ⚙️ Automated Communication Services

*   **Benefit:** Reduces manual communication tasks by automatically sending professional, event-triggered emails for critical actions like password resets, new account creation, and official leave approval notices.
*   **Mechanism:** Integrated `nodemailer` and the dedicated `EmailService.js` utilize templated communication (`EmailTemplate.model.js`) to maintain consistent and timely communication with all stakeholders.

---

## 🛠️ Tech Stack & Architecture

Trainer Sync is built using a modern, scalable JavaScript ecosystem, ensuring high performance, maintainability, and responsiveness across the entire application.

| Technology | Purpose | Key Benefit & Rationale |
| :--- | :--- | :--- |
| **Frontend: React** | User Interface (UI) Development | Chosen for its component-based architecture, allowing for reusable, manageable UI elements (`TrainerDashboard.jsx`, `LeaveApplicationForm.jsx`) and superior performance for interactive features. |
| **Backend: Express** | RESTful API Server & Application Logic | Provides a fast, minimal, and flexible framework for building the robust backend, handling routing (`attendance.routes.js`), middleware, and controller logic (`AttendanceController.js`). |
| **Database: Mongoose** | Object Data Modeling (ODM) | Simplifies interactions with MongoDB (inferred from Mongoose usage), allowing for schema definition, validation, and CRUD operations for critical models like `Attendance.model.js` and `User.model.js`. |
| **Real-Time Sync: Socket.io** | Bidirectional, Event-Based Communication | Essential for the synchronization requirements of an HR system (e.g., instant clock-in updates, notification pushes), providing low-latency communication between server and client. |
| **Caching/Messaging: Redis** | High-Performance Data Store/Broker | Used for caching session data, storing temporary notification queues, and enabling the efficient operation of Socket.io, enhancing speed and scalability. |
| **Authentication: bcryptjs & jsonwebtoken** | Secure User Credential Management | Ensures user passwords are securely hashed (`bcryptjs`) and generates stateless, secure access tokens (`jsonwebtoken`) for authorization and session management. |
| **Email Services: Nodemailer** | Programmatic Email Handling | Enables the core functionality of automated notifications (`EmailService.js`) for important transactional events (e.g., password resets, leave status changes). |
| **Validation: express-validator** | API Input Validation | Used in middleware to ensure all incoming data to the REST API is correctly formatted and meets security standards, preventing common data integrity issues. |
| **Security: Helmet** | HTTP Header Security | Implements critical security headers automatically, mitigating common web vulnerabilities like XSS, DNS prefetching attacks, and clickjacking. |

---

## 📁 Project Structure

The project maintains a clearly segregated architecture, dividing concerns between the frontend (React) and the backend (Express), enhancing modularity and development speed.

```
Trainer_Sync-755cf78/
├── 📂 backend/                                # Express.js Server and API Logic
│   ├── 📂 config/                             # Server Configuration
│   │   ├── 📄 environment.js                   # Environment setup variables
│   │   ├── 📄 constant.js                      # Backend constants
│   │   └── 📄 database.js                      # Database connection setup
│   ├── 📂 controllers/                        # Request handlers (API logic)
│   │   ├── 📄 LeaveController.js
│   │   ├── 📄 NotificationController.js
│   │   ├── 📄 AttendanceController.js          # Handles clock-in/out requests
│   │   ├── 📄 AuthController.js
│   │   └── 📄 UserController.js
│   ├── 📂 middleware/                         # Express Middleware Stack
│   │   ├── 📄 auth.middleware.js               # JWT verification
│   │   ├── 📄 errorHandler.middleware.js
│   │   ├── 📄 logger.middleware.js
│   │   ├── 📄 validator.middleware.js
│   │   └── 📄 authorize.middleware.js          # Role-based access control
│   ├── 📂 models/                             # Mongoose Schema Definitions
│   │   ├── 📄 Leave.model.js                   # Defines the leave request schema
│   │   ├── 📄 Attendance.model.js              # Defines location-based attendance records
│   │   ├── 📄 Notification.model.js
│   │   ├── 📄 EmailTemplate.model.js
│   │   └── 📄 User.model.js                    # Core user and profile information
│   ├── 📂 routes/                             # API Endpoint Definitions
│   │   ├── 📄 user.routes.js
│   │   ├── 📄 auth.routes.js
│   │   ├── 📄 admin.routes.js
│   │   ├── 📄 leave.routes.js
│   │   ├── 📄 notifications.routes.js
│   │   └── 📄 attendance.routes.js
│   ├── 📂 seeds/                              # Database seeding scripts
│   │   └── 📄 seedAdmin.js                     # Initial admin user creation
│   ├── 📂 services/                           # Business Logic Services
│   │   ├── 📄 HierarchyService.js              # Manages user roles and organizational structure
│   │   ├── 📄 NotificationService.js
│   │   ├── 📄 AuthService.js
│   │   ├── 📄 UserService.js
│   │   ├── 📄 LeaveService.js
│   │   ├── 📄 EmailService.js                  # Handles all Nodemailer operations
│   │   ├── 📄 SocketService.js                 # Socket.io configuration
│   │   └── 📄 AttendanceService.js
│   ├── 📂 utils/                              # Backend Utility Functions
│   │   ├── 📄 jwt.js
│   │   ├── 📄 dateUtils.js
│   │   ├── 📄 encryption.js
│   │   ├── 📄 validators.js
│   │   ├── 📄 errorHandler.js
│   │   └── 📄 geoLocation.js                   # Server-side geolocation processing
│   ├── 📄 app.js                              # Main Express application setup
│   ├── 📄 server.js                           # Entry point for the server
│   ├── 📄 .gitignore
│   ├── 📄 package-lock.json
│   └── 📄 package.json                        # Backend dependencies (Express, Mongoose, Socket.io, etc.)
└── 📂 frontend/                              # React Single-Page Application
    ├── 📂 public/
    │   └── 📄 vite.svg
    ├── 📂 src/                               # Frontend Source Code
    │   ├── 📂 assets/
    │   │   └── 📄 react.svg
    │   ├── 📂 components/                     # Reusable UI Components
    │   │   ├── 📂 Admin/                      # Admin-specific components
    │   │   │   ├── 📄 CreateAdminForm.jsx
    │   │   │   ├── 📄 TrainerDetails.jsx
    │   │   │   ├── 📄 LeavePage.jsx
    │   │   │   ├── 📄 TrainersList.jsx
    │   │   │   ├── 📄 AttendanceReport.jsx
    │   │   │   ├── 📄 AdminDashboard.jsx       # Main administrative view
    │   │   │   ├── 📄 CreateTrainerForm.jsx
    │   │   │   └── 📄 ClockedIn.jsx            # Attendance recording component
    │   │   ├── 📂 Leave/
    │   │   │   └── 📄 LeaveApplicationForm.jsx # Component for submitting time off
    │   │   ├── 📂 Notifications/
    │   │   │   └── 📄 NotificationBell.jsx     # Real-time alert indicator
    │   │   ├── 📂 Profile/
    │   │   │   └── 📄 ProfileView.jsx          # User profile detail
    │   │   ├── 📂 Common/
    │   │   │   ├── 📄 ProtectedRoute.jsx       # Authentication guard component
    │   │   │   └── 📄 Navbar.jsx
    │   │   ├── 📂 Dashboard/
    │   │   │   └── 📄 TrainerDashboard.jsx     # Main trainer view
    │   │   └── 📂 auth/
    │   │       ├── 📄 ChangePassword.jsx
    │   │       └── 📄 LoginForm.jsx
    │   ├── 📂 config/
    │   │   └── 📄 api.js                      # API connection configuration
    │   ├── 📂 hooks/                          # Custom React Hooks
    │   │   ├── 📄 useGeolocation.js           # Client-side location tracking
    │   │   ├── 📄 useFetch.js
    │   │   ├── 📄 useAuth.js
    │   │   └── 📄 useSocket.js                # Socket.io connection hook
    │   ├── 📂 store/                          # State management (likely using Redux/Context)
    │   │   ├── 📄 leaveStore.js
    │   │   ├── 📄 authStore.js
    │   │   ├── 📄 notificationStore.js
    │   │   └── 📄 attendanceStore.js
    │   ├── 📂 utils/
    │   │   ├── 📄 validators.js
    │   │   ├── 📄 constants.js
    │   │   └── 📄 dateFormat.js
    │   ├── 📄 main.jsx
    │   ├── 📄 App.css
    │   ├── 📄 App.jsx                         # Root application component
    │   ├── 📄 index.css
    │   └── 📄 index.html
    ├── 📄 vite.config.js
    ├── 📄 postcss.config.js
    ├── 📄 eslint.config.js
    ├── 📄 tailwind.config.js
    ├── 📄 .gitignore
    ├── 📄 package-lock.json
    └── 📄 package.json                       # Frontend dependencies (React, Vite)
```

---

## 📸 Demo & Screenshots

Explore the streamlined interfaces and dedicated dashboards that Trainer Sync provides for managing your workforce efficiently.

## 🖼️ Screenshots

<img src="https://placehold.co/800x450/2d2d4d/ffffff?text=App+Screenshot+1" alt="App Screenshot 1" width="100%">
<em><p align="center">The central Trainer Dashboard (TrainerDashboard.jsx) showing key metrics and real-time status updates from the useSocket hook.</p></em>
<img src="https://placehold.co/800x450/2d2d4d/ffffff?text=App+Screenshot+2" alt="App Screenshot 2" width="100%">
<em><p align="center">The administrative interface (AdminDashboard.jsx) offering an overview of pending leave applications and current attendance reports.</p></em>

---

## 🚀 Getting Started

To get Trainer Sync running locally, you will need a modern development environment set up to handle both the React frontend and the Express/Node.js backend.

### Prerequisites

Please ensure you have the following installed on your system:

*   **Node.js (LTS):** Required to run both the frontend and backend Node applications.
*   **npm:** Used for managing project dependencies (comes bundled with Node.js).
*   **MongoDB:** While not explicitly listed in dependencies, Mongoose is used extensively, implying a MongoDB requirement for data persistence.
*   **Redis:** Required for real-time services and session management (`socket.io` and `redis` dependency).

### Installation Steps

The project requires separate dependency installations and launch processes for the client and server.

1.  **Clone the Repository**

    ```bash
    git clone [repository-url]
    cd Eordinary01-Trainer_Sync-755cf78
    ```

2.  **Backend Setup (Express/Node.js)**

    Navigate into the backend directory and install all required dependencies:

    ```bash
    cd backend
    npm install
    ```

    *Note: You will need to configure your environment variables (database connection, JWT secret, etc.) in the backend configuration before launching.*

3.  **Frontend Setup (React)**

    Return to the project root and navigate into the frontend directory to install client dependencies:

    ```bash
    cd ../frontend
    npm install
    ```

4.  **Running the Application**

    Since no specific start scripts were verified, you will need to manually start the backend and frontend servers.

    *   **Start the Backend Server:**
        In the `backend` directory, launch the server (typically via `nodemon` or `node server.js`):
        ```bash
        # Assuming you have nodemon installed globally or configured in package.json
        # Check backend/package.json for the specific script used, or run:
        nodemon server.js
        ```

    *   **Start the Frontend Application:**
        In the `frontend` directory, start the React development server (typically via `vite` or `npm run dev`):
        ```bash
        # Check frontend/package.json for the specific script used, or run:
        npm run dev
        ```

The application should now be accessible in your web browser, typically at `http://localhost:5173` (default Vite port), while the API services are running on a separate port (e.g., `http://localhost:3000`).

---

## 🔧 Usage

Trainer Sync is a **web_app** designed for interactive use by two primary user types: Trainers and Administrators.

### Trainer Workflow

1.  **Login:** Access the system via `LoginForm.jsx`.
2.  **Clocking In:** Use the `ClockedIn.jsx` component. The system utilizes `useGeolocation.js` to capture and verify your current location against predefined criteria before recording attendance via the `AttendanceController`.
3.  **Dashboard:** The `TrainerDashboard.jsx` provides a personalized view of clocked hours, profile details (`ProfileView.jsx`), and current notifications (`NotificationBell.jsx`).
4.  **Leave Requests:** Submit time-off requests seamlessly using the `LeaveApplicationForm.jsx`. The status updates are delivered in real-time.

### Administrator Workflow

1.  **Access:** Log in and navigate to the `AdminDashboard.jsx`.
2.  **User Management:** Utilize components like `CreateTrainerForm.jsx` and `CreateAdminForm.jsx` to onboard new users. View and modify existing user details via `TrainersList.jsx` and `TrainerDetails.jsx`.
3.  **Attendance Oversight:** Generate detailed audit trails and historical data through `AttendanceReport.jsx`.
4.  **Leave Approvals:** Review and manage all pending and approved leave requests on the `LeavePage.jsx`, triggering automated email notifications upon action.

### API Health Check

For development and operations monitoring, the backend exposes a single, verified health endpoint to confirm server availability and responsiveness.

**Endpoint:** `GET /api/health`

| Method | Route | Description | Expected Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Confirms the Express server is running and accessible. | HTTP 200 OK, usually returning `{ status: 'ok', uptime: '...' }` |

This endpoint is crucial for load balancers or monitoring tools to perform periodic checks and ensure the service is live.

---

## 🤝 Contributing

We welcome contributions to improve Trainer Sync! Your input helps make this project better for everyone, ensuring our workforce management tools remain modern, secure, and highly efficient.

### How to Contribute

1. **Fork the repository** - Click the 'Fork' button at the top right of this page
2. **Create a feature branch** 
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes** - Improve code, documentation, or features. Focus on specific areas like improving the `useGeolocation` accuracy or extending the `AttendanceReport` capabilities.
4. **Test thoroughly** - Ensure all functionality works as expected. Verify that authentication flows (`auth.routes.js`) and data persistence (`models/`) remain stable.
   ```bash
   # While no specific script was verified, ensure manual testing is comprehensive
   npm run test 
   ```
5. **Commit your changes** - Write clear, descriptive commit messages, referencing the components or services you modified.
   ```bash
   git commit -m 'Feat(Attendance): Add timezone validation to ClockedIn component'
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request** - Submit your changes to the main branch for review by maintainers.

### Development Guidelines

- ✅ Follow the existing code style and conventions (e.g., component structure in `frontend/src/components/`).
- 📝 Add comments for complex logic, particularly within core services (`services/`) and middleware (`middleware/`).
- 🧪 Write tests for new features and bug fixes (utilizing Jest, as indicated by `jest` in `devDependencies`).
- 📚 Update documentation for any changed functionality (e.g., new usage of a hook like `useSocket.js`).
- 🔄 Ensure backward compatibility when modifying API routes or model schemas.
- 🎯 Keep commits focused and atomic.

### Ideas for Contributions

We're looking for help with improving the following areas:

- 🐛 **Bug Fixes:** Address issues related to state management (`store/`) or race conditions in real-time updates.
- ✨ **New Features:** Implement requested extensions to the administrative reporting features (`Admin/AttendanceReport.jsx`).
- 📖 **Documentation:** Improve the clarity of service interactions and architecture guides.
- 🎨 **UI/UX:** Enhance the visual design and flow of critical user journeys (e.g., `LeaveApplicationForm`).
- ⚡ **Performance:** Optimize database queries or improve client-side rendering performance for the dashboards.

### Code Review Process

- All submissions require review by at least one core maintainer before merging.
- Maintainers will provide constructive feedback focused on security, stability, and adherence to the project's architectural patterns.
- Once approved, your PR will be merged, and you'll be credited for your contribution.

### Questions?

Feel free to open an issue for any questions or concerns regarding the codebase, contribution process, or feature requests.

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for complete details.

### What this means:

- ✅ **Commercial use:** You can use this project commercially.
- ✅ **Modification:** You can modify the code to fit your organizational needs.
- ✅ **Distribution:** You can distribute this software and its derivatives.
- ✅ **Private use:** You can use this project privately for internal systems.
- ⚠️ **Liability:** The software is provided "as is," without warranty of any kind.
- ⚠️ **Trademark:** This license does not grant rights to use the project name or trademarks.

---

<p align="center">Made with ❤️ by Eordinary</p>
<p align="center">
  <a href="#-overview">⬆️ Back to Top</a>
</p>
