import math
from api.models import Authority

AUTHORITY_TYPE_MAP = {
    'crime': 'ps',
    'corruption': 'acb',
    'civic_issue': 'municipal',
}

# Subcategory overrides
SUBCATEGORY_OVERRIDES = {
    # Crime subcategories → always PS
    'theft': 'ps',
    'assault': 'ps',
    'murder': 'ps',
    'kidnapping': 'ps',
    'cybercrime': 'ps',
    'fraud': 'ps',
    'harassment': 'ps',
    'domestic_violence': 'ps',

    # Corruption subcategories → always ACB
    'bribery': 'acb',
    'embezzlement': 'acb',
    'government_misconduct': 'acb',
    'land_grabbing': 'acb',

    # Civic subcategories → municipal
    'road_damage': 'municipal',
    'water_supply': 'municipal',
    'sewage': 'municipal',
    'garbage': 'municipal',
    'electricity': 'municipal',
    'noise_pollution': 'municipal',
}

def route_complaint(category, subcategory, location):
    # Determine authority type
    sub_key = subcategory.lower() if subcategory else ''
    authority_type = SUBCATEGORY_OVERRIDES.get(sub_key, AUTHORITY_TYPE_MAP.get(category, 'ps'))

    state = location.get('state', '').lower()
    district = location.get('district', '').lower()

    try:
        # Find active authorities of the matching type in this state and district
        authorities = Authority.objects.filter(type=authority_type, is_active=True)
        
        # Filter by JSON jurisdiction structure:
        # matching state and matching district
        matched = None
        for auth in authorities:
            j = auth.jurisdiction or {}
            j_state = str(j.get('state', '')).lower()
            j_district = str(j.get('district', '')).lower()
            j_districts = [str(d).lower() for d in j.get('districts', [])]
            
            if j_state == state:
                if j_district == district or district in j_districts:
                    matched = auth
                    break
        
        if matched:
            return {
                'authorityId': matched.id,
                'authorityType': authority_type,
                'authorityName': matched.name,
                'authorityEmail': matched.email,
                'authorityPhone': matched.phone,
            }

        # Fallback: Find any authority of this type in this state
        fallback_matched = None
        for auth in authorities:
            j = auth.jurisdiction or {}
            j_state = str(j.get('state', '')).lower()
            if j_state == state:
                fallback_matched = auth
                break
                
        if fallback_matched:
            return {
                'authorityId': fallback_matched.id,
                'authorityType': authority_type,
                'authorityName': fallback_matched.name,
                'authorityEmail': fallback_matched.email,
                'authorityPhone': fallback_matched.phone,
                'isFallback': True,
            }

        # Ultimate fallback: assign to super admin queue
        return {
            'authorityId': 'unassigned',
            'authorityType': authority_type,
            'authorityName': 'State Headquarters',
            'isFallback': True,
            'requiresManualAssignment': True,
        }
    except Exception as e:
        print(f"Routing engine error: {str(e)}")
        raise e

def calculate_distance(lat1, lng1, lat2, lng2):
    R = 6371.0 # Earth radius in km
    dLat = math.radians(lat2 - lat1)
    dLng = math.radians(lng2 - lng1)
    a = (math.sin(dLat / 2) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def get_nearest_authority(lat, lng, authority_type, radius_km=50):
    try:
        # Approximate bounding box (1 degree ≈ 111km)
        delta = radius_km / 111.0
        min_lat = lat - delta
        max_lat = lat + delta
        min_lng = lng - delta
        max_lng = lng + delta

        # Filter database (location is a JSON field {lat: ..., lng: ...})
        candidates = Authority.objects.filter(type=authority_type, is_active=True)
        results = []

        for candidate in candidates:
            loc = candidate.location or {}
            c_lat = loc.get('lat')
            c_lng = loc.get('lng')
            if c_lat is not None and c_lng is not None:
                c_lat = float(c_lat)
                c_lng = float(c_lng)
                if min_lat <= c_lat <= max_lat and min_lng <= c_lng <= max_lng:
                    dist = calculate_distance(lat, lng, c_lat, c_lng)
                    if dist <= radius_km:
                        # Serialize
                        data = {
                            'id': candidate.id,
                            'name': candidate.name,
                            'email': candidate.email,
                            'phone': candidate.phone,
                            'type': candidate.type,
                            'location': candidate.location,
                            'jurisdiction': candidate.jurisdiction,
                            'distance': dist
                        }
                        results.append(data)
        
        # Sort by distance
        results.sort(key=lambda x: x['distance'])
        return results
    except Exception as e:
        print(f"Nearest authority error: {str(e)}")
        return []
