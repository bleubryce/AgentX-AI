# Lead Generation and Management System

A comprehensive system for managing leads, tracking conversions, and optimizing sales processes.

## Features

- Lead tracking and management
- Lead qualification and scoring
- Contact management
- Activity tracking
- Reporting and analytics
- User authentication and authorization
- Role-based access control

## Tech Stack

- **Frontend**: React, TypeScript, Material-UI, Recharts
- **Backend**: Node.js, Express, MongoDB
- **Authentication**: JWT

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/lead-generation-system.git
   cd lead-generation-system
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   VITE_API_URL=http://localhost:8000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Project Structure

```
src/
├── backend/           # Backend code
│   ├── api/           # API endpoints
│   ├── db/            # Database models and connections
│   ├── services/      # Business logic
│   └── utils/         # Utility functions
├── frontend/          # Frontend code
│   ├── components/    # React components
│   ├── hooks/         # Custom React hooks
│   ├── services/      # API services
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
└── main.tsx           # Entry point
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 