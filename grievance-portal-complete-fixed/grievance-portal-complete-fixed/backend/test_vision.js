const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const { detectIssueFromImage } = require('./src/services/openaiVisionService.js');

async function downloadImage(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
}

async function testVision() {
  const testCases = [
    {
      name: 'Pothole',
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Pothole_on_a_road.jpg',
      expected: 'pothole'
    },
    {
      name: 'Garbage',
      url: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Garbage_dumping_in_India.jpg',
      expected: 'garbage'
    },
    {
      name: 'Passport (Not a complaint)',
      url: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Passport_photo_sample.jpg',
      expected: 'not_a_complaint'
    },
    {
      name: 'Cat (Random)',
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/4d/Cat_November_2010-1a.jpg',
      expected: 'not_a_complaint'
    },
    {
      name: 'Unclear Image (Black)',
      url: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Solid_black.png',
      expected: 'uncertain'
    }
  ];

  for (const tc of testCases) {
    console.log(`\n============================`);
    console.log(`🧪 Testing: ${tc.name}`);
    console.log(`URL: ${tc.url}`);
    
    try {
      const buffer = await downloadImage(tc.url);
      const result = await detectIssueFromImage(buffer, 'image/jpeg', 'test.jpg');
      
      console.log(`Result:`);
      console.log(`is_complaint: ${result.is_complaint}`);
      console.log(`category: ${result.category}`);
      console.log(`analysis: ${result.analysis}`);
      
      const success = (result.category === tc.expected) || (result.is_complaint === false && tc.expected === 'not_a_complaint');
      console.log(`Test ${success ? '✅ PASSED' : '❌ FAILED'}`);
    } catch (e) {
      console.error('Error:', e);
    }
  }
}

testVision();
