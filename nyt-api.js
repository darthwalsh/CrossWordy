// NYT Puzzle Import API
// Based on CrosswordScraper approach: https://github.com/jpd236/CrosswordScraper

class NYTApi {
  constructor() {
    this.primaryEndpoint = "https://www.nytimes.com/svc/crosswords/v6/puzzle/";
    this.fallbackEndpoint = "https://nyt-games-prd.appspot.com/svc/crosswords/v6/puzzle/";
  }

  /**
   * Convert a Date object to NYT filename format
   * @param {Date} date - The date to convert
   * @returns {string} - Format: "daily/YYYY-MM-DD"
   */
  dateToFilename(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `daily/${year}-${month}-${day}`;
  }

  /**
   * Extract NYT-S cookie value for authentication
   * @returns {string|null} - The NYT-S cookie value or null if not found
   */
  getNYTSCookie() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'NYT-S') {
        return decodeURIComponent(value);
      }
    }
    return null;
  }

  /**
   * Download puzzle from primary NYT endpoint
   * @param {string} filename - The puzzle filename (e.g., "daily/2024-01-15")
   * @returns {Promise<Object>} - The puzzle JSON data
   */
  async downloadFromPrimary(filename) {
    const url = `${this.primaryEndpoint}${filename}.json`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.log(`Primary endpoint failed for ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Download puzzle from fallback endpoint with NYT-S cookie
   * @param {string} filename - The puzzle filename
   * @returns {Promise<Object>} - The puzzle JSON data
   */
  async downloadFromFallback(filename) {
    const nytSCookie = this.getNYTSCookie();
    
    if (!nytSCookie) {
      throw new Error('NYT-S cookie not found. Please sign in to nytimes.com');
    }

    const url = `${this.fallbackEndpoint}${filename}.json`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'nyt-s': nytSCookie
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.log(`Fallback endpoint failed for ${filename}:`, error.message);
      throw error;
    }
  }

  /**
   * Convert NYT JSON format to CrossWordy puzzle format
   * @param {Object} nytData - The NYT puzzle JSON data
   * @returns {Object} - CrossWordy-compatible puzzle data
   */
  convertNYTToCrossWordy(nytData) {
    try {
      const puzzle = nytData.body[0];
      const dimensions = puzzle.dimensions;
      const width = dimensions.width;
      const height = dimensions.height;
      
      // Extract grid data
      const cells = puzzle.cells;
      const grid = [];
      const solution = [];
      
      // Build grid and solution arrays
      for (let row = 0; row < height; row++) {
        const gridRow = [];
        const solutionRow = [];
        
        for (let col = 0; col < width; col++) {
          const cellIndex = row * width + col;
          const cell = cells[cellIndex];
          
          if (cell.type === 'Block') {
            gridRow.push('@');  // Dark square
            solutionRow.push('');
          } else {
            gridRow.push('.');   // Regular square
            solutionRow.push(cell.answer || '');
          }
        }
        
        grid.push(gridRow.join(''));
        solution.push(solutionRow);
      }
      
      // Create darkString (grid layout)
      const darkString = grid.join('_');
      
      // Convert clues
      const acrossClues = [];
      const downClues = [];
      
      if (puzzle.clues) {
        puzzle.clues.forEach(clue => {
          const clueText = `${clue.label} ${clue.text}`;
          if (clue.direction === 'Across') {
            acrossClues.push(clueText);
          } else if (clue.direction === 'Down') {
            downClues.push(clueText);
          }
        });
      }
      
      // Convert solution to tab-separated format
      const solutionText = solution.map(row => row.join('\t')).join('\n');
      
      // Extract title and clean it
      let title = puzzle.title || '';
      if (title) {
        // Remove date and day of week from title
        title = title.replace(/.*\d{4}\s*/, '').trim();
      }
      
      return {
        darkString,
        across: acrossClues.join('\n'),
        down: downClues.join('\n'),
        title: title || 'NYT Daily Crossword',
        solution: solutionText,
        crossWordyCreationMS: new Date().getTime(),
        creation: new Date()
      };
      
    } catch (error) {
      console.error('Error converting NYT data to CrossWordy format:', error);
      throw new Error(`Failed to convert NYT puzzle data: ${error.message}`);
    }
  }

  /**
   * Download NYT puzzle for a given date with fallback strategy
   * @param {Date} date - The date of the puzzle to download
   * @returns {Promise<Object>} - The puzzle JSON data
   */
  async downloadPuzzle(date) {
    const filename = this.dateToFilename(date);
    console.log(`Attempting to download NYT puzzle: ${filename}`);

    // Try primary endpoint first
    try {
      const puzzleData = await this.downloadFromPrimary(filename);
      console.log(`Successfully downloaded ${filename} from primary endpoint`);
      return puzzleData;
    } catch (primaryError) {
      console.log('Primary endpoint failed, trying fallback...');
      
      // Try fallback endpoint
      try {
        const puzzleData = await this.downloadFromFallback(filename);
        console.log(`Successfully downloaded ${filename} from fallback endpoint`);
        return puzzleData;
      } catch (fallbackError) {
        console.error('Both endpoints failed:', {
          primary: primaryError.message,
          fallback: fallbackError.message
        });
        
        throw new Error(`Failed to download puzzle for ${date.toDateString()}. Both primary and fallback endpoints failed. Please ensure you're signed in to nytimes.com`);
      }
    }
  }

  /**
   * Download and convert NYT puzzle to CrossWordy format
   * @param {Date} date - The date of the puzzle to download
   * @returns {Promise<Object>} - CrossWordy-compatible puzzle data
   */
  async downloadAndConvertPuzzle(date) {
    try {
      const nytData = await this.downloadPuzzle(date);
      const crossWordyData = this.convertNYTToCrossWordy(nytData);
      console.log(`Successfully converted NYT puzzle for ${date.toDateString()}`);
      return crossWordyData;
    } catch (error) {
      console.error(`Failed to download and convert puzzle for ${date.toDateString()}:`, error);
      throw error;
    }
  }

  /**
   * Show error dialog with manual upload fallback option
   * @param {Date} date - The date that failed to download
   * @param {Error} error - The error that occurred
   */
  showDownloadErrorDialog(date, error) {
    const dateString = date.toLocaleDateString();
    
    // Create error message
    let errorMessage = `Failed to download NYT puzzle for ${dateString}.\n\n`;
    
    if (error.message.includes('NYT-S cookie')) {
      errorMessage += `Please sign in to nytimes.com in this browser and try again.\n\n`;
    } else if (error.message.includes('HTTP 404')) {
      errorMessage += `The puzzle for this date may not be available.\n\n`;
    } else {
      errorMessage += `${error.message}\n\n`;
    }
    
    errorMessage += `Would you like to manually upload a PUZ file instead?`;
    
    // Show confirmation dialog
    if (confirm(errorMessage)) {
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

  /**
   * Download puzzle with user-friendly error handling and fallback
   * @param {Date} date - The date of the puzzle to download
   * @returns {Promise<Object|null>} - CrossWordy puzzle data or null if user chose manual upload
   */
  async downloadPuzzleWithFallback(date) {
    try {
      return await this.downloadAndConvertPuzzle(date);
    } catch (error) {
      // Show error dialog with manual upload option
      this.showDownloadErrorDialog(date, error);
      return null; // User will handle manual upload
    }
  }
}

// Export for use in other files
const nytApi = new NYTApi(); 
