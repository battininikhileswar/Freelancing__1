/**
 * voiceActionExecutor.js
 * Clean action executor which handles all automated GUI interactions in React.
 */

import useAuthStore from '../store/authStore';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Route aliases mapping
const ROUTE_MAP = {
  '/': '/',
  'home': '/',
  '/login': '/login',
  'login': '/login',
  '/register': '/register',
  'register': '/register',
  'citizen_dashboard': '/dashboard',
  '/dashboard': '/dashboard',
  'admin_dashboard': '/admin/dashboard',
  '/admin/dashboard': '/admin/dashboard',
  'police_dashboard': '/ps-dashboard',
  '/ps-dashboard': '/ps-dashboard',
  'acb_dashboard': '/acb-dashboard',
  '/acb-dashboard': '/acb-dashboard',
  'fire_dashboard': '/fire-dashboard',
  '/fire-dashboard': '/fire-dashboard',
  'hospital_dashboard': '/hospital-dashboard',
  '/hospital-dashboard': '/hospital-dashboard',
  'authority_dashboard': '/dashboard', // Dynamic fallback below
  'report_issue': '/submit-complaint',
  '/submit-complaint': '/submit-complaint',
  '/report-issue': '/submit-complaint',
  'my_complaints': '/dashboard',
  '/my-complaints': '/dashboard',
  'map': '/map',
  '/map': '/map',
  'profile': '/profile',
  '/profile': '/profile',
  'settings': '/profile',
  '/settings': '/profile',
};

