
"use strict";

const STORAGE_KEY = "studentProjectTracker.projects.v1";
const THEME_KEY = "studentProjectTracker.theme.v1";
const $ = selector => document.querySelector(selector);

const form = $("#project-form");
const formSection = $("#projectFormSection");
const projectList = $("#projectList");
const emptyState = $("#emptyState");
const searchInput = $("#searchInput");
const filterStatus = $("#filterStatus");
const sortProjects = $("#sortProjects");
const progressInput = $("#progress");
const progressValue = $("#progressValue");
const toast = $("#toast");
const deleteDialog = $("#deleteDialog");

let projects = loadProjects();
let pendingDeleteId = null;
let editingId = null;
let toastTimer;

function loadProjects() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(p => p && typeof p === "object" && p.id && p.name)
      .map(p => ({
        id: String(p.id),
        name: String(p.name),
        category: String(p.category || "Academic"),
        status: ["Planned", "In Progress", "On Hold", "Completed"].includes(p.status)
          ? p.status : "Planned",
        progress: clampProgress(p.progress),
        deadline: String(p.deadline || ""),
        description: String(p.description || ""),
        createdAt: Number(p.createdAt) || Date.now()
      }));
  } catch (error) {
    console.error("Could not load saved projects:", error);
    return [];
  }
}

function saveProjects() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch (error) {
    console.error("Could not save projects:", error);
    showToast("Unable to save. Check your browser storage settings.");
    return false;
  }
}

function clampProgress(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number / 5) * 5));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function showForm() {
  formSection.hidden = false;
  formSection.scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => $("#name").focus({ preventScroll: true }), 250);
}

function hideForm() {
  if (editingId) resetForm();
  formSection.hidden = true;
}

function resetForm() {
  form.reset();
  editingId = null;
  $("#projectId").value = "";
  $("#formHeading").textContent = "Create a new project";
  $("#saveButton").textContent = "＋ Add Project";
  progressInput.value = "0";
  progressValue.textContent = "0%";
}

function openEditForm(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  editingId = project.id;
  $("#projectId").value = project.id;
  $("#name").value = project.name;
  $("#category").value = project.category;
  $("#status").value = project.status;
  $("#deadline").value = project.deadline;
  $("#description").value = project.description;
  progressInput.value = String(project.progress);
  progressValue.textContent = `${project.progress}%`;
  $("#formHeading").textContent = "Edit project";
  $("#saveButton").textContent = "✓ Save Changes";
  showForm();
}

function handleSubmit(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const name = $("#name").value.trim();
  if (!name) {
    $("#name").focus();
    showToast("Please enter a project name.");
    return;
  }

  const status = $("#status").value;
  const progress = status === "Completed" ? 100 : clampProgress(progressInput.value);
  const existing = editingId ? projects.find(p => p.id === editingId) : null;

  const project = {
    id: editingId || (
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    ),
    name,
    category: $("#category").value,
    status,
    progress,
    deadline: $("#deadline").value,
    description: $("#description").value.trim(),
    createdAt: existing ? existing.createdAt : Date.now()
  };

  if (existing) {
    projects = projects.map(p => p.id === editingId ? project : p);
  } else {
    projects.unshift(project);
  }

  if (!saveProjects()) return;

  renderProjects();
  resetForm();
  hideForm();
  showToast(existing ? "Project updated successfully." : "Project added successfully.");
}

function getVisibleProjects() {
  const query = searchInput.value.trim().toLowerCase();
  const status = filterStatus.value;
  const sort = sortProjects.value;

  const result = projects.filter(project => {
    const matchesSearch = [
      project.name, project.category, project.status, project.description
    ].some(value => value.toLowerCase().includes(query));

    return matchesSearch && (status === "All" || project.status === status);
  });

  result.sort((a, b) => {
    switch (sort) {
      case "oldest": return a.createdAt - b.createdAt;
      case "name": return a.name.localeCompare(b.name);
      case "progressHigh": return b.progress - a.progress;
      case "progressLow": return a.progress - b.progress;
      case "deadline":
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      default: return b.createdAt - a.createdAt;
    }
  });

  return result;
}

function formatDate(dateString) {
  if (!dateString) return "No deadline";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString(undefined, {
    day: "numeric", month: "short", year: "numeric"
  });
}

