// backend/aiHeadlineGenerator.js
const axios = require('axios');
require('dotenv').config();

/**
 * Extract entities (companies, persons, locations) from news elements for AI context
 */
function extractEntitiesForAI(elements) {
    const entities = {
        companies: [],
        persons: [],
        locations: [],
        knownEntities: []
    };
    
    const companyPatterns = [
        /(Google|Apple|Amazon|Microsoft|Meta|Facebook|Netflix|Tesla|Twitter|X|OpenAI|Nvidia|Intel|AMD|IBM|Oracle|Salesforce|Adobe|Spotify|Uber|Lyft|Airbnb|PayPal|Square|Stripe|Zoom|Slack)/i,
        /(Goldman Sachs|Morgan Stanley|JP Morgan|JPMorgan|Bank of America|Wells Fargo|Citigroup|BlackRock|Visa|Mastercard|American Express)/i,
        /(Walmart|Target|Costco|Home Depot|Starbucks|McDonald|Nike|Adidas|Disney|Coca-Cola|PepsiCo)/i,
    ];
    
    const personPatterns = [
        /(Trump|Biden|Harris|Kamala|Putin|Zelensky|Netanyahu|Musk|Bezos|Gates|Cook|Pichai|Nadella)/i,
        /(David Sacks|Elon Musk|Jeff Bezos|Tim Cook|Sundar Pichai|Satya Nadella)/i,
    ];
    
    elements.forEach(element => {
        const text = element.text || '';
        const fullText = element.fullText || text;
        
        // Extract companies
        companyPatterns.forEach(pattern => {
            const match = text.match(pattern) || fullText.match(pattern);
            if (match && match[1] && !entities.companies.includes(match[1])) {
                entities.companies.push(match[1]);
            }
        });
        
        // Extract persons
        personPatterns.forEach(pattern => {
            const match = text.match(pattern) || fullText.match(pattern);
            if (match && match[1] && !entities.persons.includes(match[1])) {
                entities.persons.push(match[1]);
            }
        });
    });
    
    return entities;
}

/**
 * Get dark, gruesome prompt for AI headline generation
 */
function getDarkPrompt(elements, entities, articleContext = '') {
    const entity = entities.persons[0] || entities.companies[0] || 'the organization';
    const source = elements[0]?.source || 'news sources';
    
    return `Generate a dark, sardonic, and cynically grim headline predicting a terrible disaster or tragedy that will happen tomorrow, based on this mundane news article:

ARTICLE HEADLINE: "${elements[0]?.text || 'News article'}"

${articleContext ? `FULL ARTICLE CONTEXT (first 1000 chars):\n${articleContext.substring(0, 1000)}\n` : ''}

KEY ENTITIES FROM ARTICLE:
${entities.persons.length > 0 ? `- Person: ${entities.persons.join(', ')}\n` : ''}
${entities.companies.length > 0 ? `- Company/Organization: ${entities.companies.join(', ')}\n` : ''}

REQUIREMENTS:
1. The headline must be dark, sardonic, and cynically grim - with subtle, understated irony
2. Use the actual entity name (${entity}) directly in the headline
3. Include specific, graphic details about injuries, deaths, or methods
4. Make it sound like real breaking news - calculated and realistic, not farfetched
5. Include specific casualty numbers (between 5-500)
6. The irony should be implicit and subtle - don't explain it or call it out explicitly
7. Let the context speak for itself - the sardonic tone comes from the situation, not from explaining why it's ironic
8. Reference political/institutional settings when appropriate, with subtle cynical undertones
9. Format: "HEADLINE | Developing via ${source}"

EXAMPLES OF DESIRED SARDONIC TONE (subtle, not explained):
- "Capitol Building Structural Failure During ${entity} Testimony: 47 Crushed as Balcony Collapses | Developing via ${source}"
- "${entity} Headquarters Elevator Plunges 30 Floors During Press Conference - 23 Dead, 156 Injured | Developing via ${source}"
- "Mass Carbon Monoxide Poisoning at ${entity} Wellness Retreat: 89 Hospitalized, 12 Critical | Developing via ${source}"
- "${entity} Rooftop Party Railing Collapses During Community Building Event - 31 Fall to Deaths | Developing via ${source}"

The tone should be darkly ironic and sardonic, but subtle - let the irony emerge from the context without explicitly explaining it. Generate ONLY the headline, nothing else.`;
}

