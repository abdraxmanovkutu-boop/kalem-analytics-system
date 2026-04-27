const STORAGE_KEY = "kalemAnalytics";
const SURVEY_DONE = "kalemSurveyDone";

function getDefaultAnalytics() {
  return {
    visits: 0,
    clicks: 0,
    favorites: 0,
    orders: 0,
    pageViews: {},
    dailyVisits: {},
    products: {},
    surveyEntries: []
  };
}

function loadAnalytics() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return data ? { ...getDefaultAnalytics(), ...data } : getDefaultAnalytics();
  } catch (error) {
    return getDefaultAnalytics();
  }
}

function saveAnalytics(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function registerVisit() {
  const data = loadAnalytics();
  data.visits += 1;
  data.dailyVisits[getTodayKey()] = (data.dailyVisits[getTodayKey()] || 0) + 1;
  data.pageViews["index"] = (data.pageViews["index"] || 0) + 1;
  saveAnalytics(data);
}

function trackClick() {
  const data = loadAnalytics();
  data.clicks += 1;
  saveAnalytics(data);
}

function ensureProduct(productName) {
  const data = loadAnalytics();

  if (!data.products[productName]) {
    data.products[productName] = {
      views: 0,
      favorites: 0,
      orders: 0
    };
  }

  saveAnalytics(data);
}

function updateProduct(productName, field) {
  const data = loadAnalytics();

  if (!data.products[productName]) {
    data.products[productName] = {
      views: 0,
      favorites: 0,
      orders: 0
    };
  }

  if (typeof data.products[productName][field] !== "number") {
    data.products[productName][field] = 0;
  }

  data.products[productName][field] += 1;

  if (field === "favorites") data.favorites += 1;
  if (field === "orders") data.orders += 1;

  saveAnalytics(data);
}

function openSurvey() {
  const modal = document.getElementById("surveyModal");
  if (modal) modal.classList.remove("hidden");
}

function closeSurvey() {
  const modal = document.getElementById("surveyModal");
  if (modal) modal.classList.add("hidden");
}

function initSurvey() {
  const openBtn = document.getElementById("openSurvey");
  const closeBtn = document.getElementById("closeSurvey");
  const modal = document.getElementById("surveyModal");
  const form = document.getElementById("surveyForm");

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      trackClick();
      openSurvey();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeSurvey);
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target.id === "surveyModal") closeSurvey();
    });
  }

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const ageInput = document.getElementById("ageInput");
      const regionInput = document.getElementById("regionInput");
      const otherInput = document.getElementById("otherInput");

      const age = ageInput ? ageInput.value.trim() : "";
      const region = regionInput ? regionInput.value.trim() : "";
      const other = otherInput ? otherInput.value.trim() : "";

      if (!age || !region) return;

      const data = loadAnalytics();

      data.surveyEntries.push({
        age: Number(age),
        region: region === "Другое" && other ? other : region,
        createdAt: new Date().toISOString()
      });

      saveAnalytics(data);
      localStorage.setItem(SURVEY_DONE, "yes");
      closeSurvey();
      alert("Спасибо! Ваш ответ сохранён.");
    });
  }

  if (!localStorage.getItem(SURVEY_DONE)) {
    setTimeout(() => {
      openSurvey();
    }, 1800);
  }
}

