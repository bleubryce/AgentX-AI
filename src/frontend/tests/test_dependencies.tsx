import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import axios from 'axios';
import { 
  Button, 
  Typography, 
  Box, 
  Container, 
  CircularProgress 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

// Test component using all dependencies
const TestComponent: React.FC = () => {
  const [date, setDate] = React.useState<Date | null>(new Date());
  const data = [
    { name: 'Jan', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 600 },
    { name: 'Apr', value: 800 },
    { name: 'May', value: 500 }
  ];

  return (
    <Container>
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dependency Test
        </Typography>
        
        <Button variant="contained" color="primary">
          Test Button
        </Button>
        
        <Box sx={{ my: 2 }}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Test Date Picker"
              value={date}
              onChange={(newDate) => setDate(newDate)}
            />
          </LocalizationProvider>
        </Box>
        
        <Box sx={{ height: 300, my: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        
        <CircularProgress />
      </Box>
    </Container>
  );
};

// Test React Query
const queryClient = new QueryClient();
const TestQueryComponent: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TestComponent />
    </QueryClientProvider>
  );
};

// Test Axios
const testAxios = () => {
  // Just create an instance to verify it's working
  const api = axios.create({
    baseURL: 'https://api.example.com',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return api !== undefined;
};

// Run tests
describe('Frontend Dependencies', () => {
  test('React and Material UI components render correctly', () => {
    render(<TestComponent />);
    expect(screen.getByText('Dependency Test')).toBeInTheDocument();
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });
  
  test('React Query is working', () => {
    expect(queryClient).toBeInstanceOf(QueryClient);
  });
  
  test('Axios is working', () => {
    expect(testAxios()).toBe(true);
  });
}); 