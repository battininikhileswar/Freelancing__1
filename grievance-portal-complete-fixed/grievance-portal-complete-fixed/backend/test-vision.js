require('dotenv').config();
const { detectIssueFromImage } = require('./src/services/openaiVisionService');
const fs = require('fs');

const testImages = [
  { name: 'road pothole', path: 'pothole.jpg' },
  { name: 'garbage', path: 'garbage.jpg' },
  { name: 'streetlight', path: 'streetlight.jpg' },
  { name: 'water/sewage', path: 'water.jpg' }
];

async function runTests() {
  for (const img of testImages) {
    console.log(`\n--- Testing: ${img.name} ---`);
    try {
      const buffer = fs.readFileSync(img.path);
      const result = await detectIssueFromImage(buffer, 'image/jpeg', img.path);
      console.log('Result:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('Test failed for', img.name, e.message);
    }
  }
}

runTests();
