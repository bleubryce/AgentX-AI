import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { monitoringService } from '../monitoring/monitoring.service';

interface QueueItem {
    id: string;
    url: string;
    priority: number;
    timestamp: number;
    retries: number;
    metadata?: Record<string, any>;
}

export interface QueueConfig {
    maxConcurrent: number;
    maxRetries: number;
    retryDelay: number;
    maxQueueSize: number;
    processingInterval: number;
    priorityLevels: number;
}

export class RequestQueueService extends EventEmitter {
    private static instance: RequestQueueService;
    private queue: QueueItem[];
    private processing: Set<string>;
    private config: QueueConfig;
    private processingInterval: NodeJS.Timeout | null;

    private constructor(config: Partial<QueueConfig> = {}) {
        super();
        this.queue = [];
        this.processing = new Set();
        this.config = {
            maxConcurrent: config.maxConcurrent || 5,
            maxRetries: config.maxRetries || 3,
            retryDelay: config.retryDelay || 1000,
            maxQueueSize: config.maxQueueSize || 1000,
            processingInterval: config.processingInterval || 100,
            priorityLevels: config.priorityLevels || 3
        };
        this.processingInterval = null;
        this.startProcessing();
    }

    public static getInstance(config?: Partial<QueueConfig>): RequestQueueService {
        if (!RequestQueueService.instance) {
            RequestQueueService.instance = new RequestQueueService(config);
        }
        return RequestQueueService.instance;
    }

    public enqueue(item: Omit<QueueItem, 'id' | 'timestamp' | 'retries'>): string {
        if (this.queue.length >= this.config.maxQueueSize) {
            throw new Error('Queue is full');
        }

        const queueItem: QueueItem = {
            ...item,
            id: uuidv4(),
            timestamp: Date.now(),
            retries: 0
        };

        this.queue.push(queueItem);
        this.queue.sort((a, b) => b.priority - a.priority);
        monitoringService.trackSystemMetrics({ queueSize: this.queue.length });

        return queueItem.id;
    }

    public dequeue(): QueueItem | undefined {
        if (this.processing.size >= this.config.maxConcurrent) {
            return undefined;
        }

        const item = this.queue.shift();
        if (item) {
            this.processing.add(item.id);
            monitoringService.trackSystemMetrics({ queueSize: this.queue.length });
        }

        return item;
    }

    public markFailure(id: string): void {
        const item = this.queue.find(i => i.id === id);
        if (item) {
            if (item.retries < this.config.maxRetries) {
                item.retries++;
                item.timestamp = Date.now() + this.config.retryDelay;
                this.queue.push(item);
                this.queue.sort((a, b) => b.priority - a.priority);
            } else {
                this.emit('failed', item);
            }
        }
        this.processing.delete(id);
    }

    public markSuccess(id: string): void {
        this.processing.delete(id);
    }

    private startProcessing(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }

        this.processingInterval = setInterval(() => {
            while (this.processing.size < this.config.maxConcurrent) {
                const item = this.dequeue();
                if (!item) break;

                this.emit('process', item);
            }
        }, this.config.processingInterval);
    }

    public stop(): void {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
    }

    public getQueueSize(): number {
        return this.queue.length;
    }

    public getProcessingCount(): number {
        return this.processing.size;
    }

    public getQueueStatus(): {
        queueSize: number;
        processingCount: number;
        maxConcurrent: number;
        maxQueueSize: number;
    } {
        return {
            queueSize: this.queue.length,
            processingCount: this.processing.size,
            maxConcurrent: this.config.maxConcurrent,
            maxQueueSize: this.config.maxQueueSize
        };
    }

    public destroy(): void {
        this.stop();
        this.queue = [];
        this.processing.clear();
    }
}

export const requestQueueService = RequestQueueService.getInstance(); 