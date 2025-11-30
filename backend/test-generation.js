// backend/test-generation.js
require('dotenv').config();
const { getMundaneElements } = require('./newsScraper');

async function testGeneration() {
    console.log('Testing headline generation...\n');
    
    const elements = await getMundaneElements();
    console.log('Got elements:', elements.map(e => `${e.type}: ${e.text.substring(0, 50)}...`));
    
    // Test generating 5 different headlines from same elements
    console.log('\nGenerating 5 headlines from same elements:\n');
    
    // Import your generateSimpleDisaster function here
    // You'll need to export it from server.js first
    
    for (let i = 0; i < 5; i++) {
        // Simulate what your server does
        const shuffled = [...elements].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        console.log(`${i + 1}. Selected types:`, selected.map(e => e.type).join(', '));
    }
}

testGeneration();