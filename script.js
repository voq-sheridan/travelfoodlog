document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("dishForm");
  const statusEl = document.getElementById("formStatus");

  // Notes character counter
  const notes = document.getElementById("notes");
  const notesCount = document.getElementById("notesCount");

  if (notes && notesCount) {
    const updateCount = () => {
      const length = notes.value.length;
      notesCount.textContent = length;
    };

    notes.addEventListener("input", updateCount);
    updateCount();
  }

  // Photo preview
  const photoInput = document.getElementById("photoUrl");
  const photoPreviewWrapper = document.getElementById("photoPreviewWrapper");
  const photoPreview = document.getElementById("photoPreview");

  if (photoInput && photoPreview && photoPreviewWrapper) {
    photoInput.addEventListener("change", () => {
      const file = photoInput.files && photoInput.files[0];

      if (!file) {
        photoPreviewWrapper.hidden = true;
        photoPreview.src = "";
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        photoPreview.src = e.target.result;
        photoPreviewWrapper.hidden = false;
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle submit (static demo mode)
  if (form && statusEl) {
    form.addEventListener("submit", (event) => {
      event.preventDefault(); // keep it static for now

      if (!form.checkValidity()) {
        form.reportValidity();
        statusEl.textContent = "Please fill in the required fields (dish, location, place type, rating, date).";
        statusEl.classList.remove("success");
        statusEl.classList.add("error");
        return;
      }

      statusEl.textContent = "Dish saved (demo only, not yet connected to the database).";
      statusEl.classList.remove("error");
      statusEl.classList.add("success");

      // Optional: reset after success
      // form.reset();
      // if (notesCount) notesCount.textContent = "0";
      // if (photoPreviewWrapper) {
      //   photoPreviewWrapper.hidden = true;
      //   photoPreview.src = "";
      // }
    });
  }
});
