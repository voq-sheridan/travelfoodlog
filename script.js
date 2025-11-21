document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#dishForm");
  const statusEl = document.querySelector("#formStatus");

  if (!form || !statusEl) return;

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

    // 2) Build the data object exactly matching your form
    const placeData = {
      dishName: document.querySelector("#dishName")?.value || "",

      locationCity: document.querySelector("#locationCity")?.value || "",
      locationCountry: document.querySelector("#locationCountry")?.value || "",

      placeType: document.querySelector("input[name='placeType']:checked")?.value || "",

      rating: Number(document.querySelector("input[name='rating']:checked")?.value) || null,

      priceLevel: document.querySelector("input[name='priceLevel']:checked")?.value || "",

      KeywordTags: Array.from(document.querySelectorAll("input[name='KeywordTags']:checked"))
        .map((c) => c.value),

      visitDate: document.querySelector("#visitDate")?.value || "",

      notes: document.querySelector("#notes")?.value || "",

      photoUrl: null // optional — we will handle file upload later
    };

    console.log("Sending to backend:", placeData);

    // 3) Send to backend
    try {
      const response = await fetch("http://localhost:3000/places", {
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
    } catch (err) {
      console.error(err);
      statusEl.textContent = "Error: " + err.message;
      statusEl.classList.remove("success");
      statusEl.classList.add("error");
    }
  });
});

async function loadPlaces() {
  try {
    const res = await fetch("/places");
    const places = await res.json();

    const listEl = document.getElementById("placesList");
    if (!places.length) {
      listEl.innerHTML = "<p>No saved dishes yet.</p>";
      return;
    }

    listEl.innerHTML = places.map(place => `
      <div class="saved-place">
        <h3>${place.dishName}</h3>
        <p><strong>Location:</strong> ${place.locationCity}, ${place.locationCountry}</p>
        <p><strong>Type:</strong> ${place.placeType}</p>
        <p><strong>Rating:</strong> ${place.rating}/5</p>
        <p><strong>Visited on:</strong> ${new Date(place.visitDate).toLocaleDateString()}</p>
        <p><strong>Notes:</strong> ${place.notes || "—"}</p>
      </div>
    `).join("");
  } catch (err) {
    console.error("Error loading places", err);
  }
}

document.addEventListener("DOMContentLoaded", loadPlaces);
