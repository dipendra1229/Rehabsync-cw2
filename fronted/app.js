const API_BASE_URL = "http://localhost:7071/api";

/* =========================
   HELPER: SAFE JSON READER
========================= */
async function readJsonSafely(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

/* =========================
   THERAPIST VIDEO UPLOAD
========================= */
const uploadForm = document.getElementById("uploadForm");

if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const exerciseTitle = document.getElementById("exerciseTitle").value.trim();
    const patientId = document.getElementById("patientId").value.trim();
    const videoFile = document.getElementById("videoFile").files[0];
    const uploadMessage = document.getElementById("uploadMessage");

    if (!exerciseTitle || !patientId || !videoFile) {
      uploadMessage.innerHTML = "<p>Please complete all fields.</p>";
      return;
    }

    const formData = new FormData();
    formData.append("exerciseTitle", exerciseTitle);
    formData.append("patientId", patientId);
    formData.append("videoFile", videoFile);

    uploadMessage.innerHTML = "<p>Uploading video...</p>";

    try {
      const response = await fetch(`${API_BASE_URL}/uploadVideo`, {
        method: "POST",
        body: formData
      });

      const result = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(result.error || result.details || "Upload failed");
      }

      uploadMessage.innerHTML = `
        <p><strong>${result.message}</strong></p>
        <p><strong>Exercise:</strong> ${result.exerciseTitle}</p>
        <p><strong>Patient ID:</strong> ${result.patientId}</p>
        <p><strong>File:</strong> ${result.fileName}</p>
        <p><a href="${result.videoUrl}" target="_blank">▶ Watch Video</a></p>
      `;

      uploadForm.reset();

    } catch (error) {
      uploadMessage.innerHTML = `<p>${error.message}</p>`;
      console.error(error);
    }
  });
}

/* =========================
   PATIENT RECOVERY FORM
========================= */
const recoveryForm = document.getElementById("recoveryForm");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const loadLogsBtn = document.getElementById("loadLogsBtn");

if (recoveryForm) {
  recoveryForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const logId = document.getElementById("logId").value;
    const recoveryMessage = document.getElementById("recoveryMessage");

    const data = {
      patientId: document.getElementById("recoveryPatientId").value.trim(),
      date: document.getElementById("date").value,
      painLevel: Number(document.getElementById("painLevel").value),
      mobilityScore: Number(document.getElementById("mobilityScore").value),
      notes: document.getElementById("notes").value.trim()
    };

    try {
      let response;

      if (logId) {
        response = await fetch(`${API_BASE_URL}/recovery/${logId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      } else {
        response = await fetch(`${API_BASE_URL}/recovery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        });
      }

      const result = await readJsonSafely(response);

      if (!response.ok) {
        throw new Error(result.error || "Request failed");
      }

      recoveryMessage.textContent = logId
        ? "Recovery log updated successfully."
        : "Recovery log saved successfully.";

      resetRecoveryForm();

      const searchId = document.getElementById("searchPatientId").value.trim();
      if (searchId) {
        loadLogs();
      }

    } catch (error) {
      recoveryMessage.textContent = error.message;
      console.error(error);
    }
  });
}

/* =========================
   LOAD RECOVERY LOGS
========================= */
if (loadLogsBtn) {
  loadLogsBtn.addEventListener("click", loadLogs);
}

async function loadLogs() {
  const patientId = document.getElementById("searchPatientId").value.trim();
  const logsContainer = document.getElementById("logsContainer");

  if (!patientId) {
    logsContainer.innerHTML = "<p>Please enter a patient ID.</p>";
    return;
  }

  logsContainer.innerHTML = "<p>Loading...</p>";

  try {
    const response = await fetch(`${API_BASE_URL}/recovery?patientId=${encodeURIComponent(patientId)}`);
    const logs = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(logs.error || "Failed to load logs");
    }

    logsContainer.innerHTML = "";

    if (!logs.length) {
      logsContainer.innerHTML = "<p>No logs found.</p>";
      return;
    }

    logs.forEach(log => {
      const div = document.createElement("div");
      div.className = "log-item";

      div.innerHTML = `
        <p><strong>ID:</strong> ${log.id}</p>
        <p><strong>Patient ID:</strong> ${log.patientId}</p>
        <p><strong>Date:</strong> ${log.date}</p>
        <p><strong>Pain:</strong> ${log.painLevel}</p>
        <p><strong>Mobility:</strong> ${log.mobilityScore}</p>
        <p><strong>Notes:</strong> ${log.notes}</p>

        <div class="log-actions">
          <button class="btn" onclick="editLog('${log.id}', '${log.patientId}', '${log.date}', '${log.painLevel}', '${log.mobilityScore}', \`${escapeText(log.notes)}\`)">
            Edit
          </button>
          <button class="btn danger" onclick="deleteLog('${log.id}', '${log.patientId}')">
            Delete
          </button>
        </div>
      `;

      logsContainer.appendChild(div);
    });

  } catch (error) {
    logsContainer.innerHTML = "<p>Failed to load logs.</p>";
    console.error(error);
  }
}

