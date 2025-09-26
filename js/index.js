document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://localhost:3080/incidents";
  const list = document.getElementById("incident-list");
  const form = document.getElementById("incident-form");
  const searchInput = document.getElementById("search");
  const showOpenBtn = document.getElementById("show-open");
  const showAllBtn = document.getElementById("show-all");
  const themeToggleBtn = document.getElementById("toggle-theme");
  const typeInput = document.getElementById("type");
  const locationInput = document.getElementById("location");
  const dateTimeInput = document.getElementById("date-time");
  const descriptionInput = document.getElementById("description");
  const attachmentsInput = document.getElementById("attachments");

  // Preview container for file uploads
  const previewContainer = document.createElement("div");
  previewContainer.id = "preview-container";
  previewContainer.classList.add("d-flex", "gap-2", "flex-wrap", "mt-2");
  attachmentsInput.insertAdjacentElement("afterend", previewContainer);

  let selectedFiles = [];

  async function fetchIncidents(status = null) {
    try {
      const url = status ? `${API_URL}?status=${status}` : API_URL;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      console.log("Fetched incidents:", JSON.stringify(data, null, 2)); // Debug: Log full data
      renderIncidents(data);
    } catch (error) {
      console.error("Failed to fetch incidents:", error);
      list.innerHTML = `<li class="list-group-item text-danger">Failed to load incidents. Please try again later.</li>`;
    }
  }

  function renderIncidents(data) {
    list.innerHTML = "";
    list.classList.add("list-group", "mb-3");

    if (!data || data.length === 0) {
      list.innerHTML = `<li class="list-group-item">No incidents found.</li>`;
      return;
    }

    data.forEach(incident => {
      console.log(`Rendering incident ${incident.id}:`, incident); // Debug: Log each incident
      const li = document.createElement("li");
      li.classList.add("list-group-item", "mb-3", "border", "rounded", "p-0"); // Remove padding from card

      const detailsDiv = document.createElement("div");
      detailsDiv.classList.add("p-3"); // Add padding to details only
      detailsDiv.innerHTML = `
        <h5 class="mb-1">${incident.type || "Unknown Type"}</h5>
        <p class="mb-1"><em>${incident.location || "Unknown Location"}</em></p>
        <span class="badge bg-${incident.status === "Open" ? "warning" : "success"}">${incident.status || "Unknown"}</span>
        <p class="mb-1">${incident.description || "No description"}</p>
        <small class="text-muted">${incident.datetime ? new Date(incident.datetime).toLocaleString() : "Unknown Date"}</small>
      `;

      if (incident.attachments && Array.isArray(incident.attachments) && incident.attachments.length > 0) {
        console.log(`Attachments for incident ${incident.id}:`, incident.attachments); // Debug: Log attachments
        const mediaDiv = document.createElement("div");
        mediaDiv.classList.add("d-flex", "flex-wrap"); // Remove gap-2 and mt-2

        incident.attachments.forEach((file, index) => {
          if (!file || typeof file !== "string") {
            console.warn(`Invalid attachment at index ${index} for incident ${incident.id}:`, file);
            const placeholder = document.createElement("div");
            placeholder.classList.add("text-danger");
            placeholder.textContent = "Invalid attachment";
            mediaDiv.appendChild(placeholder);
            return;
          }

          const element = file.includes("data:image")
            ? createImageElement(file)
            : file.includes("data:video")
            ? createVideoElement(file)
            : null;

          if (element) {
            mediaDiv.appendChild(element);
          } else {
            console.warn(`Unsupported attachment format at index ${index} for incident ${incident.id}:`, file);
            const placeholder = document.createElement("div");
            placeholder.classList.add("text-danger");
            placeholder.textContent = "Unsupported attachment";
            mediaDiv.appendChild(placeholder);
          }
        });

        if (mediaDiv.children.length > 0) {
          li.appendChild(mediaDiv);
        }
      } else {
        console.log(`No valid attachments for incident ${incident.id}`);
      }

      li.appendChild(detailsDiv);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.classList.add("btn", "btn-danger", "btn-sm", "me-2");
      deleteBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to delete this incident?")) return;

        try {
          const response = await fetch(`${API_URL}/${incident.id}`, { method: "DELETE" });
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          fetchIncidents();
          showToast("Incident deleted successfully!", "success");
        } catch (err) {
          console.error("Error deleting incident:", err);
          showToast("Failed to delete incident.", "danger");
        }
      });

      li.appendChild(deleteBtn);

      const commentsDiv = document.createElement("div");
      commentsDiv.classList.add("mt-3", "p-3");
      commentsDiv.style.display = "none";

      const h4 = document.createElement("h4");
      h4.textContent = "Comments";
      h4.classList.add("h6");
      commentsDiv.appendChild(h4);

      const ul = document.createElement("ul");
      ul.classList.add("list-group", "mb-2");
      (incident.comments || []).forEach(c => {
        const liComment = document.createElement("li");
        liComment.textContent = c;
        liComment.classList.add("list-group-item", "py-1");
        ul.appendChild(liComment);
      });
      commentsDiv.appendChild(ul);

      const commentForm = document.createElement("div");
      commentForm.classList.add("input-group", "mb-2");
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Add a comment...";
      input.classList.add("form-control");

      const btn = document.createElement("button");
      btn.textContent = "Post";
      btn.classList.add("btn", "btn-primary", "btn-sm");

      btn.addEventListener("click", async () => {
        if (!input.value.trim()) {
          showToast("Please enter a comment.", "warning");
          return;
        }

        const updatedComments = [...(incident.comments || []), input.value.trim()];

        try {
          const response = await fetch(`${API_URL}/${incident.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comments: updatedComments })
          });
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          fetchIncidents();
          showToast("Comment posted successfully!", "success");
        } catch (err) {
          console.error("Error posting comment:", err);
          showToast("Failed to post comment.", "danger");
        }

        input.value = "";
      });

      commentForm.appendChild(input);
      commentForm.appendChild(btn);
      commentsDiv.appendChild(commentForm);

      const commentCount = (incident.comments || []).length;
      const toggleCommentsBtn = document.createElement("button");
      toggleCommentsBtn.textContent = `View Comments (${commentCount})`;
      toggleCommentsBtn.classList.add("btn", "btn-link", "btn-sm");
      toggleCommentsBtn.addEventListener("click", () => {
        const isHidden = commentsDiv.style.display === "none";
        commentsDiv.style.display = isHidden ? "block" : "none";
        toggleCommentsBtn.textContent = isHidden ? `Hide Comments (${commentCount})` : `View Comments (${commentCount})`;
      });

      li.appendChild(toggleCommentsBtn);
      li.appendChild(commentsDiv);
      list.appendChild(li);
    });
  }

  function createImageElement(src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Incident attachment";
    img.classList.add("img-fluid", "rounded-top");
    img.style.width = "100%"; // Full width to touch sides
    img.style.height = "200px"; // Fixed height for uniform size
    img.style.objectFit = "cover"; // Crop to fit, maintaining aspect ratio
    img.style.display = "block"; // Ensure visibility
    img.style.margin = "0"; // Remove margins
    img.onerror = () => {
      console.error("Failed to load image:", src);
      img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="; // Fallback placeholder
      img.alt = "Failed to load image";
      img.style.height = "200px"; // Ensure fallback has same height
      img.style.objectFit = "cover";
    };
    return img;
  }

  function createVideoElement(src) {
    const video = document.createElement("video");
    video.src = src;
    video.controls = true;
    video.classList.add("img-fluid", "rounded-top");
    video.style.width = "100%"; // Full width to touch sides
    video.style.height = "200px"; // Fixed height for uniform size
    video.style.objectFit = "cover"; // Crop to fit, maintaining aspect ratio
    video.style.display = "block"; // Ensure visibility
    video.style.margin = "0"; // Remove margins
    video.onerror = () => {
      console.error("Failed to load video:", src);
      video.poster = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg=="; // Fallback placeholder
      video.style.height = "200px"; // Ensure fallback has same height
      video.style.objectFit = "cover";
    };
    return video;
  }

  function renderPreviews() {
    previewContainer.innerHTML = "";
    if (selectedFiles.length === 0) {
      console.log("No files selected for preview");
      previewContainer.innerHTML = `<p class="text-muted">No files selected.</p>`;
      return;
    }

    selectedFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        console.log(`Preview file ${index}:`, file.name, result.substring(0, 50)); // Debug: Log file preview
        if (!result.includes("data:image") && !result.includes("data:video")) {
          console.warn(`Unsupported file format at index ${index}:`, file);
          const placeholder = document.createElement("div");
          placeholder.classList.add("text-danger");
          placeholder.textContent = `Unsupported file: ${file.name}`;
          previewContainer.appendChild(placeholder);
          return;
        }

        const wrapper = document.createElement("div");
        wrapper.classList.add("position-relative");

        let element;
        if (result.includes("data:video")) {
          element = createVideoElement(result);
        } else if (result.includes("data:image")) {
          element = createImageElement(result);
        }

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "×";
        removeBtn.classList.add("btn", "btn-danger", "btn-sm", "position-absolute", "top-0", "end-0");
        removeBtn.addEventListener("click", () => {
          selectedFiles.splice(index, 1);
          renderPreviews();
        });

        wrapper.appendChild(element);
        wrapper.appendChild(removeBtn);
        previewContainer.appendChild(wrapper);
      };
      reader.onerror = () => {
        console.error("Error reading file:", file);
        const placeholder = document.createElement("div");
        placeholder.classList.add("text-danger");
        placeholder.textContent = `Error reading file: ${file.name}`;
        previewContainer.appendChild(placeholder);
      };
      reader.readAsDataURL(file);
    });
  }

  function showToast(message, type) {
    const toastContainer = document.createElement("div");
    toastContainer.classList.add("toast", `bg-${type}`, "text-white", "position-fixed", "bottom-0", "end-0", "m-3");
    toastContainer.setAttribute("role", "alert");
    toastContainer.innerHTML = `
      <div class="toast-body">
        ${message}
        <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast"></button>
      </div>
    `;
    document.body.appendChild(toastContainer);
    const toast = new bootstrap.Toast(toastContainer);
    toast.show();
    setTimeout(() => toastContainer.remove(), 3000);
  }

  attachmentsInput.addEventListener("change", () => {
    selectedFiles = Array.from(attachmentsInput.files).filter(file =>
      file.type.startsWith("image/") || file.type.startsWith("video/")
    );
    console.log("Selected files:", selectedFiles.map(f => f.name)); // Debug: Log file names
    if (selectedFiles.length === 0) {
      showToast("No valid image or video files selected.", "warning");
    }
    renderPreviews();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!typeInput.value.trim() || !locationInput.value.trim() || !dateTimeInput.value || !descriptionInput.value.trim()) {
      showToast("Please fill in all required fields.", "warning");
      return;
    }

    let attachments = [];
    for (const file of selectedFiles) {
      try {
        const base64 = await toBase64(file);
        if (base64.includes("data:image") || base64.includes("data:video")) {
          attachments.push(base64);
        } else {
          console.warn("Skipping invalid file:", file.name);
          showToast(`Skipping unsupported file: ${file.name}`, "warning");
        }
      } catch (err) {
        console.error("Error converting file to Base64:", err);
        showToast(`Error processing file: ${file.name}`, "danger");
      }
    }

    const newIncident = {
      type: typeInput.value.trim(),
      location: locationInput.value.trim(),
      description: descriptionInput.value.trim(),
      datetime: dateTimeInput.value,
      status: "Open",
      comments: [],
      attachments
    };

    console.log("Submitting incident:", newIncident); // Debug: Log incident data

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIncident)
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      fetchIncidents();
      form.reset();
      selectedFiles = [];
      previewContainer.innerHTML = "";
      showToast("Incident added successfully!", "success");
    } catch (err) {
      console.error("Error submitting incident:", err);
      showToast("Failed to add incident.", "danger");
    }
  });

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }

  showOpenBtn.addEventListener("click", () => fetchIncidents("Open"));
  showAllBtn.addEventListener("click", () => fetchIncidents());

  searchInput.addEventListener("input", async () => {
    const query = searchInput.value.trim().toLowerCase();
    if (!query) {
      fetchIncidents();
      return;
    }

    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      const filtered = data.filter(
        inc =>
          (inc.type || "").toLowerCase().includes(query) ||
          (inc.location || "").toLowerCase().includes(query)
      );
      renderIncidents(filtered);
    } catch (err) {
      console.error("Search error:", err);
      list.innerHTML = `<li class="list-group-item text-danger">Failed to search incidents. Please try again.</li>`;
    }
  });

  themeToggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    themeToggleBtn.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
  });

  document.getElementById("show-report").addEventListener("click", () => {
    document.getElementById("incident-form").scrollIntoView({ behavior: "smooth" });
  });

  fetchIncidents();
});