function isOverdue(project) {
  if (!project.deadline || project.status === "Completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${project.deadline}T00:00:00`) < today;
}

function renderProject(project) {
  const statusClass = {
    "Planned": "status-planned",
    "In Progress": "status-in-progress",
    "On Hold": "status-on-hold",
    "Completed": "status-completed"
  }[project.status];

  const progress = project.status === "Completed" ? 100 : project.progress;
  const id = escapeHTML(project.id);

  return `
    <tr data-project-id="${id}">
      <td>
        <div class="project-name">${escapeHTML(project.name)}</div>
        ${project.description
          ? `<div class="project-description">${escapeHTML(project.description)}</div>`
          : ""}
      </td>
      <td><span class="category-text">${escapeHTML(project.category)}</span></td>
      <td>
        <select class="quick-status" data-action="status" data-id="${id}"
                aria-label="Change status for ${escapeHTML(project.name)}">
          ${["Planned", "In Progress", "On Hold", "Completed"].map(status =>
            `<option value="${status}" ${project.status === status ? "selected" : ""}>${status}</option>`
          ).join("")}
        </select>
      </td>
      <td class="progress-cell">
        <div class="progress-top">
          <span>Progress</span><span data-progress-label>${progress}%</span>
        </div>
        <div class="progress-track" role="progressbar"
             aria-label="${escapeHTML(project.name)} progress"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}">
          <div class="progress-fill ${progress === 100 ? "is-complete" : ""}"
               data-progress-fill style="width:${progress}%"></div>
        </div>
        <input class="progress-select" type="range" min="0" max="100" step="5"
               value="${progress}" data-action="progress" data-id="${id}"
               aria-label="Update progress for ${escapeHTML(project.name)}">
      </td>
      <td><span class="deadline-text ${isOverdue(project) ? "overdue" : ""}">
        ${escapeHTML(formatDate(project.deadline))}
      </span></td>
      <td>
        <div class="row-actions">
          <button class="row-action" data-action="edit" data-id="${id}"
                  aria-label="Edit ${escapeHTML(project.name)}" title="Edit project">✎</button>
          <button class="row-action delete" data-action="delete" data-id="${id}"
                  aria-label="Delete ${escapeHTML(project.name)}" title="Delete project">⌫</button>
        </div>
      </td>
    </tr>
  `;
}

function renderStats() {
  const total = projects.length;
  const active = projects.filter(p => p.status === "In Progress").length;
  const completed = projects.filter(p => p.status === "Completed").length;
  const average = total
    ? Math.round(projects.reduce((sum, p) =>
        sum + (p.status === "Completed" ? 100 : p.progress), 0) / total)
    : 0;

  $("#totalProjects").textContent = total;
  $("#activeProjects").textContent = active;
  $("#completedProjects").textContent = completed;
  $("#averageProgress").textContent = `${average}%`;
  $("#projectCount").textContent = total;
}

function renderProjects() {
  const visible = getVisibleProjects();
  projectList.innerHTML = visible.map(renderProject).join("");
  renderStats();

  const hasProjects = visible.length > 0;
  emptyState.classList.toggle("visible", !hasProjects);

  if (!hasProjects) {
    const hasFilters = searchInput.value.trim() || filterStatus.value !== "All";
    $("#emptyTitle").textContent = hasFilters ? "No matching projects" : "Your workspace is ready";
    $("#emptyMessage").textContent = hasFilters
      ? "Try another search or clear your filters."
      : "Add your first project to start tracking your progress.";
    $("#emptyAddButton").hidden = Boolean(hasFilters);
  }

  $("#resultsText").textContent =
    `Showing ${visible.length} of ${projects.length} project${projects.length === 1 ? "" : "s"}`;
  $("#clearSearchButton").classList.toggle("visible", searchInput.value.length > 0);
}

function updateProgress(id, value) {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  project.progress = clampProgress(value);
  if (project.progress === 100) {
    project.status = "Completed";
  } else if (project.status === "Completed") {
    project.status = "In Progress";
  }

  saveProjects();
  renderProjects();
}

function updateStatus(id, status) {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  project.status = status;
  if (status === "Completed") project.progress = 100;
  else if (project.progress === 100) project.progress = 95;

  saveProjects();
  renderProjects();
  showToast(`Status changed to ${status}.`);
}

function askDelete(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  pendingDeleteId = id;
  if (typeof deleteDialog.showModal === "function") {
    deleteDialog.showModal();
  } else if (window.confirm(`Delete "${project.name}"?`)) {
    deleteProject(id);
  }
}

function deleteProject(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;

  projects = projects.filter(p => p.id !== id);
  saveProjects();
  renderProjects();
  showToast(`"${project.name}" was deleted.`);
}

function exportCSV() {
  if (projects.length === 0) {
    showToast("There are no projects to export yet.");
    return;
  }

  const columns = [
    ["Project Name", "name"],
    ["Category", "category"],
    ["Status", "status"],
    ["Progress (%)", "progress"],
    ["Deadline", "deadline"],
    ["Description", "description"]
  ];

  const escapeCSV = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const rows = [
    columns.map(([title]) => escapeCSV(title)).join(","),
    ...projects.map(project => columns.map(([, key]) =>
      escapeCSV(key === "progress" && project.status === "Completed" ? 100 : project[key])
    ).join(","))
  ];

  const blob = new Blob(["\uFEFF" + rows.join("\r\n")], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "student-projects.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("Your project list was exported.");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function setTheme(theme) {
  const dark = theme === "dark";
  document.body.classList.toggle("dark", dark);
  $("#themeToggle").textContent = dark ? "☀" : "☾";
  $("#themeToggle").setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  $("#themeToggle").title = dark ? "Switch to light mode" : "Switch to dark mode";

  try {
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  } catch (error) {
    console.warn("Could not save theme preference.", error);
  }
}

function setActiveNav(buttonId) {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.id === buttonId);
  });
}

