# Market Analysis Feature

This feature provides comprehensive market analysis capabilities for real estate professionals, including price trends, market indicators, and forecasting.

## Components

### Frontend Components

1. **MarketVisualization**
   - Advanced data visualization with multiple chart types
   - Interactive data exploration
   - Export capabilities
   - Fullscreen mode

2. **MarketMetrics**
   - Key performance indicators
   - Market health indicators
   - Price trends and forecasts

3. **MarketAlerts**
   - Customizable market alerts
   - Real-time notifications
   - Alert management

4. **MarketReport**
   - Comprehensive market reports
   - Customizable report sections
   - Export to various formats

5. **MarketShare**
   - Share market analysis
   - Collaborative features
   - Access control

### API Integration

1. **MarketAnalysisAPI**
   - Centralized API client
   - Type-safe API calls
   - Error handling
   - Authentication management

2. **useMarketAnalysis Hook**
   - React Query integration
   - State management
   - Data caching
   - Real-time updates

### Utilities

1. **marketAnalysisUtils**
   - Data formatting
   - Market calculations
   - Trend analysis
   - Performance metrics

## Usage

### Setting Up the Feature

1. Install dependencies:
   ```bash
   npm install @tanstack/react-query axios recharts @mui/material @mui/icons-material
   ```

2. Configure the API client:
   ```typescript
   const apiConfig = {
     baseURL: 'https://api.example.com',
     timeout: 5000,
     headers: {
       'Content-Type': 'application/json',
     },
   };
   ```

3. Wrap your application with the MarketAnalysisProvider:
   ```typescript
   import { MarketAnalysisProvider } from './context/MarketAnalysisContext';

   function App() {
     return (
       <MarketAnalysisProvider apiConfig={apiConfig}>
         <YourApp />
       </MarketAnalysisProvider>
     );
   }
   ```

### Using Components

1. **Market Visualization**:
   ```typescript
   import { MarketVisualization } from './components/MarketVisualization';

   function MarketDashboard() {
     const { data, isLoading } = useMarketAnalysisContext();
     
     if (isLoading) return <LoadingSpinner />;
     
     return (
       <MarketVisualization
         analysis={data}
         onExport={(format) => handleExport(format)}
       />
     );
   }
   ```

2. **Market Metrics**:
   ```typescript
   import { MarketMetrics } from './components/MarketMetrics';

   function MetricsDashboard() {
     const { data } = useMarketAnalysisContext();
     
     return <MarketMetrics analysis={data} />;
   }
   ```

3. **Market Alerts**:
   ```typescript
   import { MarketAlerts } from './components/MarketAlerts';

   function AlertsDashboard() {
     const { handleCreateAlert } = useMarketAnalysisContext();
     
     return (
       <MarketAlerts
         onCreateAlert={handleCreateAlert}
       />
     );
   }
   ```

### Using the API Client

```typescript
import MarketAnalysisAPI from './api/MarketAnalysisAPI';

const api = MarketAnalysisAPI.getInstance(apiConfig);

// Get market analysis
const analysis = await api.getMarketAnalysis({
  location: 'San Francisco',
  propertyType: 'Single Family',
  timeframe: '6m',
  includeForecast: true,
});

// Create market alert
const alert = await api.createAlert({
  type: 'price_change',
  condition: 'above',
  value: 1000000,
  location: 'San Francisco',
  propertyType: 'Single Family',
  isActive: true,
});
```

### Using Utilities

```typescript
import { marketAnalysisUtils } from './utils/marketAnalysisUtils';

// Format currency
const formattedPrice = marketAnalysisUtils.formatCurrency(1000000);

// Calculate market efficiency
const efficiency = marketAnalysisUtils.calculateMarketEfficiency(analysis);

// Generate market summary
const summary = marketAnalysisUtils.generateMarketSummary(analysis);
```

## Testing

Run the test suite:
```bash
npm test
```

The test suite includes:
- Unit tests for utilities
- Component tests
- Integration tests
- API client tests

## Performance Considerations

1. **Data Caching**
   - React Query handles caching automatically
   - Configurable stale time and cache time
   - Background updates

2. **Optimization**
   - Memoized calculations
   - Lazy loading of components
   - Efficient data structures

3. **Error Handling**
   - Graceful degradation
   - Retry mechanisms
   - Error boundaries

## Security

1. **Authentication**
   - Token-based authentication
   - Secure token storage
   - Automatic token refresh

2. **Data Protection**
   - Input validation
   - Output sanitization
   - Rate limiting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This feature is part of the Real Estate AI System and is licensed under the MIT License. 