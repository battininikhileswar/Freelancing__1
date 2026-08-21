import math
import re
import json
import os
import requests
from firebase_admin import firestore
from django.conf import settings

# Threshold constants
DUPLICATE_THRESHOLD = 0.85
POSSIBLE_DUPLICATE_THRESHOLD = 0.65
VERY_CLOSE_METERS = 100
NEARBY_METERS = 500
CANDIDATE_RADIUS_METERS = 1000

# Scoring weights
WEIGHT_LOCATION = 0.40
WEIGHT_CATEGORY = 0.20
WEIGHT_TEXT = 0.25
WEIGHT_SEMANTIC = 0.15

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in meters between two lat/lng coordinates."""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None
    
    R = 6371000  # Radius of Earth in meters
    phi1 = math.radians(float(lat1))
    phi2 = math.radians(float(lat2))
    delta_phi = math.radians(float(lat2) - float(lat1))
    delta_lambda = math.radians(float(lon2) - float(lon1))

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    meters = R * c
    return round(meters)

def normalize_text(text):
    if not text:
        return ""
    text = str(text).lower()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def calculate_text_similarity(text1, text2):
    """Extremely lightweight bag-of-words jaccard similarity"""
    t1 = normalize_text(text1)
    t2 = normalize_text(text2)
    if not t1 and not t2:
        return 1.0
    if not t1 or not t2:
        return 0.0
        
    set1 = set(t1.split())
    set2 = set(t2.split())
    
    # Simple stop word removal (very lightweight)
    stop_words = {'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'in', 'on', 'at', 'of', 'for', 'with', 'by', 'about'}
    set1 = set1 - stop_words
    set2 = set2 - stop_words
    
    if not set1 and not set2:
        return 0.0
        
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    
    if not union:
        return 0.0
    return float(len(intersection)) / float(len(union))

def semantic_duplicate_check(new_complaint, existing_complaint):
    """Calls Gemini REST API to do a structured semantic comparison of two complaints."""
    gemini_key = os.getenv('GEMINI_API_KEY')
    if not gemini_key:
        return None
        
    prompt = f"""
Compare the following two civic complaints. Determine if they describe the exact same physical issue.

NEW COMPLAINT:
Category: {new_complaint.get('category')}
Subcategory: {new_complaint.get('subcategory')}
Location: {new_complaint.get('distance_text', 'Unknown distance')} from candidate
Description: "{new_complaint.get('description', '')}"
Summary: "{new_complaint.get('summary', '')}"

EXISTING COMPLAINT:
Category: {existing_complaint.get('category')}
Subcategory: {existing_complaint.get('subcategory')}
Location: same area
Description: "{existing_complaint.get('description', '')}"
Summary: "{existing_complaint.get('summary', '')}"

