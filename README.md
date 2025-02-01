# Stock Bot - Server (Node.js)

## Overview
The Stock Bot Server is a backend application built with Node.js and Express.js. It is responsible for handling authentication, managing database connections, and securing user data. The server integrates with a PostgreSQL database hosted on Supabase and leverages TypeORM for efficient data management.

## Features
- **User Authentication**:
  - JWT token-based authentication
  - Secure password storage using bcrypt hashing
  - Cookie-based session management
- **Database Integration**:
  - PostgreSQL hosted on Supabase
  - ORM using TypeORM
- **Security & Middleware**:
  - CORS enabled for secure cross-origin requests
  - Secure user authentication with JWT and cookies

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (Supabase)
- **ORM**: TypeORM
- **Authentication**: JWT, bcrypt, cookies
- **Security**: CORS

## Related Projects
- **Frontend**: [Stock Bot Client (React.js)](https://github.com/Hassam-01/stock_bot_app)
- **Prediction Model**: [Stock Bot Prediction Server (Python)](https://github.com/Hassam-01/Stock_bot)

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Hassam-01/stock_bot_web_server.git
   ```
2. Navigate to the project folder:
   ```bash
   cd stock_bot_web_server
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables in a `.env` file:
   ```env
   DATABASE_URL=your_supabase_database_url
   API_KEY=your_api_key
   ```
5. Start the server:
   ```bash
   npm run dev
   ```

## Usage
- The server runs on `http://localhost:5000` by default.
- Use API endpoints for authentication, user management, and stock trading interactions.
- Ensure that your frontend communicates with the backend via proper CORS policies.

---
### Connect
For any questions or collaborations, feel free to reach out!

