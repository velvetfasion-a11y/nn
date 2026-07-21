/**
 * Shared liked-items storage.
 * Key: localStorage["jj-liked"]
 * Item: { id, title, price, image, size?, color? }
 */
(function (global) {
  const KEY = "jj-liked";

  function readLiked() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function writeLiked(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    global.dispatchEvent(new CustomEvent("jj-liked-changed", { detail: { items } }));
  }

  function itemKey(item) {
    if (global.JJBag?.itemKey) return global.JJBag.itemKey(item);
    return `${item.id || ""}::${item.size || ""}`;
  }

  function addItem(entry) {
    const items = readLiked();
    const next = {
      id: entry.id || "",
      title: entry.title || "Untitled",
      price: entry.price || "",
      image: entry.image || "",
      size: entry.size || "",
      color: entry.color || "",
    };
    if (!items.some((item) => itemKey(item) === itemKey(next))) {
      items.push(next);
      writeLiked(items);
    }
    return items;
  }

  function removeItem(id, size) {
    const items = readLiked().filter((item) => {
      if (size == null || size === undefined) {
        return item.id !== id;
      }
      return !(item.id === id && (item.size || "") === (size || ""));
    });
    writeLiked(items);
    return items;
  }

  function hasItem(id) {
    if (!id) return false;
    return readLiked().some((item) => item.id === id);
  }

  function toggleItem(entry) {
    const id = entry?.id || "";
    if (!id) return { liked: false, items: readLiked() };

    if (hasItem(id)) {
      const items = removeItem(id);
      return { liked: false, items };
    }

    const items = addItem(entry);
    return { liked: true, items };
  }

  global.JJLiked = {
    KEY,
    readLiked,
    writeLiked,
    addItem,
    removeItem,
    hasItem,
    toggleItem,
    itemKey,
    count: () => readLiked().length,
  };
})(window);
