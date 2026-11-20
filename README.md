# Sports Maven: sports hub (static website)

A futuristic, mobile-friendly **information site** with:

* a home page,
* a **sports gear** page that shows the sports you supply (no prices, no checkout), with **bulk orders** for schools and associations and **direct order queries** by WhatsApp and email,
* an **academy page** for each academy: Smart Smashers (table tennis) is live with its photo gallery, and the 2nd branch has a "coming soon" page.

Pure HTML, CSS and JavaScript. One tiny build step for academies (`node tools/make-pages.js`), no server, no database. It runs on **GitHub Pages** for free.

```
index.html                home
store.html                sports gear, bulk orders, order queries
tournament.html           live scores: draw, byes, scoring (table tennis, badminton)
content/academies/*.js    <-- EDIT THESE: one file per academy (add / update / delete here)
content/academies/_template.js   copy this to add an academy
assets/js/data.js         EDIT THIS: contact, sports list, bulk-order text
assets/js/academies.js    GENERATED from content/academies (do not edit)
academies/*.html          GENERATED, one page per academy (do not edit)
assets/css/style.css      design
assets/js/app.js          builds the pages in the browser
assets/img/academies/     photos, one folder per academy: <slug>/cover.jpg, 1.jpg ... 9.jpg
tools/make-pages.js       the build step: run it after any academy change
assets/js/tournament.js   the live scores page (draw, scoring, admin token)
assets/js/live-config.js  EDIT THIS to switch on live viewing (two values)
tools/supabase-setup.sql  paste into Supabase once to create the live database
```

## 1. See it on your computer

Open `index.html`, or run `python3 -m http.server 8000` in this folder and open <http://localhost:8000>.

## 2. Change details

Open **`assets/js/data.js`** (site-wide details). Academies are separate, see section 4.

| Change | Where |
|---|---|
| Site name, tagline | `brand` (also search and replace `Sports Maven` in the `.html` files, which hold the page titles) |
| WhatsApp, email, phone | `contact` (WhatsApp is country code + number, digits only: `919834680994`) |
| Address, opening hours | `contact.address`, `contact.hours` (hidden while empty) |
| Sports we supply and the items listed under each | `sports` |
| Bulk-order text and steps | `bulk` |
| Academy text, facts, programmes, gallery captions, WhatsApp, Instagram | that academy's file in `content/academies/` (section 4) |

There are no prices anywhere. Customers message you for availability and price.

**Logo and browser-tab icon**

The golden logo (four steps with a hoop, ball, jump and football athlete) is in `assets/img/logo.svg`, with a 512 px picture in `assets/img/logo-512.png`. The small logo in the site header and footer is `assets/img/logo-mark.svg` (the bolder version, so it stays readable small). The tab icon is `favicon.svg` (a bolder version of the same logo, so it stays readable when small), plus `favicon.ico` and `apple-touch-icon.png` for older browsers and iPhones. To change the logo, replace those files and keep the names. Browsers keep old tab icons for a while, so press Ctrl+F5 (or Cmd+Shift+R) to see a new one.

## 3. Photos

Smart Smashers photos are in `assets/img/academies/smart-smashers/`: `cover.jpg` (card and page header) and `1.jpg` to `9.jpg` (gallery). The captions are in the academy's file under `gallery`.

To change a photo, replace the file with the same name. To add photos for another academy: create `assets/img/academies/<slug>/` with `cover.jpg` and `1.jpg` to `9.jpg`, then set `photos: true` on that academy. Use lowercase file names and keep them under about 500 KB each. For `.png` or `.webp` files change `photoExt`.

These photos came from the Smart Smashers listing on Google, which marks images as possibly subject to copyright. Use photos you own or have permission to use.

## 4. Add, update or delete an academy

Every academy is one file in `content/academies/`. After any change run this once in the project folder (needs Node.js):

```bash
node tools/make-pages.js
```

It bundles the files, creates or refreshes each academy page, updates the home page list, and removes pages of academies you deleted. It also stops with a clear message if a field is missing or a slug is duplicated.

**Add an academy**

