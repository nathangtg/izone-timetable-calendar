console.log('Background script loaded');

// Handle installation or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed or updated:', details.reason);
  
  if (details.reason === 'install') {
    console.log('First-time installation');
  }
});

chrome.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked, but should be handled by popup');
});

// Listen for errors
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'reportError') {
    console.error('Error reported from content script:', message.error);
    sendResponse({ received: true });
    return true;
  }
});