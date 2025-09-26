document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://localhost:3080/incidents";
  const els = {
    list: document.getElementById("incident-list"),
    form: document.getElementById("incident-form"),
    search: document.getElementById("search"),
    showOpen: document.getElementById("show-open"),
    showAll: document.getElementById("show-all"),
    themeToggle: document.getElementById("toggle-theme"),
    type: document.getElementById("type"),
    location: document.getElementById("location"),
    dateTime: document.getElementById("date-time"),
    description: document.getElementById("description"),
    attachments: document.getElementById("attachments"),
    showReport: document.getElementById("show-report")
  };

  const previewContainer = document.createElement("div");
  previewContainer.id = "preview-container";
  previewContainer.classList.add("d-flex", "gap-2", "flex-wrap", "mt-2");
  els.attachments.after(previewContainer);

  let selectedFiles = [];

  async function fetchIncidents(status) {
    try {
      const url = status ? `${API_URL}?status=${status}` : API_URL;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      renderIncidents(data);
    } catch (err) {
      console.error("Fetch error:", err);
      els.list.innerHTML = '<li class="list-group-item text-danger">Failed to load incidents.</li>';
    }
  }

  function renderIncidents(data) {
    els.list.innerHTML = "";
    els.list.classList.add("list-group", "mb-3");
    if (!data?.length) {
      els.list.innerHTML = '<li class="list-group-item">No incidents found.</li>';
      return;
    }

    data.forEach(incident => {
      const li = document.createElement("li");
      li.classList.add("list-group-item", "mb-3", "border", "rounded", "p-0");

      const details = document.createElement("div");
      details.classList.add("p-3");
      details.innerHTML = `
        <h5 class="mb-1">${incident.type || "Unknown Type"}</h5>
        <p class="mb-1"><em>${incident.location || "Unknown Location"}</em></p>
        <span class="badge bg-${incident.status === "Open" ? "warning" : "success"}">${incident.status || "Unknown"}</span>
        <p class="mb-1">${incident.description || "No description"}</p>
        <small class="text-muted">${incident.datetime ? new Date(incident.datetime).toLocaleString() : "Unknown Date"}</small>
      `;

      if (incident.attachments?.length) {
        const media = document.createElement("div");
        media.classList.add("d-flex", "flex-wrap");
        incident.attachments.forEach(file => {
          const el = file.includes("data:image") ? createImage(file) : file.includes("data:video") ? createVideo(file) : null;
          if (el) media.appendChild(el);
          else media.innerHTML += '<div class="text-danger">Unsupported attachment</div>';
        });
        if (media.children.length) li.appendChild(media);
      }

      li.appendChild(details);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.classList.add("btn", "btn-danger", "btn-sm", "me-2");
      deleteBtn.onclick = async () => {
        if (!confirm("Delete this incident?")) return;
        try {
          const res = await fetch(`${API_URL}/${incident.id}`, { method: "DELETE" });
          if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
          fetchIncidents();
          showToast("Incident deleted!", "success");
        } catch (err) {
          console.error("Delete error:", err);
          showToast("Failed to delete incident.", "danger");
        }
      };
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
      btn.onclick = async () => {
        if (!input.value.trim()) return showToast("Enter a comment.", "warning");
        try {
          const res = await fetch(`${API_URL}/${incident.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comments: [...(incident.comments || []), input.value.trim()] })
          });
          if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
          fetchIncidents();
          showToast("Comment posted!", "success");
          input.value = "";
        } catch (err) {
          console.error("Comment error:", err);
          showToast("Failed to post comment.", "danger");
        }
      };

      commentForm.appendChild(input);
      commentForm.appendChild(btn);
      commentsDiv.appendChild(commentForm);

      const toggleComments = document.createElement("button");
      toggleComments.textContent = `View Comments (${(incident.comments || []).length})`;
      toggleComments.classList.add("btn", "btn-link", "btn-sm");
      toggleComments.onclick = () => {
        commentsDiv.style.display = commentsDiv.style.display === "none" ? "block" : "none";
        toggleComments.textContent = commentsDiv.style.display === "none" ? `View Comments (${(incident.comments || []).length})` : `Hide Comments (${(incident.comments || []).length})`;
      };

      li.appendChild(toggleComments);
      li.appendChild(commentsDiv);
      els.list.appendChild(li);
    });
  }

  function createImage(src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Incident attachment";
    img.classList.add("img-fluid", "rounded-top");
    img.style.cssText = "width:100%;height:200px;object-fit:cover;display:block;margin:0;";
    img.onerror = () => {
      img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
      img.alt = "Failed to load image";
    };
    return img;
  }

  function createVideo(src) {
    const video = document.createElement("video");
    video.src = src;
    video.controls = true;
    video.classList.add("img-fluid", "rounded-top");
    video.style.cssText = "width:100%;height:200px;object-fit:cover;display:block;margin:0;";
    video.onerror = () => {
      video.poster = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";
    };
    return video;
  }

  function renderPreviews() {
    previewContainer.innerHTML = selectedFiles.length ? "" : '<p class="text-muted">No files selected.</p>';
    selectedFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = e => {
        if (!e.target.result.includes("data:image") && !e.target.result.includes("data:video")) {
          previewContainer.innerHTML += `<div class="text-danger">Unsupported file: ${file.name}</div>`;
          return;
        }
        const wrapper = document.createElement("div");
        wrapper.classList.add("position-relative");
        const el = e.target.result.includes("data:video") ? createVideo(e.target.result) : createImage(e.target.result);
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "×";
        removeBtn.classList.add("btn", "btn-danger", "btn-sm", "position-absolute", "top-0", "end-0");
        removeBtn.onclick = () => {
          selectedFiles.splice(index, 1);
          renderPreviews();
        };
        wrapper.appendChild(el);
        wrapper.appendChild(removeBtn);
        previewContainer.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
    });
  }

  function showToast(msg, type) {
    const toast = document.createElement("div");
    toast.classList.add("toast", `bg-${type}`, "text-white", "position-fixed", "bottom-0", "end-0", "m-3");
    toast.innerHTML = `<div class="toast-body">${msg}<button class="btn-close btn-close-white ms-2" data-bs-dismiss="toast"></button></div>`;
    document.body.appendChild(toast);
    new bootstrap.Toast(toast).show();
    setTimeout(() => toast.remove(), 3000);
  }

  els.attachments.addEventListener("change", () => {
    selectedFiles = Array.from(els.attachments.files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!selectedFiles.length) showToast("No valid image/video files.", "warning");
    renderPreviews();
  });

  els.form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!els.type.value.trim() || !els.location.value.trim() || !els.dateTime.value || !els.description.value.trim()) {
      showToast("Fill all required fields.", "warning");
      return;
    }

    const attachments = await Promise.all(selectedFiles.map(file => toBase64(file).catch(err => {
      console.error("Base64 error:", err);
      showToast(`Error processing file: ${file.name}`, "danger");
      return null;
    }))).then(results => results.filter(Boolean));

    const newIncident = {
      type: els.type.value.trim(),
      location: els.location.value.trim(),
      description: els.description.value.trim(),
      datetime: els.dateTime.value,
      status: "Open",
      comments: [],
      attachments
    };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIncident)
      });
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      fetchIncidents();
      els.form.reset();
      selectedFiles = [];
      previewContainer.innerHTML = "";
      showToast("Incident added!", "success");
    } catch (err) {
      console.error("Submit error:", err);
      showToast("Failed to add incident.", "danger");
    }
  });

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  els.showOpen.addEventListener("click", () => fetchIncidents("Open"));
  els.showAll.addEventListener("click", () => fetchIncidents());
  els.search.addEventListener("input", async () => {
    const query = els.search.value.trim().toLowerCase();
    if (!query) return fetchIncidents();
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      renderIncidents(data.filter(inc =>
        (inc.type || "").toLowerCase().includes(query) ||
        (inc.location || "").toLowerCase().includes(query)
      ));
    } catch (err) {
      console.error("Search error:", err);
      els.list.innerHTML = '<li class="list-group-item text-danger">Failed to search incidents.</li>';
    }
  });

  els.themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    els.themeToggle.textContent = document.body.classList.contains("dark-mode") ? "☀️" : "🌙";
  });

  els.showReport.addEventListener("click", () => {
    els.form.scrollIntoView({ behavior: "smooth" });
  });

  fetchIncidents();
});