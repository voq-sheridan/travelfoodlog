document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("placeForm");
  const statusEl = document.getElementById("formStatus");
  const description = document.getElementById("description");
  const descriptionCount = document.getElementById("descriptionCount");

  // Live character count for description
  if (description && descriptionCount) {
    const updateCount = () => {
      const length = description.value.length;
      descriptionCount.textContent = length;
    };

    description.addEventListener("input", updateCount);
    updateCount();
  }

  // Handle submit (static demo)
  if (form && statusEl) {
    form.addEventListener("submit", (event) => {
      event.preventDefault(); // keep it static for now

      // Use built-in validation
      if (!form.checkValidity()) {
        form.reportValidity();
        statusEl.textContent = "Please fill in the required fields.";
        statusEl.classList.remove("success");
        statusEl.classList.add("error");
        return;
      }

      // Fake success state for prototype
      statusEl.textContent = "Place saved (demo only, no real database yet).";
      statusEl.classList.remove("error");
      statusEl.classList.add("success");

      // You can reset the form if you want:
      // form.reset();
      // if (descriptionCount) descriptionCount.textContent = "0";
    });
  }
});

