/**
 * GeoVision Intelligence Helpers
 * Pure functions for calculating geographic statistics based on actual complaint data.
 */

// Strict severity weights
const SEVERITY_WEIGHTS = {
  Emergency: 4,
  High: 3,
  Medium: 2,
  Low: 1
};

/**
 * Calculates priority score for a single complaint
 * @param {Object} complaint 
 * @returns {number} Score
 */
export const calculatePriorityScore = (complaint) => {
  if (!complaint || !complaint.severity) return 0;
  
  const baseScore = SEVERITY_WEIGHTS[complaint.severity] || 0;
  
  // Unresolved multiplier (increases priority for active issues)
  const isUnresolved = !['closed', 'rejected'].includes(complaint.status?.toLowerCase());
  const unresolvedMultiplier = isUnresolved ? 1.5 : 1.0;
  
  return baseScore * unresolvedMultiplier;
};

/**
 * Identifies hotspots using a grid-binning algorithm based on actual coordinates.
 * Invalid or missing coordinates are safely ignored.
 * @param {Array} complaints List of complaints 
 * @returns {Array} Array of Hotspot objects
 */
export const identifyHotspots = (complaints) => {
  if (!complaints || !Array.isArray(complaints)) return [];

  // Safe filter for valid coordinates
  const validComplaints = complaints.filter(c => 
    c.lat != null && c.lng != null && !isNaN(c.lat) && !isNaN(c.lng)
  );

  const grid = {};

  // Bin into ~1km grids (rounding to 2 decimal places)
  validComplaints.forEach(c => {
    const latGrid = c.lat.toFixed(2);
    const lngGrid = c.lng.toFixed(2);
    const gridKey = `${latGrid},${lngGrid}`;

    if (!grid[gridKey]) {
      grid[gridKey] = {
        complaints: [],
        latSum: 0,
        lngSum: 0,
        totalScore: 0,
        unresolvedCount: 0,
        emergencyCount: 0,
        highCount: 0,
        categoryCounts: {}
      };
    }

    const cell = grid[gridKey];
    cell.complaints.push(c);
    cell.latSum += parseFloat(c.lat);
    cell.lngSum += parseFloat(c.lng);
    cell.totalScore += calculatePriorityScore(c);

    const isUnresolved = !['closed', 'rejected'].includes(c.status?.toLowerCase());
    if (isUnresolved) cell.unresolvedCount++;
    if (c.severity === 'Emergency') cell.emergencyCount++;
    if (c.severity === 'High') cell.highCount++;

    const cat = c.category || 'unknown';
    cell.categoryCounts[cat] = (cell.categoryCounts[cat] || 0) + 1;
  });

  // Convert grid bins into final hotspot objects
  const hotspots = Object.keys(grid).map(key => {
    const cell = grid[key];
    const count = cell.complaints.length;
    
    // Top category calculation
    const topCategory = Object.keys(cell.categoryCounts).reduce((a, b) => 
      cell.categoryCounts[a] > cell.categoryCounts[b] ? a : b
    , 'unknown');

    let riskLevel = 'Low';
    if (cell.totalScore >= 20 || cell.emergencyCount >= 2) riskLevel = 'High';
    else if (cell.totalScore >= 10 || cell.highCount >= 2) riskLevel = 'Medium';

    // Generate explainable reasoning
    const reasons = [];
    if (count >= 5) reasons.push('High complaint density');
    if (cell.emergencyCount >= 2) reasons.push('Multiple emergency complaints');
    else if (cell.emergencyCount === 1) reasons.push('Active emergency complaint');
    
    if (cell.highCount >= 3) reasons.push('Multiple high-severity issues');
    
    const unresolvedRatio = cell.unresolvedCount / count;
    if (unresolvedRatio >= 0.7 && count >= 3) reasons.push('High unresolved ratio');

    if (reasons.length === 0 && riskLevel !== 'Low') reasons.push('Elevated risk score');

    return {
      id: `hotspot-${key}`,
      centerLat: cell.latSum / count,
      centerLng: cell.lngSum / count,
      complaintCount: count,
      unresolvedCount: cell.unresolvedCount,
      emergencyCount: cell.emergencyCount,
      highCount: cell.highCount,
      totalScore: parseFloat(cell.totalScore.toFixed(2)),
      topCategory,
      riskLevel,
      reasons
    };
  });

  // Sort descending by total score
  return hotspots.sort((a, b) => b.totalScore - a.totalScore);
};
