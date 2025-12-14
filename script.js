const API_BASE = "https://travelfoodlog-backend.onrender.com";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#dishForm");
  const statusEl = document.querySelector("#formStatus");

  // Handle form submit (CREATE)
  if (form && statusEl) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); // stop page refresh

      // 1) Validate required fields
      if (!form.checkValidity()) {
        form.reportValidity();
        statusEl.textContent = "Please fill in the required fields.";
        statusEl.classList.remove("success");
        statusEl.classList.add("error");
        return;
      }

      // Get selected country (now optional)
      const selectedCountry =
        document.querySelector("input[name='locationCountry']:checked")
          ?.value || "";

      // Handle photo file upload - convert to base64
      let photoUrl = null;
      const photoInput = document.querySelector("#photoUrl");
      if (photoInput && photoInput.files && photoInput.files[0]) {
        try {
          photoUrl = await fileToBase64(photoInput.files[0]);
        } catch (err) {
          console.error("Error converting photo:", err);
        }
      }

      // 2) Build the data object from the form
      const placeData = {
        dishName: document.querySelector("#dishName")?.value || "",
        locationCity: document.querySelector("#locationCity")?.value || "",
        // backend expects a string for locationCountry; use the selected radio value
        locationCountry: selectedCountry,
        placeType:
          document.querySelector("input[name='placeType']:checked")?.value ||
          "",
        rating:
          Number(
            document.querySelector("input[name='rating']:checked")?.value
          ) || null,
        priceLevel:
          document.querySelector("input[name='priceLevel']:checked")?.value ||
          "",
        KeywordTags: Array.from(
          document.querySelectorAll("input[name='KeywordTags']:checked")
        ).map((c) => c.value),
        visitDate: document.querySelector("#visitDate")?.value || "",
        notes: document.querySelector("#notes")?.value || "",
        photoUrl: photoUrl,
      };

      console.log("Sending to backend:", placeData);

      // 3) Send to backend (POST /places)
      try {
        const response = await fetch(`${API_BASE}/places`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(placeData),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to save");
        }

        const saved = await response.json();
        console.log("Saved in MongoDB:", saved);

        // 4) Show success
        statusEl.textContent = "Dish saved successfully! 🎉";
        statusEl.classList.remove("error");
        statusEl.classList.add("success");

        form.reset();

        // Clear photo preview after form reset
        const previewWrapper = document.getElementById("photoPreviewWrapper");
        const previewImg = document.getElementById("photoPreview");
        if (previewWrapper && previewImg) {
          previewWrapper.hidden = true;
          previewImg.src = "";
        }

        // Reload list so the new item appears
        loadPlaces();
      } catch (err) {
        console.error(err);
        statusEl.textContent = "Error: " + err.message;
        statusEl.classList.remove("success");
        statusEl.classList.add("error");
      }
    });
  }

  // Initialize country dropdown widget (custom multi-select)
  initCountryDropdown();

  // Initialize custom date picker
  initCustomDatePicker();

  // Initialize photo preview
  initPhotoPreview();

  // NEW: set up restaurant search UI (Google Places)
  initRestaurantSearch();

  // Load existing places on page load (READ)
  loadPlaces();
});

// Helper function to convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Initialize photo preview functionality
function initPhotoPreview() {
  const photoInput = document.getElementById("photoUrl");
  const previewWrapper = document.getElementById("photoPreviewWrapper");
  const previewImg = document.getElementById("photoPreview");

  if (!photoInput || !previewWrapper || !previewImg) return;

  photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        previewImg.src = base64;
        previewWrapper.hidden = false;
      } catch (err) {
        console.error("Error previewing photo:", err);
      }
    } else {
      previewWrapper.hidden = true;
      previewImg.src = "";
    }
  });
}

