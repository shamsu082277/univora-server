# Univora Server — Backend API

**Powering Community Connections. Securing Social Impact.**

Univora Server is the backend API for the Univora Social Development Events Platform. It provides RESTful APIs for event management, user participation, authentication, and secure data operations.

Built with Node.js, Express.js, and MongoDB, the backend handles application data, validates authenticated requests, and ensures users can manage only their own events.

## Features

- **RESTful API:** Organized API endpoints for events, users, and community participation.
- **MongoDB Integration:** Persistent storage for events and user participation data.
- **Authentication:** Better Auth integration with MongoDB Adapter.
- **JWT Verification:** Token-based authentication for protected API endpoints.
- **Event Creation:** Authenticated users can create social development events.
- **Event Management:** Retrieve, update, and delete events with ownership verification.
- **Event Participation:** Allow authenticated users to join community events.
- **Joined Events:** Retrieve participation records for individual users.
- **Upcoming Events:** Fetch upcoming events with date filtering, sorting, and pagination or result limits where supported.
- **Data Validation:** Validate incoming requests before database operations.
- **CORS Configuration:** Controlled communication between the frontend and backend.
- **Error Handling:** Consistent API responses for successful operations and errors.

## Technology Stack

| Technology | Purpose |
|---|---|
| Node.js | JavaScript runtime |
| Express.js | Backend framework |
| MongoDB | NoSQL database |
| Better Auth | Authentication management |
| MongoDB Adapter | Authentication data persistence |
| JWT | API authentication and authorization |
| CORS | Cross-origin request handling |
| dotenv | Environment configuration |

## Repository

**GitHub:** https://github.com/shamsu082277/univora-server

**Frontend:** https://github.com/shamsu082277/univora

**Live Application:** https://univora-pi.vercel.app/

## Getting Started

Follow these instructions to run the backend locally.

### Prerequisites

- Node.js (LTS)
- npm
- MongoDB database
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/shamsu082277/univora-server.git

cd univora-server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory.

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

BETTER_AUTH_SECRET=your_secure_random_secret

CLIENT_URL=http://localhost:3000
```

Configure any additional environment variables required by your Better Auth, OAuth, and deployment setup.

**Important:** Never commit `.env` files, database credentials, OAuth secrets, or authentication secrets to GitHub.

### 4. Run the Development Server

```bash
npm run dev
```

The backend will start on the configured port.

Example:

```text
http://localhost:5000
```

## API Overview

The backend provides endpoints for the following operations. Refer to the actual route definitions in the repository for exact paths and HTTP methods.

| Module | Functionality |
|---|---|
| Events | Retrieve upcoming events |
| Events | Retrieve event details |
| Events | Create new events |
| Events | Update existing events |
| Events | Delete events |
| Participation | Join an event |
| Participation | Retrieve joined events |
| Authentication | Verify authenticated requests |

### Event Management

The event management API supports:

- Creating community events.
- Retrieving event listings.
- Fetching individual event details.
- Updating event information.
- Deleting events.
- Filtering events by date.

### Event Participation

Authenticated users can:

- Join available community events.
- Store participation information.
- Retrieve their joined events.
- Avoid duplicate participation where implemented.

## Authentication & Security

Univora uses Better Auth for authentication and JWT-based authorization for protected backend operations.

Security considerations include:

- Authentication verification for protected endpoints.
- JWT validation before authorized operations.
- User-specific access to private data.
- Ownership verification for event updates and deletion.
- CORS configuration for frontend-backend communication.
- Secure environment variable management.

## Database

The application uses MongoDB to store application data.

The database supports collections for:

- Users and authentication records.
- Community events.
- Event participation records.

The exact collection structure is determined by the backend implementation and Better Auth adapter configuration.

## Deployment

The backend is deployed on Vercel.

**Production API:** https://univora-server.vercel.app/

The frontend communicates with the backend through configured API endpoints.

Ensure that production environment variables, database connectivity, authentication configuration, and allowed frontend origins are correctly configured.

## Project Structure

The project follows an organized backend architecture. The exact directory names may vary depending on the implementation.

```text
univora-server/
├── src/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── index.js
├── .env
├── .gitignore
├── package.json
└── README.md
```

## Future Improvements

- API documentation with Swagger.
- Advanced event search and filtering.
- Improved request validation.
- Rate limiting and additional security controls.
- Event analytics and participation statistics.

---

## About Univora

Univora is a community-driven social development platform that encourages people to participate in meaningful activities, volunteer programs, and community initiatives.

The backend provides the foundation for secure event management and reliable communication between the frontend and database.

**Univora — Together, We Make a Difference.**