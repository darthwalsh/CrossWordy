# Product Requirements Document: NYT Puzzle Calendar

## Introduction/Overview

This feature adds a shareable calendar system that allows groups of friends and family to coordinate their New York Times crossword puzzle solving activities. Users can import historical NYT puzzles by date, track their collective progress, and share calendars with others to see who's working on what puzzles and their completion status.

The feature solves the friction of finding and accessing specific historical NYT puzzles while enabling groups to coordinate their puzzle-solving activities more effectively.

## Goals

1. **Reduce friction in puzzle discovery**: Make it easy for users to find and import NYT puzzles by specific dates
2. **Enable group coordination**: Allow friends/family to share calendars and see each other's puzzle progress
3. **Track collective progress**: Provide visual indicators of puzzle completion status across the group
4. **Maintain simplicity**: Keep the interface intuitive and consistent with existing app styling
5. **Leverage existing infrastructure**: Use the current puzzle sharing architecture (DB ID in URL) for calendar sharing

## User Stories

1. **As a puzzle enthusiast**, I want to click an "NYT" button to open a calendar picker so that I can quickly find and import a specific date's puzzle without hunting through external sources.

2. **As a member of a puzzle-solving group**, I want to share a calendar with my friends so that we can coordinate which puzzles we're working on and avoid duplicating efforts.

3. **As a group member**, I want to see visual indicators on the calendar showing which puzzles are not started, in progress, or completed so that I can quickly identify what's available to work on.

4. **As a puzzle solver**, I want the calendar to automatically update when I complete a puzzle so that my progress is reflected for the group without manual intervention.

5. **As a group organizer**, I want to manually mark certain days as "done" on the calendar so that I can indicate when puzzles have been completed outside the app or are being skipped.

6. **As a collaborative solver**, I want the calendar to track both completion status and actual puzzle progress so that group members can see if someone is actively working on a puzzle.

## Functional Requirements

### Core Calendar Functionality
1. The system must provide an "NYT" button prominently displayed at the top of the interface
2. The system must open a calendar picker when the NYT button is clicked
3. The calendar must display dates in a standard monthly view with clear visual indicators for puzzle status
4. The system must support date selection to import the corresponding NYT puzzle for that date
5. The calendar must show three distinct states: not started, in progress, and completed with visual indicators (colors/icons)

### Data Management
6. The system must store calendar data as documents in the cloud database (following current Firestore architecture)
7. Each calendar document must maintain a mapping of dates to puzzle status and puzzle document IDs
8. The system must create puzzle documents when importing NYT puzzles and link them to calendar entries
9. The system must track both completion status and actual puzzle progress for each date

### Sharing Mechanism
10. The system must enable calendar sharing using the same URL-based approach as current puzzle sharing (DB ID in URL)
11. Multiple users must be able to access the same calendar simultaneously and see real-time updates
12. The system must allow read/write access to all calendar members

### Progress Tracking
13. The system must automatically update calendar status when puzzles are completed through the app
14. The system must provide a manual "mark as done" option for each calendar date
15. The system must visually distinguish between puzzles completed in-app vs. manually marked as done
16. The system must sync progress updates in real-time across all users viewing the shared calendar

### NYT Integration
17. The system must support importing NYT puzzles using the NYT API endpoints (`https://www.nytimes.com/svc/crosswords/v6/puzzle/{filename}.json`)
18. The system must support daily puzzles with filename format `daily/YYYY-MM-DD`
19. The system must leverage existing browser session cookies for NYT authentication
20. The system must provide fallback to manual PUZ file upload when automatic download fails
21. The system must handle cases where NYT puzzles are not available for specific dates gracefully
22. The imported puzzles must integrate seamlessly with the existing puzzle-solving interface
23. The system must convert NYT JSON format to the existing puzzle data structure

## Non-Goals (Out of Scope)

1. **Authentication/User Management**: This feature will not implement user accounts or authentication - sharing works via URL access like current puzzles
2. **Advanced Calendar Features**: No recurring events, reminders, or complex scheduling features
3. **Multiple Puzzle Sources**: Only NYT daily puzzles will be supported (no other publishers or puzzle types)
4. **Calendar Export**: No ability to export to Google Calendar, iCal, or other external calendar systems
5. **Advanced Progress Analytics**: No detailed statistics, time tracking, or performance metrics
6. **Comments/Notes**: No ability to add comments or notes to calendar entries
7. **Calendar Templates**: No pre-made calendar templates or bulk date selection

## Design Considerations

