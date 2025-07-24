# CrossWordy

Play crossword with friends at https://xw.carlwa.com.

CrossWordy is similar to downforacross.com but you need to upload your own puzzle.

## Local development

You can open the HTML file directly i.e. ~/code/CrossWordy/index.html?id=005M6KfPJZybaIoGCRA3

You can view an existing puzzle i.e. ~/code/CrossWordy/index.html?id=005M6KfPJZybaIoGCRA3

This uses the production FireStore database, but users don't have permission to cause any harm.

## Dependencies

- [puz.js](https://github.com/downforacross/puzjs) to parse PUZ files
    - [ ] Using a fork that supports UTF-8 through jsdelivr github CDN until [PR is merged](https://github.com/downforacross/puzjs/pull/22)
- [Firebase](https://firebase.google.com/) for data syncing
