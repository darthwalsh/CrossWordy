
/** @param {Date} date - The date of the puzzle to open */
function openNYTCrosswordPage(date) {
  const ymd = new Date(date).toLocaleDateString('en-CA').replace(/-/g, '/');
  window.open(`https://www.nytimes.com/crosswords/game/daily/${ymd}`, '_blank');
}

/**
 * Handle calendar date selection - navigate to existing puzzle or start import
 * @param {Date} selectedDate - The selected calendar date
 */
async function handleDateSelection(selectedDate) {
  if (!currentCalendarId) {
    console.error('No calendar loaded');
    return;
  }

  try {
    const dateKey = calendarDB.formatDateKey(selectedDate);
    
    // Check if puzzle already exists for this date
    const dateData = calendarData.dates && calendarData.dates[dateKey];
    
    if (dateData && dateData.puzzleId) {
      // Navigate to existing puzzle
      console.log(`Navigating to existing puzzle: ${dateData.puzzleId}`);
      window.location = `?id=${dateData.puzzleId}`;
    } else {
      // No puzzle exists - open NYT page for manual import
      console.log(`No puzzle found for ${dateKey}, opening NYT page for import`);
      
      // Store the selected date and calendar for when user uploads puzzle
      sessionStorage.setItem('pendingCalendarDate', dateKey);
      sessionStorage.setItem('pendingCalendarId', currentCalendarId);
      
      openNYTCrosswordPage(selectedDate);
    }
  } catch (error) {
    console.error('Error handling date selection:', error);
    // Fallback to opening NYT page
    openNYTCrosswordPage(selectedDate);
  }
}

// Global calendar state variables
let currentCalendarId = null;
let calendarData = null;

