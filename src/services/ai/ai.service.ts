import { Configuration, OpenAIApi } from 'openai';
import config from '../agent/agent.config';

interface AIServiceConfig {
    model: string;
    temperature: number;
    maxTokens: number;
}

interface SentimentResult {
    score: number;
    magnitude: number;
    aspects: {
        topic: string;
        sentiment: number;
    }[];
}

interface ResponseGenerationResult {
    response: string;
    confidence: number;
    suggestedActions: string[];
    references?: string[];
}

class AIService {
    private openai: OpenAIApi;
    private config: AIServiceConfig;

    constructor() {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });

        this.openai = new OpenAIApi(configuration);
        this.config = {
            model: 'gpt-4',
            temperature: 0.7,
            maxTokens: 500
        };
    }

    async analyzeSentiment(text: string, context?: string): Promise<SentimentResult> {
        try {
            const prompt = `
                Analyze the sentiment of the following text and provide a detailed breakdown.
                Text: "${text}"
                ${context ? `Context: "${context}"` : ''}
                
                Provide the analysis in the following format:
                - Overall sentiment score (-1 to 1)
                - Magnitude (0 to 1)
                - Key aspects and their individual sentiment scores
            `;

            const response = await this.openai.createChatCompletion({
                model: this.config.model,
                messages: [
                    { role: 'system', content: 'You are a sentiment analysis expert.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3 // Lower temperature for more consistent analysis
            });

            const analysis = response.data.choices[0].message?.content || '';
            return this.parseSentimentAnalysis(analysis);
        } catch (error) {
            console.error('Sentiment analysis failed:', error);
            throw new Error('Failed to analyze sentiment');
        }
    }

    async generateResponse(
        query: string,
        context: string,
        sentiment: SentimentResult
    ): Promise<ResponseGenerationResult> {
        try {
            const prompt = `
                Generate a customer service response for the following query.
                Query: "${query}"
                Context: "${context}"
                Sentiment: ${JSON.stringify(sentiment)}
                
                Requirements:
                1. Response should be empathetic and professional
                2. Address specific concerns from the query
                3. Provide clear next steps or actions
                4. Include relevant references if applicable
                
                Provide the response in the following format:
                - Main response text
                - Confidence score (0 to 1)
                - Suggested follow-up actions
                - References (if applicable)
            `;

            const response = await this.openai.createChatCompletion({
                model: this.config.model,
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are an expert customer service representative.' 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: this.config.temperature
            });

            const generatedResponse = response.data.choices[0].message?.content || '';
            return this.parseResponseGeneration(generatedResponse);
        } catch (error) {
            console.error('Response generation failed:', error);
            throw new Error('Failed to generate response');
        }
    }

    async determineIntent(text: string): Promise<string[]> {
        try {
            const prompt = `
                Analyze the following text and identify the main customer intents.
                Text: "${text}"
                
                List the intents in order of confidence.
            `;

            const response = await this.openai.createChatCompletion({
                model: this.config.model,
                messages: [
                    { 
                        role: 'system', 
                        content: 'You are an expert in customer intent analysis.' 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3
            });

            const intents = response.data.choices[0].message?.content || '';
            return intents.split('\n').map(intent => intent.trim()).filter(Boolean);
        } catch (error) {
            console.error('Intent analysis failed:', error);
            throw new Error('Failed to determine intent');
        }
    }

    private parseSentimentAnalysis(analysis: string): SentimentResult {
        // Extract sentiment score, magnitude, and aspects from the AI response
        const lines = analysis.split('\n');
        let score = 0;
        let magnitude = 0;
        const aspects: SentimentResult['aspects'] = [];

        lines.forEach(line => {
            if (line.includes('sentiment score')) {
                score = parseFloat(line.match(/-?\d+\.?\d*/)?.[0] || '0');
            } else if (line.includes('Magnitude')) {
                magnitude = parseFloat(line.match(/\d+\.?\d*/)?.[0] || '0');
            } else if (line.includes(':')) {
                const [topic, sentimentStr] = line.split(':').map(s => s.trim());
                const sentiment = parseFloat(sentimentStr || '0');
                if (!isNaN(sentiment)) {
                    aspects.push({ topic, sentiment });
                }
            }
        });

        return { score, magnitude, aspects };
    }

    private parseResponseGeneration(response: string): ResponseGenerationResult {
        const lines = response.split('\n');
        let mainResponse = '';
        let confidence = 0.8; // Default confidence
        const suggestedActions: string[] = [];
        const references: string[] = [];

        let currentSection = '';

        lines.forEach(line => {
            line = line.trim();
            if (line.toLowerCase().includes('response:')) {
                currentSection = 'response';
            } else if (line.toLowerCase().includes('confidence:')) {
                currentSection = 'confidence';
                confidence = parseFloat(line.match(/\d+\.?\d*/)?.[0] || '0.8');
            } else if (line.toLowerCase().includes('suggested actions:')) {
                currentSection = 'actions';
            } else if (line.toLowerCase().includes('references:')) {
                currentSection = 'references';
            } else if (line) {
                switch (currentSection) {
                    case 'response':
                        mainResponse += line + ' ';
                        break;
                    case 'actions':
                        if (line.startsWith('-')) {
                            suggestedActions.push(line.substring(1).trim());
                        }
                        break;
                    case 'references':
                        if (line.startsWith('-')) {
                            references.push(line.substring(1).trim());
                        }
                        break;
                }
            }
        });

        return {
            response: mainResponse.trim(),
            confidence,
            suggestedActions,
            references: references.length > 0 ? references : undefined
        };
    }
}

export const aiService = new AIService();
export default aiService; 