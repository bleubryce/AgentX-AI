# Component Documentation

## Core Components

### LeadForm
The `LeadForm` component handles the creation and editing of leads.

**Props:**
- `initialData?: Lead` - Optional initial lead data for editing
- `onSubmit: (data: Lead) => Promise<void>` - Callback for form submission
- `onCancel: () => void` - Callback for canceling the form

**Features:**
- Form validation using Yup schema
- Real-time field validation
- Error handling and display
- Responsive design

### LeadList
Displays a paginated list of leads with filtering and sorting capabilities.

**Props:**
- `onLeadSelect: (lead: Lead) => void` - Callback when a lead is selected
- `onLeadStatusChange: (id: string, status: LeadStatus) => Promise<void>` - Callback for status updates
- `filters?: LeadFilters` - Optional filtering criteria

**Features:**
- Sortable columns
- Status filtering
- Search functionality
- Pagination
- Bulk actions

### Analytics Components

#### LeadConversionReport
Displays lead conversion metrics and trends.

**Props:**
- `dateRange: DateRange` - Time period for the report
- `filters?: AnalyticsFilters` - Optional filtering criteria

**Features:**
- Conversion rate visualization
- Source performance charts
- Trend analysis
- Export functionality

#### SourcePerformanceChart
Visualizes lead source performance metrics.

**Props:**
- `data: SourceMetrics[]` - Source performance data
- `metric: 'conversion' | 'volume' | 'quality'` - Metric to display

**Features:**
- Interactive charts
- Comparative analysis
- Tooltip information
- Custom color schemes

### Common Components

#### ErrorBoundary
Catches and handles React component errors gracefully.

**Props:**
- `children: ReactNode` - Components to wrap
- `fallback?: ReactNode` - Optional custom error UI

**Features:**
- Error capture and display
- Recovery options
- Development mode stack traces
- Error logging

#### LoadingState
Displays loading indicators for async operations.

**Props:**
- `isLoading: boolean` - Loading state
- `children: ReactNode` - Content to show when loaded
- `variant?: 'spinner' | 'skeleton'` - Loading indicator type

**Features:**
- Multiple loading indicator types
- Customizable appearance
- Smooth transitions

## Usage Examples

### LeadForm
```tsx
<LeadForm
  onSubmit={async (data) => {
    await createLead(data);
    showNotification('Lead created successfully');
  }}
  onCancel={() => navigate(-1)}
/>
```

### LeadList with Filtering
```tsx
<LeadList
  filters={{
    status: ['NEW', 'CONTACTED'],
    source: 'WEBSITE'
  }}
  onLeadSelect={(lead) => {
    setSelectedLead(lead);
    openDrawer();
  }}
/>
```

### Analytics Dashboard
```tsx
<Grid container spacing={3}>
  <Grid item xs={12} md={8}>
    <LeadConversionReport
      dateRange={{
        start: startDate,
        end: endDate
      }}
    />
  </Grid>
  <Grid item xs={12} md={4}>
    <SourcePerformanceChart
      data={sourceMetrics}
      metric="conversion"
    />
  </Grid>
</Grid>
```

## Best Practices

1. **Error Handling**
   - Wrap components with ErrorBoundary where appropriate
   - Provide meaningful error messages
   - Include recovery options

2. **Loading States**
   - Show loading indicators for async operations
   - Use skeleton loaders for content-heavy components
   - Maintain layout stability during loading

3. **Performance**
   - Implement pagination for large datasets
   - Use memo and callbacks for optimization
   - Lazy load components when possible

4. **Accessibility**
   - Include ARIA labels
   - Ensure keyboard navigation
   - Maintain proper heading hierarchy

5. **Testing**
   - Write unit tests for component logic
   - Include integration tests for complex flows
   - Test error and loading states 