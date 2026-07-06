// ============================================================
//  RAMANAND — FRONTEND LOGIC
//  Works even if the backend server isn't running: falls back to
//  built-in config/menu, and always completes the WhatsApp flow.
// ============================================================
(function () {
  "use strict";

  /* ---------- fallbacks (used only if /api/* is unreachable) ---------- */
  const FALLBACK_CONFIG = {
    restaurantName: "Ramanand",
    tagline: "Pure Vegetarian Kitchen",
    whatsappNumber: "919999999999",
    phoneDisplay: "+91 99999 99999",
    email: "hello@ramanand.example",
    addressLine1: "123, Prahladnagar Road",
    addressLine2: "Ahmedabad, Gujarat - 380015",
    hoursLine1: "Mon – Sun : 11:00 AM – 11:30 PM",
    hoursLine2: "Kitchen closes 30 min before closing",
    mapsEmbedSrc: "https://www.google.com/maps?q=Ahmedabad,Gujarat&output=embed",
  };

  // Keep this in sync with db.js seedMenu() if you edit one, edit both.
  const FALLBACK_MENU_RAW = [
    ["Soups", "Tomato Basil Soup", "Slow-simmered tomato, basil & a touch of cream", 120, true],
    ["Soups", "Sweet Corn Soup", "Comforting corn broth, lightly peppered", 130, false],
    ["Soups", "Hot & Sour Soup", "Tangy, peppery, loaded with vegetables", 140, false],
    ["Starters", "Paneer Tikka", "Char-grilled cottage cheese, smoky tandoor spices", 220, true],
    ["Starters", "Hara Bhara Kabab", "Spinach & peas kabab, mint chutney", 180, false],
    ["Starters", "Crispy Corn Chaat", "Golden fried corn, tossed in tangy masala", 170, false],
    ["Starters", "Chilli Paneer (Dry)", "Indo-Chinese classic, sweet-spicy-tangy", 230, true],
    ["Starters", "Gobi Manchurian", "Crisp cauliflower in Manchurian glaze", 200, false],
    ["Starters", "Veg Spring Roll", "Crunchy vegetable rolls, sweet chilli dip", 190, false],
    ["Main Course", "Paneer Butter Masala", "Cottage cheese in velvety tomato-butter gravy", 260, true],
    ["Main Course", "Malai Kofta", "Cashew-paneer dumplings in a rich, creamy curry", 270, true],
    ["Main Course", "Dal Makhani", "Black lentils, slow-cooked overnight, finished with cream", 220, true],
    ["Main Course", "Shahi Paneer", "Royal-style paneer in a mildly sweet cashew gravy", 260, false],
    ["Main Course", "Palak Paneer", "Paneer cubes in a silky spiced spinach puree", 240, true],
    ["Main Course", "Kadai Vegetable", "Seasonal veggies, coarsely ground kadai masala", 230, false],
    ["Main Course", "Mix Veg Curry", "Garden vegetables in a light home-style gravy", 210, false],
    ["Main Course", "Chole Masala", "Chickpeas simmered in a tangy onion-tomato masala", 200, false],
    ["Main Course", "Yellow Dal Tadka", "Everyday dal, finished with a ghee-cumin tempering", 180, false],
    ["Rice & Biryani", "Ramanand Veg Biryani", "Fragrant basmati, layered vegetables, house spices", 240, true],
    ["Rice & Biryani", "Veg Pulao", "Mildly spiced rice with garden vegetables", 190, false],
    ["Rice & Biryani", "Jeera Rice", "Basmati tempered with roasted cumin", 150, false],
    ["Rice & Biryani", "Curd Rice", "Cooling curd rice, a light South Indian finish", 160, false],
    ["Breads", "Tandoori Roti", "Whole-wheat bread from the clay oven", 30, false],
    ["Breads", "Butter Naan", "Classic leavened bread, brushed with butter", 50, true],
    ["Breads", "Garlic Naan", "Naan topped with roasted garlic & coriander", 60, false],
    ["Breads", "Lachha Paratha", "Layered, flaky whole-wheat paratha", 55, false],
    ["Breads", "Missi Roti", "Gram-flour roti with ajwain & spices", 40, false],
    ["South Indian", "Masala Dosa", "Crisp rice crepe, spiced potato filling, sambhar", 150, true],
    ["South Indian", "Idli Sambhar", "Steamed rice cakes (2 pc), sambhar & chutney", 110, false],
    ["South Indian", "Medu Vada", "Crisp lentil doughnuts (2 pc), sambhar & chutney", 100, false],
    ["South Indian", "Uttapam", "Thick rice pancake, onion & tomato topping", 140, false],
    ["Desserts", "Gulab Jamun", "Milk dumplings (2 pc) in rose-cardamom syrup", 90, true],
    ["Desserts", "Rasmalai", "Soft cottage-cheese discs (2 pc) in saffron milk", 120, false],
    ["Desserts", "Gajar Ka Halwa", "Slow-cooked carrot halwa, khoya & nuts", 130, false],
    ["Desserts", "Kaju Katli (100g)", "Classic cashew fudge, silver leaf", 150, false],
    ["Beverages", "Masala Chai", "Spiced milk tea, brewed the classic way", 40, false],
    ["Beverages", "Sweet Lassi", "Thick, chilled yoghurt drink", 90, true],
    ["Beverages", "Fresh Lime Soda", "Sweet, salted or plain — your choice", 70, false],
    ["Beverages", "Cold Coffee", "Blended chilled coffee, a scoop of froth", 110, false],
    ["Beverages", "Buttermilk (Chaas)", "Spiced, tempered chaas — light & cooling", 50, false],
    ["Beverages", "Mineral Water", "Packaged drinking water", 30, false],
  ];
  const FALLBACK_MENU = FALLBACK_MENU_RAW.map((r, i) => ({
    id: i + 1, category: r[0], name: r[1], description: r[2], price: r[3], popular: r[4], veg: true, available: true,
  }));

  const CATEGORY_ORDER = ["Soups", "Starters", "Main Course", "Rice & Biryani", "Breads", "South Indian", "Desserts", "Beverages"];

  let CONFIG = FALLBACK_CONFIG;
  const cart = []; // {id, name, price, qty}

  /* ---------- tiny helpers ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const rupee = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

  function waLink(number, text) {
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }

  async function safeJsonFetch(url, options) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        let msg = "Request failed";
        try { msg = (await res.json()).error || msg; } catch (_) {}
        return { ok: false, error: msg, status: res.status };
      }
      return await res.json();
    } catch (err) {
      return { ok: false, error: "offline", offline: true };
    }
  }

  /* ---------- toast ---------- */
  function showToast(message, type) {
    const container = $("#toastContainer");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast " + (type || "success");
    const icon = type === "error" ? "#icon-alert" : "#icon-check";
    toast.innerHTML = `<svg width="18" height="18"><use href="${icon}"/></svg><span></span>`;
    toast.querySelector("span").textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = "opacity .3s ease, transform .3s ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      setTimeout(() => toast.remove(), 320);
    }, 3600);
  }

  /* ============================================================
     CONFIG
     ============================================================ */
  async function loadConfig() {
    const data = await safeJsonFetch("/api/config");
    if (data && !data.offline && data.restaurantName) CONFIG = data;
    applyConfig();
  }

  function applyConfig() {
    const genericMsg = `Hello ${CONFIG.restaurantName}! I'd like to know more.`;
    $("#waFloat").href = waLink(CONFIG.whatsappNumber, genericMsg);
    $("#drawerWaLink").href = waLink(CONFIG.whatsappNumber, genericMsg);
    $("#contactWaBtn").href = waLink(CONFIG.whatsappNumber, genericMsg);

    $("#cAddress").innerHTML = escapeHtml(CONFIG.addressLine1) + "<br>" + escapeHtml(CONFIG.addressLine2);
    $("#cHours").innerHTML = escapeHtml(CONFIG.hoursLine1) + (CONFIG.hoursLine2 ? "<br><small>" + escapeHtml(CONFIG.hoursLine2) + "</small>" : "");
    const phoneDigits = CONFIG.phoneDisplay.replace(/[^\d+]/g, "");
    $("#cPhone").textContent = CONFIG.phoneDisplay;
    $("#cPhone").href = "tel:" + phoneDigits;
    $("#cEmail").textContent = CONFIG.email;
    $("#cEmail").href = "mailto:" + CONFIG.email;
    if (CONFIG.mapsEmbedSrc) $("#mapFrame").src = CONFIG.mapsEmbedSrc;
    document.title = `${CONFIG.restaurantName} — Pure Vegetarian Restaurant`;
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str == null ? "" : str;
    return d.innerHTML;
  }

  /* ============================================================
     MENU
     ============================================================ */
  async function loadMenu() {
    const data = await safeJsonFetch("/api/menu");
    const items = data && !data.offline && Array.isArray(data.items) ? data.items : FALLBACK_MENU;
    renderMenu(items);
  }

  function renderMenu(items) {
    const listEl = $("#menuList");
    const chipsEl = $("#menuChips");
    const skeleton = $("#menuSkeleton");
    if (skeleton) skeleton.remove();

    const byCategory = new Map();
    items.forEach((item) => {
      if (!byCategory.has(item.category)) byCategory.set(item.category, []);
      byCategory.get(item.category).push(item);
    });

    const orderedCats = CATEGORY_ORDER.filter((c) => byCategory.has(c))
      .concat(Array.from(byCategory.keys()).filter((c) => !CATEGORY_ORDER.includes(c)));

    chipsEl.innerHTML = "";
    listEl.innerHTML = "";

    orderedCats.forEach((cat, idx) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip" + (idx === 0 ? " active" : "");
      chip.textContent = cat;
      chip.dataset.cat = cat;
      chip.addEventListener("click", () => {
        const heading = listEl.querySelector(`[data-category="${cssEscape(cat)}"]`);
        if (heading) {
          const y = heading.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) + 62);
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      });
      chipsEl.appendChild(chip);

      const heading = document.createElement("h3");
      heading.className = "menu-cat-heading reveal";
      heading.dataset.category = cat;
      heading.textContent = cat;
      listEl.appendChild(heading);

      const grid = document.createElement("div");
      grid.className = "menu-grid";
      byCategory.get(cat).forEach((item) => grid.appendChild(buildMenuCard(item)));
      listEl.appendChild(grid);
    });

    initRevealObserver();
    initMenuChipSpy();
  }

  function cssEscape(str) {
    return String(str).replace(/["\\]/g, "\\$&");
  }

  function buildMenuCard(item) {
    const card = document.createElement("div");
    card.className = "menu-card reveal";
    card.dataset.id = item.id;

    if (item.popular) {
      const badge = document.createElement("span");
      badge.className = "popular-badge";
      badge.textContent = "Bestseller";
      card.appendChild(badge);
    }

    card.innerHTML += `
      <div class="menu-card-top">
        <span class="menu-card-name"><span class="veg-mark"><span class="veg-dot"></span></span>${escapeHtml(item.name)}</span>
        <span class="menu-card-price">${rupee(item.price)}</span>
      </div>
      <p class="menu-card-desc">${escapeHtml(item.description || "")}</p>
      <div class="menu-card-foot"></div>
    `;

    const foot = card.querySelector(".menu-card-foot");
    renderCardControl(foot, item);
    return card;
  }

  function renderCardControl(foot, item) {
    const inCart = cart.find((c) => c.id === item.id);
    foot.innerHTML = "";
    if (!inCart) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "add-btn";
      btn.textContent = "Add";
      btn.addEventListener("click", () => {
        addToCart(item);
        renderCardControl(foot, item);
      });
      foot.appendChild(btn);
    } else {
      const stepper = document.createElement("div");
      stepper.className = "qty-stepper";
      stepper.innerHTML = `
        <button type="button" aria-label="Remove one ${escapeHtml(item.name)}"><svg width="14" height="14"><use href="#icon-minus"/></svg></button>
        <span>${inCart.qty}</span>
        <button type="button" aria-label="Add one more ${escapeHtml(item.name)}"><svg width="14" height="14"><use href="#icon-plus"/></svg></button>
      `;
      const [minusBtn, , plusBtn] = stepper.children;
      minusBtn.addEventListener("click", () => { changeQty(item.id, -1); renderCardControl(foot, item); });
      plusBtn.addEventListener("click", () => { changeQty(item.id, 1); renderCardControl(foot, item); });
      foot.appendChild(stepper);
    }
  }

  function initMenuChipSpy() {
    const headings = $$(".menu-cat-heading");
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cat = entry.target.dataset.category;
            $$(".chip").forEach((c) => c.classList.toggle("active", c.dataset.cat === cat));
          }
        });
      },
      { rootMargin: "-30% 0px -55% 0px" }
    );
    headings.forEach((h) => observer.observe(h));
  }

  /* ============================================================
     CART
     ============================================================ */
  function addToCart(item) {
    const existing = cart.find((c) => c.id === item.id);
    if (existing) existing.qty += 1;
    else cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
    updateCartUI();
    showToast(`${item.name} added to your order`, "success");
  }

  function changeQty(id, delta) {
    const line = cart.find((c) => c.id === id);
    if (!line) return;
    line.qty += delta;
    if (line.qty <= 0) {
      const idx = cart.indexOf(line);
      cart.splice(idx, 1);
    }
    updateCartUI();
  }

  function removeFromCart(id) {
    const idx = cart.findIndex((c) => c.id === id);
    if (idx > -1) cart.splice(idx, 1);
    updateCartUI();
    const card = document.querySelector(`.menu-card[data-id="${id}"] .menu-card-foot`);
    if (card) {
      const item = FALLBACK_MENU.find((m) => m.id === id) || { id };
      renderCardControl(card, item);
    }
  }

  function cartTotal() { return cart.reduce((sum, c) => sum + c.price * c.qty, 0); }
  function cartCount() { return cart.reduce((sum, c) => sum + c.qty, 0); }

  function updateCartUI() {
    const count = cartCount();
    [$("#cartCount"), $("#tabCartCount")].forEach((el) => {
      if (!el) return;
      el.textContent = String(count);
      el.hidden = count === 0;
    });

    const itemsEl = $("#cartItems");
    const checkoutEl = $("#cartCheckout");
    const emptyEl = $("#cartEmpty");

    if (cart.length === 0) {
      itemsEl.innerHTML = "";
      itemsEl.appendChild(emptyEl);
      checkoutEl.hidden = true;
      return;
    }

    checkoutEl.hidden = false;
    itemsEl.innerHTML = "";
    cart.forEach((line) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div>
          <div class="cart-item-name">${escapeHtml(line.name)}</div>
          <div class="cart-item-price">${rupee(line.price)} × ${line.qty} = ${rupee(line.price * line.qty)}</div>
        </div>
        <div class="cart-item-right">
          <div class="qty-stepper">
            <button type="button" aria-label="Decrease"><svg width="14" height="14"><use href="#icon-minus"/></svg></button>
            <span>${line.qty}</span>
            <button type="button" aria-label="Increase"><svg width="14" height="14"><use href="#icon-plus"/></svg></button>
          </div>
          <button type="button" class="cart-remove" aria-label="Remove ${escapeHtml(line.name)}"><svg width="16" height="16"><use href="#icon-trash"/></svg></button>
        </div>
      `;
      const [minusBtn, , plusBtn] = row.querySelector(".qty-stepper").children;
      minusBtn.addEventListener("click", () => { changeQty(line.id, -1); });
      plusBtn.addEventListener("click", () => { changeQty(line.id, 1); });
      row.querySelector(".cart-remove").addEventListener("click", () => removeFromCart(line.id));
      itemsEl.appendChild(row);
    });

    $("#cartTotal").textContent = rupee(cartTotal());
  }

  function openCart() {
    $("#cartDrawer").classList.add("open");
    $("#cartOverlay").hidden = false;
    requestAnimationFrame(() => $("#cartOverlay").classList.add("show"));
    document.body.style.overflow = "hidden";
  }
  function closeCart() {
    $("#cartDrawer").classList.remove("open");
    $("#cartOverlay").classList.remove("show");
    setTimeout(() => { $("#cartOverlay").hidden = true; }, 300);
    document.body.style.overflow = "";
  }

  async function submitOrder() {
    const name = $("#oName").value.trim();
    const phone = $("#oPhone").value.trim();
    const note = $("#oNote").value.trim();
    const orderType = $(".ot-btn.active").dataset.type;
    const address = $("#oAddress").value.trim();

    if (!name || !phone) {
      showToast("Please add your name and phone number", "error");
      return;
    }
    if (orderType === "delivery" && !address) {
      showToast("Please add a delivery address", "error");
      return;
    }
    if (cart.length === 0) {
      showToast("Your cart is empty", "error");
      return;
    }

    const payload = { name, phone, items: cart, note, orderType, address };
    await safeJsonFetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const lines = cart.map((c, i) => `${i + 1}) ${c.name} x${c.qty} - ${rupee(c.price * c.qty)}`);
    let msg = `Hello ${CONFIG.restaurantName}! I'd like to place an order (${orderType === "delivery" ? "Delivery" : "Pickup"}).\n\n`;
    msg += lines.join("\n");
    msg += `\n\nTotal: ${rupee(cartTotal())}\n\nName: ${name}\nPhone: ${phone}`;
    if (orderType === "delivery") msg += `\nAddress: ${address}`;
    if (note) msg += `\nNote: ${note}`;
    msg += `\n\n— Sent from the Ramanand website`;

    window.open(waLink(CONFIG.whatsappNumber, msg), "_blank", "noopener");
    showToast("Order sent! Confirm it on WhatsApp.", "success");

    cart.length = 0;
    updateCartUI();
    $$(".menu-card").forEach((card) => {
      const id = Number(card.dataset.id);
      const item = FALLBACK_MENU.find((m) => m.id === id) || { id, name: "" };
      renderCardControl(card.querySelector(".menu-card-foot"), item);
    });
    closeCart();
    $("#oName").value = ""; $("#oPhone").value = ""; $("#oNote").value = ""; $("#oAddress").value = "";
  }

  /* ============================================================
     RESERVATION FORM
     ============================================================ */
  async function submitReservation(e) {
    e.preventDefault();
    const name = $("#rName").value.trim();
    const phone = $("#rPhone").value.trim();
    const date = $("#rDate").value;
    const time = $("#rTime").value;
    const guests = $("#rGuests").value;
    const note = $("#rNote").value.trim();

    if (!name || !phone || !date || !time || !guests) {
      showToast("Please fill in all required fields", "error");
      return;
    }

    await safeJsonFetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, date, time, guests, note }),
    });

    let msg = `Hello ${CONFIG.restaurantName}! I'd like to reserve a table.\n\n`;
    msg += `Name: ${name}\nPhone: ${phone}\nDate: ${date}\nTime: ${time}\nGuests: ${guests}`;
    if (note) msg += `\nNote: ${note}`;
    msg += `\n\n— Sent from the Ramanand website`;

    window.open(waLink(CONFIG.whatsappNumber, msg), "_blank", "noopener");
    showToast("Request sent! Confirm your table on WhatsApp.", "success");
    e.target.reset();
    $("#rGuests").value = 2;
  }

  /* ============================================================
     HEADER / NAV / DRAWERS / SCROLLSPY
     ============================================================ */
  function initHeaderScroll() {
    const header = $("#siteHeader");
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function initMobileDrawer() {
    const drawer = $("#mobileDrawer");
    const overlay = $("#drawerOverlay");
    const open = () => {
      drawer.classList.add("open");
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("show"));
      $("#navToggle").setAttribute("aria-expanded", "true");
    };
    const close = () => {
      drawer.classList.remove("open");
      overlay.classList.remove("show");
      setTimeout(() => { overlay.hidden = true; }, 300);
      $("#navToggle").setAttribute("aria-expanded", "false");
    };
    $("#navToggle").addEventListener("click", open);
    $("#drawerClose").addEventListener("click", close);
    overlay.addEventListener("click", close);
    $$("#mobileDrawer a").forEach((a) => a.addEventListener("click", close));
  }

  function initTabBarSpy() {
    const sections = ["home", "menu", "reserve", "contact"].map((id) => document.getElementById(id)).filter(Boolean);
    const links = $$(".tab-link[data-target]");
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            links.forEach((l) => l.classList.toggle("active", l.dataset.target === entry.target.id));
          }
        });
      },
      { rootMargin: "-40% 0px -50% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
  }

  function initRevealObserver() {
    const targets = $$(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach((t) => observer.observe(t));
  }

  /* ============================================================
     TESTIMONIAL CAROUSEL
     ============================================================ */
  function initTestimonials() {
    const track = $("#testimonialTrack");
    const cards = $$(".testimonial-card", track);
    const dotsWrap = $("#testimonialDots");
    if (!cards.length) return;
    let index = 0;
    let timer;

    cards.forEach((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Show testimonial ${i + 1}`);
      if (i === 0) dot.classList.add("active");
      dot.addEventListener("click", () => goTo(i));
      dotsWrap.appendChild(dot);
    });

    function goTo(i) {
      index = (i + cards.length) % cards.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      $$("button", dotsWrap).forEach((d, di) => d.classList.toggle("active", di === index));
    }

    function next() { goTo(index + 1); }

    function startAuto() {
      stopAuto();
      timer = setInterval(next, 6000);
    }
    function stopAuto() { if (timer) clearInterval(timer); }

    const carousel = $(".testimonial-carousel");
    carousel.addEventListener("mouseenter", stopAuto);
    carousel.addEventListener("mouseleave", startAuto);
    startAuto();
  }

  /* ============================================================
     MISC UI
     ============================================================ */
  function initGuestStepper() {
    $$(".stepper-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = document.getElementById(btn.dataset.target);
        const step = Number(btn.dataset.step);
        const min = Number(target.min || 1);
        const max = Number(target.max || 99);
        target.value = Math.min(max, Math.max(min, (Number(target.value) || min) + step));
      });
    });
  }

  function initOrderTypeToggle() {
    $$(".ot-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".ot-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        $("#oAddressRow").hidden = btn.dataset.type !== "delivery";
      });
    });
  }

  function initMinDate() {
    const dateInput = $("#rDate");
    if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);
  }

  function initCartControls() {
    $("#cartToggle").addEventListener("click", openCart);
    $("#tabCartBtn").addEventListener("click", openCart);
    $("#cartClose").addEventListener("click", closeCart);
    $("#cartOverlay").addEventListener("click", closeCart);
    $("#cartSubmit").addEventListener("click", submitOrder);
  }

  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener("DOMContentLoaded", () => {
    $("#footerYear").textContent = new Date().getFullYear();
    initHeaderScroll();
    initMobileDrawer();
    initCartControls();
    initOrderTypeToggle();
    initGuestStepper();
    initMinDate();
    initTabBarSpy();
    initTestimonials();
    initRevealObserver();
    $("#reservationForm").addEventListener("submit", submitReservation);

    loadConfig();
    loadMenu();

    // reveal for static sections not created dynamically
    $$(".about, .features-grid, .gallery-grid, .reserve-inner, .contact-grid").forEach((el) => el.classList.add("reveal"));
    initRevealObserver();
  });
})();