/**
 * ChatGPT Sidebar - Side Panel Script
 * 
 * Handles the sidebar panel UI including:
 * - Receiving text from context menu actions
 * - Displaying paste notifications
 * - Communicating with the ChatGPT iframe
 * 
 * @author toastyfawn566
 * @version 1.3.0
 */

// =============================================================================
// DOM ELEMENTS
// =============================================================================

const iframe = document.getElementById('chatgpt-frame');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');
const dismissBtn = document.getElementById('dismiss-notification');

// =============================================================================
// STATE
// =============================================================================

let notificationTimeout = null;
let iframeReady = false;

// Set the initial iframe URL only after loading the user preference.
async function initializeChatGPTFrame() {
  try {
    const { openTemporaryChat = false } = await chrome.storage.sync.get('openTemporaryChat');
    iframe.src = openTemporaryChat
      ? 'https://chatgpt.com/?temporary-chat=true'
      : 'https://chatgpt.com';
  } catch (error) {
    console.error('ChatGPT Sidebar: Could not load chat mode preference', error);
    iframe.src = 'https://chatgpt.com';
  }
}
initializeChatGPTFrame();

// =============================================================================
// NOTIFICATION MANAGEMENT
// =============================================================================

/**
 * Shows a notification message with auto-dismiss
 * @param {string} message - Message to display
 * @param {number} duration - How long to show (ms), default 3000
 */
function showNotification(message, duration = 3000) {
  notificationText.textContent = message;
  notification.classList.remove('hidden');
  
  // Clear existing timeout
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
  }
  
  // Auto-hide after duration
  notificationTimeout = setTimeout(hideNotification, duration);
}

/**
 * Hides the notification immediately
 */
function hideNotification() {
  notification.classList.add('hidden');
  if (notificationTimeout) {
    clearTimeout(notificationTimeout);
    notificationTimeout = null;
  }
}

// Dismiss button click
dismissBtn.addEventListener('click', hideNotification);

// ESC key dismisses notification
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideNotification();
  }
});

// =============================================================================
// IFRAME COMMUNICATION
// =============================================================================

/**
 * Sends text to the ChatGPT iframe via postMessage
 * @param {string} text - Text to paste into ChatGPT
 * @returns {boolean} Whether the message was sent
 */
function sendToIframe(text) {
  if (!iframe || !iframe.contentWindow) {
    console.log('ChatGPT Sidebar: Iframe not ready');
    return false;
  }
  
  try {
    iframe.contentWindow.postMessage({
      type: 'CHATGPT_SIDEBAR_PASTE',
      text: text
    }, 'https://chatgpt.com');
    return true;
  } catch (err) {
    console.error('ChatGPT Sidebar: Failed to send to iframe', err);
    return false;
  }
}

/**
 * Handles received text - stores it and sends to iframe
 * @param {string} text - The prompt text to handle
 */
function handleIncomingText(text) {
  // Store for the inject script to pick up
  chrome.storage.local.set({ pendingPaste: text });
  
  // Send directly via postMessage if iframe is ready
  if (iframeReady) {
    setTimeout(() => sendToIframe(text), 500);
  }
  
  // Show notification with preview
  const preview = text.length > 40 ? text.substring(0, 40) + '...' : text;
  showNotification(`Pasting: "${preview}"`, 2000);
}

// =============================================================================
// IFRAME LOAD HANDLER
// =============================================================================

iframe.addEventListener('load', () => {
  // Ignore about:blank before the saved URL is assigned.
  if (!iframe.getAttribute('src')) return;
  console.log('ChatGPT Sidebar: Iframe loaded');
  iframeReady = true;
  
  // Check for any pending text that was stored before iframe loaded
  chrome.storage.local.get(['selectedText'], (result) => {
    if (result.selectedText) {
      const text = typeof result.selectedText === 'string' 
        ? result.selectedText 
        : result.selectedText.text;
      
      if (text) {
        handleIncomingText(text);
        chrome.storage.local.remove('selectedText');
      }
    }
  });
});

// =============================================================================
// STORAGE LISTENER
// =============================================================================

// Listen for new text from context menu actions
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.selectedText) {
    const data = changes.selectedText.newValue;
    if (data) {
      const text = typeof data === 'string' ? data : data.text;
      if (text) {
        handleIncomingText(text);
        chrome.storage.local.remove('selectedText');
      }
    }
  }
});

// =============================================================================
// INITIAL CHECK
// =============================================================================

// Check for pending text on initial load (before iframe is ready)
chrome.storage.local.get(['selectedText'], (result) => {
  if (result.selectedText && !iframeReady) {
    console.log('ChatGPT Sidebar: Text pending, waiting for iframe...');
    // Will be handled in iframe load event
  }
});
