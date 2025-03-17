# Password Manager Application

A secure password manager application built with the MERN stack (MongoDB, Express.js, React, Node.js) that allows users to securely store and manage their account credentials with file attachments and automatic logo fetching.

## Features

- 🔐 Secure user authentication with JWT
- 🔑 Password storage with encryption
- ⚡ Automatic password generation
- 📎 File attachments support
- 🌐 Automatic website logo fetching
- 🎨 Dark mode interface
- 📱 Responsive design for all devices
- 🛡️ Protected API routes with rate limiting

## Tech Stack

- **Frontend**: React.js, TailwindCSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Local filesystem with secure access

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB Atlas account
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/jayakumar9/password-manager.git
cd password-manager
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Configure environment variables:

Create a `.env` file in the backend directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secure_jwt_secret_key
```

5. Create required directories:
```bash
mkdir backend/uploads
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. In a new terminal, start the frontend:
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user

### Accounts
- GET `/api/accounts` - Get all accounts
- POST `/api/accounts` - Create new account
- PUT `/api/accounts/:id` - Update account
- DELETE `/api/accounts/:id` - Delete account
- GET `/api/accounts/generate-password` - Generate secure password

## Security Measures

- Password hashing using bcrypt
- JWT for secure authentication
- File upload validation
- CORS protection
- Rate limiting on API endpoints
- Secure password generation
- Protected file access

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add YourFeature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a Pull Request

## Troubleshooting

If you encounter any issues:

1. Ensure MongoDB is running and accessible
2. Check all environment variables are set correctly
3. Verify all dependencies are installed
4. Clear browser cache and local storage
5. Check console for error messages

## License

This project is licensed under the MIT License. 