/* =========================
   EDIT LOG
========================= */
function editLog(id, patientId, date, painLevel, mobilityScore, notes) {
  document.getElementById("logId").value = id;
  document.getElementById("recoveryPatientId").value = patientId;
  document.getElementById("date").value = date;
  document.getElementById("painLevel").value = painLevel;
  document.getElementById("mobilityScore").value = mobilityScore;
  document.getElementById("notes").value = notes;

  document.getElementById("formTitle").textContent = "Edit Recovery Log";
  document.getElementById("saveBtn").textContent = "Update Recovery Log";
  document.getElementById("cancelEditBtn").style.display = "inline-block";
}

/* =========================
   DELETE LOG
========================= */
async function deleteLog(id, patientId) {
  if (!confirm("Delete this log?")) return;

  try {
    const response = await fetch(`${API_BASE_URL}/recovery/${id}?patientId=${encodeURIComponent(patientId)}`, {
      method: "DELETE"
    });

    const result = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(result.error || "Delete failed");
    }

    alert("Deleted successfully");
    loadLogs();

  } catch (error) {
    alert(error.message);
    console.error(error);
  }
}

/* =========================
   RESET FORM
========================= */
function resetRecoveryForm() {
  const patientIdValue = document.getElementById("recoveryPatientId").value;

  document.getElementById("logId").value = "";
  document.getElementById("recoveryForm").reset();
  document.getElementById("recoveryPatientId").value = patientIdValue;

  document.getElementById("formTitle").textContent = "Add Recovery Log";
  document.getElementById("saveBtn").textContent = "Save Recovery Log";
  document.getElementById("cancelEditBtn").style.display = "none";
}

if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", resetRecoveryForm);
}

/* =========================
   LOAD ASSIGNED VIDEOS
========================= */
const loadVideosBtn = document.getElementById("loadVideosBtn");

if (loadVideosBtn) {
  loadVideosBtn.addEventListener("click", loadVideos);
}

async function loadVideos() {
  const patientId = document.getElementById("videoPatientId").value.trim();
  const videosContainer = document.getElementById("videosContainer");

  if (!patientId) {
    videosContainer.innerHTML = "<p>Please enter a patient ID.</p>";
    return;
  }

  videosContainer.innerHTML = "<p>Loading videos...</p>";

  try {
    const response = await fetch(`${API_BASE_URL}/videos?patientId=${encodeURIComponent(patientId)}`);
    const videos = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(videos.error || "Failed to load videos");
    }

    videosContainer.innerHTML = "";

    if (!videos.length) {
      videosContainer.innerHTML = "<p>No videos assigned to this patient.</p>";
      return;
    }

    videos.forEach(video => {
      const div = document.createElement("div");
      div.className = "log-item";

      div.innerHTML = `
        <p><strong>Exercise:</strong> ${video.exerciseTitle}</p>
        <p><strong>File:</strong> ${video.fileName}</p>

        <video controls width="100%">
          <source src="${video.videoUrl}" type="video/mp4">
          Your browser does not support the video tag.
        </video>

        <p><a href="${video.videoUrl}" target="_blank">Open video in new tab</a></p>
      `;

      videosContainer.appendChild(div);
    });

  } catch (error) {
    videosContainer.innerHTML = `<p>${error.message}</p>`;
    console.error(error);
  }
}

/* =========================
   TEXT ESCAPE
========================= */
function escapeText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
}