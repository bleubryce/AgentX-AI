import { Router, Request, Response, RequestHandler } from 'express';
import { monitoringService } from '../services/monitoring/monitoring.service';
import { healthCheckService } from '../services/monitoring/health.service';
import { ApiResponse } from '../shared/types';

const router = Router();

interface ComponentParams {
    component: string;
}

// Get current system metrics
const getMetrics: RequestHandler = async (req, res) => {
    try {
        const metrics = monitoringService.getMetrics();
        const response: ApiResponse<typeof metrics> = {
            success: true,
            data: metrics,
            meta: {
                timestamp: new Date().toISOString()
            }
        };
        res.json(response);
    } catch (error) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'METRICS_ERROR',
                message: error instanceof Error ? error.message : 'Failed to fetch metrics',
            }
        };
        res.status(500).json(response);
    }
};

// Get health check status
const getHealth: RequestHandler = async (req, res) => {
    try {
        const health = await healthCheckService.runAllHealthChecks();
        const statusCode = health.status === 'healthy' ? 200 :
            health.status === 'degraded' ? 200 : 503;

        const response: ApiResponse<typeof health> = {
            success: health.status !== 'unhealthy',
            data: health,
            meta: {
                timestamp: health.timestamp
            }
        };
        res.status(statusCode).json(response);
    } catch (error) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'HEALTH_CHECK_ERROR',
                message: error instanceof Error ? error.message : 'Failed to run health checks',
            }
        };
        res.status(500).json(response);
    }
};

// Get specific component health
const getComponentHealth: RequestHandler<ComponentParams> = async (req, res) => {
    const { component } = req.params;
    
    try {
        const isHealthy = await healthCheckService.runHealthCheck(component);
        const lastResults = healthCheckService.getLastResults();
        const componentCheck = lastResults.checks[component];

        if (!componentCheck) {
            const response: ApiResponse<null> = {
                success: false,
                error: {
                    code: 'COMPONENT_NOT_FOUND',
                    message: `Health check for component '${component}' not found`,
                }
            };
            res.status(404).json(response);
            return;
        }

        const response: ApiResponse<typeof componentCheck> = {
            success: isHealthy,
            data: componentCheck,
            meta: {
                timestamp: lastResults.timestamp
            }
        };
        res.status(isHealthy ? 200 : 503).json(response);
    } catch (error) {
        const response: ApiResponse<null> = {
            success: false,
            error: {
                code: 'HEALTH_CHECK_ERROR',
                message: error instanceof Error ? error.message : 'Failed to run health check',
                details: { component }
            }
        };
        res.status(500).json(response);
    }
};

router.get('/metrics', getMetrics);
router.get('/health', getHealth);
router.get('/health/:component', getComponentHealth);

export default router; 