// Calendar Modal Functionality
function initCalendarModal() {
  const modal = $("calendar-modal");
  const nytButton = $("nyt-button");
  const closeButton = $("calendar-close");
  const monthYearDisplay = $("month-year-display");
  const prevMonthBtn = $("prev-month");
  const nextMonthBtn = $("next-month");
  const calendarGrid = $("calendar-grid");
  
  let currentDate = new Date();
  let selectedDate = null;

  // Calendar Management Functions
  
  /**
   * Initialize calendar from URL parameter or create new one
   */
  async function initializeCalendar() {
    const urlParams = new URLSearchParams(window.location.search);
    const newCalendarId = urlParams.get("calendar");
    
    // If we're switching calendars, clean up old listeners
    if (currentCalendarId && currentCalendarId !== newCalendarId) {
      console.log(`Switching from calendar ${currentCalendarId} to ${newCalendarId}`);
      cleanupCalendarListeners(currentCalendarId);
    }
    
    currentCalendarId = newCalendarId;
    
    if (currentCalendarId) {
      // Load existing calendar
      try {
        console.log(`Loading existing calendar: ${currentCalendarId}`);
        calendarData = await calendarDB.getCalendar(currentCalendarId);
        
        if (calendarData) {
          console.log(`Successfully loaded calendar: ${currentCalendarId}`);
          // console.log(`Calendar data:`, calendarData);
          
          setupCalendarListeners();
          
          // Update URL to ensure calendar parameter is present
          const currentUrl = window.location.search;
          if (!currentUrl.includes('calendar=')) {
            const newUrl = calendarDB.generateShareableUrl(currentCalendarId);
            window.history.pushState({}, '', newUrl);
          }
        } else {
          console.warn(`Calendar ${currentCalendarId} not found, creating new one`);
          await createNewCalendar();
        }
      } catch (error) {
        console.error('Error loading calendar:', error);
        await createNewCalendar();
      }
    } else {
      await createNewCalendar();
    }
  }
  
  /**
   * Create a new calendar and update URL
   */
  async function createNewCalendar() {
    try {
      currentCalendarId = await calendarDB.createCalendar();
      calendarData = { id: currentCalendarId, dates: {} };
      
      console.log(`Successfully created new calendar: ${currentCalendarId}`);
      
      const newUrl = calendarDB.generateShareableUrl(currentCalendarId);
      window.history.pushState({}, '', newUrl);
      
      console.log(`Shareable URL: ${newUrl}`);
      
      setupCalendarListeners();
      
      if (modal.style.display === 'flex') {
        showSharingInfo(currentCalendarId, newUrl);
      }
      
    } catch (error) {
      console.error('Error creating calendar:', error);
      alert('Error creating calendar. Please try again.');
    }
  }
  
  /**
   * Show sharing information to the user
   */
  function showSharingInfo(calendarId, shareUrl) {
    // Create a temporary sharing info element
    const sharingInfo = document.createElement('div');
    sharingInfo.className = 'sharing-info';
    sharingInfo.innerHTML = `
      <div style="background: #e8f5e8; border: 1px solid #28a745; border-radius: 5px; padding: 10px; margin: 10px 0; text-align: center;">
        <strong>🎉 Calendar Created!</strong><br>
        Share this URL with friends:<br>
        <code style="background: white; padding: 2px 4px; border-radius: 3px;">${shareUrl}</code><br>
        <small>Changes will sync in real-time across all users</small>
      </div>
    `;
    
    // Insert after the calendar grid
    const calendarGrid = $("calendar-grid");
    calendarGrid.parentNode.insertBefore(sharingInfo, calendarGrid.nextSibling);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (sharingInfo.parentNode) {
        sharingInfo.parentNode.removeChild(sharingInfo);
      }
    }, 5000);
  }
  
  /**
   * Show network error message to user
   */
  function showNetworkError(error, retryCount, context) {
    hideNetworkError(); // Remove any existing error messages
    
    const errorDiv = document.createElement('div');
    errorDiv.id = 'network-error';
    errorDiv.className = 'network-error';
    errorDiv.innerHTML = `
      <div style="background: #f8d7da; border: 1px solid #dc3545; border-radius: 5px; padding: 10px; margin: 10px 0; text-align: center;">
        <strong>⚠️ Connection Issue</strong><br>
        ${context} connection failed (attempt ${retryCount}/3)<br>
        <small>Retrying automatically... <button onclick="location.reload()" style="background: #dc3545; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">Refresh Now</button></small>
      </div>
    `;
    
    // Insert after the calendar grid
    const calendarGrid = $("calendar-grid");
    calendarGrid.parentNode.insertBefore(errorDiv, calendarGrid.nextSibling);
  }
  
  /**
   * Hide network error message
   */
  function hideNetworkError() {
    const existingError = document.getElementById('network-error');
    if (existingError) {
      existingError.remove();
    }
  }
  
  /**
   * Show active users indicator
   */
  function showActiveUsersIndicator(activeUsers) {
    hideActiveUsersIndicator(); // Remove any existing indicator
    
    if (!activeUsers || activeUsers.length === 0) return;
    
    const activeDiv = document.createElement('div');
    activeDiv.id = 'active-users';
    activeDiv.className = 'active-users';
    activeDiv.innerHTML = `
      <div style="background: #e3f2fd; border: 1px solid #2196f3; border-radius: 5px; padding: 8px; margin: 10px 0; text-align: center; font-size: 0.9em;">
        <strong>👥 Active Users</strong><br>
        <small>${activeUsers.length} user${activeUsers.length > 1 ? 's' : ''} currently viewing this calendar</small>
      </div>
    `;
    
    // Insert after the calendar grid
    const calendarGrid = $("calendar-grid");
    calendarGrid.parentNode.insertBefore(activeDiv, calendarGrid.nextSibling);
  }
  
  /**
   * Hide active users indicator
   */
  function hideActiveUsersIndicator() {
    const existingIndicator = document.getElementById('active-users');
    if (existingIndicator) {
      existingIndicator.remove();
    }
  }
  
  /**
   * Set up real-time listeners for calendar updates
   */
  function setupCalendarListeners() {
    if (!currentCalendarId) return;
    
    console.log(`Setting up real-time listeners for calendar: ${currentCalendarId}`);
    
    const userId = calendarDB.generateUserId();
    const cleanupPresence = calendarDB.trackUserPresence(currentCalendarId, userId, 'User');
    
    const unsubscribePresence = calendarDB.onUserPresence(currentCalendarId, (activeUsers) => {
      console.log('Active users:', activeUsers);
      
      const otherUsers = activeUsers.filter(user => user.id !== userId);
      
      if (otherUsers.length > 0) {
        showActiveUsersIndicator(otherUsers);
      } else {
        hideActiveUsersIndicator();
      }
    });
    
    // Listen for calendar data changes
    const unsubscribeCalendar = calendarDB.onCalendarUpdate(
      currentCalendarId, 
      (updatedData) => {
        console.log('Calendar data updated:', updatedData);
        calendarData = updatedData;
        
        // Regenerate calendar grid to reflect new data
        if (modal.style.display === 'flex') {
          generateCalendarGrid();
        }
        
        // Update URL if this is a new calendar
        if (!window.location.search.includes('calendar=')) {
          const newUrl = calendarDB.generateShareableUrl(currentCalendarId);
          window.history.pushState({}, '', newUrl);
        }
        
        // Hide any error messages
        hideNetworkError();
      },
      (error, retryCount) => {
        console.error('Calendar listener error:', error, 'Retry:', retryCount);
        showNetworkError(error, retryCount, 'calendar');
      }
    );
    
    // Listen for live updates (more granular changes)
    const unsubscribeLive = calendarDB.onLiveUpdates(
      currentCalendarId, 
      (liveData) => {
        console.log('Live update received:', liveData);
        
        // If we have a specific date change, we can optimize the update
        if (liveData.changedDate && liveData.newStatus) {
          // Update just the specific date in our local data
          if (!calendarData.dates) calendarData.dates = {};
          calendarData.dates[liveData.changedDate] = {
            status: liveData.newStatus,
            lastUpdated: liveData.lastChange,
            ...(calendarData.dates[liveData.changedDate] || {})
          };
          
          // Regenerate calendar grid to show the change
          if (modal.style.display === 'flex') {
            generateCalendarGrid();
          }
        }
        
        // Hide any error messages
        hideNetworkError();
      },
      (error, retryCount) => {
        console.error('Live updates listener error:', error, 'Retry:', retryCount);
        showNetworkError(error, retryCount, 'live updates');
      }
    );
    
    // Store unsubscribe functions for cleanup
    if (!window.calendarUnsubscribers) {
      window.calendarUnsubscribers = {};
    }
    window.calendarUnsubscribers[currentCalendarId] = {
      calendar: unsubscribeCalendar,
      live: unsubscribeLive,
      presence: unsubscribePresence,
      cleanupPresence: cleanupPresence
    };
  }
  
  /**
   * Clean up real-time listeners for a specific calendar
   */
  function cleanupCalendarListeners(calendarId) {
    if (window.calendarUnsubscribers && window.calendarUnsubscribers[calendarId]) {
      const { calendar, live, presence, cleanupPresence } = window.calendarUnsubscribers[calendarId];
      if (calendar) calendar();
      if (live) live();
      if (presence) presence();
      if (cleanupPresence) cleanupPresence();
      delete window.calendarUnsubscribers[calendarId];
      console.log(`Cleaned up listeners for calendar: ${calendarId}`);
    }
  }
  
  /**
   * Get puzzle state for a date from calendar data
   * @param {Date} date - The date to check
   * @returns {string|null} - The puzzle state CSS class or null
   */
  function getPuzzleState(date) {
    if (!calendarData || !calendarData.dates) return null;
    
    const dateKey = calendarDB.formatDateKey(date);
    const dateData = calendarData.dates[dateKey];
    
    if (!dateData) return null;
    
    // Map database status to CSS class
    switch (dateData.status) {
      case 'completed':
        return 'puzzle-completed';
      case 'in-progress':
        return 'puzzle-in-progress';
      case 'manually-marked':
        return 'puzzle-manually-marked';
      case 'not-started':
      default:
        return null;
    }
  }
  
  function updateMonthDisplay() {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[currentDate.getMonth()];
    const year = currentDate.getFullYear();
    monthYearDisplay.textContent = `${monthName} ${year}`;
  }
  
  function generateCalendarGrid() {
    calendarGrid.innerHTML = "";
    
    // Add day headers
    const dayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    dayHeaders.forEach(day => {
      const headerDiv = document.createElement("div");
      headerDiv.className = "calendar-day-header";
      headerDiv.textContent = day;
      calendarGrid.appendChild(headerDiv);
    });
    
    // Get first day of the month and number of days
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Add dates from previous month to fill the grid
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();
    const prevMonthYear = prevMonth.getFullYear();
    const prevMonthMonth = prevMonth.getMonth();
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateDiv = createDateCell(dayNum, prevMonthMonth, prevMonthYear, true);
      calendarGrid.appendChild(dateDiv);
    }
    
    // Add dates for current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateDiv = createDateCell(day, month, year, false);
      calendarGrid.appendChild(dateDiv);
    }
    
    // Add dates from next month to fill remaining grid
    const totalCells = calendarGrid.children.length - 7; // Subtract header row
    const remainingCells = 42 - totalCells; // 6 rows * 7 days = 42
    
    const nextMonth = new Date(year, month + 1, 1);
    const nextMonthYear = nextMonth.getFullYear();
    const nextMonthMonth = nextMonth.getMonth();
    
    for (let day = 1; day <= remainingCells; day++) {
      const dateDiv = createDateCell(day, nextMonthMonth, nextMonthYear, true);
      calendarGrid.appendChild(dateDiv);
    }
  }
  
  function createDateCell(day, month, year, isOtherMonth) {
    const dateDiv = document.createElement("div");
    dateDiv.className = "calendar-date";
    dateDiv.textContent = day;
    
    if (isOtherMonth) {
      dateDiv.classList.add("other-month");
    }
    
    // Check if this is today
    const today = new Date();
    const cellDate = new Date(year, month, day);
    if (cellDate.toDateString() === today.toDateString()) {
      dateDiv.classList.add("today");
    }
    
    // Add puzzle state indicators (mock data for demonstration)
    if (!isOtherMonth) {
      const puzzleState = getPuzzleState(cellDate);
      if (puzzleState) {
        dateDiv.classList.add(puzzleState);
      }
    }
    
    // Add click handler
    dateDiv.onclick = () => {
      // If clicking on a date from prev/next month, navigate to that month first
      if (isOtherMonth) {
        currentDate = new Date(year, month, day);
        updateMonthDisplay();
        generateCalendarGrid();
        return;
      }
      
      // Remove previous selection
      calendarGrid.querySelectorAll('.calendar-date.selected').forEach(el => {
        el.classList.remove('selected');
      });
      
      // Add selection to clicked date
      dateDiv.classList.add('selected');
      selectedDate = cellDate;
      
      closeModal();
      handleDateSelection(selectedDate);
    };
    
    // Add right-click handler for manual completion
    dateDiv.oncontextmenu = async (e) => {
      e.preventDefault();
      
      if (isOtherMonth || !currentCalendarId) return;
      
      try {
        const currentState = getPuzzleState(cellDate);
        let newStatus;
        
        if (currentState === 'puzzle-manually-marked') {
          // If already manually marked, remove it (set to not started)
          newStatus = 'not-started';
        } else {
          // Mark as manually completed
          newStatus = 'manually-marked';
        }
        
        // Update in database
        await calendarDB.updateDateStatus(currentCalendarId, cellDate, newStatus);
        
        console.log(`Updated ${cellDate.toDateString()} to ${newStatus}`);
      } catch (error) {
        console.error('Error updating date status:', error);
        alert('Error updating date status. Please try again.');
      }
    };
    
    return dateDiv;
  }
  
  async function openModal() {
    modal.style.display = "flex";
    
    // Check if URL has changed and we need to switch calendars
    const urlParams = new URLSearchParams(window.location.search);
    const urlCalendarId = urlParams.get("calendar");
    
    if (urlCalendarId !== currentCalendarId) {
      console.log(`URL calendar ID changed from ${currentCalendarId} to ${urlCalendarId}`);
      // Re-initialize calendar with new ID
      await initializeCalendar();
    } else if (!currentCalendarId) {
      // Initialize calendar if not already done
      await initializeCalendar();
    }
    
    updateMonthDisplay();
    generateCalendarGrid();
  }
  
  /**
   * Handle URL changes (browser back/forward, manual navigation)
   */
  function handleUrlChange() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCalendarId = urlParams.get("calendar");
    
    if (urlCalendarId && urlCalendarId !== currentCalendarId) {
      console.log(`URL changed to calendar: ${urlCalendarId}`);
      // If modal is open, re-initialize with new calendar
      if (modal.style.display === 'flex') {
        initializeCalendar().then(() => {
          updateMonthDisplay();
          generateCalendarGrid();
        });
      }
    }
  }
  
  // Listen for browser back/forward navigation
  window.addEventListener('popstate', handleUrlChange);
  
  // Listen for manual URL changes (for single-page app behavior)
  let currentUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      handleUrlChange();
    }
  }, 100);
  
  function closeModal() {
    modal.style.display = "none";
  }
  
  // Event listeners
  nytButton.onclick = openModal;
  closeButton.onclick = closeModal;
  
  // Close modal when clicking outside
  modal.onclick = (e) => {
    if (e.target === modal) {
      closeModal();
    }
  };
  
  // Month navigation
  prevMonthBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateMonthDisplay();
    generateCalendarGrid();
  };
  
  nextMonthBtn.onclick = () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateMonthDisplay();
    generateCalendarGrid();
  };
  
  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      closeModal();
    }
  });
} 
