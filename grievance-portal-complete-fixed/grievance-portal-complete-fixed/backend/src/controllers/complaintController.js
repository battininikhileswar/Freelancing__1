const { getDb, COLLECTIONS, serverTimestamp, increment, updateDoc } = require('../config/firebase');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { generateComplaintId } = require('../utils/generateId');
const { routeComplaint } = require('../services/routingEngine');
const { notifyComplaintSubmitted, notifyStatusChange } = require('../utils/notifications');
const { uploadToCloudinary } = require('../config/cloudinary');
const { analyzeComplaintSeverity } = require('../services/aiSeverityService');
const { awardReputation } = require('../services/reputationService');

// ======= Submit Complaint =======
const submitComplaint = asyncHandler(async (req, res) => {
  const { category, subcategory, description, preferredLanguage } = req.body;
  const db = getDb();

  // Parse isAnonymous from string if needed (from FormData)
  const isAnonymous = req.body.isAnonymous === true || req.body.isAnonymous === 'true';

  // Enforce authentication for non-anonymous submissions
  if (!isAnonymous && !req.user) {
    throw new AppError('Authentication required for non-anonymous submissions.', 401);
  }

  // Parse location if it comes as JSON string (from FormData)
  let location;
  try {
    location = typeof req.body.location === 'string' 
      ? JSON.parse(req.body.location) 
      : req.body.location;
  } catch (e) {
    throw new AppError('Invalid location data format', 400);
  }

  // Route to appropriate authority
  const routing = await routeComplaint(category, subcategory, location);
  const complaintId = generateComplaintId(category, location.state);

  // Handle file uploads in parallel with a timeout
  const attachments = [];
  if (req.files && req.files.length > 0) {
    const uploadPromises = req.files.map(async (file) => {
      try {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Upload timed out')), 15000)
        );

        const uploadPromise = uploadToCloudinary(file.buffer, {
          folder: `grievance-portal/complaints/${complaintId}`,
          resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
        });

        // Race between upload and timeout
        const result = await Promise.race([uploadPromise, timeoutPromise]);
        
        return {
          url: result.secure_url,
          publicId: result.public_id,
          type: file.mimetype,
          originalName: file.originalname,
          size: file.size,
        };
      } catch (err) {
        console.error(`❌ File upload failed for ${file.originalname}:`, err.message);
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    results.forEach(res => {
      if (res) attachments.push(res);
    });
  }

  // Set escalation deadline (72 hours)
  const escalationDueDate = new Date();
  escalationDueDate.setHours(escalationDueDate.getHours() + 72);

  // Analyze severity using AI with fail-safe fallbacks
  let severityScore = 'Medium';
  let severityReason = 'Classified under default rules.';
  try {
    const analysis = await analyzeComplaintSeverity(category, subcategory, description);
    severityScore = analysis.severity || 'Medium';
    severityReason = analysis.reason || severityReason;
    console.log(`🤖 [ComplaintController] Severity calculated: ${severityScore} (${analysis.engine} engine)`);
  } catch (severityErr) {
    console.error('⚠️ [ComplaintController] Severity analysis failed, using fallback:', severityErr.message);
  }

  const complaintData = {
    complaintId,
    category,
    subcategory: subcategory || '',
    description,
    location: {
      address: location.address || '',
      state: location.state?.toLowerCase() || '',
      district: location.district?.toLowerCase() || '',
      pincode: location.pincode || '',
      lat: location.lat ? parseFloat(location.lat) : null,
      lng: location.lng ? parseFloat(location.lng) : null,
    },
    isAnonymous: !!isAnonymous,
    userId: isAnonymous ? null : req.user.id,
    userName: isAnonymous ? 'Anonymous' : req.user.name,
    userEmail: isAnonymous ? null : req.user.email,
    userPhone: isAnonymous ? null : req.user.phone,
    attachments,
    status: 'pending',
    severity: severityScore,
    severityReason: severityReason,
    routing: {
      authorityId: routing.authorityId,
      authorityType: routing.authorityType,
      authorityName: routing.authorityName,
      assignedAt: serverTimestamp(),
    },
    statusHistory: [
      {
        status: 'pending',
        remarks: 'Complaint registered and routed to authority.',
        timestamp: new Date().toISOString(),
        updatedBy: 'system',
      },
    ],
    remarks: [],
    proofUploads: [],
    preferredLanguage: preferredLanguage || 'en',
    escalationLevel: 0,
    escalationDue: escalationDueDate.toISOString(),
    isEscalated: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await db.collection(COLLECTIONS.COMPLAINTS).add(complaintData);

  // Increment user complaint count & award reputation XP
  if (!isAnonymous && req.user?.id) {
    await db.collection(COLLECTIONS.USERS).doc(req.user.id).update({ complaintsCount: increment(1) });
    await awardReputation(req.user.id, 10);
  }

  // Notify user
  await notifyComplaintSubmitted(req.user, { ...complaintData, id: docRef.id });

  res.status(201).json({
    success: true,
    message: 'Complaint submitted successfully. Please save your Complaint ID.',
    data: {
      id: docRef.id,
      complaintId,
      status: 'pending',
      authorityType: routing.authorityType,
      estimatedResolutionTime: '7-14 working days',
    },
  });
});

// ======= Track Complaint (Public - by complaintId) =======
const trackComplaint = asyncHandler(async (req, res) => {
  const { complaintId } = req.params;
  const db = getDb();

  const snapshot = await db.collection(COLLECTIONS.COMPLAINTS).where('complaintId', '==', complaintId).limit(1).get();

  if (snapshot.empty) {
    throw new AppError('Complaint not found. Please check your Complaint ID.', 404);
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  // Return limited info for public tracking (hide sensitive routing details)
  res.json({
    success: true,
    data: {
      complaintId: data.complaintId,
      category: data.category,
      subcategory: data.subcategory,
      status: data.status,
      location: {
        state: data.location.state,
        district: data.location.district,
      },
      statusHistory: data.statusHistory || [],
      remarks: data.remarks || [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      authorityType: data.routing?.authorityType,
    },
  });
});

// ======= Get My Complaints (Citizen) =======
const getMyComplaints = asyncHandler(async (req, res) => {
  const { status, category, page = 1, limit = 10 } = req.query;
  const db = getDb();

  let query = db.collection(COLLECTIONS.COMPLAINTS).where('userId', '==', req.user.id);

  if (status) query = query.where('status', '==', status);
  if (category) query = query.where('category', '==', category);

  let snapshot;
  try {
    // Try with server-side sorting first
    snapshot = await query.orderBy('createdAt', 'desc').limit(parseInt(limit)).get();
  } catch (error) {
    // If index is missing, fetch and sort in-memory (fallback)
    if (error.code === 9 || error.message?.includes('index')) {
      console.warn('⚠️ Firestore index missing, falling back to in-memory sorting for getMyComplaints');
      snapshot = await query.get();
      // Sort manually
      snapshot.docs.sort((a, b) => {
        const timeA = a.data().createdAt?._seconds || new Date(a.data().createdAt).getTime() || 0;
        const timeB = b.data().createdAt?._seconds || new Date(b.data().createdAt).getTime() || 0;
        return timeB - timeA;
      });
      // Apply limit manually
      snapshot.docs = snapshot.docs.slice(0, parseInt(limit));
    } else {
      throw error;
    }
  }

  const complaints = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      complaintId: data.complaintId,
      category: data.category,
      subcategory: data.subcategory,
      description: data.description?.substring(0, 150) + (data.description?.length > 150 ? '...' : '') || '',
      status: data.status,
      location: { state: data.location?.state, district: data.location?.district },
      attachments: data.attachments?.length || 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });

  res.json({ success: true, data: { complaints, total: complaints.length, page: parseInt(page) } });
});

// ======= Get Complaint Detail (Owner or Authority) =======
const getComplaintDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDb();

  const doc = await db.collection(COLLECTIONS.COMPLAINTS).doc(id).get();
  if (!doc.exists) throw new AppError('Complaint not found.', 404);

  const data = doc.data();

  // Access control: citizen can only see own complaints, authority sees assigned ones
  if (req.user.role === 'citizen' && data.userId !== req.user.id) {
    throw new AppError('Access denied.', 403);
  }
  if (['ps_officer', 'acb_officer', 'municipal_officer'].includes(req.user.role)) {
    if (data.routing?.authorityId !== req.user.authorityId) {
      throw new AppError('This complaint is not assigned to your authority.', 403);
    }
  }

  res.json({ success: true, data: { id: doc.id, ...data } });
});

// ======= Get Assigned Complaints (Authority Officers) =======
const getAssignedComplaints = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const db = getDb();

  const authorityId = req.user.authorityId;
  let query;

  if (req.user.role === 'super_admin') {
    // Super admins see all complaints
    query = db.collection(COLLECTIONS.COMPLAINTS);
  } else {
    if (!authorityId) throw new AppError('Authority ID not configured for this account.', 400);
    query = db.collection(COLLECTIONS.COMPLAINTS).where('routing.authorityId', '==', authorityId);
  }

  if (status) query = query.where('status', '==', status);

  let snapshot;
  try {
    snapshot = await query.orderBy('createdAt', 'desc').limit(parseInt(limit)).get();
  } catch (error) {
    if (error.code === 9 || error.message?.includes('index')) {
      console.warn('⚠️ Firestore index missing, falling back to in-memory sorting for getAssignedComplaints');
      snapshot = await query.get();
      snapshot.docs.sort((a, b) => {
        const timeA = a.data().createdAt?._seconds || new Date(a.data().createdAt).getTime() || 0;
        const timeB = b.data().createdAt?._seconds || new Date(b.data().createdAt).getTime() || 0;
        return timeB - timeA;
      });
      snapshot.docs = snapshot.docs.slice(0, parseInt(limit));
    } else {
      throw error;
    }
  }

  const complaints = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  res.json({ success: true, data: { complaints, total: complaints.length } });
});

