# Real Estate AI Platform Backend

A FastAPI-based backend for the Real Estate AI Platform, providing AI-powered lead generation, qualification, and market analysis capabilities.

## Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control
  - Password reset functionality
  - User management

- **Lead Management**
  - Lead creation and tracking
  - Lead qualification using AI
  - Lead interaction history
  - Lead assignment and workflow

- **Market Analysis**
  - Real-time market data analysis
  - Price trends and forecasting
  - Market health indicators
  - Custom market reports
  - Market alerts and notifications

## Tech Stack

- **Framework**: FastAPI
- **Database**: MongoDB
- **Authentication**: JWT
- **Caching**: Redis
- **AI Integration**: OpenAI/Azure OpenAI
- **Testing**: pytest

## Project Structure

```
src/backend/
├── api/
│   └── v1/
│       ├── api.py
│       └── endpoints/
│           ├── auth.py
│           ├── leads.py
│           └── market.py
├── core/
│   ├── config.py
│   └── deps.py
├── db/
│   └── mongodb.py
├── models/
│   ├── base.py
│   ├── lead.py
│   ├── market.py
│   └── user.py
├── services/
│   ├── lead_service.py
│   ├── market_service.py
│   └── user_service.py
└── utils/
    └── ai_utils.py
```

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file with the following variables:
   ```
   MONGODB_URL=mongodb://localhost:27017
   MONGODB_DB_NAME=real_estate_ai
   SECRET_KEY=your-secret-key-here
   OPENAI_API_KEY=your-openai-api-key
   REDIS_URL=redis://localhost:6379
   ```

4. Start the development server:
   ```bash
   uvicorn main:app --reload
   ```

## API Documentation

Once the server is running, you can access:
- Swagger UI: http://localhost:8000/api/docs
- ReDoc: http://localhost:8000/api/redoc
- OpenAPI JSON: http://localhost:8000/api/openapi.json

## Testing

Run the test suite:
```bash
pytest
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/token` - Login
- `POST /api/v1/auth/register` - Register
- `POST /api/v1/auth/password-reset` - Request password reset
- `POST /api/v1/auth/password-reset/{token}` - Reset password
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/me` - Update current user
- `POST /api/v1/auth/me/change-password` - Change password

### Lead Management
- `POST /api/v1/leads/` - Create lead
- `GET /api/v1/leads/{lead_id}` - Get lead
- `PUT /api/v1/leads/{lead_id}` - Update lead
- `DELETE /api/v1/leads/{lead_id}` - Delete lead
- `GET /api/v1/leads/` - List leads
- `POST /api/v1/leads/{lead_id}/interactions` - Add interaction
- `POST /api/v1/leads/{lead_id}/qualify` - Qualify lead
- `POST /api/v1/leads/{lead_id}/assign` - Assign lead

### Market Analysis
- `POST /api/v1/market/analyze` - Analyze market
- `GET /api/v1/market/trends/{location}` - Get market trends
- `GET /api/v1/market/forecast/{location}` - Get market forecast
- `GET /api/v1/market/alerts` - Get market alerts
- `POST /api/v1/market/alerts` - Create market alert
- `GET /api/v1/market/reports` - Get market reports
- `POST /api/v1/market/reports` - Create market report
- `POST /api/v1/market/compare` - Compare markets

## Performance Optimization

- **Caching**: Redis caching for frequently accessed data
- **Database Indexing**: Optimized MongoDB indexes
- **Async Operations**: Non-blocking I/O operations
- **Rate Limiting**: API rate limiting to prevent abuse
- **Connection Pooling**: Efficient database connections

## Security

- **Authentication**: JWT-based authentication
- **Authorization**: Role-based access control
- **Input Validation**: Pydantic models for request validation
- **Password Hashing**: bcrypt for password storage
- **CORS**: Configurable CORS middleware
- **Rate Limiting**: API rate limiting
- **Input Sanitization**: Request data sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 