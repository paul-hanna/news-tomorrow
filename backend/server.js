// backend/server.js
require('dotenv').config();
const { getMundaneElements } = require('./newsScraper');
const { generateAIHeadline } = require('./aiHeadlineGenerator');
const express = require('express');
const cors = require('cors');
const Datastore = require('nedb');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database - PostgreSQL if configured, otherwise NeDB
let db;
let usePostgres = false;

try {
    const dbModule = require('./database');
    usePostgres = dbModule.usePostgres;
    if (usePostgres) {
        db = dbModule;
        console.log('✅ Using PostgreSQL database');
    } else {
        db = new Datastore({ filename: 'predictions.db', autoload: true });
        console.log('⚠️  Using NeDB (local dev). Set DB_HOST to use PostgreSQL.');
    }
} catch (error) {
    console.error('Database initialization error:', error);
    db = new Datastore({ filename: 'predictions.db', autoload: true });
    console.log('⚠️  Falling back to NeDB');
}

// Middleware
// CORS configuration - allow GitHub Pages and local dev
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
    /\.github\.io$/,  // Allow any GitHub Pages domain
  ].filter(Boolean),  // Remove undefined values
  credentials: true
}));
app.use(express.json());

// Basic test route
app.get('/', (req, res) => {
    res.json({ message: 'Tomorrow\'s Tragedy API Running' });
});

// Mundane route
app.get('/api/mundane', async (req, res) => {
    const elements = await getMundaneElements();
    res.json(elements);
});

// NYTimes scraper route - populate database with NYTimes articles
app.post('/api/populate/nytimes', async (req, res) => {
    try {
        const { scrapeNYTimesHomepage, populateFromNYTimes } = require('./nytimesScraper');
        const count = req.body.count || 15;
        
        console.log(`📰 Populating database with ${count} NYTimes articles...`);
        await populateFromNYTimes(count);
        
        res.json({ 
            success: true, 
            message: `Populated database with NYTimes articles`,
            count: count
        });
    } catch (error) {
        console.error('Error populating from NYTimes:', error);
        res.status(500).json({ error: 'Failed to populate from NYTimes: ' + error.message });
    }
});

// Populate with yesterday's articles route
app.post('/api/populate/yesterday', async (req, res) => {
    try {
        const { populateYesterdayArticles } = require('./populate-yesterday');
        
        console.log(`📰 Populating database with yesterday's NYTimes articles...`);
        await populateYesterdayArticles();
        
        res.json({ 
            success: true, 
            message: `Populated database with yesterday's articles`
        });
    } catch (error) {
        console.error('Error populating yesterday articles:', error);
        res.status(500).json({ error: 'Failed to populate: ' + error.message });
    }
});

// Cleanup route - delete predictions containing "Local"
app.post('/api/cleanup/local', async (req, res) => {
    try {
        if (!usePostgres) {
            return res.status(400).json({ error: 'PostgreSQL not configured. This only works with PostgreSQL.' });
        }
        
        // Set flag to skip wait when called via API
        const originalSkipWait = process.env.SKIP_WAIT;
        process.env.SKIP_WAIT = 'true';
        
        const { cleanupLocalPredictions } = require('./cleanup-local');
        const result = await cleanupLocalPredictions();
        
        // Restore original value
        if (originalSkipWait === undefined) {
            delete process.env.SKIP_WAIT;
        } else {
            process.env.SKIP_WAIT = originalSkipWait;
        }
        
        res.json({ 
            success: true, 
            message: `Cleaned up predictions containing "Local"`,
            deleted: result.deleted || 0
        });
    } catch (error) {
        console.error('Error cleaning up:', error);
        res.status(500).json({ error: 'Failed to cleanup: ' + error.message });
    }
});

