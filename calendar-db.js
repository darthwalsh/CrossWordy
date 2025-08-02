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
      console.log('Creating calendar, firebase available:', typeof firebase);
      console.log('Creating calendar, db available:', typeof db);
      console.log('Creating calendar, this.collection:', this.collection);
      
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
      console.error('Full error details:', error);
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
   * Update date status in calendar
   * @param {string} calendarId - The calendar document ID
   * @param {Date} date - The date to update
   * @param {string} status - The new status
   * @param {string} puzzleId - Optional puzzle reference
   * @returns {Promise<void>}
   */
  async updateDateStatus(calendarId, date, status, puzzleId = null) {
    try {
      const dateKey = this.formatDateKey(date);
      const updateData = {};
      
      // Use dot notation to update nested field
      updateData[`dates.${dateKey}`] = {
        status: status,
        lastUpdated: firebase.firestore.Timestamp.now(),
        ...(puzzleId && { puzzleId: puzzleId })
      };

      await this.collection.doc(calendarId).update(updateData);
      
      // Trigger live update
      await this.collection.doc(calendarId).collection("live").doc("updates").update({
        lastChange: firebase.firestore.Timestamp.now(),
        changedDate: dateKey,
        newStatus: status
      });
      
      console.log(`Updated ${dateKey} status to ${status}`);
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
   * Set up real-time listener for calendar changes
   * @param {string} calendarId - The calendar document ID
   * @param {Function} callback - Function to call when calendar updates
   * @returns {Function} - Unsubscribe function
   */
  onCalendarUpdate(calendarId, callback) {
    const calendarDoc = this.collection.doc(calendarId);
    
    return calendarDoc.onSnapshot(snapshot => {
      if (snapshot.exists) {
        const data = {
          id: snapshot.id,
          ...snapshot.data()
        };
        callback(data);
      }
    }, error => {
      console.error('Calendar listener error:', error);
    });
  }

  /**
   * Set up real-time listener for live updates
   * @param {string} calendarId - The calendar document ID  
   * @param {Function} callback - Function to call when live updates occur
   * @returns {Function} - Unsubscribe function
   */
  onLiveUpdates(calendarId, callback) {
    const liveDoc = this.collection.doc(calendarId).collection("live").doc("updates");
    
    return liveDoc.onSnapshot(snapshot => {
      if (snapshot.exists && !snapshot.metadata.hasPendingWrites) {
        callback(snapshot.data());
      }
    }, error => {
      console.error('Live updates listener error:', error);
    });
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
