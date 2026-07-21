/**
 * Shared shopping-bag storage for PDP + bag page.
 * Key: localStorage["jj-bag"]
 * Item: { id, title, price, image, size, qty, color? }
 */
(function (global) {
  const KEY = "jj-bag";

  function readBag() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  }

  function writeBag(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    global.dispatchEvent(new CustomEvent("jj-bag-changed", { detail: { items } }));
  }

  function itemKey(item) {
    return `${item.id || ""}::${item.size || ""}`;
  }

  function parsePrice(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const raw = String(value || "").trim();
    // Prefer the last number group so "Dhs. 2,890.00" → 2890
    const match = raw.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*$/);
    if (!match) return 0;
    const n = parseFloat(match[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  }

  function formatPrice(amount) {
    const n = Number(amount) || 0;
    return `Dhs. ${n.toLocaleString("en-AE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function totalQty(items) {
    return (items || readBag()).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  }

  function subtotal(items) {
    return (items || readBag()).reduce((sum, item) => {
      return sum + parsePrice(item.price) * (Number(item.qty) || 0);
    }, 0);
  }

  function addItem(entry) {
    const items = readBag();
    const next = {
      id: entry.id || "",
      title: entry.title || "Untitled",
      price: entry.price || formatPrice(0),
      image: entry.image || "",
      size: entry.size || "",
      color: entry.color || "",
      qty: Math.max(1, Number(entry.qty) || 1),
    };
    const existing = items.find((item) => itemKey(item) === itemKey(next));
    if (existing) {
      existing.qty = (Number(existing.qty) || 0) + next.qty;
    } else {
      items.push(next);
    }
    writeBag(items);
    return items;
  }

  function setQty(id, size, qty) {
    const items = readBag();
    const target = items.find((item) => item.id === id && (item.size || "") === (size || ""));
    if (!target) return items;
    const nextQty = Math.max(1, Number(qty) || 1);
    target.qty = nextQty;
    writeBag(items);
    return items;
  }

  function removeItem(id, size) {
    const items = readBag().filter(
      (item) => !(item.id === id && (item.size || "") === (size || "")),
    );
    writeBag(items);
    return items;
  }

  global.JJBag = {
    KEY,
    readBag,
    writeBag,
    addItem,
    setQty,
    removeItem,
    parsePrice,
    formatPrice,
    totalQty,
    subtotal,
    itemKey,
  };
})(window);
