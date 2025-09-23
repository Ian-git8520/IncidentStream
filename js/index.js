const API_URL = "http://localhost:3080/incidents";

const list = document.getElementById("incident-list");
const searchInput = document.getElementById("search");
const filterOpenBtn = document.getElementById("filter-open");
const filterAllBtn = document.getElementById("filter-all");
const form = document.getElementById("incident-form");
const themeToggleBtn = document.getElementById("theme-toggle");

let incidents = [];


function fetchIncidents() {
  fetch(API_URL)
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to fetch incidents: ${reponse.status}`);
      }
      return res.json();
    })
    .then(data => {
      incidents = data;
      renderIncidents(incidents);
    })
    .catch(err => {
      console.error("Error fetching incidents:", err);
      list.innerHTML = <li style="color:red;">Could not load incidents. Check JSON server.</li>;
    });
}


function renderIncidents(data) {
  list.innerHTML = "";
  if (!data || data.length === 0) {
    list.innerHTML = "<li>No incidents found.</li>";
    return;
  }

  data.forEach(incident => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${incident.type}</strong> at ${incident.location}
      (${incident.status}) - ${incident.description}
      <br><small>${incident.datetime}</small>
    `;
    list.appendChild(li);
  });
}


form.addEventListener("submit", e => {
  e.preventDefault();

  const newIncident = {
    type: document.getElementById("type").value,
    location: document.getElementById("location").value,
    datetime: new Date().toLocaleString(),
    description: document.getElementById("description").value,
    status: "Open"
  };

  fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newIncident)
  })
    .then(res => {
      if (!res.ok) {
        throw new Error("Failed to save incident");
      }
      return res.json();
    })
    .then(incident => {
      incidents.push(incident);
      renderIncidents(incidents);
      form.reset();
    })
    .catch(err => {
      console.error("Error adding incident:", err);
      alert("Could not add incident. Check server.");
    });
});


searchInput.addEventListener("input", e => {
  const term = e.target.value.toLowerCase();
  const filtered = incidents.filter(i =>
    i.type.toLowerCase().includes(term) ||
    i.location.toLowerCase().includes(term)
  );
  renderIncidents(filtered);
});


filterOpenBtn.addEventListener("click", () => {
  const openIncidents = incidents.filter(i => i.status === "Open");
  renderIncidents(openIncidents);
});


filterAllBtn.addEventListener("click", () => {
  renderIncidents(incidents);
});




// Initial fetch
fetchIncidents();


