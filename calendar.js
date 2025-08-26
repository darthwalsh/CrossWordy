
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
    currentCalendarId = urlParams.get("calendar");
    
    if (currentCalendarId) {
      // Load existing calendar
      try {
        calendarData = await calendarDB.getCalendar(currentCalendarId);
        if (calendarData) {
          console.log(`Loaded calendar: ${currentCalendarId}`);
          setupCalendarListeners();
        } else {
          console.warn(`Calendar ${currentCalendarId} not found, creating new one`);
          await createNewCalendar();
        }
      } catch (error) {
        console.error('Error loading calendar:', error);
        await createNewCalendar();
      }
    } else {
      // Create new calendar
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
      
      // Update URL without page reload
      const newUrl = calendarDB.generateShareableUrl(currentCalendarId);
      window.history.pushState({}, '', newUrl);
      
      console.log(`Created new calendar: ${currentCalendarId}`);
      console.log(`Shareable URL: ${newUrl}`);
      
      setupCalendarListeners();
    } catch (error) {
      console.error('Error creating calendar:', error);
      alert('Error creating calendar. Please try again.');
    }
  }
  
  /**
   * Set up real-time listeners for calendar updates
   */
  function setupCalendarListeners() {
    if (!currentCalendarId) return;
    
    // Listen for calendar data changes
    calendarDB.onCalendarUpdate(currentCalendarId, (updatedData) => {
      calendarData = updatedData;
      // Regenerate calendar grid to reflect new data
      if (modal.style.display === 'flex') {
        generateCalendarGrid();
      }
    });
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
    updateMonthDisplay();
    
    // Initialize calendar if not already done
    if (!currentCalendarId) {
      await initializeCalendar();
    }
    
    generateCalendarGrid();
  }
  
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
