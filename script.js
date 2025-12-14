/* =========================================================
   FoodieTrail — script.js (FULL CORRECTED)
   - Works with your CURRENT HTML (searchQuery, searchLocation, searchBtn)
   - Restaurant search + "Use this place" auto-fills the form
   - CRUD: Create / Read / Update / Delete
   - Country dropdown + custom date picker + photo preview
   ========================================================= */

const API_BASE = "https://travelfoodlog-backend.onrender.com";

// Store the selected restaurant from search (so we can save extra info if you want)
let selectedRestaurant = null;

document.addEventListener("DOMContentLoaded", () => {
  // Core UI init
  initCountryDropdown();
  initCustomDatePicker();
  initPhotoPreview();
  initEditModal();

  // Restaurant search init (matches your HTML)
  initRestaurantSearch();

  // Form submit (CREATE)
  initCreateForm();

  // Load existing places on page load (READ)
  loadPlaces();

  // Global click handler for Delete/Edit/Use Place
  document.addEventListener("click", handleGlobalClicks);
});

/* =========================
   Restaurant Search
   ========================= */

function initRestaurantSearch() {
  const queryInput = document.getElementById("searchQuery");
  const locationInput = document.getElementById("searchLocation");
  const resultsEl = document.getElementById("searchResults");
  const searchBtn = document.getElementById("searchBtn");

  // If search UI isn't present, don't crash.
  if (!queryInput || !locationInput || !resultsEl || !searchBtn) return;

  async function runSearch() {
    const query = queryInput.value.trim();
    const location = locationInput.value.trim();

    if (!query && !location) {
      resultsEl.innerHTML = `<p>Please type a dish/restaurant or a city.</p>`;
      return;
    }

    resultsEl.innerHTML = `<p>Searching...</p>`;

    try {
      const url = new URL(`${API_BASE}/restaurants/search`);
      if (query) url.searchParams.set("query", query);
      if (location) url.searchParams.set("location", location);

      const res = await fetch(url.toString());
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Search failed");
      }

      const restaurants = await res.json();
      renderRestaurantResults(restaurants, resultsEl);
    } catch (err) {
      console.error(err);
      resultsEl.innerHTML = `<p>Could not load results. Try again.</p>`;
    }
  }

  // Click Search
  searchBtn.addEventListener("click", runSearch);

  // Press Enter in either input
  [queryInput, locationInput].forEach((el) => {
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        runSearch();
      }
    });
  });
}

function renderRestaurantResults(restaurants, resultsEl) {
  if (!Array.isArray(restaurants) || restaurants.length === 0) {
    resultsEl.innerHTML = `<p>No results found. Try another keyword.</p>`;
    return;
  }

  // Save list on the element so we can retrieve by index on click
  resultsEl._restaurants = restaurants;

  resultsEl.innerHTML = restaurants
    .map((r, idx) => {
      const name = escapeHtml(r.name || "Unnamed place");
      const address = escapeHtml(r.address || "");
      const rating = r.rating != null ? Number(r.rating).toFixed(1) : "—";
      const price = mapGooglePriceLevel(r.priceLevel);

      return `
        <div class="restaurant-result" data-index="${idx}">
          <div class="restaurant-result__meta">
            <h4 class="restaurant-result__name">${name}</h4>
            ${address ? `<p class="restaurant-result__address">${address}</p>` : ""}
            <p class="restaurant-result__rating"><strong>Rating:</strong> ${rating}</p>
            <p class="restaurant-result__price"><strong>Price:</strong> ${price}</p>
          </div>

          <button
            type="button"
            class="primary-btn use-place-btn"
            data-action="use-place"
            data-index="${idx}"
          >
            Use this place
          </button>
        </div>
      `;
    })
    .join("");
}

