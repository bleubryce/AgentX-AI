const express = require('express');
const { MonitoringService } = require('../monitoring/monitoring-service');
const config = require('../config/monitoring.config');

// Create Express app
const app = express();

// Initialize monitoring service
const monitoringService = new MonitoringService(config.monitoring);

// Start monitoring service
monitoringService.start().catch(error => {
    console.error('Failed to start monitoring service:', error);
    process.exit(1);
});

// Add monitoring middleware to all routes
app.use(monitoringService.middleware());

// Example of monitoring events handling
monitoringService.on('warning', (warning) => {
    console.warn(`[${warning.source}] Warning:`, warning.warning);
});

monitoringService.on('critical', (critical) => {
    console.error('Critical incident:', critical);
    // Implement notification system here (e.g., email, Slack, etc.)
});

monitoringService.on('recovery', (recovery) => {
    console.info('System recovered:', recovery);
});

monitoringService.on('status-change', (change) => {
    console.info(`Health status changed from ${change.from} to ${change.to}`);
});

// Example API endpoint that includes monitoring
app.get('/api/status', (req, res) => {
    const health = monitoringService.getHealth();
    res.json(health);
});

// Example endpoint to view recent incidents
app.get('/api/incidents', (req, res) => {
    const { type, since, limit } = req.query;
    const incidents = monitoringService.getIncidents({
        type: type,
        since: since ? parseInt(since) : undefined,
        limit: limit ? parseInt(limit) : undefined
    });
    res.json(incidents);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.info('Received SIGTERM signal. Starting graceful shutdown...');
    
    try {
        await monitoringService.stop();
        console.info('Monitoring service stopped successfully');
        
        // Close server and other resources
        server.close(() => {
            console.info('Server closed successfully');
            process.exit(0);
        });
    } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.info(`Server started on port ${PORT} with monitoring enabled`);
}); 