function initCountryDropdown() {
  const dropdown = document.getElementById("countryDropdown");
  if (!dropdown) return;

  const btn = document.getElementById("countryDropdownBtn");
  const panel = document.getElementById("countryPanel");
  const searchInput = document.getElementById("countrySearch");
  const radios = Array.from(
    panel.querySelectorAll("input[type=radio][name='locationCountry']")
  );

  function updateButtonLabel() {
    const checked = radios.find((r) => r.checked);
    if (!checked) {
      btn.textContent = "Choose country";
    } else {
      const lbl = checked.parentElement
        ? checked.parentElement.textContent.trim()
        : checked.value;
      btn.textContent = lbl;
    }
  }

  function filterCountries() {
    const query = searchInput.value.toLowerCase().trim();
    radios.forEach((radio) => {
      const label = radio.parentElement;
      const text = label.textContent.toLowerCase();
      if (text.includes(query)) {
        label.style.display = "";
      } else {
        label.style.display = "none";
      }
    });
  }

  function openDropdown() {
    dropdown.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    if (searchInput) searchInput.focus();
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
    if (expanded) closeDropdown();
    else openDropdown();
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    const expanded = dropdown.getAttribute("aria-expanded") === "true";
    if (expanded && !dropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const expanded = dropdown.getAttribute("aria-expanded") === "true";
      if (expanded) closeDropdown();
    }
  });

  // Update label when radios change
  radios.forEach((r) =>
    r.addEventListener("change", () => {
      updateButtonLabel();
      closeDropdown();
    })
  );

  // Filter countries as user types
  if (searchInput) {
    searchInput.addEventListener("input", filterCountries);
  }

  // Initialize label
  updateButtonLabel();
}

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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
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

    // Update header
    monthYearDisplay.textContent = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Clear previous days
    calendarDaysContainer.innerHTML = "";

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // Add previous month's trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const dayEl = document.createElement("button");
      dayEl.type = "button";
      dayEl.className = "calendar-day other-month";
      dayEl.textContent = day;
      calendarDaysContainer.appendChild(dayEl);
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEl = document.createElement("button");
      dayEl.type = "button";
      dayEl.className = "calendar-day";
      dayEl.textContent = day;

      const dateObj = new Date(year, month, day);

      const today = new Date();
      if (dateObj.toDateString() === today.toDateString()) {
        dayEl.classList.add("today");
      }

      if (selectedDate && dateObj.toDateString() === selectedDate.toDateString()) {
        dayEl.classList.add("selected");
      }

      dayEl.addEventListener("click", () => {
        selectedDate = dateObj;
        hiddenInput.value = formatDate(dateObj);
        btn.textContent = formatDisplayDate(dateObj);
        closeCalendar();
      });

      calendarDaysContainer.appendChild(dayEl);
    }

    // Add next month's leading days to fill the grid
    const totalCells = calendarDaysContainer.children.length;
    const remainingCells =
      totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
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
    if (isOpen) {
      closeCalendar();
    } else {
      openCalendar();
    }
  });

  prevMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  nextMonthBtn.addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!picker.contains(e.target)) {
      closeCalendar();
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const isOpen = panel.getAttribute("aria-hidden") === "false";
      if (isOpen) closeCalendar();
    }
  });
}

// READ: get all places and render them
async function loadPlaces() {
  try {
    const res = await fetch(`${API_BASE}/places`);
    if (!res.ok) throw new Error("Failed to load places");

    const places = await res.json();
    renderPlaces(places);
  } catch (err) {
    console.error("Error loading places", err);

    const listEl = document.getElementById("placesList");
    if (listEl) {
      listEl.innerHTML = "<p>Unable to load your dishes right now.</p>";
    }
  }
}

