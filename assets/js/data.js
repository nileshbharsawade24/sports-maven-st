/* ==========================================================================
   EDIT THIS FILE to change contact details, academies and the sports list.
   The whole website is generated from it - no other file needs touching.
   ========================================================================== */
window.SITE = {
  brand: {
    name: 'Sports Maven',
    tagline: 'Whatever your sport needs,',
    accent: 'we\'ve got you.',
    intro:
      'Sport academy partners and sports equipment, all in one place. Train with a partner academy, or simply ask for the gear you need. ' +
      'Schools, associations, academies, tournaments and players are all welcome. Just message us on WhatsApp or email.'
  },

  contact: {
    whatsapp: '919834680994',                  // country code + number, digits only (91 = India)
    phone: '+91 98346 80994',                  // how the number is shown on the site
    email: 'sportsmaven.hub@gmail.com',
    address: '',                               // optional - shown in the footer and contact section when filled in
    hours: '',                                 // optional, e.g. 'Mon-Sat, 10 am - 8 pm'
    instagram: '',                             // optional - full link, leave '' to hide
    facebook: '',
    youtube: ''
  },

  // value: 'academies' and 'sports' are counted automatically; use text for words instead of a number
  stats: [
    { value: 'academies', label: 'Sport academy partners' },
    { value: 'sports', suffix: '+', label: 'Sports equipment we supply' },
    { text: 'Bulk', label: 'Orders for schools, associations, academies & tournaments' },
    { text: 'Direct', label: 'Order queries on WhatsApp & email' }
  ],

  pillars: [
    { icon: 'users', title: 'Sport Academy Partners', text: 'Coaching for kids and adults at our partner academies, with more sports and branches on the way.', link: ['Meet our academy partners', 'index.html#academies'] },
    { icon: 'tag', title: 'Sports Equipment', text: 'Equipment for table tennis, badminton, pickleball, cricket, gymnastics and more. Tell us what you need and we reply with availability and the best price.', link: ['See what we supply', 'store.html'] },
    { icon: 'chat', title: 'Bulk & Direct Orders', text: 'Schools, associations, academies and tournaments can order in bulk. For any order query, message us on WhatsApp or email.', link: ['Bulk orders', 'store.html#bulk'] }
  ],

  bulk: {
    title: 'Bulk orders for schools & associations',
    text: 'Equipping a school, an association, a club or a tournament? Send us your list and quantities and we will reply with availability and a bulk price.',
    who: [
      { icon: 'users', title: 'Schools', text: 'Kits for sports periods, inter-school events and sports days.' },
      { icon: 'star', title: 'Associations & clubs', text: 'Equipment for district and state associations, clubs and tournaments.' },
      { icon: 'tag', title: 'Academies & institutions', text: 'Coaching centres, colleges and organisations that need regular supply.' }
    ],
    steps: [
      { title: 'Send your list', text: 'Tell us the sports, items and quantities on WhatsApp or email.' },
      { title: 'Get a quote', text: 'We reply with availability and a bulk price.' },
      { title: 'Confirm', text: 'We confirm delivery and payment details with you directly.' }
    ]
  },

  /* ----------------------------------------------------------------- SPORTS
     The sports we supply. No prices on the site - customers ask by WhatsApp/email.
     popular -> gets a "Most asked" tag.  items -> typical things people ask for (edit freely).
  ----------------------------------------------------------------------- */
  sports: [
    { id: 'table-tennis', name: 'Table Tennis', icon: 'tabletennis', hue: 40, popular: true, items: ['Bats & blades', 'Rubbers', 'Balls', 'Tables', 'Nets & posts', 'Bags & covers'] },
    { id: 'badminton', name: 'Badminton', icon: 'badminton', hue: 20, popular: true, items: ['Rackets', 'Shuttlecocks', 'Nets', 'Grips', 'Strings', 'Kit bags'] },
    { id: 'pickleball', name: 'Pickleball', icon: 'pickleball', hue: 34, popular: true, items: ['Paddles', 'Balls', 'Portable nets', 'Bags', 'Grips'] },
    { id: 'cricket', name: 'Cricket', icon: 'cricket', hue: 28, popular: true, items: ['Bats', 'Balls', 'Pads & gloves', 'Helmets', 'Stumps', 'Kit bags'] },
    { id: 'gymnastics', name: 'Gymnastics', icon: 'gymnastics', hue: 12, popular: true, items: ['Mats', 'Balance beams', 'Rings', 'Ribbons & hoops', 'Vaulting boxes'] },
    { id: 'tennis', name: 'Tennis', icon: 'tennis', hue: 44, items: ['Rackets', 'Balls', 'Strings', 'Grips', 'Nets'] },
    { id: 'fitness', name: 'Fitness', icon: 'dumbbell', hue: 16, items: ['Dumbbells', 'Yoga mats', 'Skipping ropes', 'Resistance bands', 'Gym gloves'] }
  ],

  /* ------------------------------------------------------------- ACADEMIES
     Academies are NOT edited here. Each one is its own file in content/academies/
     (see content/academies/_template.js and README.md).
  ----------------------------------------------------------------------- */
  photoExt: 'jpg',
  // Academies live one-per-file in content/academies/. `node tools/make-pages.js` bundles them into assets/js/academies.js.
  // Optional fields get safe defaults, so an academy file only needs slug, name, tagline and about.
  academies: (window.ACADEMIES || []).map(a => Object.assign(
    { kind: '', icon: 'trophy', hue: 40, photos: false, soon: false, level: '', venue: '', facts: [], highlights: [], programs: [], coaches: [], gallery: [] },
    a
  ))
};
