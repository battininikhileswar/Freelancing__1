/**
 * actionExecutor.js
 * Takes a matched intent and executes real functional actions in the web application.
 */

import api from '../utils/api';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

export const actionExecutor = {
  async clickElementByText(target) {
    const rawTarget = target.toLowerCase().trim();
    const teluguToEnglishMap = {
      'సిటిజన్': 'citizen',
      'సిటిజన్‌': 'citizen',
      'అడ్మిన్': 'admin',
      'హోమ్': 'home',
      'హోం': 'home',
      'మ్యాప్': 'map',
      'లాగిన్': 'login',
      'సైన్ ఇన్': 'sign in',
      'సమర్పించు': 'submit',
      'సబ్మిట్': 'submit',
      'ఫिర్యాదు': 'complaint',
      'అత్యవసర': 'emergency',
      'ట్రాక్': 'track',
      'ప్రొఫైల్': 'profile',
      'డ్యాష్‌బోర్డ్': 'dashboard',
      'డాష్బోర్డ్': 'dashboard',
      'పాస్వర్డ్': 'password',
      'ఈమెయిల్': 'email',
      'ఈ-మెయిల్': 'email',
      'గవర్నమెంట్': 'government'
    };

    let cleanedTarget = rawTarget;
    for (const [te, en] of Object.entries(teluguToEnglishMap)) {
      if (rawTarget.includes(te)) {
        cleanedTarget = cleanedTarget.replace(te, en);
      }
    }
    cleanedTarget = cleanedTarget.toLowerCase().trim();
    console.log(`🎬 [actionExecutor] Translated target to: "${cleanedTarget}"`);

    const normalizeText = (txt) => {
      if (!txt) return '';
      return txt.toLowerCase()
        .replace(/\b(a|an|the|on|to|button|link|tab|icon|field|input|box|select|textarea)\b/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
    };

    let matchedEl = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const elements = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"], option'));
      const normTarget = normalizeText(cleanedTarget);
      
      matchedEl = elements.find(el => {
        const text = (el.textContent || el.value || el.placeholder || el.getAttribute('aria-label') || '');
        const normText = normalizeText(text);
        return normText === normTarget || (normTarget.length > 2 && normText.includes(normTarget)) || (normText.length > 2 && normTarget.includes(normText));
      });

      if (matchedEl) break;
      console.log(`🎬 [actionExecutor] Click target "${cleanedTarget}" not found, retrying in 350ms... (attempt ${attempt + 1}/3)`);
      await new Promise(r => setTimeout(r, 350));
    }
    
    if (matchedEl) {
      console.log("🎬 [actionExecutor] Found matching element, clicking:", matchedEl);
      if (matchedEl.tagName === 'OPTION') {
        const selectEl = matchedEl.closest('select');
        if (selectEl) {
          selectEl.value = matchedEl.value;
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          selectEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      matchedEl.click();
      const elText = matchedEl.textContent?.trim() || matchedEl.value || target;
      return `Clicked ${elText}.`;
    } else {
      console.warn(`🎬 [actionExecutor] No clickable element found matching "${target}"`);
      throw new Error(`Could not find clickable element for "${target}"`);
    }
  },

  async fillSingleField(fieldName, val) {
    const rawField = fieldName.toLowerCase().trim();
    const fieldSynonyms = {
      'name': ['name', 'officer name', 'authority name', 'user name', 'full name', 'పేరు', 'అథారిటీ పేరు', 'ఆఫీసర్ పేరు'],
      'email': ['email', 'officer email', 'user email', 'ఈమెయిల్', 'ఈ-మెయిల్'],
      'phone': ['phone', 'mobile', 'contact', 'contact number', 'mobile number', 'phone number', 'ఫోన్', 'మొబైల్'],
      'role': ['role', 'officer role', 'హోదా', 'పాత్ర'],
      'department': ['department', 'officer department', 'శాఖ', 'డిపార్ట్మెంట్'],
      'password': ['password', 'officer password', 'పాస్‌వర్డ్', 'పాస్వర్డ్'],
      'description': ['description', 'issue description', 'complaint description', 'details', 'notes', 'వివరణ', 'సమస్య వివరణ'],
      'title': ['title', 'complaint title', 'subject', 'శీర్షిక', 'సబ్జెక్ట్'],
      'anonymous': ['anonymous', 'is anonymous', 'అజ్ఞాత', 'రహస్య'],
      'pincode': ['pincode', 'pin', 'పిన్ కోడ్', 'పిన్‌కోడ్'],
      'address': ['address', 'చిరునామా'],
      'state': ['state', 'రాష్ట్రం', 'రాష్ట్రము'],
      'district': ['district', 'జిల్లా'],
      'category': ['category', 'విభాగం'],
      'subcategory': ['subcategory', 'ఉప విభాగం']
    };

    let cleanedField = rawField.replace(/\b(the|a|an|field|input|box|textarea|select|field\.)\b/gi, '').replace(/\s+/g, ' ').trim();

    let field = cleanedField;
    for (const [canonical, syns] of Object.entries(fieldSynonyms)) {
      if (syns.includes(cleanedField) || canonical === cleanedField) {
        field = canonical;
        break;
      }
    }
    
    let matchedEl = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      
      matchedEl = inputs.find(el => {
        const id = (el.id || '').toLowerCase().trim();
        const name = (el.name || '').toLowerCase().trim();
        const ph = (el.placeholder || '').toLowerCase().trim();
        const aria = (el.getAttribute('aria-label') || '').toLowerCase().trim();
        const type = (el.type || '').toLowerCase().trim();
        
        return id === field || name === field || ph === field || aria === field ||
               id.includes(field) || name.includes(field) || ph.includes(field) || aria.includes(field) ||
               (field === 'email' && type === 'email') || (field === 'password' && type === 'password');
      });
      
      if (!matchedEl) {
        const labels = Array.from(document.querySelectorAll('label'));
        const matchedLabel = labels.find(lbl => {
          const text = (lbl.textContent || '').toLowerCase().trim();
          return text === field || text.includes(field);
        });
        
        if (matchedLabel) {
          if (matchedLabel.htmlFor) {
            matchedEl = inputs.find(el => el.id === matchedLabel.htmlFor);
          }
          if (!matchedEl) {
            matchedEl = matchedLabel.querySelector('input, textarea, select');
          }
          if (!matchedEl) {
            let next = matchedLabel.nextElementSibling;
            while (next && !matchedEl) {
              if (['INPUT', 'TEXTAREA', 'SELECT'].includes(next.tagName)) {
                matchedEl = next;
              } else {
                matchedEl = next.querySelector('input, textarea, select');
              }
              next = next.nextElementSibling;
            }
          }
        }
      }

      if (matchedEl) break;
      console.log(`🎬 [actionExecutor] Fill target "${field}" not found, retrying in 350ms... (attempt ${attempt + 1}/3)`);
      await new Promise(r => setTimeout(r, 350));
    }
    
    if (matchedEl) {
      matchedEl.focus();
      if (matchedEl.type === 'checkbox' || matchedEl.type === 'radio') {
        const isTrue = ['true', 'yes', 'check', 'on', '1'].includes(val.toString().toLowerCase());
        matchedEl.checked = isTrue;
        matchedEl.dispatchEvent(new Event('click', { bubbles: true }));
        matchedEl.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        const prototype = matchedEl.tagName === 'TEXTAREA' 
          ? window.HTMLTextAreaElement.prototype 
          : (matchedEl.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype);
        
        const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
        if (setter) {
          setter.call(matchedEl, val);
        } else {
          matchedEl.value = val;
        }
        matchedEl.dispatchEvent(new Event('input', { bubbles: true }));
        matchedEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      matchedEl.blur();
      return true;
    }
    return false;
  },

  async fillFormFields(target, value) {
    let fieldsToFill = {};
    if (typeof value === 'object' && value !== null) {
      fieldsToFill = value;
    } else {
      try {
        fieldsToFill = JSON.parse(value);
      } catch (e) {
        if (target) {
          fieldsToFill[target] = value;
        } else {
          fieldsToFill[''] = value;
        }
      }
    }
    
    let filledCount = 0;
    for (const [fieldName, val] of Object.entries(fieldsToFill)) {
      console.log(`🎬 [actionExecutor] Filling field "${fieldName}" with "${val}"`);
      const success = await this.fillSingleField(fieldName, val);
      if (success) filledCount++;
    }
    return `Filled ${filledCount} field(s).`;
  },

  async submitForm(target) {
    const requiredMissing = Array.from(document.querySelectorAll('input[required], textarea[required], select[required]'))
      .filter(el => !el.value || el.value.trim() === '');
       
    if (requiredMissing.length > 0) {
      const missingNames = requiredMissing.map(el => {
        return el.labels && el.labels.length > 0 ? el.labels[0].textContent.trim() : (el.placeholder || el.name || 'required field');
      }).join(', ');
      throw new Error(`Required fields are missing: ${missingNames}`);
    }
    
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
    const submitBtn = buttons.find(btn => {
      const txt = (btn.textContent || btn.value || '').toLowerCase().trim();
      return txt === 'submit' || txt === 'submit complaint' || txt.includes('submit') || 
             txt.includes('save') || txt.includes('update') || txt.includes('సమర్పించు') || txt.includes('సబ్మిట్');
    });
    
    if (submitBtn) {
      submitBtn.click();
      return "Form submitted successfully.";
    }
    throw new Error("Could not find a submit button on this page.");
  },

  async applyFilter(value) {
    const normalized = value.toLowerCase().trim();
    const buttons = Array.from(document.querySelectorAll('button, a, [role="tab"], [role="button"]'));
    const filterBtn = buttons.find(btn => {
      const txt = (btn.textContent || '').toLowerCase().trim();
      return txt === normalized || txt.includes(normalized) ||
             (normalized === 'pending' && txt.includes('పెండింగ్')) ||
             (normalized === 'resolved' && (txt.includes('పరిష్కరించిన') || txt.includes('పరిష్కారం')));
    });
    
    if (filterBtn) {
      filterBtn.click();
      return `Filtered complaints by ${value}.`;
    }
    throw new Error(`Filter button for "${value}" not found.`);
  },

  async applySearch(value) {
    const inputs = Array.from(document.querySelectorAll('input'));
    const searchInput = inputs.find(el => {
      const ph = (el.placeholder || '').toLowerCase();
      const id = (el.id || '').toLowerCase();
      const name = (el.name || '').toLowerCase();
      const type = (el.type || '').toLowerCase();
      return type === 'search' || ph.includes('search') || id.includes('search') || name.includes('search') || ph.includes('వెతుకు');
    });
    
    if (searchInput) {
      searchInput.focus();
      searchInput.value = value;
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));
      searchInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Enter', keyCode: 13 }));
      searchInput.blur();
      return `Searched for "${value}".`;
    }
    throw new Error("Could not find search input field.");
  },

  async applySort(value) {
    const selects = Array.from(document.querySelectorAll('select'));
    const sortSelect = selects.find(el => {
      const id = (el.id || '').toLowerCase();
      const name = (el.name || '').toLowerCase();
      return id.includes('sort') || name.includes('sort');
    });
    
    if (sortSelect) {
      const options = Array.from(sortSelect.options);
      const matchedOpt = options.find(opt => {
        const val = opt.value.toLowerCase();
        const txt = opt.textContent.toLowerCase();
        return val.includes(value) || txt.includes(value);
      });
      
      if (matchedOpt) {
        sortSelect.value = matchedOpt.value;
        sortSelect.dispatchEvent(new Event('change', { bubbles: true }));
        sortSelect.dispatchEvent(new Event('input', { bubbles: true }));
        return `Sorted complaints by ${value}.`;
      }
    }
    
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const sortBtn = buttons.find(btn => {
      const txt = (btn.textContent || '').toLowerCase();
      return txt.includes('sort') || txt.includes(value);
    });
    if (sortBtn) {
      sortBtn.click();
      return `Sorted complaints by ${value}.`;
    }
    throw new Error("Could not find sorting element.");
  },

  async readPageSummary() {
    const bodyText = document.body.innerText;
    const cleaned = bodyText.substring(0, 1000).replace(/\s+/g, ' ').trim();
    return cleaned;
  },

  async logoutUser(navigate) {
    console.log("🎬 [actionExecutor] Executing secure global logout...");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    sessionStorage.clear();
    
    // Reset Zustand auth state
    useAuthStore.getState().logout();
    
    // Clear API authorization headers
    if (api.defaults.headers.common['Authorization']) {
      delete api.defaults.headers.common['Authorization'];
    }
    
    // Secure navigation to /login, replacing history
    navigate("/login", { replace: true });
    return "Logged out successfully.";
  },

  async executeSafeApiCall(target, value, navigate) {
    if (target === 'logout' || target === 'LOGOUT') {
      return await this.logoutUser(navigate);
    }
    throw new Error(`API call to "${target}" not allowed or supported via voice.`);
  },

  async execute(intent, navigate) {
    if (typeof intent === 'object' && intent !== null) {
      const { action, target, value, confidence } = intent;
      console.log(`🧠 [actionExecutor] Executing structured Jarvis action:`, intent);
      
      if (confidence < 0.65) {
        console.warn(`⚠️ [actionExecutor] Blocked action execution due to low confidence: ${confidence}`);
        throw new Error("confidence level is too low.");
      }

      // Intercept any structured logout actions globally
      const isLogoutAction = (action === 'API_CALL' && (target === 'logout' || target === 'LOGOUT')) ||
                             (action === 'NAVIGATE' && target && (target.toLowerCase().includes('logout') || target.toLowerCase().includes('signout'))) ||
                             (action === 'CLICK' && target && (target.toLowerCase().includes('logout') || target.toLowerCase().includes('signout')));

      if (isLogoutAction) {
        return await this.logoutUser(navigate);
      }
      
      switch (action) {
        case 'NAVIGATE':
          if (!target) throw new Error("Navigation target is missing");
          let cleanTarget = target.toLowerCase().trim();
          
          // Map incorrect/synonym paths to correct application paths
          if (
            cleanTarget === '/file-complaint' || 
            cleanTarget === '/file-a-complaint' || 
            cleanTarget === '/new-complaint' || 
            cleanTarget === '/complaints/new' || 
            cleanTarget === '/report-issue' || 
            cleanTarget === 'submit-complaint' || 
            cleanTarget === 'file-complaint' ||
            cleanTarget.includes('file-complaint') ||
            cleanTarget.includes('submit-complaint')
          ) {
            cleanTarget = '/submit-complaint';
          } else if (cleanTarget === '/admin' || cleanTarget === 'admin') {
            cleanTarget = '/admin/dashboard';
          }
          
          // Ensure it starts with '/'
          if (!cleanTarget.startsWith('/')) {
            cleanTarget = '/' + cleanTarget;
          }
          
          console.log(`🎬 [actionExecutor] Routing from raw target "${target}" to normalized path: "${cleanTarget}"`);
          navigate(cleanTarget);
          return `Navigating to ${cleanTarget}`;
          
        case 'CLICK':
          if (!target) throw new Error("Click target is missing");
          return await this.clickElementByText(target);
          
        case 'FILL_FORM':
          return await this.fillFormFields(target, value);
          
        case 'SUBMIT_FORM':
          return await this.submitForm(target);
          
        case 'FILTER':
          return await this.applyFilter(value);
          
        case 'SEARCH':
          return await this.applySearch(value);
          
        case 'SORT':
          return await this.applySort(value);
          
        case 'READ_PAGE':
          return await this.readPageSummary();
          
        case 'API_CALL':
          return await this.executeSafeApiCall(target, value, navigate);
          
        case 'ASK_CLARIFICATION':
        case 'CHAT':
          return intent.reply;
          
        default:
          throw new Error(`Unknown structured action: ${action}`);
      }
    }

    console.log(`🎬 [actionExecutor] executed primitive fallback action: ${intent}`);

    // Intercept primitive logout fallbacks globally
    if (typeof intent === 'string') {
      const normalized = intent.toUpperCase().trim();
      if (
        normalized === 'LOGOUT' || 
        normalized.includes('LOGOUT') || 
        normalized.includes('SIGNOUT') || 
        normalized.includes('EXIT ACCOUNT') || 
        normalized.includes('LOG ME OUT')
      ) {
        return await this.logoutUser(navigate);
      }
    }
    
    // Dynamic NAVIGATE support
    if (intent.startsWith('NAVIGATE:')) {
      let path = intent.substring('NAVIGATE:'.length).trim();
      let cleanPath = path.toLowerCase().trim();
      if (
        cleanPath === '/file-complaint' || 
        cleanPath === '/file-a-complaint' || 
        cleanPath === '/new-complaint' || 
        cleanPath === '/complaints/new' || 
        cleanPath === '/report-issue' || 
        cleanPath === 'submit-complaint' || 
        cleanPath === 'file-complaint' ||
        cleanPath.includes('file-complaint') ||
        cleanPath.includes('submit-complaint')
      ) {
        path = '/submit-complaint';
      } else if (cleanPath === '/admin' || cleanPath === 'admin') {
        path = '/admin/dashboard';
      }
      
      // Ensure it starts with '/'
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      
      console.log(`🎬 [actionExecutor] Dynamically navigating to: "${path}"`);
      navigate(path);
      return `Opened page ${path}.`;
    }

    // Dynamic COPY_TO_CLIPBOARD support
    if (intent.startsWith('COPY_TO_CLIPBOARD:')) {
      const text = intent.substring('COPY_TO_CLIPBOARD:'.length).trim();
      console.log(`🎬 [actionExecutor] Dynamically copying text to clipboard: "${text}"`);
      try {
        await navigator.clipboard.writeText(text);
        return `Copied ${text} to clipboard.`;
      } catch (err) {
        // Fallback if clipboard API fails
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        return `Copied ${text} to clipboard.`;
      }
    }

    // Dynamic CLICK_ELEMENT support
    if (intent.startsWith('CLICK_ELEMENT:')) {
      const rawTarget = intent.substring('CLICK_ELEMENT:'.length).toLowerCase().trim();
      console.log(`🎬 [actionExecutor] Dynamically clicking element matching raw: "${rawTarget}"`);
      
      const teluguToEnglishMap = {
        'సిటిజన్': 'citizen',
        'సిటిజన్‌': 'citizen',
        'అడ్మిన్': 'admin',
        'హోమ్': 'home',
        'హోం': 'home',
        'మ్యాప్': 'map',
        'లాగిన్': 'login',
        'సైన్ ఇన్': 'sign in',
        'సమర్పించు': 'submit',
        'సబ్మిట్': 'submit',
        'ఫిర్యాదు': 'complaint',
        'అత్యవసర': 'emergency',
        'ట్రాక్': 'track',
        'ప్రొఫైల్': 'profile',
        'డ్యాష్‌బోర్డ్': 'dashboard',
        'డాష్బోర్డ్': 'dashboard',
        'పాస్‌వర్డ్': 'password',
        'ఈమెయిల్': 'email',
        'ఈ-మెయిల్': 'email',
        'గవర్నమెంట్': 'government'
      };

      let target = rawTarget;
      for (const [te, en] of Object.entries(teluguToEnglishMap)) {
        if (rawTarget.includes(te)) {
          target = target.replace(te, en);
        }
      }
      target = target.toLowerCase().trim();
      console.log(`🎬 [actionExecutor] Target translated to: "${target}"`);

      const normalizeText = (txt) => {
        if (!txt) return '';
        return txt.toLowerCase()
          .replace(/\b(a|an|the|on|to|button|link|tab|icon|field|input|box|select|textarea)\b/g, '')
          .replace(/[^a-z0-9]/g, '')
          .trim();
      };

      let matchedEl = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const elements = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"], option'));
        const normTarget = normalizeText(target);
        
        // Search by normalized exact or partial match
        matchedEl = elements.find(el => {
          const text = (el.textContent || el.value || el.placeholder || el.getAttribute('aria-label') || '');
          const normText = normalizeText(text);
          return normText === normTarget || (normTarget.length > 2 && normText.includes(normTarget)) || (normText.length > 2 && normTarget.includes(normText));
        });

        if (matchedEl) break;
        console.log(`🎬 [actionExecutor] Click target "${target}" not found, retrying in 350ms... (attempt ${attempt + 1}/3)`);
        await new Promise(r => setTimeout(r, 350));
      }
      
      if (matchedEl) {
        console.log("🎬 [actionExecutor] Found matching element, clicking:", matchedEl);
        
        // Option selection support
        if (matchedEl.tagName === 'OPTION') {
          const selectEl = matchedEl.closest('select');
          if (selectEl) {
            selectEl.value = matchedEl.value;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            selectEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        
        matchedEl.click();
        const elText = matchedEl.textContent?.trim() || matchedEl.value || target;
        return `Clicked ${elText}.`;
      } else {
        console.warn(`🎬 [actionExecutor] No clickable element found matching "${target}"`);
        throw new Error(`Could not find clickable element for "${target}"`);
      }
    }

    // Dynamic FILL_INPUT support
    if (intent.startsWith('FILL_INPUT:')) {
      const payload = intent.substring('FILL_INPUT:'.length);
      const firstPipe = payload.indexOf('|');
      if (firstPipe === -1) {
        throw new Error("Invalid fill input format");
      }
      const rawField = payload.substring(0, firstPipe).toLowerCase().trim();
      const value = payload.substring(firstPipe + 1).trim();
      
      const fieldSynonyms = {
        'name': ['name', 'officer name', 'authority name', 'user name', 'full name', 'పేరు', 'అథారిటీ పేరు', 'ఆఫీసర్ పేరు'],
        'email': ['email', 'officer email', 'user email', 'ఈమెయిల్', 'ఈ-మెయిల్'],
        'phone': ['phone', 'mobile', 'contact', 'contact number', 'mobile number', 'phone number', 'ఫోన్', 'మొబైల్'],
        'role': ['role', 'officer role', 'హోదా', 'పాత్ర'],
        'department': ['department', 'officer department', 'శాఖ', 'డిపార్ట్మెంట్'],
        'password': ['password', 'officer password', 'పాస్‌వర్డ్', 'పాస్వర్డ్'],
        'description': ['description', 'issue description', 'complaint description', 'details', 'notes', 'వివరణ', 'సమస్య వివరణ'],
        'title': ['title', 'complaint title', 'subject', 'శీర్షిక', 'సబ్జెక్ట్'],
        'anonymous': ['anonymous', 'is anonymous', 'అజ్ఞాత', 'రహస్య'],
        'pincode': ['pincode', 'pin', 'పిన్ కోడ్', 'పిన్‌కోడ్'],
        'address': ['address', 'చిరునామా'],
        'state': ['state', 'రాష్ట్రం', 'రాష్ట్రము'],
        'district': ['district', 'జిల్లా'],
        'category': ['category', 'విభాగం'],
        'subcategory': ['subcategory', 'ఉప విభాగం']
      };

      let cleanedField = rawField.replace(/\b(the|a|an|field|input|box|textarea|select|field\.)\b/gi, '').replace(/\s+/g, ' ').trim();

      let field = cleanedField;
      for (const [canonical, syns] of Object.entries(fieldSynonyms)) {
        if (syns.includes(cleanedField) || canonical === cleanedField) {
          field = canonical;
          break;
        }
      }
      
      console.log(`🎬 [actionExecutor] Dynamically filling field: "${field}" (raw: "${rawField}") with value: "${value}"`);
      
      let matchedEl = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        // Find all inputs, textareas, and selects
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
        
        // Phase 1: Search by ID, name, placeholder, type, aria-label
        matchedEl = inputs.find(el => {
          const id = (el.id || '').toLowerCase().trim();
          const name = (el.name || '').toLowerCase().trim();
          const ph = (el.placeholder || '').toLowerCase().trim();
          const aria = (el.getAttribute('aria-label') || '').toLowerCase().trim();
          const type = (el.type || '').toLowerCase().trim();
          
          return id === field || name === field || ph === field || aria === field ||
                 id.includes(field) || name.includes(field) || ph.includes(field) || aria.includes(field) ||
                 (field === 'email' && type === 'email') || (field === 'password' && type === 'password');
        });
        
        // Phase 2: Search by label text (if not found in phase 1)
        if (!matchedEl) {
          const labels = Array.from(document.querySelectorAll('label'));
          const matchedLabel = labels.find(lbl => {
            const text = (lbl.textContent || '').toLowerCase().trim();
            return text === field || text.includes(field);
          });
          
          if (matchedLabel) {
            if (matchedLabel.htmlFor) {
              matchedEl = inputs.find(el => el.id === matchedLabel.htmlFor);
            }
            if (!matchedEl) {
              matchedEl = matchedLabel.querySelector('input, textarea, select');
            }
            if (!matchedEl) {
              let next = matchedLabel.nextElementSibling;
              while (next && !matchedEl) {
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(next.tagName)) {
                  matchedEl = next;
                } else {
                  matchedEl = next.querySelector('input, textarea, select');
                }
                next = next.nextElementSibling;
              }
            }
          }
        }

        if (matchedEl) break;
        console.log(`🎬 [actionExecutor] Fill target "${field}" not found, retrying in 350ms... (attempt ${attempt + 1}/3)`);
        await new Promise(r => setTimeout(r, 350));
      }
      
      if (matchedEl) {
        console.log("🎬 [actionExecutor] Found matching element to fill:", matchedEl);
        
        matchedEl.focus();
        
        if (matchedEl.type === 'checkbox' || matchedEl.type === 'radio') {
          const isTrue = ['true', 'yes', 'check', 'on', '1'].includes(value.toLowerCase());
          matchedEl.checked = isTrue;
          matchedEl.dispatchEvent(new Event('click', { bubbles: true }));
          matchedEl.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          // React-compatible value setting
          const prototype = matchedEl.tagName === 'TEXTAREA' 
            ? window.HTMLTextAreaElement.prototype 
            : (matchedEl.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype);
          
          const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
          if (setter) {
            setter.call(matchedEl, value);
          } else {
            matchedEl.value = value;
          }
          
          matchedEl.dispatchEvent(new Event('input', { bubbles: true }));
          matchedEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        matchedEl.blur();
        return `Entered ${value} in ${rawField}.`;
      } else {
        console.warn(`🎬 [actionExecutor] No input field found matching "${rawField}" (mapped to "${field}")`);
        throw new Error(`Could not find input field for "${rawField}"`);
      }
    }

    // Dynamic CHANGE_STATUS support
    if (intent.startsWith('CHANGE_STATUS:')) {
      const status = intent.substring('CHANGE_STATUS:'.length).toLowerCase().trim();
      console.log(`🎬 [actionExecutor] Changing status to: "${status}"`);

      // Find status select element on the page
      const selects = Array.from(document.querySelectorAll('select'));
      const statusSelect = selects.find(el => {
        const id = (el.id || '').toLowerCase();
        const name = (el.name || '').toLowerCase();
        return id.includes('status') || name.includes('status');
      });

      if (statusSelect) {
        // Try to match value exactly or partially
        let matchedValue = status;
        const options = Array.from(statusSelect.options);
        const matchedOpt = options.find(opt => {
          const val = opt.value.toLowerCase();
          const txt = opt.textContent.toLowerCase();
          return val === status || val.includes(status) || txt.includes(status) || 
                 (status === 'in_progress' && (val === 'in progress' || val.includes('progress'))) ||
                 (status === 'resolved' && (val === 'solved' || val.includes('resolve')));
        });

        if (matchedOpt) {
          matchedValue = matchedOpt.value;
        }

        statusSelect.value = matchedValue;
        statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
        statusSelect.dispatchEvent(new Event('input', { bubbles: true }));

        // Click any update/submit status button to apply
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        const submitBtn = buttons.find(btn => {
          const txt = btn.textContent.toLowerCase();
          return txt.includes('update') || txt.includes('save') || txt.includes('submit') || txt.includes('status') || txt.includes('మార్చు');
        });

        if (submitBtn) {
          submitBtn.click();
        }

        return `Status updated to ${status.replace('_', ' ')}.`;
      } else {
        throw new Error("Could not find status select element on the page.");
      }
    }

    // Dynamic REASSIGN support
    if (intent.startsWith('REASSIGN:')) {
      const authority = intent.substring('REASSIGN:'.length).toLowerCase().trim();
      console.log(`🎬 [actionExecutor] Reassigning to authority: "${authority}"`);

      // Find reassignment select element
      const selects = Array.from(document.querySelectorAll('select'));
      const reassignSelect = selects.find(el => {
        const id = (el.id || '').toLowerCase();
        const name = (el.name || '').toLowerCase();
        return id.includes('assign') || name.includes('assign') || id.includes('dept') || name.includes('dept') || id.includes('authority') || name.includes('authority');
      });

      if (reassignSelect) {
        // Find matching option
        const options = Array.from(reassignSelect.options);
        const matchedOpt = options.find(opt => {
          const val = opt.value.toLowerCase();
          const txt = opt.textContent.toLowerCase();
          return val.includes(authority) || txt.includes(authority) ||
                 (authority === 'police' && (val.includes('ps') || txt.includes('ps') || val.includes('police') || txt.includes('police'))) ||
                 (authority === 'acb' && (val.includes('acb') || txt.includes('acb') || val.includes('corruption') || txt.includes('corruption'))) ||
                 (authority === 'municipal' && (val.includes('municipal') || txt.includes('municipal') || val.includes('city') || txt.includes('city')));
        });

        if (matchedOpt) {
          reassignSelect.value = matchedOpt.value;
          reassignSelect.dispatchEvent(new Event('change', { bubbles: true }));
          reassignSelect.dispatchEvent(new Event('input', { bubbles: true }));

          // Now find the reassign button and click it!
          const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
          const reassignBtn = buttons.find(btn => {
            const txt = btn.textContent.toLowerCase();
            return txt.includes('reassign') || txt.includes('assign') || txt.includes('transfer') || txt.includes('కేటాయించు');
          });

          if (reassignBtn) {
            reassignBtn.click();
          }

          return `Reassigned complaint to ${authority.toUpperCase()}.`;
        } else {
          throw new Error(`Could not find department option matching "${authority}".`);
        }
      } else {
        throw new Error("Could not find reassign select element on the page.");
      }
    }

    // Dynamic VIEW_COMPLAINT support
    if (intent.startsWith('VIEW_COMPLAINT:')) {
      const compId = intent.substring('VIEW_COMPLAINT:'.length).trim();
      console.log(`🎬 [actionExecutor] Viewing/tracking complaint: "${compId}"`);

      // Search for any element or card containing this ID and click it
      const elements = Array.from(document.querySelectorAll('button, a, tr, td, h4, p, div.card, span'));
      const matchedEl = elements.find(el => {
        if (el.tagName === 'DIV' || el.tagName === 'SPAN' || el.tagName === 'TD' || el.tagName === 'H4' || el.tagName === 'P') {
          const text = (el.textContent || '').trim();
          return text === compId || text.includes(compId);
        }
        return false;
      });

      if (matchedEl) {
        const clickable = matchedEl.closest('button, a') || matchedEl;
        clickable.click();
        return `Opening complaint ${compId}.`;
      }

      // If not found in dynamic elements, check if user is citizen/officer and navigate directly!
      const authUser = useAuthStore.getState().user;
      if (authUser) {
        if (authUser.role === 'citizen') {
          navigate(`/complaints/${compId}`);
        } else {
          navigate(`/track/${compId}`);
        }
        return `Navigating to complaint ${compId} detail page.`;
      } else {
        navigate(`/track/${compId}`);
        return `Navigating to tracking complaint ${compId}.`;
      }
    }
    
    switch (intent) {
      case 'ADMIN_LOGIN':
        try {
          const email = 'admin@grievanceportal.gov.in';
          const password = 'Admin@1234';
          
          console.log(`🎬 [actionExecutor] POST /api/auth/demo-admin-login with email: ${email}`);
          const res = await api.post('/auth/demo-admin-login', { email, password });
          
          console.log("🎬 [actionExecutor] API response:", res.data);
          const { token, refreshToken, user } = res.data;
          
          // Save token in localStorage
          localStorage.setItem('token', token);
          
          // Sync auth state with Zustand
          useAuthStore.setState({
            token,
            refreshToken,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          navigate('/admin/dashboard', { replace: true });
          return "Logged in as Admin successfully!";
        } catch (err) {
          console.error("🎬 [actionExecutor] error:", err);
          throw err;
        }

      case 'CITIZEN_LOGIN':
        try {
          const email = 'citizen@example.com';
          const password = 'Citizen@1234';
          
          console.log(`🎬 [actionExecutor] POST /api/auth/login with email: ${email}`);
          const res = await api.post('/auth/login', { email, password });
          
          console.log("🎬 [actionExecutor] API response:", res.data);
          const { token, user } = res.data.data;
          
          // Save token in localStorage
          localStorage.setItem('token', token);
          
          // Sync auth state with Zustand
          useAuthStore.setState({
            token,
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          navigate('/dashboard', { replace: true });
          return "Logged in as Citizen successfully!";
        } catch (err) {
          console.error("🎬 [actionExecutor] error:", err);
          throw err;
        }

        
      case 'REPORT_POTHOLE':
        localStorage.setItem('voice_preselect_category', 'civic_issue');
        localStorage.setItem('voice_preselect_subcategory', 'road_damage');
        navigate('/report?category=pothole');
        return "Navigating to report pothole page.";
        
      case 'REPORT_GARBAGE':
        localStorage.setItem('voice_preselect_category', 'civic_issue');
        localStorage.setItem('voice_preselect_subcategory', 'garbage');
        navigate('/report?category=garbage');
        return "Navigating to report garbage page.";
        
      case 'OPEN_MAP':
        navigate('/map');
        return "Opening city grievance map.";
        
      case 'OPEN_DASHBOARD':
        {
          const authUser = useAuthStore.getState().user;
          if (authUser) {
            const redirectMap = {
              citizen: '/dashboard',
              ps_officer: '/ps-dashboard',
              acb_officer: '/acb-dashboard',
              municipal_officer: '/municipal-dashboard',
              fire_officer: '/fire-dashboard',
              hospital_officer: '/hospital-dashboard',
              super_admin: '/admin',
            };
            const targetPath = redirectMap[authUser.role] || '/dashboard';
            navigate(targetPath);
            return `Opening dashboard.`;
          } else {
            navigate('/login');
            return "Please login first.";
          }
        }
        
      case 'OPEN_MUNICIPAL_DASHBOARD':
        navigate('/municipal-dashboard');
        return "Opening Municipal dashboard.";
        
      case 'OPEN_PS_DASHBOARD':
        navigate('/ps-dashboard');
        return "Opening Police Station dashboard.";
        
      case 'OPEN_ACB_DASHBOARD':
        navigate('/acb-dashboard');
        return "Opening Anti-Corruption dashboard.";

      case 'OPEN_FIRE_DASHBOARD':
        navigate('/fire-dashboard');
        return "Opening Fire Department dashboard.";

      case 'OPEN_HOSPITAL_DASHBOARD':
        navigate('/hospital-dashboard');
        return "Opening Hospital dashboard.";
        
      case 'OPEN_ADMIN_PANEL':
        navigate('/admin');
        return "Opening Admin panel.";
        
      case 'OPEN_CREATE_AUTHORITY':
        navigate('/admin/create-authority');
        return "Opening create authority page.";
        
      case 'OPEN_ESCALATIONS':
        navigate('/admin/escalations');
        return "Opening escalations page.";
        
      case 'FILE_COMPLAINT':
        navigate('/submit-complaint');
        return "Opening complaint submission page.";
        
      case 'OPEN_PROFILE':
        navigate('/profile');
        return "Opening profile settings page.";
        
      case 'GO_BACK':
        window.history.back();
        return "Going back.";
        
      case 'GO_FORWARD':
        window.history.forward();
        return "Going forward.";
        
      case 'SCROLL_DOWN':
        window.scrollBy({ top: window.innerHeight * 0.6, behavior: 'smooth' });
        return "Scrolling down.";
        
      case 'SCROLL_UP':
        window.scrollBy({ top: -window.innerHeight * 0.6, behavior: 'smooth' });
        return "Scrolling up.";
        
      case 'RELOAD_PAGE':
        window.location.reload();
        return "Refreshing page.";
        
      case 'LOGOUT':
        localStorage.removeItem('token');
        useAuthStore.getState().logout();
        navigate('/login');
        return "Logged out successfully.";
        
      case 'DARK_MODE':
        document.body.classList.add('dark');
        document.documentElement.classList.add('dark');
        useThemeStore.setState({ theme: 'dark' });
        localStorage.setItem('grievance-theme', JSON.stringify({ state: { theme: 'dark', language: useThemeStore.getState().language } }));
        return "Dark mode enabled.";
        
      case 'LIGHT_MODE':
        document.body.classList.remove('dark');
        document.documentElement.classList.remove('dark');
        useThemeStore.setState({ theme: 'light' });
        localStorage.setItem('grievance-theme', JSON.stringify({ state: { theme: 'light', language: useThemeStore.getState().language } }));
        return "Light mode enabled.";
        
      case 'GO_HOME':
        navigate('/');
        return "Homepage loaded.";

      case 'OPEN_LOGIN':
        navigate('/login');
        return "Login page opened.";

      case 'OPEN_REGISTER':
        navigate('/register');
        return "Register page opened.";

      case 'OPEN_EMERGENCY':
        navigate('/emergency');
        return "Emergency page opened.";

      case 'TRACK_COMPLAINT':
        navigate('/track');
        return "Tracking page opened.";

      case 'WIZARD_NEXT':
        {
          const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
          const nextBtn = buttons.find(btn => {
            const txt = (btn.textContent || btn.value || '').toLowerCase().trim();
            return txt === 'next' || txt === 'continue' || txt === 'next step' || 
                   txt.includes('next') || txt.includes('continue') || txt.includes('ముందుకు') || txt.includes('తరువాత') || txt.includes('నెక్స్ట్');
          });
          if (nextBtn) {
            nextBtn.click();
            return "Going to next step.";
          }
          throw new Error("Could not find 'Next' or 'Continue' button on this page.");
        }

      case 'WIZARD_BACK':
        {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          const backBtn = buttons.find(btn => {
            const txt = (btn.textContent || '').toLowerCase().trim();
            return txt === 'back' || txt === 'previous' || txt === 'previous step' || 
                   txt.includes('back') || txt.includes('previous') || txt.includes('వెనక్కి') || txt.includes('వెనుకకు');
          });
          if (backBtn) {
            backBtn.click();
            return "Going to previous step.";
          }
          throw new Error("Could not find 'Back' or 'Previous' button on this page.");
        }

      case 'WIZARD_SUBMIT':
        {
          const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
          const submitBtn = buttons.find(btn => {
            const txt = (btn.textContent || btn.value || '').toLowerCase().trim();
            return txt === 'submit' || txt === 'submit complaint' || txt === 'submit grievance' || 
                   txt.includes('submit') || txt.includes('సమర్పించు') || txt.includes('సబ్మిట్');
          });
          if (submitBtn) {
            submitBtn.click();
            return "Submitting complaint.";
          }
          throw new Error("Could not find 'Submit' button on this page.");
        }

      case 'FILTER_PENDING':
        {
          const buttons = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
          const filterBtn = buttons.find(btn => {
            const txt = (btn.textContent || '').toLowerCase().trim();
            return txt === 'pending' || txt.includes('pending') || txt.includes('పెండింగ్');
          });
          if (filterBtn) {
            filterBtn.click();
            return "Filtered pending complaints.";
          }
          throw new Error("Could not find 'Pending' filter button.");
        }

      case 'FILTER_IN_PROGRESS':
        {
          const buttons = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
          const filterBtn = buttons.find(btn => {
            const txt = (btn.textContent || '').toLowerCase().trim();
            return txt === 'in progress' || txt === 'in_progress' || txt.includes('progress') || txt.includes('ప్రోగ్రెస్') || txt.includes('పనిలో ఉంది');
          });
          if (filterBtn) {
            filterBtn.click();
            return "Filtered in-progress complaints.";
          }
          throw new Error("Could not find 'In Progress' filter button.");
        }

      case 'FILTER_RESOLVED':
        {
          const buttons = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
          const filterBtn = buttons.find(btn => {
            const txt = (btn.textContent || '').toLowerCase().trim();
            return txt === 'resolved' || txt.includes('resolved') || txt.includes('పరిష్కరించిన') || txt.includes('పరిష్కారం');
          });
          if (filterBtn) {
            filterBtn.click();
            return "Filtered resolved complaints.";
          }
          throw new Error("Could not find 'Resolved' filter button.");
        }

      case 'FILTER_ESCALATED':
        {
          const buttons = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
          const filterBtn = buttons.find(btn => {
            const txt = (btn.textContent || '').toLowerCase().trim();
            return txt === 'escalated' || txt.includes('escalated') || txt.includes('ఎస్కలేట్') || txt.includes('ఎస్కలేటెడ్');
          });
          if (filterBtn) {
            filterBtn.click();
            return "Filtered escalated complaints.";
          }
          throw new Error("Could not find 'Escalated' filter button.");
        }

      case 'FILTER_ALL':
        {
          const buttons = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
          const filterBtn = buttons.find(btn => {
            const txt = (btn.textContent || '').toLowerCase().trim();
            return txt === 'all' || txt.includes('all') || txt.includes('అన్నీ') || txt.includes('మొత్తం') || txt === 'clear filter';
          });
          if (filterBtn) {
            filterBtn.click();
            return "Showing all complaints.";
          }
          throw new Error("Could not find 'All' filter button.");
        }

      default:
        console.log(`🎬 [actionExecutor] unknown intent: ${intent}`);
        return null;
    }
  }
};

export default actionExecutor;
