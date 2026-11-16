# Board Game Library

An Android app for keeping track of the board games your friends own, so you can stop asking the group chat who has Wingspan.

One person runs it on their phone and keeps the list for everyone. The other people in your group show up as owners, but they don't need the app.

## What it does right now

You add a game, pick who owns it, and it goes on the list. If two people own Catan, that's still one entry with two owners. You can also fill in how many players it takes and how long it runs, or leave those blank. Only the name is required. Tap a game to change any of that or delete it.

People get added as you go: while picking owners, type a new name and they're in. Everyone is also listed in Settings → People. Tap a name there to change it, add someone new, or delete someone. If they were the only owner of a game, that game goes too, and the app tells you how many before you confirm.

Nothing is gone for good when you delete it. An Undo button shows up for a few seconds, and anything you missed is in Settings → Recently deleted.

It won't let you add the same game or person twice, and it ignores capitals and extra spaces when checking.

You start out named after your phone. Change that in Settings → People.

All of this lives on your phone. There's no account, no network access, and nothing gets sent anywhere.

## Not built yet

These are planned for v1:

- A picker: tell it how many of you there are and how long you've got, and it shows what fits and who can bring it
- Voting on games to play
- A play log with date, players and winners, plus when each game was last played
- Asking for your name the first time you open the app
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
