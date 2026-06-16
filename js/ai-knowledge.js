(function () {
  const STORE_GUIDE = {
    brand:
      "Jamil & Jamila is a Scandinavian minimalist fashion brand. The site showcases timeless clothing for Women, Men, and Kids with clean lines and conscious design.",

    header: {
      home: "Home returns you to the top of the store page.",
      store:
        "Store scrolls you down to the launch signup section where you can enter your email to get notified about new collections and drops.",
      categoryPage:
        "Category Page opens a dropdown on hover with: All Products, T-shirts, Klänningar (Dresses), and Jackor (Jackets). Choosing any category scrolls to the launch signup section.",
      profile:
        "The profile icon (top right) opens your account menu. My Profile takes you to the login page where you can sign in with email, Google, or Apple.",
      logo: "The Jamil & Jamila logo (top left) takes you back to the home page.",
      hamburger: "On smaller screens, the menu button opens the mobile navigation.",
    },

    homepage: {
      collections:
        "The Collections section shows Women, Men, and Kids. Click any collection image to jump to the email signup for launch updates.",
      shopByCategory:
        "Shop by Category lets you browse Women, Men, Kids, and Accessories. Click any category image to go to the signup section.",
      exploreButtons:
        "EXPLORE buttons on the page scroll to the launch signup section so you can get notified when we go live.",
      about:
        "The About section tells the Jamil & Jamila story — Swedish minimalism, timeless design, and conscious lifestyle.",
      accessories: "The Accessories section highlights complementary pieces for your wardrobe.",
      images:
        "Most images and links on the homepage scroll to the 'Get Notified When We Launch' section at the bottom (above the footer).",
    },

    notify:
      "The 'Get Notified When We Launch' section lets you enter your email and tap 'Notify Me' to join the list for new collections and exclusive drops. No spam — unsubscribe anytime.",

    footer:
      "The footer lists Men (Outerwear, Shirts, Trousers, Shoes), Kids (Infant, Toddler, Outerwear, Playwear), and Company (About us, Sustainability, Stores, Contact). Footer links also scroll to the signup section.",

    account: {
      login:
        "On My Profile you can log in with your email and password, or use Continue with Google or Continue with Apple. Other account pages unlock after you sign in.",
      myProfile: "After signing in, My Profile lets you update your name, email, and phone number.",
      orderHistory: "Order History shows your past orders with status and totals.",
      savedAddresses: "Saved Addresses lets you manage shipping addresses.",
      support: "Support lets you send a message to our team — we reply within 24 hours.",
      likedItems: "Liked Items shows products you've saved, with Add to Cart and Remove options.",
      settings:
        "Settings lets you manage notification preferences and change your password.",
      access: "Open the profile icon (top right) and pick any account option, or go to account.html from the menu.",
    },

    aiWidget:
      "You're chatting with the store AI assistant — the black circle button at the bottom right. Ask me anything about navigating the site!",
  };

  const RULES = [
    {
      match: /profile|account|login|sign in|log in|google|apple|my profile|order|address|liked|settings|password/i,
      reply: function (q) {
        if (/log in|login|sign in|google|apple|password/i.test(q))
          return `Login: ${STORE_GUIDE.account.login} Open the profile icon → My Profile.`;
        if (/order/i.test(q)) return `Order History: ${STORE_GUIDE.account.orderHistory} ${STORE_GUIDE.account.access}`;
        if (/address/i.test(q)) return `Saved Addresses: ${STORE_GUIDE.account.savedAddresses} ${STORE_GUIDE.account.access}`;
        if (/liked|wishlist|favorite|heart/i.test(q))
          return `Liked Items: ${STORE_GUIDE.account.likedItems} ${STORE_GUIDE.account.access}`;
        if (/setting|password|notification/i.test(q))
          return `Settings: ${STORE_GUIDE.account.settings} ${STORE_GUIDE.account.access}`;
        if (/support|help|contact|message/i.test(q))
          return `Support: ${STORE_GUIDE.account.support} Click the profile icon → Support, or use the Support form in your account.`;
        if (/my profile|name|email|phone/i.test(q))
          return `My Profile: ${STORE_GUIDE.account.myProfile} ${STORE_GUIDE.account.access}`;
        return `Account menu: ${STORE_GUIDE.header.profile}\n\n• My Profile — edit your details\n• Order History — view past orders\n• Saved Addresses — manage shipping\n• Support — contact us\n• Liked Items — saved products\n• Settings — notifications & password`;
      },
    },
    {
      match: /notify|launch|signup|sign up|subscribe|email list|coming soon|notify me/i,
      reply: () =>
        `${STORE_GUIDE.notify}\n\nTip: Click Store, any EXPLORE button, or most images on the page to scroll there quickly.`,
    },
    {
      match: /category|t-?shirt|klänning|dress|jackor|jacket|product/i,
      reply: () =>
        `Category Page: ${STORE_GUIDE.header.categoryPage}\n\nHover "Category Page" in the header to see All Products, T-shirts, Klänningar, and Jackor.`,
    },
    {
      match: /collection|women|men|kids|kid|accessories|shop/i,
      reply: function (q) {
        if (/women/i.test(q)) return "Women's collection is in the Collections and Shop by Category sections. Click the image to reach the launch signup.";
        if (/men/i.test(q) && !/women/i.test(q))
          return "Men's collection appears in Collections and Shop by Category. Click any Men's image to go to the signup section.";
        if (/kid/i.test(q)) return "Kids collection is shown in Collections and Shop by Category. Click the Kids image to get launch updates.";
        if (/accessor/i.test(q)) return STORE_GUIDE.homepage.accessories + " Click the section image to scroll to signup.";
        return `${STORE_GUIDE.homepage.collections}\n\n${STORE_GUIDE.homepage.shopByCategory}`;
      },
    },
    {
      match: /explore|button|click|navigate|how do i|where/i,
      reply: function (q) {
        if (/footer/i.test(q)) return STORE_GUIDE.footer;
        if (/home/i.test(q)) return `Home: ${STORE_GUIDE.header.home}`;
        if (/store/i.test(q)) return `Store: ${STORE_GUIDE.header.store}`;
        if (/image|picture|photo/i.test(q)) return STORE_GUIDE.homepage.images;
        return `Here's how to get around:\n\n• Header: Home, Store, Category Page (dropdown), Profile icon\n• ${STORE_GUIDE.homepage.exploreButtons}\n• ${STORE_GUIDE.homepage.images}\n• ${STORE_GUIDE.notify}`;
      },
    },
    {
      match: /about|brand|story|jamil|minimal/i,
      reply: () => `${STORE_GUIDE.brand}\n\n${STORE_GUIDE.homepage.about}`,
    },
    {
      match: /footer|company|sustainability|stores|contact/i,
      reply: () => STORE_GUIDE.footer,
    },
    {
      match: /hello|hi|hey|help|start/i,
      reply: () =>
        `Welcome to Jamil & Jamila! I can help you find collections, sign up for launch updates, use your account, or navigate the site.\n\nTry asking: "How do I get notified?" · "Where is my order history?" · "Show me women's collection"`,
    },
    {
      match: /ai|assistant|chat|you|bot/i,
      reply: () => STORE_GUIDE.aiWidget,
    },
  ];

  function getStoreAssistantReply(message) {
    const text = message.trim();
    if (!text) return "Please type a question and I'll guide you through the store.";

    for (const rule of RULES) {
      if (rule.match.test(text)) {
        return rule.reply(text);
      }
    }

    return `I'm your Jamil & Jamila guide. ${STORE_GUIDE.brand}\n\nMost links and images scroll to the launch signup. Use the profile icon (top right) for your account.\n\nAsk me about: collections, categories, notifications, orders, profile, or support.`;
  }

  window.getStoreAssistantReply = getStoreAssistantReply;
  window.STORE_GUIDE = STORE_GUIDE;
})();