1. Copy `content/academies/_template.js` to `content/academies/03-<slug>.js`. The number sets the order on the site.
2. Fill in the values (the template explains every field).
3. Photos (optional): put `cover.jpg` and `1.jpg` to `9.jpg` in `assets/img/academies/<slug>/` and set `photos: true`.
4. Run `node tools/make-pages.js`.

**Update an academy:** edit its file, run `node tools/make-pages.js`.

**Delete an academy:** delete its file in `content/academies/` (and its photo folder if you like), run `node tools/make-pages.js`.

**Open the 2nd branch:** in `content/academies/02-smart-smashers-branch-2.js` remove `soon: true` and fill in `about`, `facts`, `highlights`, `programs` and `gallery` like the first academy. Add its photos, then run the command.

Academy pages never print phone numbers or emails. They show WhatsApp, call, mail and Instagram icons only. Per-academy `whatsapp`, `email` and `instagram` fields override the main contact.

## 5. Live scoring (tournaments)

The page is `tournament.html` ("Live Scores" in the menu), for **table tennis** and **badminton**.

**Run a tournament**

1. Live Scores, then **Create a tournament**.
2. Give it a name, pick the sport and rules (defaults below), how many tables or courts can be used **at the same time**, and the format.
3. Paste the players, one name per line. Any number works.
4. **Knockout** shows the numbers for you, for example: *"18 players make a 32-place bracket, so 14 byes (14 players go straight to round 2; 2 matches in round 1)"*. The number of byes comes from the player count. You choose **who** gets them: the top seeds (first names entered), players picked at random, or players you tick yourself. The draw can follow the order entered (top names are top seeds) or be random.
   **League** puts the players in groups (one group is fine) and everyone plays everyone in their own group. You choose the number of groups or the players per group, and who goes in which group (see "How the league is arranged" below).
5. Press **Create**. You get the **admin token** and the **watch link**.
6. On the tournament page press **Start on Table 1 / 2 / 3** for each match you want to play. Up to the number of tables you set can be live together. Tap **+1** for whoever wins each rally. **Undo last point** is always there. Winners move to the next round by themselves, and the finished tournament shows the champion.

**Points and games** (defaults, you can change them for each tournament)

| | Table tennis | Badminton |
|---|---|---|
| Points in a game | first to 11, win by 2 | first to 21, win by 2, the 30th point wins |
| Games in a match | early rounds best of 3, semi-finals best of 5, final best of 5 | best of 3 in every round |

Early rounds, the semi-finals and the final each have their own "best of" setting on the create form, so for example the final can be best of 7 while the semi-finals stay best of 5.

Table tennis also shows who is serving: it changes every 2 points, and every point from 10-10.

**Typing a result instead of tapping every point**

* **Enter / edit score** (on a live match), **Enter result** (on a match that is up next) and **Edit result** (on a finished match) open a small form. Type the score of each game, for example 11-7, 9-11, 11-9, and press **Save result**. Leave unused games empty.
* The form checks the scores against the rules. For example 11-10 is not a finished game, 15-3 is not possible, and games cannot be added after someone has already won the match. A game still in progress can go in the last row of a live match, and the +1 and Undo buttons carry on from there.
* **Walkover** records a match that was not played: pick the winner and no points are stored.
* The winner moves to the next round automatically. If you change a result, the next round is updated too, unless that next match has already been played (the form tells you).
* Nobody can be in two live matches at once. The page says so if a player is already on another table.

**How the league is arranged**

A league (also called round robin) has everyone play everyone once, inside their group. A group of n players makes n x (n - 1) / 2 matches. Use one group for a single league, or several groups to keep the number of matches sensible: 18 players in one group is 153 matches, in 3 groups of 6 it is 45.

1. The players are placed in a circle. One player stays fixed and the others move one place each round (the "circle method").
2. In each round the first player faces the last, the second faces the second-last, and so on. Every player plays exactly once per round and nobody meets the same opponent twice.
3. With an odd number of players, one player rests each round. A league has N - 1 rounds for an even N and N rounds for an odd N. For example 5 players make 10 matches in 5 rounds, and 18 players make 153 matches in 17 rounds.
4. The order of the players follows the names as entered, or a random shuffle if you pick Random.
5. **Standings:** most wins first. Players level on wins are ordered by the results between those players, then by game difference (games won minus games lost), then by point difference, then by name. When every match is done, the top of the table is the winner.

