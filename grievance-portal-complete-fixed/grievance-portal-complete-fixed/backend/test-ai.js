const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testAI() {
  const form = new FormData();
  // Using a dummy file to test the AI route
  form.append('image', Buffer.from('dummy image data'), 'dummy.jpg');

  try {
    const res = await axios.post('http://localhost:5000/api/complaints/detect-issue', form, {
      headers: form.getHeaders()
    });
    console.log('AI API Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('AI API Error:', err.response?.data || err.message);
  }
}

testAI();
