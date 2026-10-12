/**
 * AEGIS Protocol — Elysium Testnet Beta Access Verification Module
 * Manages institutional access gating during the Ascend & Elysium Testnet Beta phase.
 * 
 * NOTE FOR MAINNET:
 * Once Elysium Mainnet launches, switch IS_TESTNET_GATE_ENABLED to false.
 * This will immediately grant open access to all users without requiring an invite code.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AegisAccess = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Toggle this flag to false upon Mainnet launch to unlock the terminal for all users.
  var IS_TESTNET_GATE_ENABLED = true;

  var STORAGE_KEYS = {
    AUTHORIZED: 'aegis_access_authorized',
    CODE: 'aegis_access_code',
    GRANTED_AT: 'aegis_access_granted_at'
  };

  // 50 Exclusive Testnet Beta Invitation Codes + 10 Alpha Pass Codes
  var CODES_LIST = [
    "AEGIS-TESTNET-SP9Y-MTKP",
    "AEGIS-TESTNET-9TMR-FCRZ",
    "AEGIS-TESTNET-YAJX-NCSR",
    "AEGIS-TESTNET-4MZL-R7Y9",
    "AEGIS-TESTNET-PGPH-5TYD",
    "AEGIS-TESTNET-X3ES-N7AZ",
    "AEGIS-TESTNET-ZDMP-L9VR",
    "AEGIS-TESTNET-ZWJG-BJLB",
    "AEGIS-TESTNET-HBKK-2U9E",
    "AEGIS-TESTNET-9ZSU-CVYN",
    "AEGIS-TESTNET-YJVR-RE4R",
    "AEGIS-TESTNET-S3HS-78PM",
    "AEGIS-TESTNET-7Y48-989T",
    "AEGIS-TESTNET-6A8P-B8HM",
    "AEGIS-TESTNET-MRVQ-GVCS",
    "AEGIS-TESTNET-9JU7-98CL",
    "AEGIS-TESTNET-ZNF9-DN3R",
    "AEGIS-TESTNET-V8D4-ZNCP",
    "AEGIS-TESTNET-PPLM-CALP",
    "AEGIS-TESTNET-HCZU-5T2R",
    "AEGIS-TESTNET-CDCQ-ATBG",
    "AEGIS-TESTNET-3Z3J-86EW",
    "AEGIS-TESTNET-EGR2-MD3K",
    "AEGIS-TESTNET-TZEA-SUF4",
    "AEGIS-TESTNET-7V9S-9BRD",
    "AEGIS-TESTNET-8W7T-E99A",
    "AEGIS-TESTNET-GD7V-Z5ND",
    "AEGIS-TESTNET-F5KQ-88DP",
    "AEGIS-TESTNET-EJ3M-QTAP",
    "AEGIS-TESTNET-6LGC-5X84",
    "AEGIS-TESTNET-UTCX-DKBT",
    "AEGIS-TESTNET-GDPC-XQS5",
    "AEGIS-TESTNET-NSCM-S576",
    "AEGIS-TESTNET-PEN9-WXF6",
    "AEGIS-TESTNET-9PWA-C8L5",
    "AEGIS-TESTNET-W7F9-UZ23",
    "AEGIS-TESTNET-MYKS-GPFQ",
    "AEGIS-TESTNET-BYJA-8H3T",
    "AEGIS-TESTNET-S9K3-UHPQ",
    "AEGIS-TESTNET-2NXY-45SA",
    "AEGIS-TESTNET-XZTD-4HNE",
    "AEGIS-TESTNET-W2FN-UCZJ",
    "AEGIS-TESTNET-JYRW-PFPT",
    "AEGIS-TESTNET-ZRX5-8CNU",
    "AEGIS-TESTNET-DMZU-MHR4",
    "AEGIS-TESTNET-ZPUK-NSEN",
    "AEGIS-TESTNET-78BK-LMX5",
    "AEGIS-TESTNET-LV8D-CD9M",
    "AEGIS-TESTNET-PX22-8G2U",
    "AEGIS-TESTNET-R9GD-E2YQ",
    "AEGIS-ALPHA-701",
    "AEGIS-ALPHA-702",
    "AEGIS-ALPHA-703",
    "AEGIS-ALPHA-704",
    "AEGIS-ALPHA-705",
    "AEGIS-ALPHA-706",
    "AEGIS-ALPHA-707",
    "AEGIS-ALPHA-708",
    "AEGIS-ALPHA-709",
    "AEGIS-ALPHA-710"
  ];

  var VALID_CODES_SET = new Set(CODES_LIST);

  function normalizeCode(raw) {
    if (!raw || typeof raw !== 'string') return '';
    // Strip all whitespace: "AEGIS - TESTNET - 9TMR - FCRZ" -> "AEGIS-TESTNET-9TMR-FCRZ"
    return raw.replace(/\s+/g, '').toUpperCase();
  }

  function isGateEnabled() {
    return IS_TESTNET_GATE_ENABLED;
  }

  function isValidCode(code) {
    var norm = normalizeCode(code);
    return VALID_CODES_SET.has(norm);
  }

  function isAuthorized() {
    if (!IS_TESTNET_GATE_ENABLED) return true;
    try {
      return localStorage.getItem(STORAGE_KEYS.AUTHORIZED) === 'true';
    } catch (e) {
      console.warn('Storage access warning:', e);
      return false;
    }
  }

  function getAuthorizedCode() {
    try {
      return localStorage.getItem(STORAGE_KEYS.CODE) || null;
    } catch (e) {
      return null;
    }
  }

  function authorize(code) {
    var norm = normalizeCode(code);
    if (!isValidCode(norm)) {
      return { success: false, error: 'Invalid or unrecognized access code.' };
    }
    try {
      localStorage.setItem(STORAGE_KEYS.AUTHORIZED, 'true');
      localStorage.setItem(STORAGE_KEYS.CODE, norm);
      localStorage.setItem(STORAGE_KEYS.GRANTED_AT, new Date().toISOString());
      return { success: true, code: norm };
    } catch (e) {
      return { success: false, error: 'Could not write to local storage.' };
    }
  }

  function revoke() {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTHORIZED);
      localStorage.removeItem(STORAGE_KEYS.CODE);
      localStorage.removeItem(STORAGE_KEYS.GRANTED_AT);
      return true;
    } catch (e) {
      return false;
    }
  }

  var api = {
    isGateEnabled: isGateEnabled,
    isValidCode: isValidCode,
    isValid: isValidCode,
    isAuthorized: isAuthorized,
    getAuthorizedCode: getAuthorizedCode,
    authorize: authorize,
    revoke: revoke,
    codesCount: CODES_LIST.length
  };

  if (typeof window !== 'undefined') {
    window.AegisAccess = api;
    window.AegisAccessCodes = api;
  }

  return api;
}));
