// ======= Complaint Categories =======
export const CATEGORIES = {
  crime: {
    label: 'Crime',
    icon: '🚨',
    color: 'red',
    subcategories: [
      { value: 'theft', label: 'Theft / Robbery' },
      { value: 'assault', label: 'Assault / Physical Violence' },
      { value: 'murder', label: 'Murder / Attempt to Murder' },
      { value: 'kidnapping', label: 'Kidnapping / Missing Person' },
      { value: 'cybercrime', label: 'Cybercrime / Online Fraud' },
      { value: 'fraud', label: 'Financial Fraud / Cheating' },
      { value: 'harassment', label: 'Harassment / Stalking' },
      { value: 'domestic_violence', label: 'Domestic Violence' },
      { value: 'drug_trafficking', label: 'Drug Trafficking' },
      { value: 'other_crime', label: 'Other Crime' },
    ],
  },
  corruption: {
    label: 'Corruption',
    icon: '⚖️',
    color: 'purple',
    subcategories: [
      { value: 'bribery', label: 'Bribery / Demand for Bribe' },
      { value: 'embezzlement', label: 'Embezzlement of Public Funds' },
      { value: 'government_misconduct', label: 'Government Official Misconduct' },
      { value: 'land_grabbing', label: 'Land Grabbing / Illegal Encroachment' },
      { value: 'ration_corruption', label: 'Ration / PDS Corruption' },
      { value: 'tender_fraud', label: 'Tender / Contract Fraud' },
      { value: 'police_corruption', label: 'Police Corruption' },
      { value: 'other_corruption', label: 'Other Corruption' },
    ],
  },
  civic_issue: {
    label: 'Civic Issue',
    icon: '🏙️',
    color: 'teal',
    subcategories: [
      { value: 'road_damage', label: 'Road Damage / Pothole' },
      { value: 'water_supply', label: 'Water Supply Issue' },
      { value: 'sewage', label: 'Sewage / Drainage Problem' },
      { value: 'garbage', label: 'Garbage / Waste Management' },
      { value: 'electricity', label: 'Electricity Issue' },
      { value: 'street_light', label: 'Street Light Failure' },
      { value: 'noise_pollution', label: 'Noise Pollution' },
      { value: 'illegal_construction', label: 'Illegal Construction' },
      { value: 'park_maintenance', label: 'Park / Public Space Issue' },
      { value: 'other_civic', label: 'Other Civic Issue' },
    ],
  },
  fire: {
    label: 'Fire Safety / Emergency',
    icon: '🔥',
    color: 'orange',
    subcategories: [
      { value: 'fire_outbreak', label: 'Active Fire Outbreak' },
      { value: 'safety_hazard', label: 'Fire Safety Hazard / Code Violation' },
      { value: 'gas_leak', label: 'Hazardous Gas Leak' },
      { value: 'other_fire', label: 'Other Fire Incident' },
    ],
  },
  hospital: {
    label: 'Healthcare / Hospital',
    icon: '🏥',
    color: 'rose',
    subcategories: [
      { value: 'ambulance_delay', label: 'Ambulance Delay / Service Issue' },
      { value: 'medical_negligence', label: 'Medical Negligence / Grievance' },
      { value: 'hospital_infra', label: 'Hospital Infrastructure Failure' },
      { value: 'other_hospital', label: 'Other Healthcare Issue' },
    ],
  },
};

// ======= Status Labels =======
export const STATUS_LABELS = {
  pending: { label: 'Pending', color: 'amber', description: 'Complaint received, awaiting review' },
  under_review: { label: 'Under Review', color: 'blue', description: 'Being reviewed by authority' },
  investigating: { label: 'Investigating', color: 'purple', description: 'Active investigation underway' },
  action_taken: { label: 'Action Taken', color: 'orange', description: 'Action has been taken' },
  closed: { label: 'Closed', color: 'green', description: 'Complaint resolved and closed' },
  rejected: { label: 'Rejected', color: 'red', description: 'Complaint rejected (invalid/duplicate)' },
};

// ======= Indian States =======
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi',
  'Jammu & Kashmir', 'Ladakh', 'Puducherry',
];

// ======= Role Labels =======
export const ROLE_LABELS = {
  citizen: 'Citizen',
  ps_officer: 'Police Station Officer',
  acb_officer: 'ACB Officer',
  municipal_officer: 'Municipal Officer',
  fire_officer: 'Fire Department Officer',
  hospital_officer: 'Hospital Authority Officer',
  super_admin: 'Super Administrator',
};

// ======= Date formatters =======
export const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const timeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ======= Languages =======
export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

// ======= Authority Types =======
export const AUTHORITY_TYPE_INFO = {
  ps: { label: 'Police Station', short: 'PS', icon: '🚔', color: 'blue' },
  acb: { label: 'Anti-Corruption Bureau', short: 'ACB', icon: '⚖️', color: 'purple' },
  municipal: { label: 'Municipal Authority', short: 'MUN', icon: '🏛️', color: 'teal' },
  fire: { label: 'Fire Department', short: 'FIRE', icon: '🔥', color: 'orange' },
  hospital: { label: 'Hospital Authority', short: 'HOSP', icon: '🏥', color: 'rose' },
};
