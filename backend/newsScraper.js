// backend/newsScraper.js
const axios = require('axios');
require('dotenv').config();

async function getMundaneElements() {
    console.log('NEWS_API_KEY exists:', !!process.env.NEWS_API_KEY);
    console.log('API Key first 10 chars:', process.env.NEWS_API_KEY?.substring(0, 10));
    
    const elements = [];
    
    try {
        // Test with a simpler API call first
        console.log('Fetching business news...');
        const businessNews = await axios.get('https://newsapi.org/v2/top-headlines', {
            params: {
                country: 'us',
                category: 'business',
                apiKey: process.env.NEWS_API_KEY,
                pageSize: 10
            }
        });
        
        console.log('Business news response status:', businessNews.data.status);
        console.log('Number of articles:', businessNews.data.articles?.length);
        
        // Process business headlines
        if (businessNews.data.articles) {
            businessNews.data.articles.forEach(article => {
                const headline = article.title;
                console.log('Processing headline:', headline);
                
                // Skip if it's already tragic
                if (headline && !headline.match(/death|kill|crash|disaster|crisis|war|attack|dead/i)) {
                    elements.push({
                        type: 'corporate',
                        text: headline,
                        source: article.source.name,
                        real: true
                    });
                }
            });
        }
        
        console.log('Total elements collected:', elements.length);
        
        // If we got some real news, return it
        if (elements.length > 0) {
            return elements.slice(0, 6);
        }
        
    } catch (error) {
        console.error('Error fetching news:', error.response?.data || error.message);
        // If it's an API key issue, the error will show here
        if (error.response?.status === 401) {
            console.error('API KEY ERROR: Invalid or missing API key');
        }
    }
    
    // Return fallback
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