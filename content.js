// Make the TimetableConverter class available
class TimetableConverter {
    constructor() {
      this.classes = [];
    }
  
    extractClasses(html) {
      const classes = [];
      const rowsRegex = /<tr class="[^"]*">\s*<th[^>]*><strong>([^<]+)<\/strong>,<br>\s*<span>(\d+ [A-Za-z]+ \d+)<\/span><\/th>([\s\S]*?)<\/tr>/g;
      let rowMatch;
      while ((rowMatch = rowsRegex.exec(html)) !== null) {
        const day = rowMatch[1];
        const dateStr = rowMatch[2];
        const cellsContent = rowMatch[3];
        const cellsRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
        let cellMatch;
        while ((cellMatch = cellsRegex.exec(cellsContent)) !== null) {
          const cellContent = cellMatch[1];
          if (cellContent.trim() === '') continue;
          const timeMatch = /<span><strong>Time : <\/strong>([^<]+)<\/span>/i.exec(cellContent);
          const time = timeMatch ? timeMatch[1].trim() : '';
          const courseMatch = /<br><br>\s*<strong>([^<]+)<\/strong>/i.exec(cellContent);
          const course = courseMatch ? courseMatch[1].trim() : '';
          const venueMatch = /<strong>Venue : <\/strong>([^<]+)<\/span>/i.exec(cellContent);
          const venue = venueMatch ? venueMatch[1].trim() : '';
          const lecturerMatch = /<strong>Lecturer : <\/strong>([^<]+)<\/span>/i.exec(cellContent);
          const lecturer = lecturerMatch ? lecturerMatch[1].trim() : '';
          const groupingMatch = /<strong>Grouping : <\/strong>([^<]+)<\/span>/i.exec(cellContent);
          const grouping = groupingMatch ? groupingMatch[1].trim() : '';
          if (time && course) {
            classes.push({ day, date: dateStr, time, course, venue, lecturer, grouping });
          }
        }
      }
      this.classes = classes;
      return classes;
    }
  
    generateICS() {
      if (this.classes.length === 0) throw new Error('No classes to convert.');
      let icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TimetableToICS//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ];
      this.classes.forEach(classInfo => {
        const [day, monthStr, year] = classInfo.date.split(' ');
        const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
        const month = months[monthStr];
        const dayPadded = day.padStart(2, '0');
        const [startTimeStr, endTimeStr] = classInfo.time.split(' - ');
        const [startHours, startMinutes] = this._convertTo24Hour(startTimeStr);
        const [endHours, endMinutes] = this._convertTo24Hour(endTimeStr);
        const startDateTimeStr = `${year}${month}${dayPadded}T${startHours}${startMinutes}00`;
        const endDateTimeStr = `${year}${month}${dayPadded}T${endHours}${endMinutes}00`;
        const uid = `${startDateTimeStr}-${classInfo.course.replace(/[^\w-]/g, '').replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 9)}`;
        icsContent = icsContent.concat([
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTSTART:${startDateTimeStr}`,
          `DTEND:${endDateTimeStr}`,
          `SUMMARY:${classInfo.course}`,
          `LOCATION:${classInfo.venue}`,
          `DESCRIPTION:Lecturer: ${classInfo.lecturer}\\nGroup: ${classInfo.grouping}`,
          'END:VEVENT'
        ]);
      });
      icsContent.push('END:VCALENDAR');
      return icsContent.join('\r\n');
    }
  
    _convertTo24Hour(timeStr) {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return [String(hours).padStart(2, '0'), String(minutes).padStart(2, '0')];
    }
  
    downloadICS(filename = 'sunway_timetable.ics') {
      const icsContent = this.generateICS();
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(link.href), 100);
      return { result: 'success' };
    }
  }
  
  // Function to trigger the timetable conversion
  function triggerTimetableConversion() {
    console.log('Starting timetable conversion');
    try {
      const converter = new TimetableConverter();
      const html = document.documentElement.innerHTML;
      console.log('Extracting classes from HTML');
      const classes = converter.extractClasses(html);
      console.log(`Found ${classes.length} classes`);
      
      if (classes.length === 0) {
        console.log('No classes found in the timetable.');
        return { status: 'no-classes' };
      }
      
      console.log('Downloading ICS file');
      converter.downloadICS();
      console.log('ICS file download initiated');
      return { status: 'success' };
    } catch (err) {
      console.error('Error converting timetable:', err);
      return { status: 'error', message: err.message };
    }
  }
  
  // Make the function available to the popup script
  window.triggerTimetableConversion = triggerTimetableConversion;
  
  // Listen for the custom event from the popup script
  document.addEventListener('convert-timetable', () => {
    console.log('Received convert-timetable event');
    triggerTimetableConversion();
  });
  
  // Listen for messages from the extension
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message:', message);
    
    if (message.action === "checkIfReady") {
      console.log('Confirming content script is ready');
      sendResponse({ status: "ready" });
      return true; // Indicates we'll send a response asynchronously
    }
    
    if (message.action === "convert") {
      console.log('Executing conversion from message');
      try {
        const result = triggerTimetableConversion();
        console.log('Conversion result:', result);
        sendResponse(result);
      } catch (err) {
        console.error('Error during conversion:', err);
        sendResponse({ status: 'error', message: err.message });
      }
      return true;
    }
  });