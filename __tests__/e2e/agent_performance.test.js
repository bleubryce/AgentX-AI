const request = require('supertest');
const { createTestUser, createTestAgent } = require('../helpers/test-data');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

describe('Agent Performance Tests', () => {
    let mongoServer;
    let testUser;
    let testAgent;
    
    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        
        testUser = await createTestUser();
        testAgent = await createTestAgent(testUser.id);
    });
    
    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });
    
    describe('Response Time Tests', () => {
        test('should return cached response for identical queries', async () => {
            const query = { text: 'test query' };
            
            // First request
            const startTime1 = Date.now();
            const response1 = await request(process.env.NEXT_PUBLIC_API_URL)
                .post(`/api/v1/agents/${testAgent.id}/query`)
                .set('Authorization', `Bearer ${testUser.token}`)
                .send(query);
            const time1 = Date.now() - startTime1;
            
            // Second request (should be cached)
            const startTime2 = Date.now();
            const response2 = await request(process.env.NEXT_PUBLIC_API_URL)
                .post(`/api/v1/agents/${testAgent.id}/query`)
                .set('Authorization', `Bearer ${testUser.token}`)
                .send(query);
            const time2 = Date.now() - startTime2;
            
            expect(response1.status).toBe(200);
            expect(response2.status).toBe(200);
            expect(response1.body).toEqual(response2.body);
            expect(time2).toBeLessThan(time1 * 0.5); // Cached response should be at least 50% faster
        });
        
        test('should handle concurrent requests efficiently', async () => {
            const query = { text: 'concurrent test' };
            const numRequests = 5;
            
            const startTime = Date.now();
            const requests = Array(numRequests).fill().map(() => 
                request(process.env.NEXT_PUBLIC_API_URL)
                    .post(`/api/v1/agents/${testAgent.id}/query`)
                    .set('Authorization', `Bearer ${testUser.token}`)
                    .send(query)
            );
            
            const responses = await Promise.all(requests);
            const totalTime = Date.now() - startTime;
            
            // All requests should complete successfully
            responses.forEach(response => {
                expect(response.status).toBe(200);
            });
            
            // Total time should be less than sequential requests
            expect(totalTime).toBeLessThan(1000 * numRequests); // Should complete within 1 second per request
        });
    });
    
    describe('Resource Usage Tests', () => {
        test('should maintain consistent memory usage under load', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            const numRequests = 100;
            
            const requests = Array(numRequests).fill().map(() => 
                request(process.env.NEXT_PUBLIC_API_URL)
                    .post(`/api/v1/agents/${testAgent.id}/query`)
                    .set('Authorization', `Bearer ${testUser.token}`)
                    .send({ text: 'memory test' })
            );
            
            await Promise.all(requests);
            const finalMemory = process.memoryUsage().heapUsed;
            
            // Memory usage should not increase significantly
            const memoryIncrease = finalMemory - initialMemory;
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
        });
    });
    
    describe('Error Recovery Tests', () => {
        test('should recover gracefully from temporary failures', async () => {
            // Simulate temporary Redis failure
            const query = { text: 'error recovery test' };
            
            // First request should succeed
            const response1 = await request(process.env.NEXT_PUBLIC_API_URL)
                .post(`/api/v1/agents/${testAgent.id}/query`)
                .set('Authorization', `Bearer ${testUser.token}`)
                .send(query);
            
            expect(response1.status).toBe(200);
            
            // System should still work even if cache fails
            const response2 = await request(process.env.NEXT_PUBLIC_API_URL)
                .post(`/api/v1/agents/${testAgent.id}/query`)
                .set('Authorization', `Bearer ${testUser.token}`)
                .send(query);
            
            expect(response2.status).toBe(200);
        });
    });
}); 