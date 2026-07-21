/** Default homepage image + title content (used when Firestore doc is empty). */
export const DEFAULT_SITE_CONTENT = {
  hero: {
    image: "assets/images/optimized/0rISg.jpg",
    focus: { x: 50, y: 50, scale: 1.1765, originY: 100 },
  },
  collectionsHeading: {
    title: "THE COLLECTIONS",
  },
  collectionTiles: [
    {
      id: "women",
      target: "comp-mmq82nh7",
      image: "assets/images/optimized/women.jpg",
      title: "WOMEN",
      focus: { x: 50, y: 58, scale: 1 },
    },
    {
      id: "men",
      target: "comp-mmq8486o",
      image: "assets/images/optimized/men.jpg",
      title: "MEN",
      focus: { x: 56, y: 52, scale: 1.28 },
    },
    {
      id: "uni",
      target: "comp-mmq84fyo",
      image: "assets/images/optimized/kids.jpg",
      title: "UNI",
      focus: { x: 50, y: 0, scale: 1 },
    },
  ],
  signaturePieces: {
    title: "Signature Pieces",
    items: [
      {
        id: "sp1",
        image: "assets/images/optimized/accessories.jpg",
        title: "Geometric Heritage Box Bag",
        price: 1299,
        href: "/product.html",
        focus: { x: 50, y: 42, scale: 1 },
      },
      {
        id: "sp2",
        image: "assets/images/optimized/women.jpg",
        title: "The Silk Midi Dress",
        price: 420,
        href: "/product.html",
        focus: { x: 50, y: 42, scale: 1 },
      },
      {
        id: "sp3",
        image: "assets/images/optimized/men.jpg",
        title: "The Tailored Wool Blazer",
        price: 890,
        href: "/product.html",
        focus: { x: 54, y: 46, scale: 1.45 },
      },
      {
        id: "sp4",
        image: "assets/images/optimized/kids.jpg",
        title: "The Relaxed Linen Set",
        price: 680,
        href: "/product.html",
        focus: { x: 50, y: 38, scale: 1 },
      },
      {
        id: "sp5",
        image: "assets/images/optimized/collection-01.jpg",
        title: "Embroidered Silk Kaftan",
        price: 1250,
        href: "/product.html",
        focus: { x: 50, y: 18, scale: 1.38 },
      },
      {
        id: "sp6",
        image: "assets/images/optimized/collection-02.jpg",
        title: "The Nordic Wool Coat",
        price: 520,
        href: "/product.html",
        focus: { x: 50, y: 14, scale: 1.38 },
      },
    ],
  },
  aboutHero: {
    image: "assets/images/IMG_8558.JPG",
    title: "Her Collection",
    ctaText: "Shop Now",
    focus: { x: 50, y: 50, scale: 1 },
  },
  aboutSection: {
    title: "Jamil Jamila",
  },
};

function mergeFocus(defaults, patch) {
  if (!patch) return defaults;
  return { ...defaults, ...patch };
}

export function mergeSiteContent(partial) {
  const base = structuredClone(DEFAULT_SITE_CONTENT);
  if (!partial || typeof partial !== "object") return base;

  if (partial.hero) {
    base.hero = {
      ...base.hero,
      ...partial.hero,
      focus: mergeFocus(base.hero.focus, partial.hero.focus),
    };
  }
  if (partial.collectionsHeading) Object.assign(base.collectionsHeading, partial.collectionsHeading);
  if (partial.aboutHero) {
    base.aboutHero = {
      ...base.aboutHero,
      ...partial.aboutHero,
      focus: mergeFocus(base.aboutHero.focus, partial.aboutHero.focus),
    };
  }
  if (partial.aboutSection) Object.assign(base.aboutSection, partial.aboutSection);

  if (Array.isArray(partial.collectionTiles)) {
    base.collectionTiles = base.collectionTiles.map((tile) => {
      const patch = partial.collectionTiles.find((t) => t.id === tile.id);
      if (!patch) return tile;
      return {
        ...tile,
        ...patch,
        focus: mergeFocus(tile.focus, patch.focus),
      };
    });
  }

  if (partial.signaturePieces) {
    if (partial.signaturePieces.title) {
      base.signaturePieces.title = partial.signaturePieces.title;
    }
    if (Array.isArray(partial.signaturePieces.items) && partial.signaturePieces.items.length) {
      base.signaturePieces.items = partial.signaturePieces.items.map((item, index) => {
        const fallback =
          DEFAULT_SITE_CONTENT.signaturePieces.items.find((d) => d.id === item.id) ||
          DEFAULT_SITE_CONTENT.signaturePieces.items[index];
        return {
          id: item.id || fallback?.id || `sp${index + 1}`,
          image: item.image || "",
          title: item.title || "",
          price: Number(item.price) || 0,
          focus: mergeFocus(fallback?.focus, item.focus),
        };
      });
    }
  }

  return base;
}
