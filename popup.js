document.addEventListener('DOMContentLoaded', function() {
    const convertBtn = document.getElementById('convertBtn');
    const statusDiv = document.getElementById('status');
    
    convertBtn.addEventListener('click', async () => {
      try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Check if we're on the Sunway timetable page
        if (!tab.url.includes('izone.sunway.edu.my/timetable')) {
          statusDiv.textContent = 'Error: Please navigate to the Sunway University timetable page first.';
          statusDiv.style.color = 'red';
          return;
        }
        
        statusDiv.textContent = 'Converting timetable...';
        
        chrome.tabs.sendMessage(tab.id, { action: "checkIfReady" }, function(response) {
          // If content script is ready, trigger conversion via message
          if (response && response.status === "ready") {
            chrome.tabs.sendMessage(tab.id, { action: "convert" }, function(result) {
              handleResult(result);
            });
          } else {
            // Content script isn't loaded or didn't respond, use executeScript
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: triggerConversion
            }, (results) => {
              if (chrome.runtime.lastError) {
                statusDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
                statusDiv.style.color = 'red';
                console.error('Runtime error:', chrome.runtime.lastError);
              } else if (results && results[0]) {
                handleResult(results[0].result);
              } else {
                statusDiv.textContent = 'Error: Could not execute script';
                statusDiv.style.color = 'red';
                console.error('No results returned from executeScript');
              }
            });
          }
        });
      } catch (err) {
        statusDiv.textContent = 'Error: ' + err.message;
        statusDiv.style.color = 'red';
        console.error('Caught error:', err);
      }
    });
    
    function handleResult(result) {
      console.log("Result received:", result);
      
      if (!result) {
        statusDiv.textContent = 'Error: No response from content script';
        statusDiv.style.color = 'red';
        return;
      }
      
      if (result.status === 'success') {
        statusDiv.textContent = 'Timetable converted successfully! Check your downloads.';
        statusDiv.style.color = 'green';
      } else if (result.status === 'no-classes') {
        statusDiv.textContent = 'No classes found in the timetable. Make sure you\'re viewing your timetable.';
        statusDiv.style.color = 'orange';
      } else if (result.status === 'error') {
        statusDiv.textContent = 'Error: ' + (result.message || 'Unknown error');
        statusDiv.style.color = 'red';
      } else {
        statusDiv.textContent = 'Unknown response from content script: ' + JSON.stringify(result);
        statusDiv.style.color = 'red';
      }
    }
  });
  
  function triggerConversion() {
    console.log("Executing triggerConversion in page context");
    try {
      if (typeof window.triggerTimetableConversion === 'function') {
        console.log("Found triggerTimetableConversion function");
        const result = window.triggerTimetableConversion();
        console.log("Conversion result:", result);
        return result;
      } else {
        console.log("triggerTimetableConversion function not found");
        const event = new CustomEvent('convert-timetable');
        document.dispatchEvent(event);
        return { status: 'success' };
      }
    } catch (err) {
      console.error('Conversion error:', err);
      return { status: 'error', message: err.message };
    }
  }