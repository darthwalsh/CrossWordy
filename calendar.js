
/** @param {Date} date - The date of the puzzle to open */
function openNYTCrosswordPage(date) {
  const ymd = new Date(date).toLocaleDateString('en-CA').replace(/-/g, '/');
  window.open(`https://www.nytimes.com/crosswords/game/daily/${ymd}`, '_blank');
}

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

  // Mock function to demonstrate puzzle states
  // TODO: Replace with actual database queries
  function getPuzzleState(date) {
    const day = date.getDate();
    
    // Mock data for demonstration
    if (day % 7 === 1) return "puzzle-completed";      // Every 7th day starting from 1st
    if (day % 7 === 2) return "puzzle-in-progress";    // Every 7th day starting from 2nd  
    if (day % 7 === 3) return "puzzle-manually-marked"; // Every 7th day starting from 3rd
    
    // Most days are not started (no special class)
    return null;
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
      openNYTCrosswordPage(selectedDate);
    };
    
    // Add right-click handler for manual completion
    dateDiv.oncontextmenu = (e) => {
      e.preventDefault();
      
      if (isOtherMonth) return;
      
      // Toggle manual completion state
      const hasManualMark = dateDiv.classList.contains('puzzle-manually-marked');
      const hasCompleted = dateDiv.classList.contains('puzzle-completed');
      const hasInProgress = dateDiv.classList.contains('puzzle-in-progress');
      
      // Remove all puzzle state classes
      dateDiv.classList.remove('puzzle-completed', 'puzzle-in-progress', 'puzzle-manually-marked');
      
      if (!hasManualMark) {
        // Mark as manually completed
        dateDiv.classList.add('puzzle-manually-marked');
        // TODO: Save to database
      }
      // If already manually marked, remove it (set to not started)
    };
    
    return dateDiv;
  }
  
  function openModal() {
    modal.style.display = "flex";
    updateMonthDisplay();
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
