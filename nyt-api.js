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
  }
}

// Export for use in other files
const nytApi = new NYTApi(); 