// POST route to create predictions
app.post('/api/predict', async (req, res) => {
    const { elements } = req.body;
    
    if (!elements || elements.length === 0) {
        return res.status(400).json({ error: 'At least one element is required' });
    }
    
    // Use only the first element (single article)
    const singleElement = elements[0];
    const elementsArray = [singleElement];
    
    // Try AI generation first, fallback to template-based
    let headline;
    try {
        console.log('Attempting AI headline generation...');
        headline = await generateAIHeadline(elementsArray);
        if (!headline) {
            // Fallback to template-based generation
            console.log('⚠️  Using template-based headline generation (no AI API configured or failed)');
            headline = generateSimpleDisaster(elementsArray);
        } else {
            console.log('✅ AI-generated headline:', headline);
        }
    } catch (error) {
        console.error('❌ Error generating headline, using fallback:', error.message);
        headline = generateSimpleDisaster(elementsArray);
    }
    
    // Generate stock photo description
    const stockPhotoDesc = generateStockPhotoDescription(elementsArray);
    
    // Generate image URL (using Lorem Picsum - free, no API key)
    const randomId = Math.floor(Math.random() * 1000);
    const stockImageUrl = `https://picsum.photos/800/600?random=${randomId}`;
    
    const prediction = {
        components: elementsArray,
        headline: headline ? String(headline).replace(/[\x00-\x1F\x7F]/g, '').trim() : '',
        stockPhotoDescription: stockPhotoDesc ? String(stockPhotoDesc).replace(/[\x00-\x1F\x7F]/g, '').trim() : null,
        stockImageUrl: stockImageUrl || null,
        predicted_date: getTomorrowDate(),
        created_at: new Date(),
        came_true: false
    };
    
    // Save to database
    try {
        let newDoc;
        
        if (usePostgres) {
            // PostgreSQL - async
            newDoc = await db.insert(prediction);
            console.log('✅ Saved to PostgreSQL:', newDoc.headline);
        } else {
            // NeDB - callback-based
            newDoc = await new Promise((resolve, reject) => {
                db.insert(prediction, (err, doc) => {
                    if (err) reject(err);
                    else resolve(doc);
                });
            });
        }
        
        res.json(newDoc);
    } catch (error) {
        console.error('Error saving prediction:', error);
        res.status(500).json({ error: 'Failed to save' });
    }
});

// GET all predictions
app.get('/api/predictions', async (req, res) => {
    try {
        let docs;
        
        if (usePostgres) {
            // PostgreSQL - async
            docs = await db.find({});
            console.log(`📊 Retrieved ${docs.length} predictions from PostgreSQL`);
        } else {
            // NeDB - callback-based
            docs = await new Promise((resolve, reject) => {
                db.find({}).sort({ created_at: -1 }).exec((err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                });
            });
        }
        
        // Add default image fields for predictions that don't have them
        const docsWithImages = docs.map(doc => {
            if (!doc.stockImageUrl) {
                const randomId = doc._id ? doc._id.charCodeAt(0) * 1000 : Math.floor(Math.random() * 1000);
                doc.stockImageUrl = `https://picsum.photos/800/600?random=${randomId}`;
            }
            if (!doc.stockPhotoDescription) {
                doc.stockPhotoDescription = `Corporate event documentation`;
            }
            return doc;
        });
        
        res.json(docsWithImages);
    } catch (error) {
        console.error('Error fetching predictions:', error);
        res.status(500).json({ error: 'Failed to fetch' });
    }
});

