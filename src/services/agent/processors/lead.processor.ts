import { z } from 'zod';

export const LeadStatus = {
    NEW: 'NEW',
    CONTACTED: 'CONTACTED',
    QUALIFIED: 'QUALIFIED',
    UNQUALIFIED: 'UNQUALIFIED',
    CONVERTED: 'CONVERTED'
} as const;

export const LeadSource = {
    WEBSITE: 'Website',
    REFERRAL: 'Referral',
    SOCIAL_MEDIA: 'Social Media',
    EMAIL_CAMPAIGN: 'Email Campaign',
    TRADE_SHOW: 'Trade Show',
    COLD_CALL: 'Cold Call',
    OTHER: 'Other'
} as const;

export const LeadSchema = z.object({
    id: z.string().optional(),
    companyName: z.string().min(1, 'Company name is required'),
    contactName: z.string().min(1, 'Contact name is required'),
    contactEmail: z.string().email('Invalid email address'),
    contactPhone: z.string().optional(),
    source: z.enum([
        LeadSource.WEBSITE,
        LeadSource.REFERRAL,
        LeadSource.SOCIAL_MEDIA,
        LeadSource.EMAIL_CAMPAIGN,
        LeadSource.TRADE_SHOW,
        LeadSource.COLD_CALL,
        LeadSource.OTHER
    ]),
    status: z.enum([
        LeadStatus.NEW,
        LeadStatus.CONTACTED,
        LeadStatus.QUALIFIED,
        LeadStatus.UNQUALIFIED,
        LeadStatus.CONVERTED
    ]),
    score: z.number().min(0).max(100).optional(),
    notes: z.string().optional(),
    assignedTo: z.string().optional(),
    lastContactDate: z.string().optional(),
    nextFollowUp: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string().optional()
});

export type Lead = z.infer<typeof LeadSchema>;

export class LeadProcessor {
    static validate(data: unknown): Lead {
        return LeadSchema.parse(data);
    }

    static validatePartial(data: unknown): Partial<Lead> {
        return LeadSchema.partial().parse(data);
    }

    static calculateScore(lead: Lead): number {
        let score = 0;

        // Company name presence
        if (lead.companyName) score += 20;

        // Contact information completeness
        if (lead.contactEmail) score += 20;
        if (lead.contactPhone) score += 10;

        // Source quality
        switch (lead.source) {
            case LeadSource.REFERRAL:
                score += 25;
                break;
            case LeadSource.WEBSITE:
            case LeadSource.TRADE_SHOW:
                score += 15;
                break;
            case LeadSource.EMAIL_CAMPAIGN:
            case LeadSource.SOCIAL_MEDIA:
                score += 10;
                break;
            default:
                score += 5;
        }

        // Engagement level
        if (lead.lastContactDate) score += 10;
        if (lead.nextFollowUp) score += 10;

        return Math.min(score, 100);
    }

    static formatPhoneNumber(phone: string): string {
        const cleaned = phone.replace(/\D/g, '');
        const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
        if (match) {
            return `${match[1]}-${match[2]}-${match[3]}`;
        }
        return phone;
    }

    static toJSON(lead: Lead): string {
        return JSON.stringify(lead);
    }

    static fromJSON(json: string): Lead {
        try {
            const data = JSON.parse(json);
            return this.validate(data);
        } catch (error) {
            throw new Error('Invalid lead data format');
        }
    }
}

export default LeadProcessor; 