# Ban users matching username patterns Bot

Bans users matching a filter or alerts you if a filter partially matches.

## Setting up

1. Run `npm ci`
2. Copy `src/config.example.ts` to `src/config.ts` and fill in everything
3. Build the source code with `npm run build`
4. Start the bot up by running `node dist/main.js` (or via `pm2` by running `pm2 start dist/main.js --name UsernameFilterBot`)