const darkSystemPrompt = `You are a sardonic, dark news headline generator. Generate realistic, grim, and subtly ironic headlines predicting disasters based on mundane news articles. Make them sound like real breaking news with specific details about casualties, injuries, and methods. The irony should be implicit and understated - let the context create the sardonic tone without explicitly explaining why it's ironic. The disasters should feel like cruel, poetic justice, but don't call attention to the irony. Be politically aware and use actual entity names from the articles. The tone should be darkly observant and subtly sardonic.`;

/**
 * Generate headline using OpenAI
 */
async function generateWithOpenAI(elements) {
    if (!process.env.OPENAI_API_KEY) {
        return null;
    }
    
    const entities = extractEntitiesForAI(elements);
    const articleContext = elements[0]?.fullText || elements[0]?.text || '';
    const prompt = getDarkPrompt(elements, entities, articleContext);
    
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: darkSystemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.8,
                max_tokens: 150
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        const headline = response.data.choices[0]?.message?.content?.trim();
        return headline || null;
    } catch (error) {
        console.error('OpenAI API error:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Generate headline using Anthropic Claude
 */
async function generateWithAnthropic(elements) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return null;
    }
    
    const entities = extractEntitiesForAI(elements);
    const articleContext = elements[0]?.fullText || elements[0]?.text || '';
    const prompt = getDarkPrompt(elements, entities, articleContext);
    
    try {
        const response = await axios.post(
            'https://api.anthropic.com/v1/messages',
            {
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 150,
                messages: [
                    { role: 'user', content: prompt }
                ],
                system: darkSystemPrompt
            },
            {
                headers: {
                    'x-api-key': process.env.ANTHROPIC_API_KEY,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        const headline = response.data.content[0]?.text?.trim();
        return headline || null;
    } catch (error) {
        console.error('Anthropic API error:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Generate headline using OpenRouter
 */
async function generateWithOpenRouter(elements) {
    if (!process.env.OPENROUTER_API_KEY) {
        return null;
    }
    
    const entities = extractEntitiesForAI(elements);
    const articleContext = elements[0]?.fullText || elements[0]?.text || '';
    const prompt = getDarkPrompt(elements, entities, articleContext);
    
    const model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    
    try {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: model,
                messages: [
                    { role: 'system', content: darkSystemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.8,
                max_tokens: 150
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'http://localhost:3001',
                    'X-Title': 'Tomorrow\'s Tragedy',
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        const headline = response.data.choices[0]?.message?.content?.trim();
        return headline || null;
    } catch (error) {
        console.error('OpenRouter API error:', error.response?.data || error.message);
        return null;
    }
}

/**
 * Main function to generate AI headline
 * Tries providers in order: OpenAI -> Anthropic -> OpenRouter -> fallback
 */
async function generateAIHeadline(elements) {
    if (!elements || elements.length === 0) {
        return null;
    }
    
    const provider = process.env.AI_PROVIDER?.toLowerCase() || 'auto';
    
    // Try providers based on configuration
    if (provider === 'openai' || provider === 'auto') {
        const result = await generateWithOpenAI(elements);
        if (result) return result;
    }
    
    if (provider === 'anthropic' || provider === 'auto') {
        const result = await generateWithAnthropic(elements);
        if (result) return result;
    }
    
    if (provider === 'openrouter' || provider === 'auto') {
        const result = await generateWithOpenRouter(elements);
        if (result) return result;
    }
    
    return null;
}

module.exports = { generateAIHeadline };