function applyRestaurantToForm(restaurant) {
  selectedRestaurant = restaurant;

  // Fill dish/restaurant name
  const dishNameInput = document.getElementById("dishName");
  if (dishNameInput) dishNameInput.value = restaurant.name || "";

  // Try to guess city/country from formatted address
  const { city, country } = parseCityCountryFromAddress(restaurant.address || "");

  // Auto-select price level radio if available
if (restaurant.priceLevel) {
  const priceSymbol = mapGooglePriceLevel(restaurant.priceLevel);
  const priceRadio = document.querySelector(
    `input[name="priceLevel"][value="${priceSymbol}"]`
  );
  if (priceRadio) priceRadio.checked = true;
}

  const cityInput = document.getElementById("locationCity");
  if (cityInput && city) cityInput.value = city;

  // Select the country radio if it exists in your list
  if (country) {
    const countryRadio = document.querySelector(
      `input[type="radio"][name="locationCountry"][value="${cssEscape(country)}"]`
    );
    if (countryRadio) {
      countryRadio.checked = true;

      // Update dropdown label
      const dropdownBtn = document.getElementById("countryDropdownBtn");
      if (dropdownBtn) {
        const lbl = countryRadio.parentElement?.textContent?.trim() || country;
        dropdownBtn.textContent = lbl;
      }
    }
  }

  // Optional: put address into notes if notes is empty
  const notes = document.getElementById("notes");
  if (notes && restaurant.address) {
    const existing = notes.value.trim();
    if (!existing) notes.value = `Address: ${restaurant.address}`;
  }

  // Scroll to form
  const form = document.getElementById("dishForm");
  if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function parseCityCountryFromAddress(address) {
  // Example: "421 College St, Toronto, ON M5T 1T1, Canada"
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  const country = parts.length >= 1 ? parts[parts.length - 1] : "";
  const cityChunk = parts.length >= 2 ? parts[parts.length - 2] : "";
  const city = cityChunk ? cityChunk.split(" ")[0] : "";
  return { city, country };
}

/* =========================
   Create (POST /places)
   ========================= */

function initCreateForm() {
  const form = document.querySelector("#dishForm");
  const statusEl = document.querySelector("#formStatus");
  if (!form || !statusEl) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      statusEl.textContent = "Please fill in the required fields.";
      statusEl.classList.remove("success");
      statusEl.classList.add("error");
      return;
    }

    const selectedCountry =
      document.querySelector("input[name='locationCountry']:checked")?.value || "";

    // Photo file -> base64
    let photoUrl = null;
    const photoInput = document.querySelector("#photoUrl");
    if (photoInput?.files?.[0]) {
      try {
        photoUrl = await fileToBase64(photoInput.files[0]);
      } catch (err) {
        console.error("Error converting photo:", err);
      }
    }

    const placeData = {
      dishName: document.querySelector("#dishName")?.value || "",
      locationCity: document.querySelector("#locationCity")?.value || "",
      locationCountry: selectedCountry,
      placeType: document.querySelector("input[name='placeType']:checked")?.value || "",
      rating: Number(document.querySelector("input[name='rating']:checked")?.value) || null,
      priceLevel: document.querySelector("input[name='priceLevel']:checked")?.value || "",
      KeywordTags: Array.from(
        document.querySelectorAll("input[name='KeywordTags']:checked")
      ).map((c) => c.value),
      visitDate: document.querySelector("#visitDate")?.value || "",
      notes: document.querySelector("#notes")?.value || "",
      photoUrl,

      // Optional: save Google info too
      externalId: selectedRestaurant?.externalId || "",
      address: selectedRestaurant?.address || "",
      lat: selectedRestaurant?.lat ?? null,
      lng: selectedRestaurant?.lng ?? null,
      source: selectedRestaurant?.source || "",
    };

    try {
      const response = await fetch(`${API_BASE}/places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(placeData),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }

      statusEl.textContent = "Dish saved successfully! 🎉";
      statusEl.classList.remove("error");
      statusEl.classList.add("success");

      form.reset();
      selectedRestaurant = null;

      // Clear photo preview
      const previewWrapper = document.getElementById("photoPreviewWrapper");
      const previewImg = document.getElementById("photoPreview");
      if (previewWrapper && previewImg) {
        previewWrapper.hidden = true;
        previewImg.src = "";
      }

      // Reset country dropdown label
      const dropdownBtn = document.getElementById("countryDropdownBtn");
      if (dropdownBtn) dropdownBtn.textContent = "Choose country(s)";

      // Reset date picker label
      const dateBtn = document.getElementById("datePickerBtn");
      if (dateBtn) dateBtn.textContent = "Choose date";

      loadPlaces();
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Error: " + err.message;
      statusEl.classList.remove("success");
      statusEl.classList.add("error");
    }
  });
}

/* =========================
   Helpers: file -> base64
   ========================= */

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/* =========================
   Photo preview
   ========================= */

function initPhotoPreview() {
  const photoInput = document.getElementById("photoUrl");
  const previewWrapper = document.getElementById("photoPreviewWrapper");
  const previewImg = document.getElementById("photoPreview");
  if (!photoInput || !previewWrapper || !previewImg) return;

  photoInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      previewWrapper.hidden = true;
      previewImg.src = "";
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      previewImg.src = base64;
      previewWrapper.hidden = false;
    } catch (err) {
      console.error("Error previewing photo:", err);
    }
  });
}

/* =========================
   Country dropdown
   ========================= */

function initCountryDropdown() {
  const dropdown = document.getElementById("countryDropdown");
  if (!dropdown) return;

  const btn = document.getElementById("countryDropdownBtn");
  const panel = document.getElementById("countryPanel");
  const searchInput = document.getElementById("countrySearch");
  const radios = Array.from(panel.querySelectorAll("input[type=radio][name='locationCountry']"));

  function updateButtonLabel() {
    const checked = radios.find((r) => r.checked);
    if (!checked) btn.textContent = "Choose country(s)";
    else btn.textContent = checked.parentElement?.textContent?.trim() || checked.value;
  }

  function filterCountries() {
    const q = (searchInput?.value || "").toLowerCase().trim();
    radios.forEach((radio) => {
      const label = radio.parentElement;
      const text = label.textContent.toLowerCase();
      label.style.display = text.includes(q) ? "" : "none";
    });
  }

  function openDropdown() {
    dropdown.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    searchInput?.focus();
  }

  function closeDropdown() {
    dropdown.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
    btn.focus();

    if (searchInput) {
      searchInput.value = "";
      filterCountries();
    }
  }

  btn.addEventListener("click", () => {
    const expanded = dropdown.getAttribute("aria-expanded") === "true";
    expanded ? closeDropdown() : openDropdown();
  });

  document.addEventListener("click", (e) => {
    const expanded = dropdown.getAttribute("aria-expanded") === "true";
    if (expanded && !dropdown.contains(e.target)) closeDropdown();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const expanded = dropdown.getAttribute("aria-expanded") === "true";
      if (expanded) closeDropdown();
    }
  });

  radios.forEach((r) =>
    r.addEventListener("change", () => {
      updateButtonLabel();
      closeDropdown();
    })
  );

  searchInput?.addEventListener("input", filterCountries);
  updateButtonLabel();
}

/* =========================
   Custom date picker
   ========================= */

function initCustomDatePicker() {
  const picker = document.getElementById("customDatePicker");
  if (!picker) return;

  const btn = document.getElementById("datePickerBtn");
  const panel = document.getElementById("calendarPanel");
  const hiddenInput = document.getElementById("visitDate");
  const monthYearDisplay = document.getElementById("monthYear");
  const calendarDaysContainer = document.getElementById("calendarDays");
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");

  let currentDate = new Date();
  let selectedDate = null;

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function formatDisplayDate(date) {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYearDisplay.textContent = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    calendarDaysContainer.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const dayEl = document.createElement("button");
      dayEl.type = "button";
      dayEl.className = "calendar-day other-month";
      dayEl.textContent = day;
      calendarDaysContainer.appendChild(dayEl);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayEl = document.createElement("button");
      dayEl.type = "button";
      dayEl.className = "calendar-day";
      dayEl.textContent = day;

      const dateObj = new Date(year, month, day);
      const today = new Date();

      if (dateObj.toDateString() === today.toDateString()) dayEl.classList.add("today");
      if (selectedDate && dateObj.toDateString() === selectedDate.toDateString())
        dayEl.classList.add("selected");

      dayEl.addEventListener("click", () => {
        selectedDate = dateObj;
        hiddenInput.value = formatDate(dateObj);
        btn.textContent = formatDisplayDate(dateObj);
        closeCalendar();
      });

      calendarDaysContainer.appendChild(dayEl);
    }

    const totalCells = calendarDaysContainer.children.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      const dayEl = document.createElement("button");
      dayEl.type = "button";
      dayEl.className = "calendar-day other-month";
      dayEl.textContent = day;
      calendarDaysContainer.appendChild(dayEl);
    }
  }

  function openCalendar() {
    panel.setAttribute("aria-hidden", "false");
    renderCalendar();
  }

  function closeCalendar() {
    panel.setAttribute("aria-hidden", "true");
  }

  btn.addEventListener("click", () => {
    const isOpen = panel.getAttribute("aria-hidden") === "false";
    isOpen ? closeCalendar() : openCalendar();
  });

  prevMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  nextMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  document.addEventListener("click", (e) => {
    if (!picker.contains(e.target)) closeCalendar();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const isOpen = panel.getAttribute("aria-hidden") === "false";
      if (isOpen) closeCalendar();
    }
  });
}

/* =========================
   READ: load + render places
   ========================= */

async function loadPlaces() {
  try {
    const res = await fetch(`${API_BASE}/places`);
    if (!res.ok) throw new Error("Failed to load places");
    const places = await res.json();
    renderPlaces(places);
  } catch (err) {
    console.error("Error loading places", err);
    const listEl = document.getElementById("placesList");
    if (listEl) listEl.innerHTML = "<p>Unable to load your dishes right now.</p>";
  }
}

function renderPlaces(places) {
  const listEl = document.getElementById("placesList");
  if (!listEl) return;

  if (!places.length) {
    listEl.innerHTML = "<p>No saved dishes yet.</p>";
    return;
  }

  listEl.innerHTML = places
    .map((place) => {
      const visitDateText = place.visitDate
        ? new Date(place.visitDate).toLocaleDateString()
        : "Not set";

      const tagsText = Array.isArray(place.KeywordTags) ? place.KeywordTags.join(", ") : "";

      return `
        <div class="saved-place" data-id="${place._id}">
          ${
            place.photoUrl
              ? `<img src="${place.photoUrl}" alt="${escapeHtml(
                  place.dishName || "Dish photo"
                )}" class="saved-place__photo">`
              : ""
          }
          <h3>${escapeHtml(place.dishName || "Untitled dish")}</h3>
          <p><strong>Location:</strong> ${escapeHtml(place.locationCity || "?")}, ${escapeHtml(
        place.locationCountry || "?"
      )}</p>
          <p><strong>Type:</strong> ${escapeHtml(place.placeType || "Not specified")}</p>
          <p><strong>Rating:</strong> ${
            place.rating != null ? `${place.rating}/5` : "No rating"
          }</p>
          <p><strong>Price level:</strong> ${escapeHtml(place.priceLevel || "Not specified")}</p>
          <p><strong>Tags:</strong> ${escapeHtml(tagsText || "None")}</p>
          <p><strong>Visited on:</strong> ${escapeHtml(visitDateText)}</p>
          <p><strong>Notes:</strong> <span class="notes-text">${escapeHtml(
            place.notes || "No notes yet."
          )}</span></p>

          <div class="saved-place__actions">
            <button class="edit-btn" type="button">Edit</button>
            <button class="delete-btn" type="button">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");
}

/* =========================
   Global click handler
   ========================= */

async function handleGlobalClicks(event) {
  const deleteBtn = event.target.closest(".delete-btn");
  const editBtn = event.target.closest(".edit-btn");
  const usePlaceBtn = event.target.closest("[data-action='use-place']");

  // Use this place (restaurant search)
  if (usePlaceBtn) {
    const resultsEl = document.getElementById("searchResults");
    const restaurants = resultsEl?._restaurants || [];
    const index = Number(usePlaceBtn.dataset.index);
    const restaurant = restaurants[index];
    if (restaurant) applyRestaurantToForm(restaurant);
    return;
  }

  // DELETE
  if (deleteBtn) {
    const card = deleteBtn.closest(".saved-place");
    const id = card?.dataset?.id;
    if (!id) return;

    if (!confirm("Delete this dish?")) return;

    try {
      const res = await fetch(`${API_BASE}/places/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete dish");
      loadPlaces();
    } catch (err) {
      console.error(err);
      alert("Could not delete this dish. Please try again.");
    }
    return;
  }

  // EDIT
  if (editBtn) {
    const card = editBtn.closest(".saved-place");
    const id = card?.dataset?.id;
    if (!id) return;

    try {
      const res = await fetch(`${API_BASE}/places/${id}`);
      if (!res.ok) throw new Error("Failed to fetch place data");
      const place = await res.json();
      openEditModal(place);
    } catch (err) {
      console.error(err);
      alert("Could not load dish data for editing.");
    }
  }
}

/* =========================
   Edit modal
   ========================= */

function initEditModal() {
  const editForm = document.getElementById("editForm");
  const closeBtn = document.getElementById("closeEditModal");
  const cancelBtn = document.getElementById("cancelEdit");
  const modal = document.getElementById("editModal");

  closeBtn?.addEventListener("click", closeEditModal);
  cancelBtn?.addEventListener("click", closeEditModal);

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeEditModal();
  });

  editForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("editId").value;
    const updatedData = {
      dishName: document.getElementById("editDishName").value,
      locationCity: document.getElementById("editLocationCity").value,
      locationCountry: document.getElementById("editLocationCountry").value,
      placeType: document.getElementById("editPlaceType").value,
      rating: document.getElementById("editRating").value
        ? Number(document.getElementById("editRating").value)
        : null,
      priceLevel: document.getElementById("editPriceLevel").value,
      visitDate: document.getElementById("editVisitDate").value,
      notes: document.getElementById("editNotes").value,
      photoUrl: document.getElementById("editPhotoUrl").value,
    };

    try {
      const res = await fetch(`${API_BASE}/places/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) throw new Error("Failed to update dish");

      closeEditModal();
      loadPlaces();
      alert("Dish updated successfully! 🎉");
    } catch (err) {
      console.error(err);
      alert("Could not update dish. Please try again.");
    }
  });
}

function openEditModal(place) {
  const modal = document.getElementById("editModal");
  if (!modal) return;

  document.getElementById("editId").value = place._id;
  document.getElementById("editDishName").value = place.dishName || "";
  document.getElementById("editLocationCity").value = place.locationCity || "";
  document.getElementById("editLocationCountry").value = place.locationCountry || "";
  document.getElementById("editPlaceType").value = place.placeType || "";
  document.getElementById("editRating").value = place.rating || "";
  document.getElementById("editPriceLevel").value = place.priceLevel || "";
  document.getElementById("editVisitDate").value = place.visitDate ? place.visitDate.split("T")[0] : "";
  document.getElementById("editNotes").value = place.notes || "";
  document.getElementById("editPhotoUrl").value = place.photoUrl || "";

  modal.hidden = false;
}

function closeEditModal() {
  const modal = document.getElementById("editModal");
  if (modal) modal.hidden = true;
}

/* =========================
   Utilities
   ========================= */

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// For querySelector value matching
function cssEscape(value) {
  return CSS?.escape ? CSS.escape(value) : String(value).replace(/"/g, '\\"');
}

function mapGooglePriceLevel(priceLevel) {
  switch (priceLevel) {
    case "PRICE_LEVEL_INEXPENSIVE":
      return "$";
    case "PRICE_LEVEL_MODERATE":
      return "$$";
    case "PRICE_LEVEL_EXPENSIVE":
      return "$$$";
    case "PRICE_LEVEL_VERY_EXPENSIVE":
      return "$$$$";
    default:
      return "—";
  }
}
