// backend/nytimesScraper.js
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Scrapes NYTimes homepage for article headlines and URLs
 * Returns an array of elements in the format expected by the prediction system
 */
async function scrapeNYTimesHomepage(count = 20) {
    try {
        console.log('Scraping NYTimes homepage...');
        
        // Fetch the NYTimes homepage with browser-like headers
        const response = await axios.get('https://www.nytimes.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Referer': 'https://www.google.com/'
            },
            timeout: 15000
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        const articles = [];
        const seenHeadlines = new Set();
        
        // Strategy 1: Find all article links and extract headlines
        $('a[href*="/202"]').each((i, elem) => {
            if (articles.length >= count) return false;
            
            const $link = $(elem);
            let url = $link.attr('href');
            if (!url) return;
            
            // Make sure it's a full URL
            if (!url.startsWith('http')) {
                url = 'https://www.nytimes.com' + url;
            }
            
            // Skip non-article URLs
            if (!url.match(/\/\d{4}\/\d{2}\/\d{2}\//)) return;
            
            // Try to find headline text - could be in the link itself or nearby
            let headline = $link.text().trim();
            
            // If link text is empty or too short, look for nearby heading
            if (!headline || headline.length < 10) {
                const $heading = $link.find('h2, h3, h4').first();
                if ($heading.length) {
                    headline = $heading.text().trim();
                } else {
                    // Look for heading in parent
                    const $parentHeading = $link.parent().find('h2, h3, h4').first();
                    if ($parentHeading.length) {
                        headline = $parentHeading.text().trim();
                    } else {
                        // Look for data attributes
                        headline = $link.attr('aria-label') || $link.attr('title') || '';
                    }
                }
            }
            
            // Clean up headline
            headline = headline.replace(/\s+/g, ' ').trim();
            
            // Skip navigation items and non-article content
            const skipPatterns = [
                /^(see all|subscribe|log in|sign up|skip|menu|search|games|cooking|wirecutter|the athletic)/i,
                /^(play |listen |watch |read |more |all |newsletter|podcast|quiz|crossword|wordle|spelling bee)/i,
                /^(mini to maestro|5 minutes to|are you smarter|weekend reads|in case you missed)/i,
                /<img/i, // Skip if headline contains HTML
                /^[^a-zA-Z]*$/, // Skip if no letters
            ];
            
            const shouldSkip = skipPatterns.some(pattern => pattern.test(headline));
            
            // Skip if empty, too short, already seen, or matches skip patterns
            if (headline && headline.length > 15 && !seenHeadlines.has(headline.toLowerCase()) && !shouldSkip) {
                // Skip if it's already tragic
                if (!headline.match(/death|kill|crash|disaster|war|attack|dead|murder|assassination|massacre|terrorist|bombing|shooting|mass shooting/i)) {
                    seenHeadlines.add(headline.toLowerCase());
                    
                    // Determine type based on content
                    let type = 'corporate';
                    if (headline.match(/politic|election|congress|senate|president|government|policy|legislation|vote|democrat|republican|biden|trump|kamala|harris/i)) {
                        type = 'political';
                    } else if (headline.match(/international|world|country|nation|diplomat|summit|treaty|geopolitic|russia|china|ukraine|israel|palestine|nato|eu|united nations/i)) {
                        type = 'world';
                    } else if (headline.match(/tech|ai|software|digital|cyber|quantum|blockchain|apple|google|microsoft|meta|tesla|nvidia/i)) {
                        type = 'tech';
                    } else if (headline.match(/business|economy|market|stock|trade|finance|bank|corporate|company|ceo|merger|acquisition/i)) {
                        type = 'corporate';
                    }
                    
                    articles.push({
                        type: type,
                        text: headline,
                        source: 'The New York Times',
                        real: true,
                        url: url
                    });
                }
            }
        });
        
        // Strategy 2: Try data-testid selectors
        $('[data-testid="headline"]').each((i, elem) => {
            if (articles.length >= count) return false;
            
            const $elem = $(elem);
            let headline = $elem.text().trim();
            if (!headline || headline.length < 10) return;
            
            // Find parent link
            const $link = $elem.closest('a[href]');
            let url = null;
            if ($link.length) {
                url = $link.attr('href');
                if (url && !url.startsWith('http')) {
                    url = 'https://www.nytimes.com' + url;
                }
            }
            
            headline = headline.replace(/\s+/g, ' ').trim();
            
            // Skip navigation items
            const skipPatterns = [
                /^(see all|subscribe|log in|sign up|skip|menu|search|games|newsletter|podcast)/i,
                /<img/i,
            ];
            const shouldSkip = skipPatterns.some(pattern => pattern.test(headline));
            
            if (headline && headline.length > 15 && !seenHeadlines.has(headline.toLowerCase()) && !shouldSkip) {
                if (!headline.match(/death|kill|crash|disaster|war|attack|dead|murder|assassination/i)) {
                    seenHeadlines.add(headline.toLowerCase());
                    
                    let type = 'corporate';
                    if (headline.match(/politic|election|congress|senate|president|government/i)) {
                        type = 'political';
                    } else if (headline.match(/international|world|country|nation/i)) {
                        type = 'world';
                    }
                    
                    articles.push({
                        type: type,
                        text: headline,
                        source: 'The New York Times',
                        real: true,
                        url: url || null
                    });
                }
            }
        });
        
        // Also try to extract from data attributes and JSON-LD
        try {
            // Look for JSON-LD structured data
            $('script[type="application/ld+json"]').each((i, elem) => {
                if (articles.length >= count) return false;
                
                try {
                    const jsonData = JSON.parse($(elem).html());
                    if (jsonData['@type'] === 'NewsArticle' || jsonData['@type'] === 'Article') {
                        const headline = jsonData.headline || jsonData.name;
                        const url = jsonData.url || jsonData['@id'];
                        
                        if (headline && headline.length > 10 && !seenHeadlines.has(headline.toLowerCase())) {
                            if (!headline.match(/death|kill|crash|disaster|war|attack|dead|murder|assassination/i)) {
                                seenHeadlines.add(headline.toLowerCase());
                                
                                let type = 'corporate';
                                if (headline.match(/politic|election|congress|senate|president|government/i)) {
                                    type = 'political';
                                } else if (headline.match(/international|world|country|nation/i)) {
                                    type = 'world';
                                }
                                
                                articles.push({
                                    type: type,
                                    text: headline,
                                    source: 'The New York Times',
                                    real: true,
                                    url: url || null
                                });
                            }
                        }
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            });
        } catch (e) {
            console.log('Error parsing JSON-LD:', e.message);
        }
        
        // Shuffle and limit
        const shuffled = articles.sort(() => 0.5 - Math.random());
        const result = shuffled.slice(0, count);
        
        console.log(`✅ Scraped ${result.length} articles from NYTimes homepage`);
        return result;
        
    } catch (error) {
        console.error('Error scraping NYTimes:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
        return [];
    }
}

/**
 * Populate database with NYTimes articles by generating predictions
 */
async function populateFromNYTimes(count = 15) {
    try {
        console.log(`\n📰 Fetching ${count} articles from NYTimes homepage...`);
        const articles = await scrapeNYTimesHomepage(count);
        
        if (articles.length === 0) {
            console.log('❌ No articles found. NYTimes may have changed their structure or is blocking requests.');
            return;
        }
        
        console.log(`\n✅ Found ${articles.length} articles. Generating predictions...\n`);
        
        // Use axios (already imported at top)
        const baseUrl = process.env.API_URL || 'http://localhost:3001';
        
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            console.log(`[${i + 1}/${articles.length}] Processing: ${article.text.substring(0, 60)}...`);
            
            try {
                // Generate prediction for this article
                const response = await axios.post(`${baseUrl}/api/predict`, {
                    elements: [article]
                }, {
                    timeout: 30000 // 30 second timeout
                });
                
                console.log(`  ✅ Generated: ${response.data.headline}`);
                successCount++;
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                if (error.code === 'ECONNREFUSED') {
                    console.log(`  ❌ Error: Cannot connect to server at ${baseUrl}. Is the server running?`);
                    console.log(`     Try: cd backend && node server.js`);
                } else if (error.response?.status === 400 && error.response?.data?.error?.includes('already')) {
                    console.log(`  ⚠️  Already exists, skipping...`);
                } else if (error.response) {
                    console.log(`  ❌ Error (${error.response.status}): ${error.response.data?.error || JSON.stringify(error.response.data)}`);
                    errorCount++;
                } else if (error.request) {
                    console.log(`  ❌ Error: No response from server. Is it running at ${baseUrl}?`);
                    errorCount++;
                } else {
                    console.log(`  ❌ Error: ${error.message}`);
                    if (error.stack) {
                        console.log(`     Stack: ${error.stack.split('\n')[1]?.trim()}`);
                    }
                    errorCount++;
                }
            }
        }
        
        console.log(`\n📊 Summary:`);
        console.log(`   ✅ Successfully generated: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);
        console.log(`   📰 Total articles processed: ${articles.length}\n`);
        
    } catch (error) {
        console.error('Error populating from NYTimes:', error);
    }
}

module.exports = { scrapeNYTimesHomepage, populateFromNYTimes };

// If run directly, populate the database
if (require.main === module) {
    const count = parseInt(process.argv[2]) || 15;
    populateFromNYTimes(count)
        .then(() => {
            console.log('Done!');
            process.exit(0);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

