// backend/test-news-api.js
require('dotenv').config();
const axios = require('axios');

async function testAPI() {
    console.log('Testing News API...');
    console.log('API Key:', process.env.NEWS_API_KEY ? 'Found' : 'NOT FOUND');
    
    try {
        const response = await axios.get('https://newsapi.org/v2/top-headlines', {
            params: {
                country: 'us',
                apiKey: process.env.NEWS_API_KEY,
                pageSize: 3
            }
        });
        
        console.log('Success! Got articles:');
        response.data.articles.forEach((article, i) => {
            console.log(`${i + 1}. ${article.title}`);
        });
    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
    }
}

testAPI();
