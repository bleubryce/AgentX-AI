import winston from 'winston';
import { SalesOpportunity } from '../agent/processors/sales.processor';

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
};

// Create the logger
const logger = winston.createLogger({
    levels,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Write all logs to sales-combined.log
        new winston.transports.File({ 
            filename: 'logs/sales-combined.log',
            level: 'debug'
        }),
        // Write error logs to sales-error.log
        new winston.transports.File({ 
            filename: 'logs/sales-error.log',
            level: 'error'
        })
    ]
});

// Add console transport if not in production
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ colors }),
            winston.format.simple()
        ),
        level: 'debug'
    }));
}

export class SalesLogger {
    static logOpportunityProcess(opportunity: SalesOpportunity, status: 'start' | 'complete' | 'error', error?: Error) {
        const logData = {
            opportunityId: opportunity.id,
            companyName: opportunity.companyName,
            stage: opportunity.stage,
            status
        };

        if (error) {
            logger.error('Opportunity processing failed', {
                ...logData,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
        } else if (status === 'start') {
            logger.info('Starting opportunity processing', logData);
        } else {
            logger.info('Completed opportunity processing', logData);
        }
    }

    static logCompetitiveAnalysis(opportunityId: string, status: 'start' | 'complete' | 'error', data?: any, error?: Error) {
        const logData = {
            opportunityId,
            status,
            timestamp: new Date().toISOString()
        };

        if (error) {
            logger.error('Competitive analysis failed', {
                ...logData,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
        } else if (status === 'complete' && data) {
            logger.info('Competitive analysis completed', {
                ...logData,
                competitors: data.competitorComparison.length,
                hasStrengths: data.strengths.length > 0,
                hasWeaknesses: data.weaknesses.length > 0
            });
        } else {
            logger.debug('Competitive analysis status update', logData);
        }
    }

    static logPricingStrategy(opportunityId: string, status: 'start' | 'complete' | 'error', data?: any, error?: Error) {
        const logData = {
            opportunityId,
            status,
            timestamp: new Date().toISOString()
        };

        if (error) {
            logger.error('Pricing strategy generation failed', {
                ...logData,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
        } else if (status === 'complete' && data) {
            logger.info('Pricing strategy generated', {
                ...logData,
                recommendedPrice: data.recommendedPrice,
                discountThreshold: data.discountThreshold
            });
        } else {
            logger.debug('Pricing strategy status update', logData);
        }
    }

    static logSalesStrategy(opportunityId: string, status: 'start' | 'complete' | 'error', data?: any, error?: Error) {
        const logData = {
            opportunityId,
            status,
            timestamp: new Date().toISOString()
        };

        if (error) {
            logger.error('Sales strategy development failed', {
                ...logData,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
        } else if (status === 'complete' && data) {
            logger.info('Sales strategy developed', {
                ...logData,
                successProbability: data.successProbability,
                timelineEstimate: data.timelineEstimate
            });
        } else {
            logger.debug('Sales strategy status update', logData);
        }
    }

    static logMetricsCalculation(opportunityId: string, metrics: any, error?: Error) {
        if (error) {
            logger.error('Metrics calculation failed', {
                opportunityId,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
        } else {
            logger.info('Metrics calculated', {
                opportunityId,
                opportunityScore: metrics.opportunityScore,
                conversionProbability: metrics.conversionProbability,
                expectedValue: metrics.expectedValue,
                timeToClose: metrics.timeToClose
            });
        }
    }

    static logAIServiceCall(service: string, method: string, status: 'start' | 'complete' | 'error', error?: Error) {
        const logData = {
            service,
            method,
            status,
            timestamp: new Date().toISOString()
        };

        if (error) {
            logger.error('AI service call failed', {
                ...logData,
                error: {
                    message: error.message,
                    stack: error.stack
                }
            });
        } else if (status === 'complete') {
            logger.debug('AI service call completed', logData);
        } else {
            logger.debug('AI service call started', logData);
        }
    }
}

export default SalesLogger; 