# Feature Addition Guidelines

## Core Principles
1. Never modify existing code
2. Add new features in separate directories
3. Use dependency injection
4. Maintain backward compatibility
5. Follow existing patterns

## Directory Structure for New Features
```plaintext
src/
├── existing/           # Current code (DO NOT MODIFY)
└── new_features/      # New features directory
    ├── market_analysis/
    │   ├── __init__.py
    │   ├── models.py
    │   ├── routes.py
    │   └── services.py
    ├── analytics/
    │   ├── __init__.py
    │   ├── models.py
    │   ├── routes.py
    │   └── services.py
    └── alerts/
        ├── __init__.py
        ├── models.py
        ├── routes.py
        └── services.py
```

## Integration Steps
1. Create new feature directory
2. Implement feature in isolation
3. Create integration layer
4. Add feature to main application
5. Test integration

## Example: Adding Market Analysis Feature
```python
# 1. Create new feature directory
src/new_features/market_analysis/
    ├── __init__.py
    ├── models.py
    ├── routes.py
    └── services.py

# 2. Implement feature in isolation
# models.py
from pydantic import BaseModel

class MarketAnalysis(BaseModel):
    location: str
    property_type: str
    price_trend: dict
    market_indicators: dict

# 3. Create integration layer
# integration.py
from src.existing.market import MarketService
from src.new_features.market_analysis import MarketAnalysis

class MarketAnalysisIntegration:
    def __init__(self, existing_market_service: MarketService):
        self.market_service = existing_market_service

    async def analyze_market(self, location: str) -> MarketAnalysis:
        # Use existing service without modification
        market_data = await self.market_service.get_market_data(location)
        return MarketAnalysis(**market_data)

# 4. Add to main application
# main.py
from src.new_features.market_analysis.integration import MarketAnalysisIntegration

app = FastAPI()
market_service = MarketService()  # Existing service
market_analysis = MarketAnalysisIntegration(market_service)

@app.post("/api/v1/market/analyze")
async def analyze_market(location: str):
    return await market_analysis.analyze_market(location)
```

## Testing Guidelines
1. Create separate test directory for new features
2. Test new features in isolation
3. Test integration with existing code
4. Maintain existing test coverage

```plaintext
tests/
├── existing/          # Current tests (DO NOT MODIFY)
└── new_features/     # New feature tests
    ├── market_analysis/
    │   ├── test_models.py
    │   ├── test_routes.py
    │   └── test_integration.py
    └── conftest.py
```

## Database Changes
1. Create new migrations
2. Never modify existing tables
3. Use foreign keys to existing tables
4. Add new indexes separately

```sql
-- Example: Adding new market analysis table
CREATE TABLE new_market_analysis (
    id UUID PRIMARY KEY,
    market_data_id UUID REFERENCES existing_market_data(id),
    analysis_data JSONB,
    created_at TIMESTAMP
);
```

## Frontend Integration
1. Create new feature components
2. Use existing component patterns
3. Add new routes without modifying existing ones
4. Maintain existing styling

```typescript
// Example: Adding new market analysis component
frontend/src/new_features/market/
    ├── components/
    │   ├── MarketTrends.tsx
    │   └── PriceForecast.tsx
    ├── hooks/
    │   └── useMarketAnalysis.ts
    └── types/
        └── market.ts
```

## API Versioning
1. Use new version for new features
2. Maintain existing endpoints
3. Document version differences
4. Support backward compatibility

```python
# Example: Versioned API routes
@app.post("/api/v2/market/analyze")  # New version
async def analyze_market_v2(location: str):
    return await market_analysis.analyze_market(location)

# Existing endpoint remains unchanged
@app.post("/api/v1/market/analyze")
async def analyze_market(location: str):
    return await existing_market_service.analyze(location)
```

## Documentation
1. Create separate documentation for new features
2. Document integration points
3. Update API documentation
4. Add migration guides

```markdown
docs/
├── existing/          # Current documentation (DO NOT MODIFY)
└── new_features/     # New feature documentation
    ├── market_analysis/
    │   ├── overview.md
    │   ├── api.md
    │   └── integration.md
    └── README.md
```

## Deployment Checklist
1. [ ] Create new feature branch
2. [ ] Implement feature in isolation
3. [ ] Create integration layer
4. [ ] Add tests for new feature
5. [ ] Update documentation
6. [ ] Create database migrations
7. [ ] Test integration
8. [ ] Deploy to staging
9. [ ] Verify existing functionality
10. [ ] Deploy to production 