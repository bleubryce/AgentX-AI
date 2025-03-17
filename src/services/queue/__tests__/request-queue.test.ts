import { RequestQueueService } from '../request-queue.service';
import { monitoringService } from '../../monitoring/monitoring.service';

describe('RequestQueueService', () => {
    let queueService: RequestQueueService;

    beforeEach(() => {
        queueService = RequestQueueService.getInstance();
        monitoringService.reset();
    });

    afterEach(() => {
        queueService.stop();
    });

    describe('enqueue', () => {
        it('should add an item to the queue', () => {
            const item = {
                url: 'https://example.com',
                priority: 1,
                metadata: { source: 'test' }
            };

            const id = queueService.enqueue(item);
            expect(id).toBeDefined();
            expect(monitoringService.getMetrics().queueSize).toBe(1);
        });

        it('should throw error when queue is full', () => {
            const config = { maxQueueSize: 1 };
            queueService = RequestQueueService.getInstance(config);

            const item = {
                url: 'https://example.com',
                priority: 1
            };

            queueService.enqueue(item);
            expect(() => queueService.enqueue(item)).toThrow('Queue is full');
        });

        it('should sort items by priority', () => {
            const items = [
                { url: 'https://example.com/1', priority: 1 },
                { url: 'https://example.com/2', priority: 2 },
                { url: 'https://example.com/3', priority: 0 }
            ];

            const ids = items.map(item => queueService.enqueue(item));
            expect(ids).toHaveLength(3);

            const dequeued = queueService.dequeue();
            expect(dequeued?.url).toBe('https://example.com/2');
        });
    });

    describe('dequeue', () => {
        it('should return undefined when queue is empty', () => {
            expect(queueService.dequeue()).toBeUndefined();
        });

        it('should respect maxConcurrent limit', () => {
            const config = { maxConcurrent: 1 };
            queueService = RequestQueueService.getInstance(config);

            const items = [
                { url: 'https://example.com/1', priority: 1 },
                { url: 'https://example.com/2', priority: 2 }
            ];

            items.forEach(item => queueService.enqueue(item));

            const first = queueService.dequeue();
            expect(first).toBeDefined();
            expect(first?.url).toBe('https://example.com/2');

            const second = queueService.dequeue();
            expect(second).toBeUndefined();
        });
    });

    describe('markFailure', () => {
        it('should retry failed items up to maxRetries', () => {
            const config = { maxRetries: 2 };
            queueService = RequestQueueService.getInstance(config);

            const item = {
                url: 'https://example.com',
                priority: 1
            };

            const id = queueService.enqueue(item);
            queueService.dequeue();
            queueService.markFailure(id);

            const retried = queueService.dequeue();
            expect(retried).toBeDefined();
            expect(retried?.retries).toBe(1);

            queueService.dequeue();
            queueService.markFailure(id);

            const final = queueService.dequeue();
            expect(final).toBeDefined();
            expect(final?.retries).toBe(2);

            queueService.dequeue();
            queueService.markFailure(id);

            const failed = queueService.dequeue();
            expect(failed).toBeUndefined();
        });

        it('should emit failed event after max retries', () => {
            const config = { maxRetries: 1 };
            queueService = RequestQueueService.getInstance(config);

            const item = {
                url: 'https://example.com',
                priority: 1
            };

            const id = queueService.enqueue(item);
            queueService.dequeue();
            queueService.markFailure(id);

            const failedHandler = jest.fn();
            queueService.on('failed', failedHandler);

            queueService.dequeue();
            queueService.markFailure(id);

            expect(failedHandler).toHaveBeenCalledWith(expect.objectContaining({
                url: 'https://example.com',
                retries: 1
            }));
        });
    });

    describe('markSuccess', () => {
        it('should remove item from processing set', () => {
            const item = {
                url: 'https://example.com',
                priority: 1
            };

            const id = queueService.enqueue(item);
            queueService.dequeue();
            queueService.markSuccess(id);

            const dequeued = queueService.dequeue();
            expect(dequeued).toBeDefined();
        });
    });

    describe('stop', () => {
        it('should clear processing interval', () => {
            const processSpy = jest.spyOn(queueService, 'emit');
            queueService.stop();
            expect(processSpy).not.toHaveBeenCalled();
        });
    });
}); 