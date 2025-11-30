// backend/test-post.js
const axios = require('axios');

async function getMundaneAndPredict() {
    try {
        // First get current mundane elements
        const mundaneResponse = await axios.get('http://localhost:3001/api/mundane');
        const elements = mundaneResponse.data;
        
        console.log('\nUsing these mundane elements:');
        elements.forEach(e => console.log(`- ${e.type}: ${e.text}`));
        
        // Now create prediction
        const predictResponse = await axios.post('http://localhost:3001/api/predict', {
            elements: elements
        });
        
        console.log('\nGenerated disaster:');
        console.log(predictResponse.data.headline);
        console.log('\n---');
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run it 3 times to see variety
getMundaneAndPredict();
setTimeout(() => getMundaneAndPredict(), 1000);
setTimeout(() => getMundaneAndPredict(), 2000);