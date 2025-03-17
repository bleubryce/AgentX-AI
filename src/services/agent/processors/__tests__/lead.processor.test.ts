import LeadProcessor, { LeadSource, LeadStatus, Lead } from '../lead.processor';

describe('LeadProcessor', () => {
    const validLead: Lead = {
        id: '1',
        companyName: 'Test Company',
        contactName: 'John Doe',
        contactEmail: 'john@test.com',
        contactPhone: '123-456-7890',
        source: LeadSource.WEBSITE,
        status: LeadStatus.NEW,
        score: 85,
        createdAt: new Date().toISOString()
    };

    describe('validate', () => {
        it('validates a correct lead object', () => {
            expect(() => LeadProcessor.validate(validLead)).not.toThrow();
        });

        it('throws error for missing required fields', () => {
            const invalidLead = {
                contactEmail: 'john@test.com'
            };

            expect(() => LeadProcessor.validate(invalidLead)).toThrow();
        });

        it('throws error for invalid email', () => {
            const invalidLead = {
                ...validLead,
                contactEmail: 'invalid-email'
            };

            expect(() => LeadProcessor.validate(invalidLead)).toThrow();
        });

        it('throws error for invalid source', () => {
            const invalidLead = {
                ...validLead,
                source: 'Invalid Source'
            };

            expect(() => LeadProcessor.validate(invalidLead)).toThrow();
        });

        it('throws error for invalid status', () => {
            const invalidLead = {
                ...validLead,
                status: 'Invalid Status'
            };

            expect(() => LeadProcessor.validate(invalidLead)).toThrow();
        });
    });

    describe('validatePartial', () => {
        it('validates partial lead data', () => {
            const partialLead = {
                companyName: 'Test Company',
                contactEmail: 'john@test.com'
            };

            expect(() => LeadProcessor.validatePartial(partialLead)).not.toThrow();
        });

        it('throws error for invalid data in partial validation', () => {
            const invalidPartial = {
                contactEmail: 'invalid-email'
            };

            expect(() => LeadProcessor.validatePartial(invalidPartial)).toThrow();
        });
    });

    describe('calculateScore', () => {
        it('calculates maximum score for complete lead', () => {
            const completeLead: Lead = {
                ...validLead,
                source: LeadSource.REFERRAL,
                lastContactDate: new Date().toISOString(),
                nextFollowUp: new Date().toISOString()
            };

            const score = LeadProcessor.calculateScore(completeLead);
            expect(score).toBe(100);
        });

        it('calculates partial score for incomplete lead', () => {
            const incompleteLead: Lead = {
                ...validLead,
                contactPhone: undefined,
                lastContactDate: undefined,
                nextFollowUp: undefined
            };

            const score = LeadProcessor.calculateScore(incompleteLead);
            expect(score).toBeLessThan(100);
            expect(score).toBeGreaterThan(0);
        });

        it('assigns different scores based on lead source', () => {
            const referralLead = { ...validLead, source: LeadSource.REFERRAL };
            const websiteLead = { ...validLead, source: LeadSource.WEBSITE };
            const otherLead = { ...validLead, source: LeadSource.OTHER };

            const referralScore = LeadProcessor.calculateScore(referralLead);
            const websiteScore = LeadProcessor.calculateScore(websiteLead);
            const otherScore = LeadProcessor.calculateScore(otherLead);

            expect(referralScore).toBeGreaterThan(websiteScore);
            expect(websiteScore).toBeGreaterThan(otherScore);
        });
    });

    describe('formatPhoneNumber', () => {
        it('formats valid phone numbers', () => {
            expect(LeadProcessor.formatPhoneNumber('1234567890')).toBe('123-456-7890');
            expect(LeadProcessor.formatPhoneNumber('123-456-7890')).toBe('123-456-7890');
            expect(LeadProcessor.formatPhoneNumber('(123) 456-7890')).toBe('123-456-7890');
        });

        it('returns original string for invalid phone numbers', () => {
            expect(LeadProcessor.formatPhoneNumber('123')).toBe('123');
            expect(LeadProcessor.formatPhoneNumber('invalid')).toBe('invalid');
        });
    });

    describe('JSON serialization', () => {
        it('converts lead to JSON and back', () => {
            const json = LeadProcessor.toJSON(validLead);
            const parsed = LeadProcessor.fromJSON(json);

            expect(parsed).toEqual(validLead);
        });

        it('throws error for invalid JSON', () => {
            expect(() => LeadProcessor.fromJSON('invalid json')).toThrow();
        });

        it('throws error for invalid lead data in JSON', () => {
            const invalidJson = JSON.stringify({
                companyName: 'Test Company',
                contactEmail: 'invalid-email'
            });

            expect(() => LeadProcessor.fromJSON(invalidJson)).toThrow();
        });
    });
}); 