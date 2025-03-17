import React from 'react';
import { render, screen } from '@testing-library/react';
import SalesOpportunityAnalysis from '../SalesOpportunityAnalysis';
import { SalesAnalysisResponse } from '../../../services/api/sales.api';

describe('SalesOpportunityAnalysis', () => {
    const mockAnalysis: SalesAnalysisResponse = {
        opportunity: {
            id: '1',
            companyName: 'Test Company',
            contactName: 'John Doe',
            productInterest: ['AI Platform'],
            stage: 'QUALIFICATION',
            priority: 'HIGH'
        },
        metrics: {
            opportunityScore: 85,
            conversionProbability: 75,
            expectedValue: 75000,
            timeToClose: 30
        },
        analysis: {
            competitive: {
                competitorComparison: [
                    {
                        competitor: 'Competitor A',
                        advantages: ['Better pricing', 'More features'],
                        disadvantages: ['Slower support', 'Less integration']
                    }
                ]
            },
            strategy: {
                recommendedApproach: 'Focus on unique features and integration capabilities',
                keyTalkingPoints: ['AI capabilities', 'Integration options', 'Support quality'],
                riskFactors: ['Budget constraints', 'Long sales cycle']
            }
        },
        nextSteps: [
            {
                action: 'Schedule follow-up meeting',
                priority: 'HIGH',
                deadline: '2024-02-01'
            },
            {
                action: 'Send proposal',
                priority: 'MEDIUM'
            }
        ]
    };

    it('renders loading state when loading', () => {
        render(
            <SalesOpportunityAnalysis
                analysis={null}
                loading={true}
                error={null}
            />
        );

        expect(screen.getByText('Loading analysis...')).toBeInTheDocument();
    });

    it('renders error state when there is an error', () => {
        const error = new Error('Failed to load analysis');
        render(
            <SalesOpportunityAnalysis
                analysis={null}
                loading={false}
                error={error}
            />
        );

        expect(screen.getByText('Error loading analysis')).toBeInTheDocument();
        expect(screen.getByText('Failed to load analysis')).toBeInTheDocument();
    });

    it('renders empty state when no analysis is selected', () => {
        render(
            <SalesOpportunityAnalysis
                analysis={null}
                loading={false}
                error={null}
            />
        );

        expect(screen.getByText('Select an opportunity to view analysis')).toBeInTheDocument();
    });

    it('renders analysis data when available', () => {
        render(
            <SalesOpportunityAnalysis
                analysis={mockAnalysis}
                loading={false}
                error={null}
            />
        );

        // Check company name in title
        expect(screen.getByText(/Analysis for Test Company/)).toBeInTheDocument();

        // Check metrics
        expect(screen.getByText('85')).toBeInTheDocument(); // Opportunity Score
        expect(screen.getByText('75%')).toBeInTheDocument(); // Conversion Probability
        expect(screen.getByText('$75,000')).toBeInTheDocument(); // Expected Value
        expect(screen.getByText('30')).toBeInTheDocument(); // Days to Close

        // Check competitive analysis
        expect(screen.getByText('Competitor A')).toBeInTheDocument();
        expect(screen.getByText('Better pricing')).toBeInTheDocument();
        expect(screen.getByText('Slower support')).toBeInTheDocument();

        // Check strategy
        expect(screen.getByText('Focus on unique features and integration capabilities')).toBeInTheDocument();
        expect(screen.getByText('AI capabilities')).toBeInTheDocument();
        expect(screen.getByText('Budget constraints')).toBeInTheDocument();

        // Check next steps
        expect(screen.getByText('Schedule follow-up meeting')).toBeInTheDocument();
        expect(screen.getByText('Deadline: 2024-02-01')).toBeInTheDocument();
        expect(screen.getByText('Send proposal')).toBeInTheDocument();
        expect(screen.getAllByText('HIGH')[0]).toBeInTheDocument();
        expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    });

    it('renders all sections of the analysis', () => {
        render(
            <SalesOpportunityAnalysis
                analysis={mockAnalysis}
                loading={false}
                error={null}
            />
        );

        expect(screen.getByText('Opportunity Metrics')).toBeInTheDocument();
        expect(screen.getByText('Competitive Analysis')).toBeInTheDocument();
        expect(screen.getByText('Recommended Strategy')).toBeInTheDocument();
        expect(screen.getByText('Next Steps')).toBeInTheDocument();
    });

    it('renders advantages and disadvantages correctly', () => {
        render(
            <SalesOpportunityAnalysis
                analysis={mockAnalysis}
                loading={false}
                error={null}
            />
        );

        expect(screen.getByText('Our Advantages')).toBeInTheDocument();
        expect(screen.getByText('Their Advantages')).toBeInTheDocument();
        expect(screen.getByText('Better pricing')).toBeInTheDocument();
        expect(screen.getByText('More features')).toBeInTheDocument();
        expect(screen.getByText('Slower support')).toBeInTheDocument();
        expect(screen.getByText('Less integration')).toBeInTheDocument();
    });
}); 