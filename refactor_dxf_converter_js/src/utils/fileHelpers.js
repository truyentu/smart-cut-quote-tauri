/**
 * File Helper Utilities
 *
 * Utilities for:
 * - Reading files from file input
 * - Downloading JSON files
 * - Copying to clipboard
 * - File validation
 */

import { stringifySparrowJson } from '../core/jsonFormatter.js';

/**
 * Read multiple files from file input
 * @param {FileList} fileList - File list from input element
 * @returns {Promise<Array>} Array of {name, content, size} objects
 */
export async function readFiles(fileList) {
  const files = Array.from(fileList);

  // Filter DXF files only
  const dxfFiles = files.filter(file =>
    file.name.toLowerCase().endsWith('.dxf')
  );

  if (dxfFiles.length === 0) {
    throw new Error('No DXF files found. Please select .dxf files.');
  }

  // Read all files
  const readers = dxfFiles.map(file => readSingleFile(file));

  return Promise.all(readers);
}

/**
 * Read a single file
 * @param {File} file - File object
 * @returns {Promise<Object>} {name, content, size}
 */
export function readSingleFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      resolve({
        name: file.name,
        content: event.target.result,
        size: file.size,
        lastModified: file.lastModified,
        type: file.type
      });
    };

    reader.onerror = (error) => {
      reject(new Error(`Failed to read file ${file.name}: ${error}`));
    };

    reader.readAsText(file);
  });
}

/**
 * Download JSON as file
 * USES stringifySparrowJson to ensure float notation (0.0 not 0)
 * @param {Object} json - JSON object
 * @param {string} filename - Output filename
 */
export function downloadJson(json, filename = 'nesting-input.json') {
  // CRITICAL: Use stringifySparrowJson to convert integers to floats
  // This prevents Rust deserializer panic in sparroWASM
  const jsonString = stringifySparrowJson(json, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Copy JSON to clipboard
 * USES stringifySparrowJson to ensure float notation
 * @param {Object} json - JSON object
 * @param {boolean} pretty - Pretty print (default: true)
 * @returns {Promise<void>}
 */
export async function copyToClipboard(json, pretty = true) {
  // CRITICAL: Use stringifySparrowJson for float notation
  const jsonString = pretty
    ? stringifySparrowJson(json, 2)
    : stringifySparrowJson(json, 0);

  try {
    await navigator.clipboard.writeText(jsonString);
    return { success: true, message: 'JSON copied to clipboard!' };
  } catch (error) {
    // Fallback for older browsers
    return fallbackCopyToClipboard(jsonString);
  }
}

/**
 * Fallback copy method for browsers without clipboard API
 * @param {string} text - Text to copy
 * @returns {Object} {success, message}
 */
function fallbackCopyToClipboard(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';

  document.body.appendChild(textarea);
  textarea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);

    return successful
      ? { success: true, message: 'JSON copied to clipboard!' }
      : { success: false, message: 'Failed to copy to clipboard' };
  } catch (error) {
    document.body.removeChild(textarea);
    return { success: false, message: 'Copy to clipboard not supported' };
  }
}

/**
 * Validate file before reading
 * @param {File} file - File object
 * @param {Object} options - Validation options
 * @returns {Object} {valid, errors}
 */
export function validateFile(file, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024,  // 10 MB default
    allowedExtensions = ['.dxf']
  } = options;

  const errors = [];

  // Check file exists
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }

  // Check extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    errors.push(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
  }

  // Check size
  if (file.size > maxSize) {
    errors.push(`File too large. Max size: ${formatBytes(maxSize)}`);
  }

  if (file.size === 0) {
    errors.push('File is empty');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Format bytes to human readable string
 * @param {number} bytes - Number of bytes
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted string
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Generate timestamp for filename
 * @returns {string} Timestamp string
 */
export function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Generate filename for JSON output
 * @param {Array} files - Array of input files
 * @returns {string} Generated filename
 */
export function generateOutputFilename(files) {
  const timestamp = getTimestamp();

  if (files.length === 1) {
    const baseName = files[0].name.replace(/\.[^/.]+$/, '');
    return `${baseName}_nesting_${timestamp}.json`;
  }

  return `nesting_${files.length}parts_${timestamp}.json`;
}

/**
 * Load JSON file
 * @param {File} file - JSON file
 * @returns {Promise<Object>} Parsed JSON object
 */
export async function loadJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        resolve(json);
      } catch (error) {
        reject(new Error(`Invalid JSON file: ${error.message}`));
      }
    };

    reader.onerror = (error) => {
      reject(new Error(`Failed to read JSON file: ${error}`));
    };

    reader.readAsText(file);
  });
}

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem('mvp-dxf-converter-settings', JSON.stringify(settings));
    return { success: true };
  } catch (error) {
    console.error('Failed to save settings:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Load settings from localStorage
 * @returns {Object|null} Settings object or null
 */
export function loadSettings() {
  try {
    const saved = localStorage.getItem('mvp-dxf-converter-settings');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return null;
  }
}

/**
 * Clear saved settings
 */
export function clearSettings() {
  try {
    localStorage.removeItem('mvp-dxf-converter-settings');
    return { success: true };
  } catch (error) {
    console.error('Failed to clear settings:', error);
    return { success: false, error: error.message };
  }
}

export default {
  readFiles,
  readSingleFile,
  downloadJson,
  copyToClipboard,
  validateFile,
  formatBytes,
  getTimestamp,
  generateOutputFilename,
  loadJsonFile,
  saveSettings,
  loadSettings,
  clearSettings
};
