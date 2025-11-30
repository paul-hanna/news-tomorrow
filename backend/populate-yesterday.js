#!/usr/bin/env node
// Script to populate database with yesterday's NYTimes articles
// Usage: node populate-yesterday.js

const axios = require('axios');
const { scrapeNYTimesHomepage } = require('./nytimesScraper');

async function populateYesterdayArticles() {
    try {
        console.log('\n📰 Fetching yesterday\'s articles from NYTimes...\n');
        
        // Fetch a large number of articles to get good coverage
        const articles = await scrapeNYTimesHomepage(50);
        
        if (articles.length === 0) {
            console.log('❌ No articles found. NYTimes may have changed their structure.');
            return;
        }
        
        console.log(`✅ Found ${articles.length} articles from NYTimes\n`);
        console.log('Generating predictions for all articles...\n');
        
        const baseUrl = process.env.API_URL || 'http://localhost:3001';
        let successCount = 0;
        let errorCount = 0;
        const errors = [];
        
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            const headlinePreview = article.text.substring(0, 60);
            console.log(`[${i + 1}/${articles.length}] ${headlinePreview}...`);
            
            try {
                const response = await axios.post(`${baseUrl}/api/predict`, {
                    elements: [article]
                }, {
                    timeout: 30000
                });
                
                console.log(`  ✅ ${response.data.headline.substring(0, 70)}...`);
                successCount++;
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1500));
            } catch (error) {
                if (error.code === 'ECONNREFUSED') {
                    console.log(`  ❌ Cannot connect to server at ${baseUrl}. Is the server running?`);
                    console.log(`     Try: cd backend && node server.js`);
                    break;
                } else if (error.response?.status === 400 && error.response?.data?.error?.includes('already')) {
                    console.log(`  ⚠️  Already exists, skipping...`);
                } else {
                    const errorMsg = error.response?.data?.error || error.message;
                    console.log(`  ❌ Error: ${errorMsg}`);
                    errors.push({ article: headlinePreview, error: errorMsg });
                    errorCount++;
                }
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Successfully generated: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📰 Total articles processed: ${articles.length}`);
        
        if (errors.length > 0) {
            console.log(`\n⚠️  Errors encountered:`);
            errors.slice(0, 5).forEach(({ article, error }) => {
                console.log(`   - ${article}: ${error}`);
            });
            if (errors.length > 5) {
                console.log(`   ... and ${errors.length - 5} more`);
            }
        }
        
        console.log(`\n✅ Done! Database populated with ${successCount} predictions from yesterday's articles.\n`);
        
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    populateYesterdayArticles()
        .then(() => {
            process.exit(0);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { populateYesterdayArticles };

