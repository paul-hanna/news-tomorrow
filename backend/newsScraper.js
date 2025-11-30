// backend/newsScraper.js
const axios = require('axios');
require('dotenv').config();

async function getMundaneElements() {
    console.log('NEWS_API_KEY exists:', !!process.env.NEWS_API_KEY);
    
    const elements = [];
    const seenHeadlines = new Set();
    
    if (!process.env.NEWS_API_KEY) {
        console.log('⚠️  NEWS_API_KEY not set, returning fallback data');
        return getFallbackElements();
    }
    
    try {
        // Fetch from multiple categories for variety
        const categories = ['business', 'technology', 'general', 'health', 'science'];
        const pageSize = 8; // Get 8 from each category
        
        for (const category of categories) {
            try {
                console.log(`Fetching ${category} news...`);
                const response = await axios.get('https://newsapi.org/v2/top-headlines', {
                    params: {
                        country: 'us',
                        category: category,
                        apiKey: process.env.NEWS_API_KEY,
                        pageSize: pageSize
                    },
                    timeout: 10000
                });
                
                if (response.data.articles) {
                    response.data.articles.forEach(article => {
                        const headline = article.title;
                        if (!headline) return;
                        
                        // Skip if already seen
                        const headlineLower = headline.toLowerCase();
                        if (seenHeadlines.has(headlineLower)) return;
                        
                        // Skip if it's already tragic
                        if (!headline.match(/death|kill|crash|disaster|crisis|war|attack|dead|murder|assassination|massacre|terrorist|bombing|shooting|mass shooting/i)) {
                            seenHeadlines.add(headlineLower);
                            
                            // Determine type based on category and content
                            let type = 'corporate';
                            if (category === 'technology' || headline.match(/tech|ai|software|digital|cyber|quantum|blockchain|apple|google|microsoft|meta|tesla|nvidia/i)) {
                                type = 'tech';
                            } else if (category === 'business' || headline.match(/business|economy|market|stock|trade|finance|bank|corporate|company|ceo|merger|acquisition/i)) {
                                type = 'corporate';
                            } else if (category === 'health' || headline.match(/health|medical|hospital|doctor|treatment|disease|medicine/i)) {
                                type = 'health';
                            } else if (category === 'science' || headline.match(/science|research|study|discovery|scientist|experiment/i)) {
                                type = 'science';
                            }
                            
                            elements.push({
                                type: type,
                                text: headline,
                                source: article.source?.name || 'News API',
                                real: true,
                                url: article.url || null
                            });
                        }
                    });
                }
                
                // Small delay between requests to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`Error fetching ${category} news:`, error.message);
                // Continue with other categories even if one fails
            }
        }
        
        console.log(`✅ Total elements collected from News API: ${elements.length}`);
        
        // If we got some real news, return it (shuffled for variety)
        if (elements.length > 0) {
            const shuffled = elements.sort(() => 0.5 - Math.random());
            return shuffled;
        }
        
    } catch (error) {
        console.error('Error fetching news from News API:', error.response?.data || error.message);
        // If it's an API key issue, the error will show here
        if (error.response?.status === 401) {
            console.error('API KEY ERROR: Invalid or missing API key');
        }
    }
    
    // Return fallback if News API fails
    console.log('Returning fallback data');
    return getFallbackElements();
}

function getFallbackElements() {
    return [
        { type: 'corporate', text: 'Tech startup raises $10M in Series A funding', source: 'Fallback' },
        { type: 'weather', text: 'Mild temperatures continue through weekend', source: 'Fallback' },
        { type: 'market', text: 'Markets close slightly higher on light trading', source: 'Fallback' },
        { type: 'traffic', text: 'Highway construction enters final phase', source: 'Fallback' }
    ];
}

async function getStockPhoto(searchTerm) {
    try {
        // Unsplash API - no key needed for demo/development
        const response = await axios.get('https://source.unsplash.com/800x600/?' + searchTerm);
        return response.request.res.responseUrl;
    } catch (error) {
        // Fallback to placeholder
        return `https://via.placeholder.com/800x600/cccccc/969696?text=${searchTerm}`;
    }
}

// Export it
module.exports = { getMundaneElements, getStockPhoto };