// Helper functions
function generateSimpleDisaster(elements) {
    // Better extraction that properly gets company names
    function extractKeyTerms(text) {
        // Remove common articles and get the actual company name
        const cleanText = text.replace(/^(The|A|An)\s+/gi, '');
        
        // Better company extraction - check for known companies first
        const companyPatterns = [
            // Known tech companies
            /(Google|Apple|Amazon|Microsoft|Meta|Facebook|Netflix|Tesla|Twitter|X|OpenAI|Nvidia|Intel|AMD|IBM|Oracle|Salesforce|Adobe|Spotify|Uber|Lyft|Airbnb|PayPal|Square|Stripe|Zoom|Slack)/i,
            // Financial
            /(Goldman Sachs|Morgan Stanley|JP Morgan|JPMorgan|Bank of America|Wells Fargo|Citigroup|BlackRock|Visa|Mastercard|American Express)/i,
            // Retail/Consumer
            /(Walmart|Target|Costco|Home Depot|Starbucks|McDonald|Nike|Adidas|Disney|Coca-Cola|PepsiCo)/i,
        ];
        
        let company = null;
        
        // First try known companies
        for (const pattern of companyPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                company = match[1];
                break;
            }
        }
        
        // If no known company, look for capitalized words/phrases
        if (!company) {
            // Try to find company-like patterns (but not The/A/An)
            const genericPattern = /(?:^|[\s])([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)(?:\s+(?:Inc|Corp|LLC|Co|Ltd|Group|Technologies|Motors|Bank|Airlines))?/;
            const match = cleanText.match(genericPattern);
            if (match && match[1] && !['The', 'A', 'An', 'In', 'On', 'At', 'For'].includes(match[1])) {
                company = match[1];
            }
        }
        
        // Last resort - get first capitalized word that's not an article
        if (!company) {
            const words = cleanText.split(' ');
            for (const word of words) {
                if (word.match(/^[A-Z]/) && !['The', 'A', 'An', 'In', 'On', 'At', 'For', 'And', 'But', 'Or', 'As', 'Of'].includes(word)) {
                    company = word;
                    break;
                }
            }
        }
        
        // Better fallback - try to extract a meaningful noun from the headline
        let fallbackEntity = null;
        if (!company) {
            // Try to find a capitalized noun phrase (2-3 words max)
            const nounPhrase = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
            if (nounPhrase && nounPhrase[1]) {
                const phrase = nounPhrase[1];
                // Skip common words
                if (!['The', 'A', 'An', 'In', 'On', 'At', 'For', 'And', 'But', 'Or', 'As', 'Of', 'To', 'From'].includes(phrase.split(' ')[0])) {
                    fallbackEntity = phrase;
                }
            }
        }
        
        return {
            money: text.match(/\$[\d.]+[MBK]?(?:illion)?/gi)?.[0],
            numbers: text.match(/\d+/g) || [],
            company: company || fallbackEntity || null, // Return null instead of generic terms
            action: text.match(/(announces|launches|raises|reports|reveals|unveils|opens|expands|acquires|releases|celebrates|completes|introduces|partners|debuts|starts)/gi)?.[0],
            tech: text.match(/(AI|app|platform|software|cloud|data|digital|cyber|quantum|blockchain|metaverse|iPhone|Android|GPU|chip)/gi)?.[0],
        };
    }
    
    const parsed = elements.map(e => ({
        ...e,
        terms: extractKeyTerms(e.text)
    }));
    
    // Find elements with real content
    const corporate = parsed.find(e => e.type === 'corporate' && e.real) || parsed[0];
    const tech = parsed.find(e => e.type === 'tech' && e.real);
    const weather = parsed.find(e => e.type === 'weather');
    
    // Extract the best details - prefer actual entity names, avoid generic fallbacks
    let company = corporate.terms.company || tech?.terms.company;
    
    // If no company found, try to extract from the headline text directly
    if (!company && corporate) {
        const headline = corporate.text || '';
        // Try to find a meaningful entity - look for capitalized words/phrases
        const entityMatch = headline.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/);
        if (entityMatch && entityMatch[1]) {
            const candidate = entityMatch[1];
            // Skip common words
            if (!['The', 'A', 'An', 'In', 'On', 'At', 'For', 'And', 'But', 'Or', 'As', 'Of', 'To', 'From', 'New', 'Old'].includes(candidate.split(' ')[0])) {
                company = candidate;
            }
        }
    }
    
    // Last resort: use first few words of headline if it's meaningful
    if (!company && corporate) {
        const words = (corporate.text || '').split(' ').slice(0, 3).filter(w => 
            w.length > 2 && !['The', 'A', 'An', 'In', 'On', 'At', 'For', 'And', 'But', 'Or', 'As', 'Of', 'To', 'From'].includes(w)
        );
        if (words.length > 0) {
            company = words.join(' ');
        }
    }
    const money = corporate.terms.money || tech?.terms.money;
    
    // FIXED: Better number generation with more variety
    const allNumbers = [...corporate.terms.numbers, ...(tech?.terms.numbers || [])];
    
    // Generate varied casualty numbers if none found in news
    const casualtyNumbers = [3, 5, 7, 8, 9, 11, 13, 14, 16, 17, 18, 19, 21, 23, 24, 26, 28, 31, 34, 37, 42, 43, 47, 51, 56];
    const largeNumbers = [67, 73, 89, 94, 112, 127, 134, 147, 156, 178, 189, 203, 234, 267, 289, 312, 347, 389, 412, 456];
    
    // Try to use real numbers from articles, otherwise generate random ones
    let bigNumber, smallNumber;
    
    if (allNumbers.length > 0) {
        // Use real numbers but add some variation
        const realNumber = parseInt(allNumbers[Math.floor(Math.random() * allNumbers.length)]);
        smallNumber = Math.min(realNumber, casualtyNumbers[Math.floor(Math.random() * casualtyNumbers.length)]);
        bigNumber = Math.max(realNumber, largeNumbers[Math.floor(Math.random() * largeNumbers.length)]);
    } else {
        // No numbers in news, use random selection
        smallNumber = casualtyNumbers[Math.floor(Math.random() * casualtyNumbers.length)];
        bigNumber = largeNumbers[Math.floor(Math.random() * largeNumbers.length)];
    }
    
    // Sometimes swap them for variety
    if (Math.random() > 0.7) {
        [smallNumber, bigNumber] = [bigNumber, smallNumber];
    }
    
    const action = corporate.terms.action || tech?.terms.action || 'event';
    const techTerm = tech?.terms.tech || corporate.terms.tech;
    
    // Disaster types with subtle sardonic tone (irony implicit, not explained)
    const disasterTypes = [
        // Chemical/Gas disasters - subtle irony
        () => {
            const gases = ['Carbon Monoxide', 'Toxic Gas', 'Chemical Vapor', 'Unknown Fumes'];
            const gas = gases[Math.floor(Math.random() * gases.length)];
            const entity = company || 'Headquarters';
            return `${entity} ${action} Deaths: ${smallNumber} Dead From ${gas} Leak in Ventilation System | Developing via ${corporate.source || 'Wire Services'}`;
        },
        
        // Fire disasters - subtle
        () => {
            const causes = ['Electrical Fire', 'Server Room Blaze', 'Kitchen Fire', 'HVAC Explosion'];
            const cause = causes[Math.floor(Math.random() * causes.length)];
            const entity = company || 'Headquarters';
            return `${cause} During ${entity} ${action} Event Kills ${smallNumber}, Hundreds Evacuated | Developing via ${corporate.source || 'Wire Services'}`;
        },
        
        // Crushing/Stampede - subtle
        () => {
            const entity = company || 'Event';
            return `Stampede at ${entity} ${action} Announcement: ${bigNumber} Injured in Crowd Surge, ${smallNumber} Critical | Developing via ${corporate.source || 'Wire Services'}`;
        },
        
        // Elevator/Escalator - subtle
        () => {
            const types = ['Elevator Plunges 40 Floors', 'Escalator Suddenly Reverses', 'Elevator Cables Snap'];
            const type = types[Math.floor(Math.random() * types.length)];
            const entity = company ? `${company} Headquarters` : 'Headquarters';
            return `${entity}: ${type} During ${action} Event - ${smallNumber} Dead | Developing via ${corporate.source || 'Wire Services'}`;
        },
        
        // Food poisoning - subtle
        () => {
            const entity = company || 'Event';
            return `Mass Poisoning at ${entity} ${action} Celebration: ${bigNumber} Hospitalized After Catered Lunch | Developing via ${corporate.source || 'Wire Services'}`;
        },
        
        // Technology disasters - subtle
        () => {
            if (techTerm) {
                const entity = company || 'System';
                return `${entity}'s ${techTerm} System Malfunction Causes Fatal Power Surge - ${smallNumber} Electrocuted | Developing via ${corporate.source || 'Wire Services'}`;
            }
            const entity = company || 'Data Center';
            return `${entity} Cooling Failure: ${smallNumber} Die from Heat Stroke Trapped Inside | Developing via ${corporate.source || 'Wire Services'}`;
        },
        
        // Ceiling/Floor collapse - subtle
        () => {
            const types = ['Ceiling', 'Glass Skylight', 'Floor', 'Parking Garage'];
            const type = types[Math.floor(Math.random() * types.length)];
            const entity = company || 'Building';
            return `${type} Collapse at ${entity} Kills ${smallNumber} During "${action}" Ceremony | Developing via ${corporate.source || 'Wire Services'}`;
        },
        
        // Vehicle disasters - subtle
        () => {
            const entity = company || 'Event';
            return `${entity} Shuttle Bus Crash After ${action} Event: ${smallNumber} Dead, ${bigNumber} Injured | Developing via ${corporate.source || 'Wire Services'}`;
        },
        
        // Bizarre accidents - subtle
        () => {
            const entity = company || 'Headquarters';
            const bizarre = [
                `Giant LED Display Falls During ${entity} ${action} Presentation - ${smallNumber} Crushed | Developing via ${corporate.source || 'Wire Services'}`,
                `${entity} Aquarium Explodes, ${smallNumber} Drown in Lobby Flash Flood | Developing via ${corporate.source || 'Wire Services'}`,
                `Industrial Robot Malfunctions at ${entity} Demo, ${smallNumber} Fatal Injuries | Developing via ${corporate.source || 'Wire Services'}`,
                `${entity} Rooftop Party Railing Collapse During ${action} Toast - ${smallNumber} Fall to Deaths | Developing via ${corporate.source || 'Wire Services'}`
            ];
            return bizarre[Math.floor(Math.random() * bizarre.length)];
        },
        
        // Using money amounts - subtle
        () => {
            if (money) {
                const entity = company || 'Founder';
                return `"We Just Raised ${money}" Were His Last Words: ${entity} Among ${smallNumber} Dead in Champagne Explosion | Developing via ${corporate.source || 'Wire Services'}`;
            }
            const entity = company || 'Building';
            return `${entity} IPO Bell Ringing Triggers Structural Resonance - Building Evacuated, ${smallNumber} Missing | Developing via ${corporate.source || 'Wire Services'}`;
        },
        
        // Mass illness - subtle
        () => {
            const causes = ['Legionnaires Disease', 'Mass Hallucinations', 'Severe Allergic Reactions', 'Mystery Illness'];
            const cause = causes[Math.floor(Math.random() * causes.length)];
            const entity = company || 'Campus';
            return `${cause} Strikes ${entity} After ${action} - ${bigNumber} Hospitalized | Developing via ${corporate.source || 'Wire Services'}`;
        },
        
        // Weather-related - subtle
        () => {
            if (weather) {
                const weatherTerm = weather.text.match(/\d+\s*degrees?|rain|snow|wind|fog/i)?.[0] || 'conditions';
                const entity = company || 'Building';
                return `${entity} Glass Facade Shatters in ${weatherTerm}, Shards Rain on ${action} Attendees - ${smallNumber} Dead | Developing via ${corporate.source || 'Wire Services'}`;
            }
            const entity = company || 'Building';
            return `Lightning Strikes ${entity} During ${action} Speech - Entire Executive Team Killed | Developing via ${corporate.source || 'Wire Services'}`;
        }
    ];
    
    // Pick a random disaster type
    const disaster = disasterTypes[Math.floor(Math.random() * disasterTypes.length)]();
    
    // Return the disaster (source already included in templates)
    return disaster;
}