// Render list of places into #placesList
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

      const tagsText = Array.isArray(place.KeywordTags)
        ? place.KeywordTags.join(", ")
        : "";

      return `
        <div class="saved-place" data-id="${place._id}">
          ${
            place.photoUrl
              ? `<img src="${place.photoUrl}" alt="${
                  place.dishName || "Dish photo"
                }" class="saved-place__photo">`
              : ""
          }
          <h3>${place.dishName || "Untitled dish"}</h3>
          <p><strong>Location:</strong> ${place.locationCity || "?"}, ${
        place.locationCountry || "?"
      }</p>
          <p><strong>Type:</strong> ${place.placeType || "Not specified"}</p>
          <p><strong>Rating:</strong> ${
            place.rating != null ? `${place.rating}/5` : "No rating"
          }</p>
          <p><strong>Price level:</strong> ${
            place.priceLevel || "Not specified"
          }</p>
          <p><strong>Tags:</strong> ${tagsText || "None"}</p>
          <p><strong>Visited on:</strong> ${visitDateText}</p>
          <p><strong>Notes:</strong> <span class="notes-text">${
            place.notes || "No notes yet."
          }</span></p>

          <div class="saved-place__actions">
            <button class="edit-btn">Edit</button>
            <button class="delete-btn">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");
}

// ========= Restaurant Search (Google Places via backend) =========
function initRestaurantSearch() {
  const searchQueryInput = document.querySelector("#searchQuery");
  const searchLocationInput = document.querySelector("#searchLocation");
  const searchBtn = document.querySelector("#searchBtn");
  const searchResultsContainer = document.querySelector("#searchResults");

  if (
    !searchQueryInput ||
    !searchLocationInput ||
    !searchBtn ||
    !searchResultsContainer
  ) {
    return;
  }

  searchBtn.addEventListener("click", async () => {
    const query = searchQueryInput.value.trim();
    const location = searchLocationInput.value.trim();

    if (!query || !location) {
      alert("Please enter both what you want to eat and a city.");
      return;
    }

    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";

    try {
      const res = await fetch(
        `${API_BASE}/restaurants/search?query=${encodeURIComponent(
          query
        )}&location=${encodeURIComponent(location)}`
      );

      if (!res.ok) {
        throw new Error("Search failed");
      }

      const restaurants = await res.json();
      renderRestaurantResults(restaurants);
    } catch (err) {
      console.error("Restaurant search error:", err);
      searchResultsContainer.innerHTML =
        "<p>Sorry, something went wrong while searching. Please try again.</p>";
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = "Search";
    }
  });
}

function renderRestaurantResults(restaurants) {
  const container = document.querySelector("#searchResults");
  if (!container) return;

  container.innerHTML = "";

  if (!restaurants || restaurants.length === 0) {
    container.innerHTML = "<p>No results found for this search.</p>";
    return;
  }

  restaurants.forEach((r) => {
    const card = document.createElement("article");
    card.className = "place-card";

    const ratingText =
      typeof r.rating === "number" ? r.rating.toFixed(1) : "N/A";

    card.innerHTML = `
      <div class="place-main">
        <div>
          <h3>${r.name || "Unknown place"}</h3>
          <p class="place-address">${r.address || ""}</p>
        </div>
        <div class="place-meta">
          <span class="pill pill-small">★ ${ratingText}</span>
        </div>
      </div>
      <button class="secondary-btn use-place-btn" type="button">
        Use this place
      </button>
    `;

    const useBtn = card.querySelector(".use-place-btn");
    useBtn.addEventListener("click", () => fillFormFromPlace(r));

    container.appendChild(card);
  });
}