export const voiceActionExecutor = {
  /**
   * Performs global secure logout operations
   */
  async executeLogout(navigate) {
    console.log("🎬 [ActionExecutor] Executing global secure logout...");
    
    // Clear localStorage and sessionStorage credentials
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    sessionStorage.clear();

    // Reset Zustand auth state
    const { logout } = useAuthStore.getState();
    logout();

    // Reset API common headers
    if (api.defaults.headers.common['Authorization']) {
      delete api.defaults.headers.common['Authorization'];
    }

    toast.success("Logged out successfully.");
    
    // Navigate with history replacement
    navigate('/login', { replace: true });
    return "Logged out successfully.";
  },

  /**
   * Standardizes and resolves the path target
   */
  resolvePath(target, role) {
    let cleanTarget = (target || '').toLowerCase().trim();
    
    // Strip leading or trailing slashes for lookup
    if (cleanTarget.startsWith('/')) cleanTarget = cleanTarget.substring(1);
    if (cleanTarget.endsWith('/')) cleanTarget = cleanTarget.substring(0, cleanTarget.length - 1);

    // Dynamic resolution for authority dashboard based on user role
    if (cleanTarget === 'authority_dashboard' || cleanTarget === 'authority') {
      if (role === 'ps_officer') return '/ps-dashboard';
      if (role === 'acb_officer') return '/acb-dashboard';
      if (role === 'municipal_officer') return '/municipal-dashboard';
      if (role === 'fire_officer') return '/fire-dashboard';
      if (role === 'hospital_officer') return '/hospital-dashboard';
      return '/dashboard'; // Fallback
    }

    const mapped = ROUTE_MAP[cleanTarget] || ROUTE_MAP['/' + cleanTarget];
    if (mapped) return mapped;

    // Direct path starts with /
    if (target && target.startsWith('/')) {
      return target;
    }
    
    // Fallback default
    return '/';
  },

  /**
   * Automates form field entering in React
   */
  async fillField(fieldName, val) {
    const field = (fieldName || '').toLowerCase().trim();
    console.log(`🎬 [ActionExecutor] Automating fill for field "${field}" with value "${val}"`);

    // Match inputs, textareas, selects
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    const matchedEl = inputs.find(el => {
      const id = (el.id || '').toLowerCase();
      const name = (el.name || '').toLowerCase();
      const ph = (el.placeholder || '').toLowerCase();
      return id.includes(field) || name.includes(field) || ph.includes(field);
    });

    if (matchedEl) {
      matchedEl.focus();
      
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
      matchedEl.blur();
      return true;
    }
    return false;
  },

  /**
   * Main entry point to execute parsed actions safely
   */
  async execute(intentObj, navigate) {
    if (!intentObj) return "No action executed.";
    const { action, target, value, confidence } = intentObj;
    
    console.log(`🎬 [ActionExecutor] Executing action: "${action}" | Target: "${target}" | Value: "${value}"`);

    // CRITICAL: Handle LOGOUT first before any other route or navigation action
    const isLogoutIntent = action === 'LOGOUT' || 
                           (target && (target.toLowerCase().includes('logout') || target.toLowerCase().includes('signout')));

    if (isLogoutIntent) {
      return await this.executeLogout(navigate);
    }

    const role = useAuthStore.getState().user?.role || 'guest';

    switch (action) {
      case 'NAVIGATE': {
        const resolvedPath = this.resolvePath(target, role);
        console.log(`🎬 [ActionExecutor] Navigating absolutely to: "${resolvedPath}"`);
        navigate(resolvedPath);
        return `Opened page ${resolvedPath}.`;
      }

      case 'CLICK': {
        const cleanedTarget = (target || '').toLowerCase().trim();
        const buttons = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"], [role="button"]'));
        const matched = buttons.find(btn => {
          const txt = (btn.textContent || btn.value || '').toLowerCase().trim();
          return txt.includes(cleanedTarget) || cleanedTarget.includes(txt);
        });

        if (matched) {
          matched.click();
          return `Clicked "${matched.textContent.trim() || 'button'}".`;
        }
        throw new Error(`Click target "${target}" not found.`);
      }

      case 'FILL_FORM': {
        const success = await this.fillField(target, value);
        if (success) {
          return `Entered details in field ${target}.`;
        }
        throw new Error(`Field "${target}" not found.`);
      }

      case 'SUBMIT_FORM': {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        const submitBtn = buttons.find(btn => {
          const txt = (btn.textContent || btn.value || '').toLowerCase().trim();
          return txt === 'submit' || txt.includes('submit') || txt.includes('సమర్పించు');
        });
        if (submitBtn) {
          submitBtn.click();
          return "Form submitted.";
        }
        throw new Error("Submit button not found.");
      }

      case 'SEARCH': {
        const inputs = Array.from(document.querySelectorAll('input'));
        const searchInput = inputs.find(el => {
          const ph = (el.placeholder || '').toLowerCase();
          const type = (el.type || '').toLowerCase();
          return type === 'search' || ph.includes('search') || ph.includes('వెతుకు');
        });
        if (searchInput) {
          searchInput.focus();
          searchInput.value = value;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          searchInput.blur();
          return `Searched for "${value}".`;
        }
        throw new Error("Search input field not found.");
      }

      case 'FILTER': {
        const cleanedFilter = (value || '').toLowerCase().trim();
        const buttons = Array.from(document.querySelectorAll('button, a'));
        const filterBtn = buttons.find(btn => {
          const txt = (btn.textContent || '').toLowerCase().trim();
          return txt.includes(cleanedFilter) || 
                 (cleanedFilter === 'pending' && txt.includes('పెండింగ్')) ||
                 (cleanedFilter === 'resolved' && txt.includes('పరిష్కారం'));
        });
        if (filterBtn) {
          filterBtn.click();
          return `Filtered complaints by ${value}.`;
        }
        throw new Error(`Filter button for "${value}" not found.`);
      }

      case 'READ_PAGE': {
        const text = document.body.innerText.substring(0, 800).replace(/\s+/g, ' ').trim();
        return text;
      }

      case 'ASK_CLARIFICATION':
      case 'CHAT':
        // Just return the spoken reply
        return intentObj.reply;

      default:
        console.warn("⚠️ [ActionExecutor] Unknown action:", action);
        return intentObj.reply || "Action completed.";
    }
  }
};

export default voiceActionExecutor;
