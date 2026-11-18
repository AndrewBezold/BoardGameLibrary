# Board Game Library

An Android app for keeping track of the board games your friends own, so you can stop asking the group chat who has Wingspan.

One person runs it on their phone and keeps the list for everyone. The other people in your group show up as owners, but they don't need the app.

## What it does right now

You add a game, pick who owns it, and it goes on the list. If two people own Catan, that's still one entry with two owners. You can also fill in how many players it takes and how long it runs, or leave those blank. Only the name is required. Tap a game to change any of that or delete it.

People get added as you go: while picking owners, type a new name and they're in. Everyone is also listed in Settings → People. Tap a name there to change it, add someone new, or delete someone. If they were the only owner of a game, that game goes too, and the app tells you how many before you confirm.

On the Pick tab, enter how many of you are playing and how many minutes you've got, and it lists the games that fit and who owns them. Leave either one blank if it doesn't matter. Tap the people who are there and it fills in the player count and sticks to games one of them owns (switch that off to see everything), with their names first and in bold. Games missing a player count or play time it needs to check are listed after the rest under "Unknown fit", so they don't get forgotten. Can't decide? Tap Pick one and the app chooses one of the games that fit, and Pick again gives you a different one. Each game shows when it was last played, and you can put the ones nobody's played in ages at the top.

When a game's over, log it. Tap Log play on the game the app picked or on any game's edit form, or tap Log a play on the Pick tab and search for the game. It starts with today's date and whoever you marked as there (or just you), so usually all that's left is tapping the winner and Save. Pick as many winners as you like: none for a co-op loss or a game you gave up on, everyone for a co-op win. Change the date if you're logging one from last week. You can't look back through past plays or fix one yet, apart from the Undo button right after saving.

Nothing is gone for good when you delete it. An Undo button shows up for a few seconds, and anything you missed is in Settings → Recently deleted.

It won't let you add the same game or person twice, and it ignores capitals and extra spaces when checking.

The first time you open the app, it asks for your name. Change it later in Settings → People.

All of this lives on your phone. There's no account, no network access, and nothing gets sent anywhere.

## Not built yet

These are planned for v1:

- Looking up games on BoardGameGeek while adding them, and importing your BGG collection. This will be the only thing the app sends anywhere: your searches and BGG username, to BGG
- Voting on games to play
- Each game's play history and play count, and editing or deleting a play
- Search and sort for the game list
- A self-hosted sync backend, to enable voting and library sharing

## Running it

You need Node.js and either an Android emulator or a phone with USB debugging on. The app uses a development build rather than Expo Go, so the first run builds the native app, and Android Studio has to be installed for that:

```bash
npm install
npx expo run:android
```

After that, `npx expo start` is enough unless you change native code or `app.json`.

It's built with Expo SDK 58, Expo Router, expo-sqlite and Drizzle ORM, in TypeScript. If you're going to change anything, read [docs/development.md](docs/development.md) first. The database migrations in particular have a couple of traps.

## License

MIT. See [LICENSE](LICENSE).
