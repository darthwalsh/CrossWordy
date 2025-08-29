// Calendar Data Management for Firestore
// Following similar patterns to existing puzzle document structure

/**
 * Calendar Document Schema:
 * {
 *   creation: Timestamp,
 *   title: string (optional),
 *   dates: {
 *     "YYYY-MM-DD": {
 *       status: "not-started" | "in-progress" | "completed" | "manually-marked",
 *       puzzleId: string (reference to puzzle document),
 *       lastUpdated: Timestamp,
 *       completedBy: string[] (for tracking multiple users)
 *     }
 *   }
 * }
 */

class CalendarDB {
  constructor() {
    this.collection = db.collection("calendars");
  }

  /**
   * Format date to consistent string format for database keys
   * @param {Date} date - The date to format
   * @returns {string} - Format: "YYYY-MM-DD"
   */
  formatDateKey(date) {
    return date.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD
  }

  /**
   * Create a new calendar document
   * @param {string} title - Optional title for the calendar
   * @returns {Promise<string>} - The calendar document ID
   */
  async createCalendar(title = '') {
    try {
      const calendarData = {
        creation: firebase.firestore.Timestamp.now(),
        title: title || '',
        dates: {}
      };

      const ref = await this.collection.add(calendarData);
      
      // Create live subcollection for real-time updates (similar to puzzle structure)
      await ref.collection("live").doc("updates").set({});
      
      console.log(`Created new calendar: ${ref.id}`);
      return ref.id;
    } catch (error) {
      console.error('Error creating calendar:', error);
      throw error;
    }
  }

