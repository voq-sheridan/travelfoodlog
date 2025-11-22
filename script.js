const API_BASE = "http://localhost:3000";

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

      // Ensure exactly one country is selected (radio inside custom dropdown)
      const selectedCountry = document.querySelector("input[name='locationCountry']:checked")?.value || "";
      if (!selectedCountry) {
        statusEl.textContent = "Please choose a country.";
        statusEl.classList.remove("success");
        statusEl.classList.add("error");
        const btn = document.getElementById("countryDropdownBtn");
        if (btn) btn.focus();
        return;
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
        photoUrl: null, // optional
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

  // Load existing places on page load (READ)
  // Initialize country dropdown widget (custom multi-select)
  initCountryDropdown();

  loadPlaces();
});

function initCountryDropdown() {
  const dropdown = document.getElementById("countryDropdown");
  if (!dropdown) return;

  const btn = document.getElementById("countryDropdownBtn");
  const panel = document.getElementById("countryPanel");
  const radios = Array.from(panel.querySelectorAll("input[type=radio][name='locationCountry']"));

  function updateButtonLabel() {
    const checked = radios.find((r) => r.checked);
    if (!checked) {
      btn.textContent = "Choose country";
    } else {
      const lbl = checked.parentElement ? checked.parentElement.textContent.trim() : checked.value;
      btn.textContent = lbl;
    }
  }

  function openDropdown() {
    dropdown.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-expanded", "true");
    panel.setAttribute("aria-hidden", "false");
    // focus first radio for keyboard users
    const first = panel.querySelector("input[type=radio]");
    if (first) first.focus();
  }

  function closeDropdown() {
    dropdown.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-expanded", "false");
    panel.setAttribute("aria-hidden", "true");
    btn.focus();
  }

  btn.addEventListener("click", (e) => {
    const expanded = dropdown.getAttribute("aria-expanded") === "true";
    if (expanded) closeDropdown();
    else openDropdown();
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) {
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
  radios.forEach((r) => r.addEventListener("change", () => {
    updateButtonLabel();
    // close dropdown after selection for faster UX
    closeDropdown();
  }));

  // Initialize label
  updateButtonLabel();
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
            <button class="edit-notes-btn">Edit notes</button>
            <button class="delete-btn">Delete</button>
          </div>
        </div>
      `;
    })
    .join("");
}

// Global click handler for Update + Delete
document.addEventListener("click", async (event) => {
  const deleteBtn = event.target.closest(".delete-btn");
  const editBtn = event.target.closest(".edit-notes-btn");

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

  // UPDATE (edit notes)
  if (editBtn) {
    const card = editBtn.closest(".saved-place");
    if (!card) return;
    const id = card.dataset.id;
    if (!id) return;

    const notesEl = card.querySelector(".notes-text");
    const currentNotes = notesEl ? notesEl.textContent : "";

    const newNotes = prompt("Update notes for this dish:", currentNotes);
    if (newNotes === null) {
      // user cancelled
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/places/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: newNotes }),
      });

      if (!res.ok) {
        throw new Error("Failed to update notes");
      }

      // Refresh list
      loadPlaces();
    } catch (err) {
      console.error(err);
      alert("Could not update notes. Please try again.");
    }
  }
});