Return STRICT JSON:
{{
  "isDuplicate": true/false,
  "confidence": numeric between 0.0 and 1.0,
  "reason": "Short explanation"
}}
Rules: Return JSON only. No markdown. Do not invent facts. Same category or location alone is NOT sufficient.
    """
    
    payload = {
        "contents": [
            {
                "parts": [{"text": prompt.strip()}]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }
    
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={gemini_key}"
    try:
        response = requests.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=15)
        if response.status_code == 200:
            res_json = response.json()
            reply_text = res_json['candidates'][0]['content']['parts'][0]['text'].strip()
            # Clean markdown if Gemini still returns it
            if reply_text.startswith('```json'):
                reply_text = reply_text[7:]
                if reply_text.endswith('```'):
                    reply_text = reply_text[:-3]
            elif reply_text.startswith('```'):
                reply_text = reply_text[3:]
                if reply_text.endswith('```'):
                    reply_text = reply_text[:-3]
                    
            parsed = json.loads(reply_text.strip())
            return {
                'confidence': float(parsed.get('confidence', 0.0)),
                'reason': parsed.get('reason', '')
            }
        return None
    except Exception as e:
        print(f"[DuplicateDetection] Semantic check failed: {e}")
        return None

def calculate_duplicate_score(new_complaint, existing_complaint, distance_meters, semantic_result=None):
    """
    Scoring model: Location(0.40), Category(0.20), Text(0.25), Semantic(0.15)
    If semantic is missing, distribute its 0.15 weight.
    If location is missing, distribute its 0.40 weight.
    """
    # 1. Location Score
    has_location = distance_meters is not None
    loc_score = 0.0
    if has_location:
        if distance_meters <= VERY_CLOSE_METERS:
            loc_score = 1.0
        elif distance_meters <= NEARBY_METERS:
            loc_score = 0.8
        elif distance_meters <= CANDIDATE_RADIUS_METERS:
            loc_score = 0.5
        else:
            loc_score = 0.0

    # 2. Category Score
    cat_score = 0.0
    is_exact_category = new_complaint.get('category') == existing_complaint.get('category')
    is_exact_subcategory = new_complaint.get('subcategory') == existing_complaint.get('subcategory')
    
    if is_exact_category and is_exact_subcategory:
        cat_score = 1.0
    elif is_exact_category:
        cat_score = 0.6
    else:
        # Different categories are a strong negative signal
        cat_score = 0.0
        
    # 3. Text Score
    text_new = f"{new_complaint.get('description', '')} {new_complaint.get('summary', '')}"
    
    # Handle nested AI metadata for existing complaint summary
    existing_summary = existing_complaint.get('aiMetadata', {}).get('summary', '')
    if not existing_summary:
        existing_summary = existing_complaint.get('aiAnalysis', {}).get('summary', '')
        
    text_existing = f"{existing_complaint.get('description', '')} {existing_summary}"
    text_score = calculate_text_similarity(text_new, text_existing)
    
    # 4. Semantic Score
    sem_score = 0.0
    has_semantic = semantic_result is not None
    if has_semantic:
        sem_score = semantic_result.get('confidence', 0.0)
        
    # Weights
    w_loc = WEIGHT_LOCATION if has_location else 0.0
    w_cat = WEIGHT_CATEGORY
    w_txt = WEIGHT_TEXT
    w_sem = WEIGHT_SEMANTIC if has_semantic else 0.0
    
    total_weight = w_loc + w_cat + w_txt + w_sem
    if total_weight == 0:
        return 0.0
        
    # Normalize weights so they sum to 1.0
    w_loc /= total_weight
    w_cat /= total_weight
    w_txt /= total_weight
    w_sem /= total_weight
    
    final_score = (loc_score * w_loc) + (cat_score * w_cat) + (text_score * w_txt) + (sem_score * w_sem)
    
    # Strong override logic: If different categories and far away, it is definitely not a duplicate, regardless of text
    if not is_exact_category and has_location and distance_meters > VERY_CLOSE_METERS:
        final_score = min(final_score, 0.4)
        
    return final_score

def format_result(status, confidence, matched_id, matched_data, distance, reason):
    is_duplicate = status == 'duplicate'
    return {
        "status": status,
        "isDuplicate": is_duplicate,
        "confidence": round(confidence, 2),
        "matchedComplaintId": matched_id,
        "matchedComplaint": matched_data,
        "distanceMeters": distance,
        "reason": reason
    }

def detect_duplicate_complaint(new_complaint):
    """
    Main orchestrator for duplicate detection.
    """
    try:
        # Extract inputs
        cat = new_complaint.get('category')
        lat = None
        lng = None
        loc_obj = new_complaint.get('location')
        if isinstance(loc_obj, dict):
            lat = loc_obj.get('lat')
            lng = loc_obj.get('lng')
        from api.services.firebase import get_firestore_db
        db = get_firestore_db()
        if not db:
            print(" [DuplicateService] Could not initialize Firestore db.")
            return {
                'status': 'unknown',
                'isDuplicate': False,
                'confidence': 0,
                'reason': 'Database connection error'
            }

        # Query Firestore for active complaints. Since we want to limit reads,
        # we will fetch pending, assigned, in_progress complaints.
        candidates_ref = db.collection('complaints').where('status', 'in', ['pending', 'assigned', 'in_progress'])
        if cat:
            candidates_ref = candidates_ref.where('category', '==', cat)
            
        # Limit to 100 recent active complaints to prevent massive read costs
        docs = candidates_ref.limit(100).stream()
        
        candidates = []
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            
            # Distance filter
            dist = None
            if lat is not None and lng is not None:
                c_loc = data.get('location', {})
                c_lat = c_loc.get('lat')
                c_lng = c_loc.get('lng')
                dist = haversine_distance(lat, lng, c_lat, c_lng)
                
                # If we have location and it's outside the radius, skip
                if dist is not None and dist > CANDIDATE_RADIUS_METERS:
                    continue
                    
            candidates.append({
                'id': doc.id,
                'data': data,
                'distance': dist
            })
            
        if not candidates:
            reason = "No sufficiently similar complaint was found."
            if lat is None:
                reason = "Location data unavailable; duplicate confidence is limited. No similar complaints found."
            return format_result('unique', 0.10, None, None, None, reason)
            
        # 2. SCORE & RANK CANDIDATES (Deterministic)
        ranked = []
        for c in candidates:
            # Quick deterministic score
            score = calculate_duplicate_score(new_complaint, c['data'], c['distance'], semantic_result=None)
            ranked.append({
                **c,
                'det_score': score
            })
            
        # Sort by deterministic score descending
        ranked.sort(key=lambda x: x['det_score'], reverse=True)
        
        # 3. SEMANTIC CHECK FOR TOP CANDIDATES (Max 3)
        top_candidates = ranked[:3]
        best_candidate = None
        best_score = 0.0
        best_semantic_reason = ""
        
        for c in top_candidates:
            # We add a human readable distance for the AI prompt
            dist_text = f"{c['distance']}m" if c['distance'] is not None else "Unknown"
            new_c_with_dist = {**new_complaint, 'distance_text': dist_text}
            
            # Only call Gemini if the deterministic score is ambiguous or reasonably high
            # (e.g. > 0.40). No point calling AI if they share 0 similarities.
            sem_result = None
            if c['det_score'] > 0.35:
                sem_result = semantic_duplicate_check(new_c_with_dist, c['data'])
                
            final_score = calculate_duplicate_score(new_complaint, c['data'], c['distance'], semantic_result=sem_result)
            
            if final_score > best_score:
                best_score = final_score
                best_candidate = c
                if sem_result:
                    best_semantic_reason = sem_result.get('reason', '')
                    
        # 4. CLASSIFICATION
        if best_candidate and best_score >= POSSIBLE_DUPLICATE_THRESHOLD:
            # Build matched complaint safe dict
            mc_data = best_candidate['data']
            loc_data = mc_data.get('location', {})
            safe_match = {
                'category': mc_data.get('category'),
                'subcategory': mc_data.get('subcategory'),
                'address': loc_data.get('address', 'Unknown location'),
                'status': mc_data.get('status')
            }
            
            reason = best_semantic_reason
            if not reason:
                reason = "A nearby complaint has similar issue and description."
                
            if lat is None:
                reason = "Location data unavailable; duplicate confidence is limited. " + reason
            
            status = 'duplicate' if best_score >= DUPLICATE_THRESHOLD else 'possible_duplicate'
            
            return format_result(
                status, 
                best_score, 
                best_candidate['id'], 
                safe_match, 
                best_candidate['distance'], 
                reason
            )
            
        reason = "No sufficiently similar complaint was found."
        if lat is None:
            reason = "Location data unavailable; duplicate confidence is limited. " + reason
            
        return format_result('unique', max(0.10, best_score), None, None, None, reason)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"[DuplicateDetection] Error: {e}")
        return {
            "status": "unknown",
            "isDuplicate": False,
            "confidence": 0,
            "reason": "Duplicate detection temporarily unavailable."
        }
