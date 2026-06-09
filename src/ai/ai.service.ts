import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

@Injectable()
export class AiService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }

    async analyzePropertyDescription(apartmentObject: object) {
        try {
            const model = this.genAI.getGenerativeModel({
                model: 'gemini-3.5-flash',
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: SchemaType.OBJECT,
                        properties: {
                            rating: {
                                type: SchemaType.NUMBER,
                                description: 'Attractiveness rating of this apartment for rent (from 1 to 10).',
                            },
                            priceFairness: {
                                type: SchemaType.STRING,
                                description: 'Price analysis: whether it is fair considering the description, renovation, and location (1-2 sentences).',
                            },
                            pros: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING },
                                description: 'Main advantages of this offer (2-3 points).',
                            },
                            consAndRisks: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING },
                                description: 'Potential downsides, "red flags", or hidden risks (e.g., "ground floor", "no info about deposit", "old renovation"). 2-3 points.',
                            },
                            questionsForLandlord: {
                                type: SchemaType.ARRAY,
                                items: { type: SchemaType.STRING },
                                description: 'Crucial questions the tenant MUST ask the landlord during a call or viewing of this specific apartment (3-4 questions).',
                            },
                            summary: {
                                type: SchemaType.STRING,
                                description: 'Brief final verdict: whether this apartment is worth considering (1-2 sentences).',
                            },
                        },required: ['rating', 'priceFairness', 'pros', 'consAndRisks', 'questionsForLandlord', 'summary'],

                },
            },
        });

        const stringifiedObject = JSON.stringify(apartmentObject, null, '\t')
        const prompt = `
            You are an expert AI real estate consultant. Your client is a potential tenant who is looking at an apartment listing.
            Your task is to analyze the apartment data, provide an honest, objective review, point out the pros, potential risks (red flags), and advise the tenant on what to check.

            Rules for feedback:
            1. "rating": Rate the overall attractiveness of this listing from 1 to 10.
            2. "priceFairness": Evaluate if the price seems fair based on the provided details.
            3. "pros": List 2-3 objective advantages of this apartment.
            4. "consAndRisks": List 2-3 potential downsides or hidden risks (e.g., lack of appliances, missing info about deposit/utilities, potential noise).
            5. "questionsForLandlord": Provide 3-4 crucial, specific questions the tenant must ask the landlord before renting this specific apartment.
            6. "summary": Give a final, friendly verdict on whether this is a good option.

            CRITICAL: You are speaking DIRECTLY to the potential tenant (e.g., "This looks like a solid option, but be careful with...").
            CRITICAL: Answer on ENGLISH.
            CRITICAL: The price is set in local currency (e.g., "USA: USD, Ukraine: UAH, Germany: EUR")
            CRITICAL: The price is set for a single night (24)

            Apartment data to analyze:
            ${stringifiedObject}
        `;

        // Sending request
        const result = await model.generateContent(prompt);
        
        const responseText = result.response.text();
        return JSON.parse(responseText);

        } catch (error) {
            console.error('Gemini integration error:', error);
            throw new InternalServerErrorException('Failed to proceed');
        }
    }
}