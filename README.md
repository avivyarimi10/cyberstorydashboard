# Cyber Story Tracker

A small web app for keeping the month-to-month story of how security helps the business, and rolling it up by quarter.

- **Monthly story:** one plain line per lens per month, plus a headline, an overall direction (Safer, Same, Less safe), the decision or ask, and what you can't say yet.
- **Metrics:** numbers by month. Each metric says whether lower or higher is better and whether a quarter adds or averages its months. The latest value, the change, and a Better/Worse flag work themselves out. Blank means not available, never zero.
- **Asks:** every ask or decision with an owner, a due date, a status, and how it ended.
- **Quarterly roll-up:** calendar quarters filled in from the other tabs, plus five lines you write yourself. One button copies a text summary of the latest quarter.

The ten lenses (risk reduction, velocity, resource allocation, accountability, assurance, third-party risk, resilience, trend and confidence, cost and avoided loss, forward look and asks) are the ones in the lens tracker spreadsheet.

## Run it

No build step and no server. Open `index.html` in a browser.

Your data is saved in the browser's local storage on that device. Use **Export JSON** to back it up or move it, and **Import JSON** to load it back. **Load sample data** fills the app with a made-up example for a fictional manufacturer.

## Put it on the web (GitHub Pages)

1. Push these files to the root of a GitHub repository.
2. In the repository, open Settings, then Pages.
3. Under "Build and deployment", choose "Deploy from a branch", pick `main` and `/ (root)`, and save.
4. After a minute the app is live at `https://<your-username>.github.io/<repository>/`.

Pages sites are public, but the app has no server: each visitor's data stays in their own browser and is never sent anywhere.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The page and its header |
| `styles.css` | Layout, colors, light and dark theme |
| `app.js` | Data, calculations and the four views |

## Ideas for later

- Sign-in and a small database, so a team can share one tracker.
- A chart of each metric across months.
- Print or PDF output for the quarterly roll-up.
- Per-client workspaces.
