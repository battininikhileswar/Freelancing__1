require('dotenv').config();
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api/complaints';

async function runIntegrationTests() {
  console.log('--- STARTING INTEGRATION TESTS ---');

  // Utility to submit complaint
  const submitComplaint = async (desc, aiVisionData = null, attachFile = null) => {
    const form = new FormData();
    form.append('category', 'civic_issue');
    form.append('subcategory', 'road_damage');
    form.append('description', desc);
    form.append('isAnonymous', 'true');
    form.append('location', JSON.stringify({
      address: 'Test Location', state: 'maharashtra', district: 'mumbai', lat: 19.076, lng: 72.877
    }));

    if (aiVisionData) {
      form.append('aiVisionResult', JSON.stringify(aiVisionData));
    }
    
    if (attachFile && fs.existsSync(attachFile)) {
      form.append('attachments', fs.createReadStream(attachFile));
    }

    try {
      const res = await axios.post(API_URL, form, { headers: form.getHeaders() });
      return { success: true, complaintId: res.data.data.id };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  };

  // TEST 1: VALID POTHOLE (Perfect valid metadata)
  console.log('\\n[TEST 1] Submitting Valid Pothole AI Metadata...');
  const res1 = await submitComplaint('Huge pothole on main street.', {
    provider: 'gemini',
    model: 'gemini-3.6-flash',
    detectedIssue: 'Pothole',
    category: 'civic_issue',
    subcategory: 'road_damage',
    confidence: 0.98,
    severity: 'high',
    isRelevant: true,
    analysis: 'Image clearly shows a massive pothole.',
    reason: 'Deep damage in tarmac.'
  });
  console.log('Test 1 Result:', res1);

  // TEST 2: PASSPORT PHOTO (Invalid category and isRelevant:false)
  console.log('\\n[TEST 2] Submitting Passport Photo (Invalid payload, should NOT store aiVision)...');
  const res2 = await submitComplaint('Trying to submit a selfie.', {
    provider: 'gemini',
    model: 'gemini-3.6-flash',
    detectedIssue: 'None',
    category: 'not_a_complaint',
    subcategory: 'other_civic',
    confidence: 0.99,
    severity: 'none',
    isRelevant: false,
    analysis: 'Image of a human face.',
    reason: 'Passport photo'
  });
  console.log('Test 2 Result:', res2);

  // TEST 3: GARBAGE (Valid)
  console.log('\\n[TEST 3] Submitting Garbage AI Metadata...');
  const res3 = await submitComplaint('Garbage dumped here.', {
    provider: 'gemini',
    model: 'gemini-3.6-flash',
    detectedIssue: 'Garbage',
    category: 'civic_issue',
    subcategory: 'garbage',
    confidence: 0.85,
    severity: 'medium',
    isRelevant: true,
    analysis: 'Pile of trash.'
  });
  console.log('Test 3 Result:', res3);

  // TEST 4: NO AI ANALYSIS
  console.log('\\n[TEST 4] Submitting without AI Analysis...');
  const res4 = await submitComplaint('No photo attached, just text.');
  console.log('Test 4 Result:', res4);

  // VERIFY FIRESTORE (Fetch documents directly from DB to verify schema)
  console.log('\\n--- VERIFYING FIRESTORE DOCUMENTS ---');
  const { getDb } = require('./src/config/firebase');
  const db = getDb();
  
  if (res1.success) {
    const doc1 = await db.collection('complaints').doc(res1.complaintId).get();
    console.log('Doc 1 (Valid Pothole) aiVision exists:', !!doc1.data().aiVision);
    if (doc1.data().aiVision) console.log('Doc 1 aiVision:', doc1.data().aiVision);
  }

  if (res2.success) {
    const doc2 = await db.collection('complaints').doc(res2.complaintId).get();
    console.log('Doc 2 (Passport) aiVision exists:', !!doc2.data().aiVision);
    if (doc2.data().aiVision) console.log('Doc 2 aiVision:', doc2.data().aiVision);
  }

  if (res4.success) {
    const doc4 = await db.collection('complaints').doc(res4.complaintId).get();
    console.log('Doc 4 (No AI) aiVision exists:', !!doc4.data().aiVision);
    console.log('Doc 4 main severity exists (unmodified):', doc4.data().severity);
  }

  console.log('\\n--- TESTS FINISHED ---');
  process.exit(0);
}

runIntegrationTests();