function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

// Add stock photo description generator
// In backend/server.js, add this function before your routes:

// Add this function in backend/server.js (after your generateSimpleDisaster function)
function generateStockPhotoDescription(elements) {
    const subjects = [
        'Diverse team high-fiving in modern office',
        'Smiling businesswoman looking at laptop',
        'Happy employees celebrating around conference table',
        'Professional shaking hands in bright lobby',
        'Team laughing during casual meeting',
        'Excited startup founders toasting success',
        'Cheerful customer service representative',
        'Joyful team building exercise outdoors',
        'Optimistic executives reviewing growth charts',
        'Enthusiastic interns on first day'
    ];
    
    const settings = [
        'with natural lighting',
        'in contemporary workspace',
        'with city skyline background',
        'in glass-walled meeting room',
        'at rooftop party',
        'in open-plan office',
        'with lens flare effect',
        'shot from low angle'
    ];
    
    const moods = [
        'expressing authentic joy',
        'showing genuine excitement',
        'radiating confidence',
        'demonstrating synergy',
        'embodying success',
        'projecting optimism'
    ];
    
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const setting = settings[Math.floor(Math.random() * settings.length)];
    const mood = moods[Math.floor(Math.random() * moods.length)];
    
    return `Stock Photo #${Math.floor(Math.random() * 99999)}: ${subject} ${setting}, ${mood}`;
}