  /**
   * Get calendar document by ID
   * @param {string} calendarId - The calendar document ID
   * @returns {Promise<Object|null>} - The calendar data or null if not found
   */
  async getCalendar(calendarId) {
    try {
      const doc = await this.collection.doc(calendarId).get();
      
      if (!doc.exists) {
        console.warn(`Calendar ${calendarId} not found`);
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error getting calendar:', error);
      throw error;
    }
  }

  /**
   * Update date status in calendar with conflict resolution
   * @param {string} calendarId - The calendar document ID
   * @param {Date} date - The date to update
   * @param {string} status - The new status
   * @param {string} puzzleId - Optional puzzle reference
   * @param {string} userId - Optional user identifier for tracking
   * @returns {Promise<void>}
   */
  async updateDateStatus(calendarId, date, status, puzzleId = null, userId = null) {
    try {
      const dateKey = this.formatDateKey(date);
      
      // Get current calendar data for conflict resolution
      const calendarDoc = await this.collection.doc(calendarId).get();
      if (!calendarDoc.exists) {
        throw new Error(`Calendar ${calendarId} not found`);
      }
      
      const currentData = calendarDoc.data();
      const currentDateData = currentData.dates && currentData.dates[dateKey];
      
      // Prepare update data
      const updateData = {};
      const newDateData = {
        status: status,
        lastUpdated: firebase.firestore.Timestamp.now(),
        ...(puzzleId && { puzzleId: puzzleId }),
        ...(userId && { lastUpdatedBy: userId })
      };
      
      // If we have existing data, merge it intelligently
      if (currentDateData) {
        // Don't overwrite puzzleId if we're not setting a new one
        if (!puzzleId && currentDateData.puzzleId) {
          newDateData.puzzleId = currentDateData.puzzleId;
        }
        
        // Preserve completion tracking
        if (currentDateData.completedBy) {
          newDateData.completedBy = currentDateData.completedBy;
        }
        
        // Add current user to completedBy if marking as completed
        if (status === 'completed' && userId && (!newDateData.completedBy || !newDateData.completedBy.includes(userId))) {
          newDateData.completedBy = [...(newDateData.completedBy || []), userId];
        }
      }
      
      updateData[`dates.${dateKey}`] = newDateData;
      
      // Use transaction for atomic update
      await this.collection.doc(calendarId).update(updateData);
      
      // Trigger live update with more detailed information
      await this.collection.doc(calendarId).collection("live").doc("updates").update({
        lastChange: firebase.firestore.Timestamp.now(),
        changedDate: dateKey,
        newStatus: status,
        updatedBy: userId || 'unknown',
        puzzleId: puzzleId,
        timestamp: firebase.firestore.Timestamp.now()
      });
      
      console.log(`Updated ${dateKey} status to ${status} in calendar ${calendarId}`);
    } catch (error) {
      console.error('Error updating date status:', error);
      throw error;
    }
  }

  /**
   * Get status for a specific date
   * @param {string} calendarId - The calendar document ID
   * @param {Date} date - The date to check
   * @returns {Promise<Object|null>} - The date data or null if not set
   */
  async getDateStatus(calendarId, date) {
    try {
      const calendar = await this.getCalendar(calendarId);
      if (!calendar) return null;
      
      const dateKey = this.formatDateKey(date);
      return calendar.dates[dateKey] || null;
    } catch (error) {
      console.error('Error getting date status:', error);
      throw error;
    }
  }

  /**
   * Set up real-time listener for calendar changes with error handling and retry logic
   * @param {string} calendarId - The calendar document ID
   * @param {Function} callback - Function to call when calendar updates
   * @param {Function} errorCallback - Optional function to call on errors
   * @returns {Function} - Unsubscribe function
   */
  onCalendarUpdate(calendarId, callback, errorCallback = null) {
    const calendarDoc = this.collection.doc(calendarId);
    
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    const setupListener = () => {
      return calendarDoc.onSnapshot(snapshot => {
        if (snapshot.exists) {
          const data = {
            id: snapshot.id,
            ...snapshot.data()
          };
          retryCount = 0; // Reset retry count on successful update
          callback(data);
        }
      }, error => {
        console.error('Calendar listener error:', error);
        retryCount++;
        
        if (errorCallback) {
          errorCallback(error, retryCount);
        }
        
        // Retry connection if it's a network error and we haven't exceeded max retries
        if (retryCount < maxRetries && this.isNetworkError(error)) {
          console.log(`Retrying calendar connection in ${retryDelay}ms (attempt ${retryCount}/${maxRetries})`);
          setTimeout(() => {
            setupListener();
          }, retryDelay * retryCount);
        } else if (retryCount >= maxRetries) {
          console.error(`Max retries exceeded for calendar ${calendarId}. Manual refresh required.`);
          if (errorCallback) {
            errorCallback(new Error('Connection failed after max retries'), retryCount);
          }
        }
      });
    };
    
    return setupListener();
  }
  
  /**
   * Set up real-time listener for live updates with error handling
   * @param {string} calendarId - The calendar document ID  
   * @param {Function} callback - Function to call when live updates occur
   * @param {Function} errorCallback - Optional function to call on errors
   * @returns {Function} - Unsubscribe function
   */
  onLiveUpdates(calendarId, callback, errorCallback = null) {
    const liveDoc = this.collection.doc(calendarId).collection("live").doc("updates");
    
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000;
    
    const setupListener = () => {
      return liveDoc.onSnapshot(snapshot => {
        if (snapshot.exists && !snapshot.metadata.hasPendingWrites) {
          retryCount = 0; // Reset retry count on successful update
          callback(snapshot.data());
        }
      }, error => {
        console.error('Live updates listener error:', error);
        retryCount++;
        
        if (errorCallback) {
          errorCallback(error, retryCount);
        }
        
        // Retry connection if it's a network error and we haven't exceeded max retries
        if (retryCount < maxRetries && this.isNetworkError(error)) {
          console.log(`Retrying live updates connection in ${retryDelay}ms (attempt ${retryCount}/${maxRetries})`);
          setTimeout(() => {
            setupListener();
          }, retryDelay * retryCount);
        } else if (retryCount >= maxRetries) {
          console.error(`Max retries exceeded for live updates ${calendarId}. Manual refresh required.`);
          if (errorCallback) {
            errorCallback(new Error('Live updates connection failed after max retries'), retryCount);
          }
        }
      });
    };
    
    return setupListener();
  }
  
  /**
   * Check if an error is a network connectivity issue
   * @param {Error} error - The error to check
   * @returns {boolean} - True if it's a network error
   */
  isNetworkError(error) {
    const networkErrorCodes = [
      'unavailable',
      'deadline-exceeded',
      'resource-exhausted',
      'internal',
      'unavailable'
    ];
    
    return networkErrorCodes.includes(error.code) || 
           error.message.includes('network') ||
           error.message.includes('connection') ||
           error.message.includes('timeout');
  }
  
  /**
   * Check network connectivity status
   * @returns {Promise<boolean>} - True if network is available
   */
  async checkNetworkConnectivity() {
    try {
      // Try to access a simple Firestore operation
      await this.collection.limit(1).get();
      return true;
    } catch (error) {
      console.warn('Network connectivity check failed:', error);
      return false;
    }
  }
  
  /**
   * Track user presence in calendar
   * @param {string} calendarId - The calendar document ID
   * @param {string} userId - Unique identifier for the user
   * @param {string} userName - Display name for the user
   * @returns {Function} - Function to call to remove presence
   */
  trackUserPresence(calendarId, userId, userName = 'Anonymous') {
    const presenceRef = this.collection.doc(calendarId).collection("presence").doc(userId);
    
    // Set user as present
    const presenceData = {
      userId: userId,
      userName: userName,
      lastSeen: firebase.firestore.Timestamp.now(),
      online: true
    };
    
    // Update presence every 30 seconds to keep user online
    const updatePresence = () => {
      presenceRef.set(presenceData, { merge: true });
    };
    
    // Set initial presence
    updatePresence();
    
    // Update presence every 30 seconds
    const presenceInterval = setInterval(updatePresence, 30000);
    
    // Set up disconnect handler
    const handleDisconnect = () => {
      presenceRef.update({
        online: false,
        lastSeen: firebase.firestore.Timestamp.now()
      });
    };
    
    // Listen for page unload
    window.addEventListener('beforeunload', handleDisconnect);
    
    // Return cleanup function
    return () => {
      clearInterval(presenceInterval);
      window.removeEventListener('beforeunload', handleDisconnect);
      handleDisconnect();
    };
  }
  
  /**
   * Listen for active users in calendar
   * @param {string} calendarId - The calendar document ID
   * @param {Function} callback - Function to call with active users list
   * @returns {Function} - Unsubscribe function
   */
  onUserPresence(calendarId, callback) {
    const presenceCollection = this.collection.doc(calendarId).collection("presence");
    
    return presenceCollection.onSnapshot(snapshot => {
      const activeUsers = [];
      snapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.online) {
          activeUsers.push({
            id: doc.id,
            name: userData.userName,
            lastSeen: userData.lastSeen
          });
        }
      });
      
      callback(activeUsers);
    }, error => {
      console.error('User presence listener error:', error);
      callback([]); // Return empty array on error
    });
  }
  
  /**
   * Generate a unique user ID for this session
   * @returns {string} - Unique user identifier
   */
  generateUserId() {
    if (!window.sessionUserId) {
      window.sessionUserId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }
    return window.sessionUserId;
  }

  /**
   * Generate shareable URL for calendar
   * @param {string} calendarId - The calendar document ID
   * @returns {string} - The shareable URL
   */
  generateShareableUrl(calendarId) {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?calendar=${calendarId}`;
  }
}

// Export instance - will be initialized after db is available
let calendarDB; 
