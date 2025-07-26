# Tasks for NYT Puzzle Calendar Implementation

Based on analysis of the existing CrossWordy codebase and the NYT Calendar PRD requirements.

## Current Architecture Understanding

**Existing Infrastructure:**
- Firestore database with `puzzles` collection and `live` subcollections
- URL-based sharing via `?id={document_id}` parameter
- Real-time updates using Firestore `onSnapshot` listeners
- PUZ file processing pipeline via `Puz.decode()`
- CSS grid system with custom properties for responsive layout
- Completion detection via filled cell counting in `updateChars()`

**Key Files:**
- `main.js` - Core puzzle logic, Firestore integration, UI event handling
- `index.html` - DOM structure with header, grid, and clues sections
- `style.css` - Grid layout, visual states, responsive design

## Relevant Files

- `index.html` - Add NYT button to header and calendar modal structure
- `style.css` - Calendar styling, visual indicators, responsive design for calendar UI
- `main.js` - Core calendar functionality, NYT API integration, and calendar-puzzle integration
- `calendar.js` - New file for calendar-specific logic and UI management
- `nyt-api.js` - New file for NYT puzzle import functionality and API handling
- `calendar-db.js` - New file for calendar data management and Firestore operations

### Notes

- Calendar functionality will be integrated into the existing single-page architecture
- NYT API calls will be made client-side to leverage existing user authentication
- Calendar data will follow similar Firestore patterns as existing puzzle documents
- Visual indicators will use existing CSS color scheme and styling patterns
- **Testing Strategy**: Manual browser testing (refresh and verify UI/functionality) - no automated test framework needed for this simple HTML/CSS/JS project

## Tasks

- [ ] 1.0 Implement Calendar UI and Navigation
  - [ ] 1.1 Add "NYT" button to header section next to existing buttons
  - [ ] 1.2 Create calendar modal overlay with month/year navigation controls
  - [ ] 1.3 Implement calendar grid layout showing dates for selected month
  - [ ] 1.4 Add visual indicators for puzzle states (not started, in progress, completed, manually marked)
  - [ ] 1.5 Style calendar to match existing app design with responsive mobile support
  - [ ] 1.6 Implement calendar modal open/close functionality and keyboard navigation
  - [ ] 1.7 Add date selection handling and highlight current date

- [ ] 2.0 Add NYT Puzzle Import Functionality
  - [ ] 2.1 Implement NYT API endpoint calls using fetch with CORS handling
  - [ ] 2.2 Add browser cookie extraction for NYT authentication (NYT-S cookie)
  - [ ] 2.3 Create NYT JSON to CrossWordy data format conversion function
  - [ ] 2.4 Implement fallback API endpoint logic with cookie headers
  - [ ] 2.5 Add graceful error handling and fallback to manual PUZ upload
  - [ ] 2.6 Create date-to-filename conversion (daily/YYYY-MM-DD format)
  - [ ] 2.7 Test import functionality with various date ranges and handle missing puzzles

- [ ] 3.0 Create Calendar Data Management System
  - [ ] 3.1 Design Firestore calendar document schema with date mappings and puzzle references
  - [ ] 3.2 Implement calendar creation and document initialization in Firestore
  - [ ] 3.3 Add CRUD operations for calendar document updates (status changes, puzzle links)
  - [ ] 3.4 Create URL parameter system for calendar sharing (similar to puzzle sharing)
  - [ ] 3.5 Implement date-to-puzzle-status mapping and persistence
  - [ ] 3.6 Add calendar document metadata (creation date, title, etc.)

- [ ] 4.0 Integrate Calendar with Existing Puzzle System
  - [ ] 4.1 Hook into existing puzzle completion detection in updateChars function
  - [ ] 4.2 Add automatic calendar status updates when puzzles are completed
  - [ ] 4.3 Implement manual "mark as done" functionality for calendar dates
  - [ ] 4.4 Create navigation from calendar date selection to puzzle solving interface
  - [ ] 4.5 Handle puzzle creation and linking when importing from calendar
  - [ ] 4.6 Add visual distinction between app-completed vs manually-marked puzzles
  - [ ] 4.7 Ensure puzzle-to-calendar relationship is bidirectional

- [ ] 5.0 Implement Real-time Calendar Sharing and Updates
  - [ ] 5.1 Set up Firestore onSnapshot listeners for calendar document changes
  - [ ] 5.2 Implement URL parameter parsing for calendar sharing (?calendar=ID)
  - [ ] 5.3 Add real-time synchronization of calendar status changes across users
  - [ ] 5.4 Handle concurrent user access and conflict resolution for calendar updates
  - [ ] 5.5 Implement live visual updates when other users mark puzzles as done
  - [ ] 5.6 Add error handling for network connectivity and failed syncs
  - [ ] 5.7 Test multi-user calendar sharing and real-time update functionality 