function scrollToProjects() {
  $("#projectsSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

// Submit form
form.addEventListener("submit", handleSubmit);

// Progress control in the form
progressInput.addEventListener("input", () => {
  progressValue.textContent = `${progressInput.value}%`;

  if (Number(progressInput.value) === 100) {
    $("#status").value = "Completed";
  } else if ($("#status").value === "Completed") {
    $("#status").value = "In Progress";
  }
});

// Keep form status and progress in sync
$("#status").addEventListener("change", () => {
  if ($("#status").value === "Completed") {
    progressInput.value = "100";
  } else if (Number(progressInput.value) === 100) {
    progressInput.value = "95";
  }

  progressValue.textContent = `${progressInput.value}%`;
});

// Form buttons
$("#cancelButton").addEventListener("click", () => {
  resetForm();
  hideForm();
});

$("#closeFormButton").addEventListener("click", hideForm);

$("#topAddButton").addEventListener("click", () => {
  resetForm();
  showForm();
});

$("#addProjectNav").addEventListener("click", () => {
  resetForm();
  showForm();
  setActiveNav("addProjectNav");
});

$("#emptyAddButton").addEventListener("click", () => {
  resetForm();
  showForm();
});

// Navigation
$("#dashboardNav").addEventListener("click", () => {
  setActiveNav("dashboardNav");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

$("#projectsNav").addEventListener("click", () => {
  setActiveNav("projectsNav");
  scrollToProjects();
});

$("#backToTopButton").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Search and filters
searchInput.addEventListener("input", renderProjects);
filterStatus.addEventListener("change", renderProjects);
sortProjects.addEventListener("change", renderProjects);

$("#clearSearchButton").addEventListener("click", () => {
  searchInput.value = "";
  renderProjects();
  searchInput.focus();
});

$("#clearFiltersButton").addEventListener("click", () => {
  searchInput.value = "";
  filterStatus.value = "All";
  sortProjects.value = "newest";
  renderProjects();
  showToast("Search and filters cleared.");
});

// Handle Edit and Delete buttons in project rows
projectList.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;
  if (action === "edit") openEditForm(id);
  if (action === "delete") askDelete(id);
});

// Update status from the table
projectList.addEventListener("change", event => {
  const control = event.target;
  if (control.dataset.action === "status") {
    updateStatus(control.dataset.id, control.value);
  }

  if (control.dataset.action === "progress") {
    updateProgress(control.dataset.id, control.value);
  }
});

// Show slider changes immediately
projectList.addEventListener("input", event => {
  const control = event.target;
  if (control.dataset.action !== "progress") return;

  const row = control.closest("tr");
  const label = row.querySelector("[data-progress-label]");
  const fill = row.querySelector("[data-progress-fill]");
  const bar = row.querySelector('[role="progressbar"]');

  label.textContent = `${control.value}%`;
  fill.style.width = `${control.value}%`;
  fill.classList.toggle("is-complete", Number(control.value) === 100);
  bar.setAttribute("aria-valuenow", control.value);
});

// Delete confirmation
$("#confirmDeleteButton").addEventListener("click", () => {
  if (pendingDeleteId) deleteProject(pendingDeleteId);
  pendingDeleteId = null;
  deleteDialog.close();
});

$("#keepProjectButton").addEventListener("click", () => {
  pendingDeleteId = null;
  deleteDialog.close();
});

deleteDialog.addEventListener("click", event => {
  if (event.target === deleteDialog) {
    pendingDeleteId = null;
    deleteDialog.close();
  }
});

// Export and theme
$("#exportButton").addEventListener("click", exportCSV);

$("#themeToggle").addEventListener("click", () => {
  setTheme(document.body.classList.contains("dark") ? "light" : "dark");
});

// Load saved theme and projects
try {
  setTheme(localStorage.getItem(THEME_KEY) || "light");
} catch (error) {
  setTheme("light");
}

renderProjects();