**Groups**

* On the create form pick **Number of groups**, or type **Players per group** and the groups follow. Sizes are as even as possible (for example 18 players in 4 groups: 5, 5, 4, 4). Every group needs at least 2 players.
* **Who goes in which group:** *Spread by order entered* places the top names in different groups (A, B, C, then C, B, A, and so on, so the strongest players are split up). *Random* shuffles the players. *I will choose* lets you pick a group for every player.
* Each group has its own standings table and its own winner, and matches are labelled like "Group B - Round 2". When every group is done the page shows "Group winners".

**Next stages (groups, then a league, then a knockout...)**

A tournament can have as many stages as you like. The players who go through from one stage carry on to the next, and every stage can be a league (one group or several) or a knockout. For example: 20 players in 4 groups of 5, then the top 2 of each group (8 players) in 2 groups of 4, then the top 2 of each of those in a knockout.

* When a league stage is finished, the admin sees **Set up the next stage** on the tournament page. (Only the admin sees it. A knockout ends the tournament, so nothing follows it.)
* **1. Who goes through:** type how many go through from each group (for example 2) and the top of every group is ticked. You can still tick and untick names yourself, for example to add the best third-placed player. Players level on every tie-break are ordered by name, so check the ticks at the cut.
* **2. What they play next:** the same choices as when you created the tournament: league or knockout, number of groups, who goes in which group, byes, random or seeded draw, tables and the best-of for each round. You can also name the stage (for example "Super 8").
* Seeds follow the table: group winners first, then runners-up, and so on, so winners meet runners-up from other groups. Players who already met in the stage before are kept apart in the new groups and in round 1 where possible.
* Match numbers carry on (stage 1 had 40 matches, so stage 2 starts at Match 41). Each stage has its own panel on the page, newest first, with the older ones folded. Download chart and Download results (CSV) include every stage.
* Once the next stage is set up, the stage before it is **closed**: its results cannot be edited. If you picked the wrong players or format, use **Redo this stage** (it only works until a match in the new stage has started), then choose again.
* Tournaments made before this feature open as a single stage and can be continued the same way.

**Big tournaments (limits)**

* Up to **2,000 players** in one tournament, up to **64 tables or courts** at once, and up to **5,000 matches in one stage** (so a league needs groups once it gets big: 1,000 players in one group would be about 500,000 matches, in 250 groups of 4 it is 1,500).
* Tested with 1,000 players (a knockout, and 250 groups of 4 followed by a 500-player knockout) and with a 2,000-player knockout. Each point redraws in well under a tenth of a second.
* **Up next** and **Results** show the first 40 rows with a **Show all** button, so the page stays short.
* **Storage:** everything is saved in this browser, which usually allows about 5 to 10 MB. A tournament of 1,000 players takes roughly 300 KB to 700 KB, so a few big ones fit. If the browser is full, the page says "no room left" and does not save that score: download a backup and end old tournaments.
* **Download chart** works up to about 2,000 players on a computer. On a phone, or for a very large league plus knockout, it says the picture would be too big: use **Download results (CSV)** instead. Long league match lists are left out of the picture and are in the CSV.
* Live mode (the free database) has its own size caps in `tools/supabase-setup.sql` (400 KB per tournament), which a 1,000-player tournament would pass. Raise them there before using live mode for one.

**Ending a tournament (removes it)**

* **End tournament** (admin bar) asks "are you sure?" in a window. If you confirm, scoring stops and the tournament, with every score and its token, is **deleted for good**. Anyone still watching sees "This tournament has ended".
* Before it is removed the window offers to save copies to your device, all ticked by default: a **chart picture** (the bracket, or the standings for round robin), a **results spreadsheet (CSV)**, and a **backup file**. The backup file is how you bring the tournament back later: on Live Scores press **Restore from file** and pick it.
* **Download chart** and **Download results (CSV)** are also on every tournament page, for you or any viewer, at any time before it is ended.
* Automatic removal after 7 days comes with the Firebase setup. Until then, End tournament is the way to clear a tournament.