// ======= Update Complaint Status (Authority) =======
const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;
  const db = getDb();

  const doc = await db.collection(COLLECTIONS.COMPLAINTS).doc(id).get();
  if (!doc.exists) throw new AppError('Complaint not found.', 404);

  const data = doc.data();

  // Authority can only update assigned complaints
  if (['ps_officer', 'acb_officer', 'municipal_officer'].includes(req.user.role)) {
    if (data.routing?.authorityId !== req.user.authorityId) {
      throw new AppError('Not authorized to update this complaint.', 403);
    }
  }

  // Handle proof file uploads
  const proofUploads = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Upload timed out')), 15000)
        );

        const uploadPromise = uploadToCloudinary(file.buffer, {
          folder: `grievance-portal/proofs/${data.complaintId}`,
          resource_type: file.mimetype?.startsWith('video') ? 'video' : 'image',
        });

        // Race between upload and timeout
        const result = await Promise.race([uploadPromise, timeoutPromise]);
        
        proofUploads.push({ 
          url: result.secure_url, 
          publicId: result.public_id, 
          type: file.mimetype 
        });
      } catch (err) {
        console.error(`❌ Proof upload failed for ${file.originalname}:`, err.message);
        // Robust fallback: Save file as inline Base64 data URL so it remains readable/renderable in dashboard without Cloudinary!
        const base64Data = file.buffer.toString('base64');
        const dataUrl = `data:${file.mimetype};base64,${base64Data}`;
        proofUploads.push({
          url: dataUrl,
          publicId: `local-proof-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          type: file.mimetype,
          originalName: file.originalname,
          size: file.size,
          isLocalFallback: true
        });
      }
    }
  }

  const statusEntry = {
    status,
    remarks: remarks || '',
    timestamp: new Date().toISOString(),
    updatedBy: req.user.name || req.user.id,
    updatedByRole: req.user.role,
  };

  const updates = {
    status,
    latestRemark: remarks || '',
    updatedAt: serverTimestamp(),
    statusHistory: [...(data.statusHistory || []), statusEntry],
  };

  if (remarks) updates.remarks = [...(data.remarks || []), { text: remarks, timestamp: new Date().toISOString(), by: req.user.name }];
  if (proofUploads.length > 0) updates.proofUploads = [...(data.proofUploads || []), ...proofUploads];
  if (status === 'closed') updates.closedAt = serverTimestamp();

  await updateDoc(doc, updates);

  // Notify user & award resolution reputation XP if closed
  if (!data.isAnonymous && data.userId) {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(data.userId).get();
    if (userDoc.exists) {
      await notifyStatusChange(userDoc.data(), { ...data, status, latestRemark: remarks });
      
      if (status === 'closed') {
        await awardReputation(data.userId, 50);
      }
    }
  }

  // Emit socket event
  if (req.io) {
    req.io.to(`complaint_${id}`).emit('status_updated', { complaintId: id, status, remarks });
  }

  res.json({ success: true, message: 'Status updated successfully.' });
});

// ======= Analytics (Admin) =======
const getAnalytics = asyncHandler(async (req, res) => {
  const db = getDb();

  const [totalSnap, pendingSnap, closedSnap, crimeSnap, corruptionSnap, civicSnap] = await Promise.all([
    db.collection(COLLECTIONS.COMPLAINTS).count().get(),
    db.collection(COLLECTIONS.COMPLAINTS).where('status', '==', 'pending').count().get(),
    db.collection(COLLECTIONS.COMPLAINTS).where('status', '==', 'closed').count().get(),
    db.collection(COLLECTIONS.COMPLAINTS).where('category', '==', 'crime').count().get(),
    db.collection(COLLECTIONS.COMPLAINTS).where('category', '==', 'corruption').count().get(),
    db.collection(COLLECTIONS.COMPLAINTS).where('category', '==', 'civic_issue').count().get(),
  ]);

  res.json({
    success: true,
    data: {
      total: totalSnap.data().count,
      pending: pendingSnap.data().count,
      closed: closedSnap.data().count,
      byCategory: {
        crime: crimeSnap.data().count,
        corruption: corruptionSnap.data().count,
        civic_issue: civicSnap.data().count,
      },
    },
  });
});

// ======= Heatmap Data (Public) =======
const getHeatmapData = asyncHandler(async (req, res) => {
  const db = getDb();
  const snapshot = await db.collection(COLLECTIONS.COMPLAINTS).get();

  const points = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      complaintId: data.complaintId,
      lat: data.location?.lat ? parseFloat(data.location.lat) : null,
      lng: data.location?.lng ? parseFloat(data.location.lng) : null,
      category: data.category,
      severity: data.severity || 'Medium',
      status: data.status,
      address: data.location?.address || 'N/A'
    };
  }).filter((p) => p.lat !== null && p.lng !== null);

  res.json({ success: true, data: points });
});

// ======= Check Duplicate Complaint =======
const checkDuplicateComplaint = asyncHandler(async (req, res) => {
  const { category, location, description } = req.body;
  const db = getDb();

  if (!category || !location || !location.lat || !location.lng) {
    throw new AppError('Category and coordinates (lat, lng) are required.', 400);
  }

  const inputLat = parseFloat(location.lat);
  const inputLng = parseFloat(location.lng);

  // 1. Fetch complaints in same category
  const snapshot = await db.collection(COLLECTIONS.COMPLAINTS)
    .where('category', '==', category)
    .get();

  const matches = [];

  // Helper for Jaccard similarity score
  const getJaccardSimilarity = (desc1, desc2) => {
    if (!desc1 || !desc2) return 0;
    const normalize = (text) => {
      return text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'near', 'very', 'here', 'there'].includes(w));
    };
    const tokens1 = new Set(normalize(desc1));
    const tokens2 = new Set(normalize(desc2));
    
    if (tokens1.size === 0 || tokens2.size === 0) return 0;
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return intersection.size / union.size;
  };

  // Helper for Haversine distance in km
  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.status === 'closed' || data.status === 'rejected') return;

    const docLat = data.location?.lat ? parseFloat(data.location.lat) : null;
    const docLng = data.location?.lng ? parseFloat(data.location.lng) : null;

    if (docLat !== null && docLng !== null) {
      const distanceKm = getDistance(inputLat, inputLng, docLat, docLng);
      const distanceMeters = Math.round(distanceKm * 1000);

      // Check geographically (within 300 meters)
      if (distanceMeters <= 300) {
        const similarityScore = getJaccardSimilarity(description, data.description);

        // We consider it a potential duplicate if it's very close (<300m) AND either:
        // - descriptions have a 20% Jaccard match, or
        // - it is extremely close (<50 meters) where localized issues overlap heavily
        const isMatch = similarityScore >= 0.20 || distanceMeters <= 50;

        if (isMatch) {
          matches.push({
            id: doc.id,
            complaintId: data.complaintId,
            description: data.description?.substring(0, 150) + (data.description?.length > 150 ? '...' : ''),
            address: data.location?.address || 'N/A',
            status: data.status,
            distance: distanceMeters,
            similarityScore: Math.round(similarityScore * 100)
          });
        }
      }
    }
  });

  // Sort matches by distance (closest first)
  matches.sort((a, b) => a.distance - b.distance);

  res.json({
    success: true,
    data: {
      isPotentialDuplicate: matches.length > 0,
      matches: matches.slice(0, 5)
    }
  });
});

module.exports = { submitComplaint, trackComplaint, getMyComplaints, getComplaintDetail, getAssignedComplaints, updateComplaintStatus, getAnalytics, getHeatmapData, checkDuplicateComplaint };
