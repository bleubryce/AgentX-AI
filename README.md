# Real Estate Lead Generation AI Agents

An intelligent system of AI agents designed to generate and qualify leads for real estate buying, selling, and refinancing opportunities.

## Project Overview

This project implements a multi-agent system that:

1. **Finds potential leads** through web scraping, API integrations, and data analysis
2. **Qualifies leads** based on customizable criteria
3. **Engages with leads** through automated communication
4. **Manages lead data** in a structured database
5. **Provides insights** on lead quality and conversion potential

## Components

- **API Server**: RESTful interface for agent management and data access
- **Agent Manager**: Coordinates the activities of specialized AI agents
- **Specialized Agents**:
  - Buyer Lead Agent
  - Seller Lead Agent
  - Refinance Lead Agent
- **Database**: MongoDB storage for lead and property data
- **CLI Tool**: Command-line interface for system management
- **API Integrations**:
  - RentCast API for property data and market insights
  - Additional real estate data APIs

## Setup Instructions

### Prerequisites

- Python 3.9+
- MongoDB
- API keys for OpenAI, RentCast, and other services as needed

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/real-estate-lead-generation.git
   cd real-estate-lead-generation
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Edit the `.env` file with your API keys and configuration.

4. Initialize the database:
   ```
   python src/data/init_db.py
   ```

## Usage

### Running the API Server

```
./run_api.py
```

The API server will be available at http://localhost:8000

### Running the Agent Manager

```
./run_agents.py
```

### Using the CLI Tool

```
python src/cli/main.py --help
```

### Managing API Cache

To efficiently use the limited free tier of the RentCast API (50 requests/month), the system includes a caching mechanism:

```
python src/cli/cache_manager.py stats  # Show cache statistics
python src/cli/cache_manager.py clear  # Clear the cache
python src/cli/cache_manager.py list   # List cache files
```

### RentCast API Demo

A demo script is provided to showcase the RentCast API functionality with caching:

```
./demo_rentcast.py --zip-code 90210 --demo search
```

Available demos:
- `search`: Search for properties
- `details`: Get property details
- `market`: Get market statistics
- `comps`: Find comparable properties
- `rentals`: Find rental listings
- `sales`: Find sale listings
- `valuation`: Get property valuations
- `all`: Run all demos

## Project Structure

```
├── run_api.py                # Script to run the API server
├── run_agents.py             # Script to run the agent manager
├── demo_rentcast.py          # Demo script for RentCast API
├── requirements.txt          # Python dependencies
├── .env.example              # Example environment variables
├── src/
│   ├── agents/               # AI agent implementations
│   │   ├── __init__.py
│   │   ├── agent_manager.py
│   │   ├── buyer_agent.py
│   │   ├── seller_agent.py
│   │   └── refinance_agent.py
│   ├── api/                  # API server implementation
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── routes/
│   │   └── models/
│   ├── data/                 # Data management
│   │   ├── __init__.py
│   │   ├── init_db.py
│   │   ├── models.py
│   │   └── repositories/
│   ├── cli/                  # Command-line interface
│   │   ├── __init__.py
│   │   ├── main.py
│   │   └── cache_manager.py
│   └── utils/                # Utility functions
│       ├── __init__.py
│       ├── helpers.py
│       ├── api_cache.py
│       └── rentcast_api.py
```

## API Integrations

### RentCast API

The system integrates with the [RentCast API](https://developers.rentcast.io/reference/introduction) to access:

- 140+ million property records
- Owner details
- Home value and rent estimates
- Comparable properties
- Active sale and rental listings
- Aggregate real estate market data

The free tier provides 50 API requests per month, which is managed efficiently through the caching system.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 