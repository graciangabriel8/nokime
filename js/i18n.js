/* Nokime — strings.
   French is the source language and lives in the HTML itself; site.js harvests it
   from every [data-t] element at load, so a page reads correctly without any script.
   The `fr` block below holds only what the script renders itself (the language button
   and menu labels).
   `en` holds every key. A key present in `en` and absent from the page is harmless;
   a page key absent from `en` would leave French text in the English view — the
   check in tools/check-i18n.py lists those. */
window.NOKIME_I18N = {
  fr: {
    langSwitch: "Switch to English",
    menuLabel: "Menu",
  },
  en: {
    /* shared */
    navManager: "Manager", navCopius: "Copius", navGroup: "The group", navContact: "Contact", navCta: "Write to us",
    footTag: "Cook with ideas, run things without the headache.", footLegal: "Legal notice", footNav: "Footer",
    langSwitch: "Passer en français", menuLabel: "Menu",
    titleNotFound: "Page not found — Nokime", nfEyebrow: "Error 404", nfTitle: "This page does not exist.", nfLead: "The address may have changed. Everything that exists is one click from here.", nfHome: "Back to the home page",
    titleHome: "Nokime — cook with ideas, run things without the headache",
    descHome: "Copius to find inspiration, Jobs to hire while looking after the team, Manager to know whether the dish pays.",
    titleManager: "Nokime Manager — the cost of the plate",
    descManager: "Nokime Manager: food cost per portion, ratio, gross margin and floor price for every dish; your purchase prices; the allergen chart; one typical service read in plain words. On your account, with 1,887 products already priced.",
    titleCopius: "Nokime Copius — the illustrated atlas of cooking",
    descCopius: "Copius: 1,889 ingredients, 135 techniques, 45 bases and 68 chefs, drawn and bilingual, each product with its price band, season and pairings. Three versions: free, full, school (coming soon).",
    titleGroup: "The group — Nokime",
    descGroup: "Nokime brings together Copius, Manager and Jobs: tools to cook with ideas and run things without the headache.",
    titleContact: "Contact — Nokime",
    descContact: "One email is enough. Restaurants, teachers, press: one address.",
    titleLegal: "Legal notice — Nokime",
    descLegal: "Publisher, host, personal data and credits for the Nokime website.",

    more: "More",
    whyKicker: "Why everything under one name?", whyS: "A restaurant that trusts one tool takes a second from the same hand.", methodS: "One tool at a time, quiet rather than complete.",

    shotLabel: "Nokime Manager in use, with the example dishes", shotCap: "The tool, with its example dishes. Lower the price, and the dish drops below its floor.",
    cpShotLabel: "Nokime Copius in use, from search to the pairing lab", cpShotCap: "The full version. Search for asparagus, step over to butter, and the lab judges the pairing.",
    /* home */
    heroEyebrow: "Nokime",
    heroT1: "Cook with ", heroT2: "ideas", heroT3: ", run things ", heroT4: "without the headache", heroT5: ".",
    heroCta1: "See the tools", heroCta2: "Write to us",
    stat1n: "Out of ideas in the kitchen?", stat1l: "Copius: what’s in season, and what goes with it.",
    stat2n: "Nobody for the season?", stat2l: "Nokime Jobs is coming back soon.",
    stat3n: "At that price, does the dish pay?", stat3l: "Manager tells you before service.",
    prodKicker: "Our three tools.",
    mTag: "Founders’ offer open", mSub: "The cost of the plate, and what the service does.",
    mText: "Cost per portion, food-cost ratio, gross margin and floor price for every dish; your purchase prices and yields per product; one typical service — brigade, overheads, break-even — read in plain words. On your account, with Copius’s 1,887 products already priced.",
    mLink: "See Nokime Manager",
    cTag: "Live · copius.fr", cSub: "The illustrated atlas of cooking.",
    cText: "Ingredients, techniques, bases and chefs, drawn and bilingual. Every product with its price band, its season and its pairings, and a lab to test a plate before you cook it.",
    cLink: "See Nokime Copius",

    /* manager */
    mgrEyebrow: "Nokime Manager",
    mgrT1: "What the plate costs, ", mgrT2: "before service", mgrT3: ". Not after the year-end.",
    mgrLead: "Online, on your account, with 1,887 products already priced.",
    mgrCta1: "Join the founders", mgrSite: "Open Manager",

    /* copius */
    cpEyebrow: "Nokime Copius", cpT1: "The ", cpT2: "illustrated", cpT3: " atlas of cooking.",
    cpLead: "Ingredients, techniques, bases and chefs, drawn, in French and English.",
    cpCta1: "Open copius.fr", cpCta2: "@copius.fr on Instagram",
    cpDrawKicker: "Every product, drawn.",
    cpSchoolKicker: "For schools.",
    cpSchoolP: "Teaching material: a product, its pairings, a plate to build.",
    cpCta3: "Propose a pilot class",

    /* group */
    grEyebrow: "The group", grTitle: "One name, several tools.",
    grLead: "One name for the group, one name for each tool: Nokime Copius, Nokime Manager, Nokime Jobs.",
    grP1: "The idea is simple. A restaurant that trusts one tool will take a second from the same hand more readily than it will go looking for a new one. So every tool is built to be joined by the next: same products, same prices, same seasons, same way of presenting a number.",
    grP2: "Copius, the atlas, is the base: it knows the products. Manager uses it to price a menu.",
    methodKicker: "The method.",
    methodP1: "One tool at a time. The next does not start before a restaurant pays for the previous one: that is the only proof that counts.",
    methodP2: "Quiet rather than complete. A tool shows few things and gives the detail when asked; a dull job deserves some pleasure.",
    stateKicker: "Where we are.",
    state1: "Nokime Copius is live, readable without an account.",
    state2: "Nokime Manager is built and opens to five founding restaurants.",
    state3: "Nokime Jobs is coming back soon.",
    grCta: "Write to us",

    /* contact */
    ctEyebrow: "Contact", ctTitle: "One email is enough.",
    ctLead: "One address, and an answer within 2 working days.",
    r1t: "You run a restaurant", r1p: "To join the five founding restaurants of Nokime Manager, or to ask about the tool.", r1cta: "Write about Manager",
    r2t: "You teach", r2p: "For a pilot class with Copius, or to talk about the school version.", r2cta: "Write about Copius",
    r3t: "Press, partners, the curious", r3p: "For everything else.", r3cta: "Write",
    ctMailLabel: "The address",
    /* Nokime Jobs */
    navJobs: "Jobs", titleJobs: "Nokime Jobs is coming back soon",
    descJobs: "Internships, apprenticeships and seasons in hotels and restaurants, with a welcome charter. Meanwhile, see you on Instagram.",
    jobsT1: "Nokime Jobs ", jobsT2: "is coming back soon.",
    jobsLead: "Internships, apprenticeships and seasons in hotels and restaurants, with a welcome charter. Meanwhile, see you on Instagram.",
    jobsCta1: "Follow @nokime.jobs",

    jTag: "Coming soon", jSub: "Internships, apprenticeships and seasons in hotels and restaurants. Staff wellbeing matters.", jLink: "See Nokime Jobs",

    /* welcome door (home page) */
    ddTitle: "One restaurant, three questions.",
    ddQ1: "What to cook?", ddQ2: "At what price?", ddQ3: "With whom?",
    ddI1: "The ideas.", ddI2: "The right price.", ddI3: "The team.",
    ddScroll: "Scroll", ddSkip: "Skip", ddEnter: "Enter the site",
  }
};
