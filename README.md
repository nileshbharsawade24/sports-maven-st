# Sports Maven: sports hub (static website)

A futuristic, mobile-friendly **information site** with:

* a home page,
* a **sports gear** page that shows the sports you supply (no prices, no checkout), with **bulk orders** for schools and associations and **direct order queries** by WhatsApp and email,
* an **academy page** for each academy: Smart Smashers (table tennis) is live with its photo gallery, and the 2nd branch has a "coming soon" page.

Pure HTML, CSS and JavaScript. One tiny build step for academies (`node tools/make-pages.js`), no server, no database. It runs on **GitHub Pages** for free.

```
index.html                home
store.html                sports gear, bulk orders, order queries
content/academies/*.js    <-- EDIT THESE: one file per academy (add / update / delete here)
content/academies/_template.js   copy this to add an academy
assets/js/data.js         EDIT THIS: contact, sports list, bulk-order text
assets/js/academies.js    GENERATED from content/academies (do not edit)
academies/*.html          GENERATED, one page per academy (do not edit)
assets/css/style.css      design
assets/js/app.js          builds the pages in the browser
assets/img/academies/     photos, one folder per academy: <slug>/cover.jpg, 1.jpg ... 9.jpg
tools/make-pages.js       the build step: run it after any academy change
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

## 5. Publish on GitHub (free)

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
* Fonts (Inter, Space Grotesk) load from Google Fonts. Offline, the site falls back to system fonts.
* Pages are built in the browser from `data.js` and the academy files, so Google can read them, but link previews on WhatsApp show only the title and description from each `.html` file's `<head>`.
