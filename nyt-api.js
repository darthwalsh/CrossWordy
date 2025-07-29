// NYT Crossword URL Generator
// Opens NYT crossword pages in new tabs for manual downloading

class NYTApi {
  constructor() {
    this.baseUrl = "https://www.nytimes.com/crosswords/game/daily/";
  }

  /**
   * Convert a Date object to NYT URL format
   * @param {Date} date - The date to convert
   * @returns {string} - Format: "YYYY/MM/DD"
   */
  dateToUrlPath(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  /**
   * Generate NYT crossword URL for a given date
   * @param {Date} date - The date of the puzzle
   * @returns {string} - The NYT crossword URL
   */
  generateCrosswordUrl(date) {
    const urlPath = this.dateToUrlPath(date);
    return `${this.baseUrl}${urlPath}`;
  }

  /**
   * Open NYT crossword page for a given date in a new tab
   * @param {Date} date - The date of the puzzle to open
   */
  openCrosswordPage(date) {
    const url = this.generateCrosswordUrl(date);
    const dateString = date.toLocaleDateString();
    
    console.log(`Opening NYT crossword for ${dateString}: ${url}`);
    
    // Open in new tab
    window.open(url, '_blank');
    
    // Show instructions
    setTimeout(() => {
      this.showDownloadInstructions(date);
    }, 1000);
  }

  /**
   * Show instructions for downloading the puzzle manually
   * @param {Date} date - The date for context
   */
  showDownloadInstructions(date) {
    const dateString = date.toLocaleDateString();
    
    const message = `NYT Crossword for ${dateString} opened in a new tab.\n\n` +
      `To import the puzzle:\n` +
      `1. If needed, sign in to your NYT Games subscription\n` +
      `2. Download the puzzle as a .puz file from the NYT page\n` +
      `3. Come back to this tab and upload the .puz file\n\n` +
      `Would you like to open the file upload dialog now?`;
    
    if (confirm(message)) {
      this.triggerManualUpload(date);
    }
  }

  /**
   * Trigger the manual PUZ file upload
   * @param {Date} date - The date for context
   */
  triggerManualUpload(date) {
    // Create a temporary file input for manual upload
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.puz';
    fileInput.style.display = 'none';
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        console.log(`Manual upload selected for ${date.toDateString()}:`, file.name);
        
        // Use the existing upload mechanism
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onloadend = (evt) => {
          try {
            // Use the existing fromUpload function if available
            if (typeof fromUpload === 'function') {
              fromUpload(evt.target.result);
            } else {
              // Fallback: decode PUZ and alert user
              const puz = Puz.decode(evt.target.result);
              alert(`PUZ file loaded: ${puz.meta.title}\nPlease use the existing upload functionality to process this file.`);
            }
          } catch (error) {
            alert(`Error reading PUZ file: ${error.message}`);
          }
        };
      }
      
      // Clean up
      document.body.removeChild(fileInput);
    };
    
    // Add to DOM temporarily and click
    document.body.appendChild(fileInput);
    fileInput.click();
  }
}

// Export for use in other files
const nytApi = new NYTApi(); 