- **Visual Consistency**: The calendar interface must match existing app styling and color scheme
- **Mobile Responsive**: The calendar must work well on mobile devices, as many users solve puzzles on phones/tablets
- **Accessibility**: Calendar navigation and status indicators should be screen-reader friendly
- **Performance**: Calendar loading should be fast even with large date ranges
- **Visual Hierarchy**: Clear distinction between different puzzle states using color coding and/or icons

### Recommended Visual Indicators:
- **Not Started**: Default/neutral background color
- **In Progress**: Yellow/orange indicator with optional progress indicator
- **Completed (In-App)**: Green background or checkmark icon
- **Manually Marked Done**: Different shade of green or distinct icon to show manual completion

## Technical Considerations

### Database Schema
- Calendar documents should follow similar structure to puzzle documents for consistency
- Consider subcollections for real-time updates (similar to `live/cells` and `live/shares`)
- Date keys should use consistent format (YYYY-MM-DD) for reliable sorting and querying

### Integration Points
- Hook into existing puzzle completion logic to auto-update calendar status
- Leverage existing Firestore real-time listeners for live updates
- Use existing URL parameter parsing system for calendar sharing

### NYT Puzzle Import
- Leverage NYT API endpoints for puzzle download (similar to [CrosswordScraper approach](https://github.com/jpd236/CrosswordScraper/blob/dcc0fb05258aebb8d84bf6e3319230338e49fa7d/src/jsMain/kotlin/com/jeffpdavidson/crosswordscraper/sources/NewYorkTimesSource.kt#L16))
- Use existing browser session cookies for authentication (assumes user is signed in to nytimes.com)
- Support daily NYT puzzles only
- Implement fallback to manual PUZ file upload if automatic download fails
- Handle network failures gracefully with appropriate error messages

### Recommended Implementation Approach
Given the user's feedback that integration approach should be "what makes most sense," recommend:
1. **Bi-directional integration**: Calendar updates when puzzles are completed, and calendar can launch puzzle-solving interface
2. **Seamless workflow**: Clicking a calendar date should either open existing puzzle or import and open new puzzle
3. **Unified progress tracking**: Single source of truth for puzzle completion status

### NYT Puzzle Download Implementation
Based on the proven [CrosswordScraper approach](https://github.com/jpd236/CrosswordScraper/blob/dcc0fb05258aebb8d84bf6e3319230338e49fa7d/src/jsMain/kotlin/com/jeffpdavidson/crosswordscraper/sources/NewYorkTimesSource.kt#L16):

1. **Primary API Endpoint**: `https://www.nytimes.com/svc/crosswords/v6/puzzle/{filename}.json`
2. **Fallback API Endpoint**: `https://nyt-games-prd.appspot.com/svc/crosswords/v6/puzzle/{filename}.json` (requires NYT-S cookie)
3. **Filename Format**: `daily/{YYYY-MM-DD}`
4. **Authentication**: Use existing browser session cookies (user assumed to be signed in)
5. **Error Handling**: Graceful fallback to manual PUZ file upload if API calls fail
6. **Data Processing**: Convert NYT JSON format to existing CrossWordy puzzle data structure

## Success Metrics

1. **Primary**: Reduction in user friction for accessing specific NYT puzzles (measured by user feedback and usage patterns)
2. **Adoption**: Number of shared calendars created and actively used
3. **Engagement**: Increased usage of historical puzzles vs. only current puzzles
4. **Collaboration**: Number of users accessing shared calendars and completion coordination

## Open Questions

1. **NYT API Implementation**: Should we implement the NYT API calls client-side (like CrosswordScraper) or server-side? Client-side would leverage user's existing login but may hit CORS issues.

2. **Date Range Support**: How far back should we support historical daily puzzles? NYT uses filename format `daily/YYYY-MM-DD`.

3. **Authentication Strategy**: Should we detect if user is signed in to NYT, prompt them to sign in, or always provide manual upload fallback?

4. **Calendar Permissions**: Should there be any restrictions on who can modify a shared calendar, or should all users have full access?

5. **Storage Considerations**: For calendars covering many years, should we implement lazy loading or pagination for performance?

6. **Mobile UX**: How should the calendar picker work on mobile devices where screen space is limited?

7. **Data Migration**: For users who already have puzzle progress outside the calendar system, should there be a way to import/sync that data?

8. **Calendar Naming**: Should shared calendars have names/titles to distinguish between multiple calendars a user might access?

## Implementation Priority

### Phase 1 (MVP):
- Basic calendar UI with date picker
- Calendar creation and sharing via URL
- Manual status marking (done/not done)
- NYT puzzle import for limited date range

### Phase 2:
- Auto-update from puzzle completion
- Visual progress indicators
- Real-time synchronization
- Extended date range support

### Phase 3:
- Enhanced visual design
- Mobile UX optimization
- Performance improvements
- Error handling and edge cases 