// POST route to create prediction from URL
app.post('/api/predict/from-url', async (req, res) => {
    const { url } = req.body;
    
    if (!url || !url.trim()) {
        return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
        const { scrapeArticle, articleToElement } = require('./urlScraper');
        
        // Scrape the article
        const article = await scrapeArticle(url.trim());
        
        if (!article.success) {
            return res.status(400).json({ error: article.error || 'Failed to scrape article' });
        }
        
        // Convert to element format
        const element = articleToElement(article);
        const elementsArray = [element];
        
        // Try AI generation first, fallback to template-based
        let headline;
        try {
            console.log('Attempting AI headline generation from URL...');
            headline = await generateAIHeadline(elementsArray);
            if (!headline) {
                console.log('⚠️  Using template-based headline generation (no AI API configured or failed)');
                headline = generateSimpleDisaster(elementsArray);
            } else {
                console.log('✅ AI-generated headline from URL:', headline);
            }
        } catch (error) {
            console.error('❌ Error generating headline, using fallback:', error.message);
            headline = generateSimpleDisaster(elementsArray);
        }
        
        // Generate stock photo description
        const stockPhotoDesc = generateStockPhotoDescription(elementsArray);
        
        // Generate image URL
        const randomId = Math.floor(Math.random() * 1000);
        const stockImageUrl = `https://picsum.photos/800/600?random=${randomId}`;
        
        const prediction = {
            components: elementsArray,
            headline: headline ? String(headline).replace(/[\x00-\x1F\x7F]/g, '').trim() : '',
            stockPhotoDescription: stockPhotoDesc ? String(stockPhotoDesc).replace(/[\x00-\x1F\x7F]/g, '').trim() : null,
            stockImageUrl: stockImageUrl || null,
            predicted_date: getTomorrowDate(),
            created_at: new Date(),
            came_true: false,
            source_url: url
        };
        
        // Save to database
        try {
            let newDoc;
            
            if (usePostgres) {
                // PostgreSQL - async
                newDoc = await db.insert(prediction);
                console.log('✅ Saved URL prediction to PostgreSQL:', newDoc.headline);
            } else {
                // NeDB - callback-based
                newDoc = await new Promise((resolve, reject) => {
                    db.insert(prediction, (err, doc) => {
                        if (err) reject(err);
                        else resolve(doc);
                    });
                });
            }
            
            res.json({
                ...newDoc,
                article: {
                    title: article.title,
                    source: article.source,
                    description: article.description
                }
            });
        } catch (error) {
            console.error('Error saving URL prediction:', error);
            res.status(500).json({ error: 'Failed to save prediction' });
        }
        
    } catch (error) {
        console.error('Error processing URL:', error);
        res.status(500).json({ error: 'Failed to process URL: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Routes available:');
    console.log('  GET  http://localhost:3001/api/mundane');
    console.log('  POST http://localhost:3001/api/predict');
    console.log('  POST http://localhost:3001/api/predict/from-url');
    console.log('  GET  http://localhost:3001/api/predictions');
    console.log('  POST http://localhost:3001/api/populate/nytimes');
    console.log('  POST http://localhost:3001/api/populate/yesterday');
    console.log('  POST http://localhost:3001/api/cleanup/local');
});