**Two sports at the same time:** create one tournament per sport. Each has its own link and its own tables. With live mode on, both appear on the Live Scores page.

**The admin token**

* It is made automatically when you create the tournament and shown on the success page. Save it then.
* It stays in your browser, so you remain signed in on that phone or laptop. Only the admin can reveal it again: **Show token** in the admin bar. Viewers never see it, and it is never stored in the tournament data (live mode keeps only a scrambled hash).
* To score from another phone, or to give a helper access: open the watch link, **Admin sign in**, type the token.
* Lost or leaked? While signed in, press **New token**. The old one stops working at once.
* Anyone who has the token can score, so share it only with your scorers. If you lose it and are not signed in anywhere, make a new tournament.

**Where the data lives**

* **Default (no setup):** in your browser only (local storage, not cookies), so nobody else can watch yet. It survives a refresh, closing the tab and restarting the phone. It is lost if you clear the browser's site data, use a private tab, or switch phone or browser.
* **Backup file (recommended with the default):** on the Live Scores page press **Download backup** (also in the admin bar of a tournament). It saves one small file with all your tournaments: players, matches, scores and admin tokens. Keep it in Google Drive or WhatsApp to yourself, and keep it private, because anyone with the file can score. If the data disappears, open Live Scores (or an old watch link), press **Restore from file** and pick the file. Restore never replaces newer data that is already on the device.
* **Live (everyone can watch):** a free Supabase database holds the tournaments. Viewers see scores update within about 3 seconds. One-time setup, about 10 minutes:
  1. Create a free project at supabase.com (any name, a region near you, a database password, then wait for it to finish).
  2. Open **SQL Editor, New query**, paste the whole of `tools/supabase-setup.sql` and press **Run**.
  3. Open **Project Settings, API** and copy the **Project URL** and the **anon public** key.
  4. Paste both into `assets/js/live-config.js` and publish the site again.
  5. Test: create a tournament, open its watch link on another phone, score a point and watch it appear.
* Notes: the two keys are public by design. The database checks the admin token on every change, so viewers cannot edit anything. Free Supabase projects pause after about a week without use (open the dashboard to wake it). Player names are visible to anyone with the link, and tournaments you list also show on the Live Scores page.

## 6. Publish on GitHub (free)

**With the website only**

1. On github.com click **New repository**. Name it, for example, `sports-maven`. Keep it **Public**.
2. Click **uploading an existing file** and drag in **everything inside this folder** (so `index.html` is at the top level of the repo). Commit.
3. Go to **Settings, Pages**. Under **Build and deployment** choose **Deploy from a branch**, branch **main**, folder **/ (root)**, and Save.
4. After a minute your site is live at `https://<your-username>.github.io/sports-maven/`.

**With the terminal**

```bash
cd ~/Downloads/sports-hub
git init -b main
git add .
git commit -m "Sports Maven site"
git remote add origin https://github.com/<your-username>/sports-maven.git
git push -u origin main
```

Then do step 3 above. To update later, edit the files, then `git add . && git commit -m "Update" && git push`.

**Your own domain:** in Settings, Pages, enter the domain, and add a DNS `CNAME` record pointing to `<your-username>.github.io`.

All links are relative, so the site works at `username.github.io/sports-maven/` and on a custom domain without changes. `.nojekyll` is included so GitHub serves the files as they are.

## Notes

* **No data is collected.** The enquiry forms build a message and open WhatsApp or the visitor's email app; nothing is stored or sent by the site itself.
* **WhatsApp buttons** are normal `wa.me` chat links with the sport or academy filled into the message.
* Fonts (Inter, Playfair Display) load from Google Fonts. Offline, the site falls back to system fonts.
* Pages are built in the browser from `data.js` and the academy files, so Google can read them, but link previews on WhatsApp show only the title and description from each `.html` file's `<head>`.
