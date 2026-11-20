/* TEMPLATE for a new academy.
   1. Copy this file to content/academies/03-<slug>.js (the number sets the order on the site).
   2. Fill in the values. Only slug, name, tagline and about are required: delete any other line you do not need.
   3. Run:  node tools/make-pages.js     (creates the page and updates the home page list)

   slug      -> lowercase, dashes only. It becomes academies/<slug>.html and the photo folder name.
   kind      -> small label above the name
   icon      -> tabletennis | cricket | football | badminton | pickleball | gymnastics | swimming | tennis | martial
   hue       -> accent shade: 10 copper, 28 amber, 40 gold, 50 honey
   photos    -> true once assets/img/academies/<slug>/ has cover.jpg and 1.jpg ... 9.jpg
   soon      -> true while the academy is not open yet ("Coming soon" page; programs/gallery can be empty)
   whatsapp  -> country code + number, digits only (919028988648). Leave out to use the main contact.
   instagram -> full link. Leave out to hide.
   email     -> leave out to use the main contact.
   facts     -> chips under the title: [icon, text]  (icons: users, pin, clock, star, phone, mail, tag, chat)
   Phone numbers and emails are never printed on academy pages: only icons are shown. */
window.ACADEMIES = window.ACADEMIES || [];
window.ACADEMIES.push({
  slug: 'my-academy',
  name: 'My Academy',
  kind: 'Cricket Academy',
  icon: 'cricket',
  hue: 40,
  photos: false,
  tagline: 'One line that sells the academy.',
  about: 'Two or three sentences about the academy, who it trains and where.',
  level: 'Beginners to advanced',
  venue: 'Address of the venue',
  whatsapp: '91XXXXXXXXXX',
  instagram: '',
  facts: [['users', 'Kids & adults'], ['pin', 'Area, City'], ['clock', 'Open daily, 6 am - 9 pm']],
  highlights: ['Experienced coaches', 'Batches for every level'],
  programs: [
    { name: 'Beginner batch', text: 'For players starting out.' }
  ],
  coaches: [],
  gallery: []
});
