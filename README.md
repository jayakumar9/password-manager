# Password Manager Application

A secure password manager application built with the MERN stack (MongoDB, Express.js, React, Node.js).

## Features

- User authentication with JWT
- Secure password storage
- Password generation
- File attachments
- Website logo fetching
- Responsive design
- Dark mode interface

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd password-manager
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Set up environment variables:

Create a `.env` file in the backend directory with the following variables:
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

4. Start the application:

```bash
# Start backend server (from backend directory)
npm run dev

# Start frontend development server (from frontend directory)
npm start
```

## Usage

1. Register a new account or login with existing credentials
2. Add accounts with website, username, and password
3. Upload attachments (optional)
4. Generate secure passwords
5. View and manage saved accounts

## Security Features

- Passwords are securely stored
- JWT authentication
- Protected API routes
- File upload validation
- Rate limiting
- CORS protection

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 