function fillFormFromPlace(r) {
  const dishNameInput = document.querySelector("#dishName");
  const cityInput = document.querySelector("#locationCity");
  const countryRadios = document.querySelectorAll(
    "input[name='locationCountry']"
  );
  const ratingInputs = document.querySelectorAll("input[name='rating']");
  const placeTypeRadios = document.querySelectorAll("input[name='placeType']");
  const countryDropdownBtn = document.querySelector("#countryDropdownBtn");

  // Dish / restaurant name
  if (dishNameInput) {
    dishNameInput.value = r.name || "";
  }

  // Rough city guess: first part of address
  if (cityInput && r.address) {
    const parts = r.address.split(",");
    cityInput.value = parts[0].trim();
  }

  // Country guess: last part of address
  if (countryRadios.length && r.address) {
    const countryGuess = r.address
      .split(",")
      .slice(-1)[0]
      .trim()
      .toLowerCase();

    let matchedRadio = null;
    countryRadios.forEach((radio) => {
      if (radio.value.toLowerCase() === countryGuess) {
        radio.checked = true;
        matchedRadio = radio;
      } else {
        radio.checked = false;
      }
    });

    if (matchedRadio && countryDropdownBtn) {
      const lbl = matchedRadio.parentElement
        ? matchedRadio.parentElement.textContent.trim()
        : matchedRadio.value;
      countryDropdownBtn.textContent = lbl;
    }
  }

  // Rating from Google → round to nearest star
  if (ratingInputs.length && typeof r.rating === "number") {
    const rounded = Math.round(r.rating);
    ratingInputs.forEach((input) => {
      input.checked = Number(input.value) === rounded;
    });
  }

  // Default place type to Restaurant
  placeTypeRadios.forEach((radio) => {
    radio.checked = radio.value === "Restaurant";
  });

  // Scroll to main form
  const formCard = document.querySelector(".form-card");
  if (formCard) {
    formCard.scrollIntoView({ behavior: "smooth" });
  }
}

// Global click handler for Update + Delete
document.addEventListener("click", async (event) => {
  const deleteBtn = event.target.closest(".delete-btn");
  const editBtn = event.target.closest(".edit-btn");

  // DELETE
  if (deleteBtn) {
    const card = deleteBtn.closest(".saved-place");
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;

    const confirmDelete = confirm("Delete this dish?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_BASE}/places/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete dish");
      }

      // Refresh list
      loadPlaces();
    } catch (err) {
      console.error(err);
      alert("Could not delete this dish. Please try again.");
    }
  }

  // EDIT - Open edit modal with all fields
  if (editBtn) {
    const card = editBtn.closest(".saved-place");
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;

    // Fetch the full place data
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
});

// Open edit modal and populate with place data
function openEditModal(place) {
  const modal = document.getElementById("editModal");
  if (!modal) return;

  document.getElementById("editId").value = place._id;
  document.getElementById("editDishName").value = place.dishName || "";
  document.getElementById("editLocationCity").value =
    place.locationCity || "";
  document.getElementById("editLocationCountry").value =
    place.locationCountry || "";
  document.getElementById("editPlaceType").value = place.placeType || "";
  document.getElementById("editRating").value = place.rating || "";
  document.getElementById("editPriceLevel").value = place.priceLevel || "";
  document.getElementById("editVisitDate").value = place.visitDate
    ? place.visitDate.split("T")[0]
    : "";
  document.getElementById("editNotes").value = place.notes || "";
  document.getElementById("editPhotoUrl").value = place.photoUrl || "";

  modal.hidden = false;
}

// Close edit modal
function closeEditModal() {
  const modal = document.getElementById("editModal");
  if (modal) modal.hidden = true;
}

// Handle edit form submission
document.addEventListener("DOMContentLoaded", () => {
  const editForm = document.getElementById("editForm");
  const closeBtn = document.getElementById("closeEditModal");
  const cancelBtn = document.getElementById("cancelEdit");

  if (closeBtn) closeBtn.addEventListener("click", closeEditModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeEditModal);

  if (editForm) {
    editForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const id = document.getElementById("editId").value;
      const updatedData = {
        dishName: document.getElementById("editDishName").value,
        locationCity: document.getElementById("editLocationCity").value,
        locationCountry:
          document.getElementById("editLocationCountry").value,
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

        if (!res.ok) {
          throw new Error("Failed to update dish");
        }

        closeEditModal();
        loadPlaces();
        alert("Dish updated successfully! 🎉");
      } catch (err) {
        console.error(err);
        alert("Could not update dish. Please try again.");
      }
    });
  }

  const modal = document.getElementById("editModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeEditModal();
      }
    });
  }
});