function openProductModal(card) {
  const modal = document.getElementById("productModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalDesc = document.getElementById("modalDesc");
  const modalImage = document.getElementById("modalImage");
  const modalFavBtn = document.getElementById("modalFavBtn");
  const modalOrderBtn = document.getElementById("modalOrderBtn");

  if (!modal || !modalTitle || !modalDesc || !modalImage || !modalFavBtn || !modalOrderBtn) {
    return;
  }

  const title = card.dataset.name || card.dataset.product || "Товар";
  const desc = card.dataset.desc || "Описание товара";
  const img = card.querySelector("img") ? card.querySelector("img").src : "";

  modalTitle.textContent = title;
  modalDesc.textContent = desc;
  modalImage.src = img;
  modalImage.alt = title;

  modalFavBtn.dataset.product = title;
  modalOrderBtn.dataset.product = title;

  modal.classList.remove("hidden");
}

function closeProductModal() {
  const modal = document.getElementById("productModal");
  if (modal) modal.classList.add("hidden");
}

function initProductModal() {
  const closeBtn = document.getElementById("closeProductModal");
  const modal = document.getElementById("productModal");
  const modalFavBtn = document.getElementById("modalFavBtn");
  const modalOrderBtn = document.getElementById("modalOrderBtn");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeProductModal);
  }

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target.id === "productModal") {
        closeProductModal();
      }
    });
  }

  if (modalFavBtn) {
    modalFavBtn.addEventListener("click", function (e) {
      const product = e.currentTarget.dataset.product;
      if (!product) return;

      trackClick();
      updateProduct(product, "favorites");
      alert("Добавлено в избранное: " + product);
    });
  }

  if (modalOrderBtn) {
    modalOrderBtn.addEventListener("click", function (e) {
      const product = e.currentTarget.dataset.product;
      if (!product) return;

      trackClick();
      updateProduct(product, "orders");
      alert("Заказ оформлен: " + product);
    });
  }
}

function initProductButtons() {
  document.querySelectorAll(".searchable-card").forEach(function (card) {
    const productName = card.dataset.product || card.dataset.name || "Неизвестный товар";
    ensureProduct(productName);

    const viewBtn = card.querySelector(".track-view");
    const favBtn = card.querySelector(".track-fav");
    const orderBtn = card.querySelector(".track-order");

    if (viewBtn) {
      viewBtn.addEventListener("click", function () {
        trackClick();
        updateProduct(productName, "views");
        openProductModal(card);
      });
    }

    if (favBtn) {
      favBtn.addEventListener("click", function () {
        trackClick();
        updateProduct(productName, "favorites");
        alert("Добавлено в избранное: " + productName);
      });
    }

    if (orderBtn) {
      orderBtn.addEventListener("click", function () {
        trackClick();
        updateProduct(productName, "orders");
        alert("Заказ оформлен: " + productName);
      });
    }
  });
}

function initFilters() {
  document.querySelectorAll(".filter-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      trackClick();

      const targetId = button.dataset.target;
      const filter = button.dataset.filter;
      const wrap = document.getElementById(targetId);

      if (!wrap) return;

      const parentBlock = wrap.parentElement;
      if (parentBlock) {
        parentBlock
          .querySelectorAll('.filter-btn[data-target="' + targetId + '"]')
          .forEach(function (btn) {
            btn.classList.remove("active");
          });
      }

      button.classList.add("active");

      wrap.querySelectorAll(".searchable-card").forEach(function (card) {
        const type = card.dataset.type || "";

        if (filter === "all" || type === filter) {
          card.classList.remove("card-hidden");
        } else {
          card.classList.add("card-hidden");
        }
      });
    });
  });
}

function initSearch(inputId, targetId) {
  const input = document.getElementById(inputId);
  const target = document.getElementById(targetId);

  if (!input || !target) return;

  input.addEventListener("input", () => {
    const value = input.value.toLowerCase().trim();

    target.querySelectorAll(".searchable-card").forEach((card) => {
      const name = (card.dataset.name || "").toLowerCase();
      const desc = (card.dataset.desc || "").toLowerCase();

      if (name.includes(value) || desc.includes(value)) {
        card.classList.remove("card-hidden");
      } else {
        card.classList.add("card-hidden");
      }
    });
  });
}

function initFaq() {
  document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.parentElement;
      if (item) item.classList.toggle("open");
    });
  });
}

function initContactForm() {
  const form = document.getElementById("contactForm");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      trackClick();
      alert("Заявка отправлена. Позже можно подключить реальную отправку на email или Telegram.");
      form.reset();
    });
  }
}

function initNavTracking() {
  document.querySelectorAll(".top-nav a, .hero-actions a").forEach((link) => {
    link.addEventListener("click", () => {
      trackClick();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  registerVisit();
  initSurvey();
  initProductModal();
  initProductButtons();
  initFilters();
  initSearch("bookSearch", "booksGrid");
  initSearch("trainerSearch", "trainersGrid");
  initFaq();
  initContactForm();
  initNavTracking();
});