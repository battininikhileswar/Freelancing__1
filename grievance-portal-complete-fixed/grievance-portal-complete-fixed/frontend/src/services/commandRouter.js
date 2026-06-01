/**
 * commandRouter.js
 * Takes a recognized command string, normalizes it, strips wake words,
 * and routes it to intents using includes() logic.
 */

export const commandRouter = {
  /**
   * Routes raw transcribed text to matched intents
   * @param {string} text - Transcribed voice query
   * @returns {string|null} - Intent name or null
   */
  route(text) {
    if (!text) return null;
    
    let clean = text.toLowerCase().trim();
    console.log(`🧭 [commandRouter] raw input: "${clean}"`);

    // Remove wake words: "hey city", "hey siri", "city", "siri"
    clean = clean.replace(/\bhey\s+city\b/g, '');
    clean = clean.replace(/\bhey\s+siri\b/g, '');
    clean = clean.replace(/\bcity\b/g, '');
    clean = clean.replace(/\bsiri\b/g, '');
    
    // Trim and normalize spaces
    clean = clean.replace(/\s+/g, ' ').trim();

    // Strip trailing punctuation (periods, question marks, exclamation marks)
    clean = clean.replace(/[.?!\s]+$/, '').trim();
    console.log(`🧭 [commandRouter] normalized command (no wake words): "${clean}"`);
    // Dynamic Input Filling: support type/enter/write/fill/set/put, plus English/Telugu
    let fillMatch = null;

    // Pattern 1: type/enter/write/put [value] in/into/inside/in the [field]
    const p1 = /^(?:type|enter|write|put)\s+(.+?)\s+(?:in|into|inside|in\s+the|into\s+the)\s+(.+?)(?:\s+field)?$/i;
    const m1 = clean.match(p1);
    if (m1) {
      fillMatch = { value: m1[1].trim(), field: m1[2].trim() };
    }

    // Pattern 2: fill [field] with [value]
    if (!fillMatch) {
      const p2 = /^fill\s+(.+?)\s+with\s+(.+)$/i;
      const m2 = clean.match(p2);
      if (m2) {
        fillMatch = { field: m2[1].trim(), value: m2[2].trim() };
      }
    }

    // Pattern 3: set [field] to/as [value]
    if (!fillMatch) {
      const p3_set = /^set\s+(.+?)\s+(?:to|as)\s+(.+)$/i;
      const m3_set = clean.match(p3_set);
      if (m3_set) {
        fillMatch = { field: m3_set[1].trim(), value: m3_set[2].trim() };
      }
    }

    // Telugu Input Pattern: [field] లో [value] అని టైప్ చేయి/రాయి/ఎంటర్/మార్చు
    if (!fillMatch) {
      const p3_tel = /(.+?)\s*(?:లో|లొ|లోనా|లొనా|ని|గా)\s+(.+?)\s*(?:అని\s+)?(?:టైప్|రాయి|ఎంటర్|మార్చు|చెయ్యి|చేయి)/i;
      const m3_tel = clean.match(p3_tel);
      if (m3_tel) {
        fillMatch = { field: m3_tel[1].trim(), value: m3_tel[2].trim() };
      }
    }

    if (fillMatch && fillMatch.field && fillMatch.value) {
      // Strip outer quotes if present
      let cleanVal = fillMatch.value.replace(/^['"“‘]|['"”’]$/g, '').trim();
      let cleanFld = fillMatch.field.replace(/^['"“‘]|['"”’]$/g, '').trim();
      // Remove trailing periods/punctuation from fields and values
      cleanVal = cleanVal.replace(/[.?!\s]+$/, '').trim();
      cleanFld = cleanFld.replace(/[.?!\s]+$/, '').trim();
      console.log(`🧭 [commandRouter] matched dynamic fill element: FILL_INPUT:${cleanFld}|${cleanVal}`);
      return `FILL_INPUT:${cleanFld}|${cleanVal}`;
    }

    // Dynamic Click Parsing: "click [button]" or "select [button]" or "press [button]" or "choose [button]"
    if (clean.startsWith('click') || clean.startsWith('select') || clean.startsWith('press') || clean.startsWith('choose')) {
      let target = clean.replace(/^(click|select|press|choose)\s*(?:on\s+|the\s+|to\s+|a\s+|an\s+)?/i, '').trim();
      if (target) {
        // Strip trailing noise words like button/link
        target = target.replace(/\b(button|link|tab|icon)\b/gi, '').trim();
        if (target) {
          console.log(`🧭 [commandRouter] matched dynamic click element: CLICK_ELEMENT:${target}`);
          return `CLICK_ELEMENT:${target}`;
        }
      }
    }

    // Telugu Dynamic Click with robust verb protection
    const teluguClickVerbs = /(క్లిక్\s*చేయి|క్లిక్\s*చేయ్యి|క్లిక్\s*చెయ్యి|నొక్కు|నొక్కండి|ప్రెస్\s*చేయి|సెలెక్ట్\s*చేయి|క్లిక్|నొక్కు|ఎంచుకో|సెలెక్ట్|ప్రెస్)/g;
    if (clean.includes('క్లిక్') || clean.includes('నొక్కు') || clean.includes('సెలెక్ట్') || clean.includes('ప్రెస్') || clean.includes('ఎంచుకో')) {
      const target = clean.replace(teluguClickVerbs, '').trim();
      if (target) {
        console.log(`🧭 [commandRouter] matched Telugu dynamic click element: CLICK_ELEMENT:${target}`);
        return `CLICK_ELEMENT:${target}`;
      }
    }

    // Browser control commands
    // GO_BACK: "go back", "back page", "వెనక్కి"
    if (clean === 'go back' || clean === 'back' || clean.includes('వెనక్కి వెళ్ళు') || clean === 'వెనక్కి' || clean === 'వెనుకకు') {
      console.log("🧭 [commandRouter] matched intent: GO_BACK");
      return 'GO_BACK';
    }

    // GO_FORWARD: "go forward", "forward"
    if (clean === 'go forward' || clean === 'forward') {
      console.log("🧭 [commandRouter] matched intent: GO_FORWARD");
      return 'GO_FORWARD';
    }

    // SCROLL_DOWN: "scroll down", "move down", "కిందకి"
    if (clean.includes('scroll down') || clean.includes('move down') || clean.includes('కిందకి స్క్రోల్') || clean.includes('కిందకి')) {
      console.log("🧭 [commandRouter] matched intent: SCROLL_DOWN");
      return 'SCROLL_DOWN';
    }

    // SCROLL_UP: "scroll up", "move up", "పైకి"
    if (clean.includes('scroll up') || clean.includes('move up') || clean.includes('పైకి స్క్రోల్') || clean.includes('పైకి')) {
      console.log("🧭 [commandRouter] matched intent: SCROLL_UP");
      return 'SCROLL_UP';
    }

    // RELOAD_PAGE: "refresh page", "reload page", "రిఫ్రెష్"
    if (clean.includes('refresh') || clean.includes('reload') || clean.includes('రిఫ్రెష్')) {
      console.log("🧭 [commandRouter] matched intent: RELOAD_PAGE");
      return 'RELOAD_PAGE';
    }

    // ADMIN_LOGIN: "admin" and "login" (also supports Telugu equivalents like "అడ్మిన్" and "లాగిన్")
    if ((clean.includes('admin') && clean.includes('login')) || (clean.includes('అడ్మిన్') && clean.includes('లాగిన్'))) {
      console.log("🧭 [commandRouter] matched intent: ADMIN_LOGIN");
      return 'ADMIN_LOGIN';
    }

    // CITIZEN_LOGIN: "citizen" and "login" (also supports Telugu equivalents like "సిటిజన్" and "లాగిన్")
    if ((clean.includes('citizen') && clean.includes('login')) || (clean.includes('సిటిజన్') && clean.includes('లాగిన్'))) {
      console.log("🧭 [commandRouter] matched intent: CITIZEN_LOGIN");
      return 'CITIZEN_LOGIN';
    }

    // Wizard Navigations (Citizen Submit Complaint Form)
    // WIZARD_NEXT: "next step", "next", "continue"
    if (clean === 'next step' || clean === 'next' || clean === 'continue' || clean.includes('ముందుకు వెళ్ళు') || clean === 'ముందుకు' || clean === 'తరువాత' || clean === 'నెక్స్ట్') {
      console.log("🧭 [commandRouter] matched intent: WIZARD_NEXT");
      return 'WIZARD_NEXT';
    }

    // WIZARD_BACK: "previous step", "back step", "previous"
    if (clean === 'previous step' || clean === 'back step' || clean === 'previous' || clean.includes('వెనక్కి వెళ్ళు') || clean === 'వెనక్కి') {
      console.log("🧭 [commandRouter] matched intent: WIZARD_BACK");
      return 'WIZARD_BACK';
    }

    // WIZARD_SUBMIT: "submit complaint", "submit grievance", "ఫిర్యాదు సబ్మిట్"
    if (clean.includes('submit complaint') || clean.includes('submit grievance') || clean.includes('సబ్మిట్ చేయి') || clean.includes('సమర్పించు')) {
      console.log("🧭 [commandRouter] matched intent: WIZARD_SUBMIT");
      return 'WIZARD_SUBMIT';
    }

    // Dashboard Status Filters
    // FILTER_PENDING: "filter pending", "show pending"
    if (clean.includes('filter pending') || clean.includes('show pending') || clean === 'pending' || clean.includes('పెండింగ్')) {
      console.log("🧭 [commandRouter] matched intent: FILTER_PENDING");
      return 'FILTER_PENDING';
    }

    // FILTER_IN_PROGRESS: "filter in progress", "show in progress"
    if (clean.includes('filter in progress') || clean.includes('show in progress') || clean.includes('in progress') || clean.includes('ప్రోగ్రెస్') || clean.includes('పనిలో ఉంది')) {
      console.log("🧭 [commandRouter] matched intent: FILTER_IN_PROGRESS");
      return 'FILTER_IN_PROGRESS';
    }

    // FILTER_RESOLVED: "filter resolved", "show resolved"
    if (clean.includes('filter resolved') || clean.includes('show resolved') || clean.includes('resolved') || clean.includes('పరిష్కరించిన') || clean.includes('పరిష్కారం')) {
      console.log("🧭 [commandRouter] matched intent: FILTER_RESOLVED");
      return 'FILTER_RESOLVED';
    }

    // FILTER_ESCALATED: "filter escalated", "show escalated"
    if (clean.includes('filter escalated') || clean.includes('show escalated') || clean.includes('escalated') || clean.includes('ఎస్కలేట్')) {
      console.log("🧭 [commandRouter] matched intent: FILTER_ESCALATED");
      return 'FILTER_ESCALATED';
    }

    // FILTER_ALL: "show all", "clear filter", "all complaints"
    if (clean.includes('show all') || clean.includes('clear filter') || clean === 'all' || clean.includes('అన్నీ') || clean.includes('మొత్తం')) {
      console.log("🧭 [commandRouter] matched intent: FILTER_ALL");
      return 'FILTER_ALL';
    }

    // Authority Status Updates
    // CHANGE_STATUS:[status]
    const statusMatch = clean.match(/^(?:change|set)\s+status\s+(?:to\s+)?(pending|in\s*progress|resolved|escalated)$/i);
    if (statusMatch) {
      const targetStatus = statusMatch[1].replace(/\s+/g, '_').toLowerCase();
      console.log(`🧭 [commandRouter] matched intent: CHANGE_STATUS:${targetStatus}`);
      return `CHANGE_STATUS:${targetStatus}`;
    }
    // Telugu Status change
    if (clean.includes('మార్చు') && (clean.includes('పెండింగ్') || clean.includes('ప్రోగ్రెస్') || clean.includes('పరిష్కరించిన') || clean.includes('ఎస్కలేట్'))) {
      let targetStatus = 'pending';
      if (clean.includes('ప్రోగ్రెస్')) targetStatus = 'in_progress';
      if (clean.includes('పరిష్కరించిన') || clean.includes('పరిష్కారం')) targetStatus = 'resolved';
      if (clean.includes('ఎస్కలేట్')) targetStatus = 'escalated';
      console.log(`🧭 [commandRouter] matched Telugu status intent: CHANGE_STATUS:${targetStatus}`);
      return `CHANGE_STATUS:${targetStatus}`;
    }

    // Admin Reassignments
    // REASSIGN:[authority]
    const reassignMatch = clean.match(/^(?:reassign|assign)\s+(?:to\s+)?(police|ps|acb|municipal|municipal\s+officer|anti\s*corruption)$/i);
    if (reassignMatch) {
      let authType = reassignMatch[1].toLowerCase().trim();
      if (authType === 'ps') authType = 'police';
      if (authType === 'anti corruption') authType = 'acb';
      if (authType === 'municipal officer') authType = 'municipal';
      console.log(`🧭 [commandRouter] matched intent: REASSIGN:${authType}`);
      return `REASSIGN:${authType}`;
    }
    // Telugu Reassignments
    if (clean.includes('కేటాయించు') && (clean.includes('పోలీస్') || clean.includes('ఏసీబీ') || clean.includes('మున్సిపల్'))) {
      let authType = 'municipal';
      if (clean.includes('పోలీస్')) authType = 'police';
      if (clean.includes('ఏసీబీ')) authType = 'acb';
      console.log(`🧭 [commandRouter] matched Telugu reassignment intent: REASSIGN:${authType}`);
      return `REASSIGN:${authType}`;
    }

    // Specific Complaint Card Tracking / Viewing
    // VIEW_COMPLAINT:[id]
    const viewMatch = clean.match(/^(?:open|view|track)\s+complaint\s+(?:number\s+|id\s+)?([a-zA-Z0-9-]+)$/i);
    if (viewMatch) {
      const compId = viewMatch[1].trim();
      console.log(`🧭 [commandRouter] matched intent: VIEW_COMPLAINT:${compId}`);
      return `VIEW_COMPLAINT:${compId}`;
    }

    // FILE_COMPLAINT: "file complaint", "report issue", "new complaint"
    if (clean.includes('file complaint') || clean.includes('new complaint') || clean.includes('report issue') || clean.includes('ఫిర్యాదు') || clean.includes('ఫైల్')) {
      console.log("🧭 [commandRouter] matched intent: FILE_COMPLAINT");
      return 'FILE_COMPLAINT';
    }

    // OPEN_PROFILE: "profile", "settings", "ప్రొఫైల్"
    if (clean.includes('profile') || clean.includes('settings') || clean.includes('ప్రొఫైల్') || clean.includes('సెట్టింగ్స్')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_PROFILE");
      return 'OPEN_PROFILE';
    }

    // OPEN_DASHBOARD: "dashboard"
    if (clean.includes('dashboard') || clean.includes('డ్యాష్‌బోర్డ్') || clean.includes('డాష్బోర్డ్')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_DASHBOARD");
      return 'OPEN_DASHBOARD';
    }

    // OPEN_MUNICIPAL_DASHBOARD
    if (clean.includes('municipal dashboard') || clean.includes('municipal authority')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_MUNICIPAL_DASHBOARD");
      return 'OPEN_MUNICIPAL_DASHBOARD';
    }

    // OPEN_PS_DASHBOARD
    if (clean.includes('police dashboard') || clean.includes('police station dashboard') || clean.includes('ps dashboard')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_PS_DASHBOARD");
      return 'OPEN_PS_DASHBOARD';
    }

    // OPEN_ACB_DASHBOARD
    if (clean.includes('acb dashboard') || clean.includes('anti corruption dashboard')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_ACB_DASHBOARD");
      return 'OPEN_ACB_DASHBOARD';
    }

    // OPEN_ADMIN_PANEL
    if (clean.includes('admin panel')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_ADMIN_PANEL");
      return 'OPEN_ADMIN_PANEL';
    }

    // OPEN_CREATE_AUTHORITY
    if (clean.includes('create authority') || clean.includes('add officer') || clean.includes('new officer')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_CREATE_AUTHORITY");
      return 'OPEN_CREATE_AUTHORITY';
    }

    // OPEN_ESCALATIONS
    if (clean.includes('escalations') || clean.includes('escalated issues')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_ESCALATIONS");
      return 'OPEN_ESCALATIONS';
    }

    // REPORT_POTHOLE: "report" and "pothole" (supports Telugu counterparts "రోడ్డు గుంత" / "గుంత సమస్య")
    if ((clean.includes('report') && clean.includes('pothole')) || (clean.includes('రోడ్డు') && clean.includes('గుంత')) || clean.includes('గుంత సమస్య')) {
      console.log("🧭 [commandRouter] matched intent: REPORT_POTHOLE");
      return 'REPORT_POTHOLE';
    }

    // REPORT_GARBAGE: "report" and "garbage" (supports Telugu counterpart "చెత్త సమస్య")
    if ((clean.includes('report') && clean.includes('garbage')) || clean.includes('చెత్త సమస్య') || clean.includes('చెత్త కుప్ప')) {
      console.log("🧭 [commandRouter] matched intent: REPORT_GARBAGE");
      return 'REPORT_GARBAGE';
    }

    // OPEN_MAP: "map" (supports Telugu counterpart "మ్యాప్")
    if (clean.includes('map') || clean.includes('మ్యాప్')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_MAP");
      return 'OPEN_MAP';
    }

    // LOGOUT: "logout" (supports Telugu counterpart "లాగౌట్")
    if (clean.includes('logout') || clean.includes('లాగౌట్')) {
      console.log("🧭 [commandRouter] matched intent: LOGOUT");
      return 'LOGOUT';
    }

    // DARK_MODE: "dark"
    if (clean.includes('dark') || clean.includes('డార్క్')) {
      console.log("🧭 [commandRouter] matched intent: DARK_MODE");
      return 'DARK_MODE';
    }

    // GO_HOME: "home", "main page", "landing page"
    if (clean.includes('home') || clean.includes('హోమ్') || clean.includes('ఇంటికి') || clean.includes('main page')) {
      console.log("🧭 [commandRouter] matched intent: GO_HOME");
      return 'GO_HOME';
    }

    // OPEN_LOGIN: "login page", "go to login", "open login"
    if (clean.includes('login page') || clean.includes('go to login') || clean.includes('open login') || clean.includes('లాగిన్ పేజీ')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_LOGIN");
      return 'OPEN_LOGIN';
    }

    // OPEN_REGISTER: "register page", "open register", "signup"
    if (clean.includes('register page') || clean.includes('open register') || clean.includes('signup') || clean.includes('నమోదు పేజీ')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_REGISTER");
      return 'OPEN_REGISTER';
    }

    // OPEN_EMERGENCY: "emergency"
    if (clean.includes('emergency') || clean.includes('అత్యవసర')) {
      console.log("🧭 [commandRouter] matched intent: OPEN_EMERGENCY");
      return 'OPEN_EMERGENCY';
    }

    // TRACK_COMPLAINT: "track" or "check status"
    if (clean.includes('track') || clean.includes('ట్రాక్') || clean.includes('check status')) {
      console.log("🧭 [commandRouter] matched intent: TRACK_COMPLAINT");
      return 'TRACK_COMPLAINT';
    }

    console.log("🧭 [commandRouter] matched intent: null (Command not found)");
    return null;
  }
};

export default commandRouter;
