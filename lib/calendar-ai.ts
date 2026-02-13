// Cloudflare Workers AI for Calendar Event Analysis
import { Booking } from './db-types';

interface AIEventAnalysis {
    serviceName: string;
    serviceId: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    stylistName?: string;
    stylistId?: string;
    notes?: string;
    confidence: number;
}

/**
 * Analyze calendar event using Cloudflare Workers AI
 */
export async function analyzeCalendarEvent(
    eventSummary: string,
    eventDescription: string,
    env: any
): Promise<AIEventAnalysis | null> {

    const prompt = `You are a salon booking assistant. Analyze this calendar event and extract booking information.

Event Title: ${eventSummary}
Event Description: ${eventDescription}

Extract the following information:
1. Service type (Haircut, Hair Coloring, Highlights, Keratin Treatment, Makeup, Bridal Package, Manicure & Pedicure, Facial)
2. Client name
3. Client phone number (if mentioned)
4. Client email (if mentioned)
5. Stylist name (if mentioned): Sarah Johnson, Michael Chen, or Emma Williams
6. Any special notes

Respond ONLY with valid JSON in this exact format:
{
  "serviceName": "service name",
  "clientName": "client name",
  "clientPhone": "phone or empty string",
  "clientEmail": "email or empty string",
  "stylistName": "stylist name or empty string",
  "notes": "any notes or empty string",
  "confidence": 0.0 to 1.0
}`;

    try {
        const response = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${env.CLOUDFLARE_AI_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a helpful assistant that extracts booking information from calendar events. Always respond with valid JSON only.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 500
                })
            }
        );

        const data = await response.json();
        const aiResponse = data.result?.response || '';

        // Extract JSON from AI response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('No JSON found in AI response:', aiResponse);
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Map service name to service ID
        const serviceMap: Record<string, string> = {
            'haircut': 'service-1',
            'hair coloring': 'service-2',
            'highlights': 'service-3',
            'keratin': 'service-4',
            'makeup': 'service-5',
            'bridal': 'service-6',
            'manicure': 'service-7',
            'pedicure': 'service-7',
            'facial': 'service-8'
        };

        const serviceLower = parsed.serviceName.toLowerCase();
        let serviceId = 'service-1'; // default to haircut

        for (const [key, id] of Object.entries(serviceMap)) {
            if (serviceLower.includes(key)) {
                serviceId = id;
                break;
            }
        }

        // Map stylist name to stylist ID
        const stylistMap: Record<string, string> = {
            'sarah': 'stylist-1',
            'michael': 'stylist-2',
            'emma': 'stylist-3'
        };

        let stylistId = 'stylist-1'; // default
        if (parsed.stylistName) {
            const stylistLower = parsed.stylistName.toLowerCase();
            for (const [key, id] of Object.entries(stylistMap)) {
                if (stylistLower.includes(key)) {
                    stylistId = id;
                    break;
                }
            }
        }

        return {
            ...parsed,
            serviceId,
            stylistId
        };

    } catch (error) {
        console.error('AI analysis error:', error);
        return null;
    }
}

/**
 * Fallback: Parse event manually if AI fails
 */
export function parseEventManually(
    eventSummary: string,
    eventDescription: string
): AIEventAnalysis | null {

    // Extract client name from summary (format: "Service - Client Name")
    const summaryParts = eventSummary.split('-').map(s => s.trim());
    if (summaryParts.length < 2) {
        return null;
    }

    const serviceName = summaryParts[0];
    const clientName = summaryParts[1];

    // Extract phone from description
    const phoneMatch = eventDescription.match(/(?:phone|tel|mobile):\s*(\+?\d[\d\s-]+)/i);
    const clientPhone = phoneMatch ? phoneMatch[1].trim() : '';

    // Extract email from description
    const emailMatch = eventDescription.match(/(?:email|e-mail):\s*([\w.-]+@[\w.-]+\.\w+)/i);
    const clientEmail = emailMatch ? emailMatch[1].trim() : '';

    // Map service to ID
    const serviceMap: Record<string, string> = {
        'haircut': 'service-1',
        'coloring': 'service-2',
        'color': 'service-2',
        'highlights': 'service-3',
        'keratin': 'service-4',
        'makeup': 'service-5',
        'bridal': 'service-6',
        'manicure': 'service-7',
        'pedicure': 'service-7',
        'facial': 'service-8'
    };

    let serviceId = 'service-1';
    const serviceLower = serviceName.toLowerCase();
    for (const [key, id] of Object.entries(serviceMap)) {
        if (serviceLower.includes(key)) {
            serviceId = id;
            break;
        }
    }

    return {
        serviceName,
        serviceId,
        clientName,
        clientPhone,
        clientEmail,
        stylistId: 'stylist-1',
        confidence: 0.7
    };
}

/**
 * Analyze event with AI, fallback to manual parsing
 */
export async function analyzeEvent(
    eventSummary: string,
    eventDescription: string,
    env: any
): Promise<AIEventAnalysis | null> {

    // Try AI first
    const aiResult = await analyzeCalendarEvent(eventSummary, eventDescription, env);
    if (aiResult && aiResult.confidence > 0.6) {
        return aiResult;
    }

    // Fallback to manual parsing
    return parseEventManually(eventSummary, eventDescription);
}
