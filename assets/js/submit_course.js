document.addEventListener("DOMContentLoaded", () => {
  const holesContainer = document.getElementById("holesContainer");
  for (let i = 1; i <= 18; i++) {
    const holeDiv = document.createElement("div");
    holeDiv.classList.add("hole-group");
    holeDiv.innerHTML = `
      <strong>Hole ${i}</strong>
      <label>Coordinates (lat, lng):
        <input type="text" id="coords${i}" placeholder="e.g. 61.45181, 23.39079" />
      </label>
      <label>Par:
        <input type="number" id="par${i}" min="3" max="5" placeholder="e.g. 4" />
      </label>
    `;
    holesContainer.appendChild(holeDiv);
  }

  window.downloadJson = function () {
    const id = document.getElementById("courseId").value;
    const name = document.getElementById("courseName").value;
    const country = document.getElementById("country").value;
    const city = document.getElementById("city").value;

    if (!id || !name || !country || !city) {
      alert("Please fill in all course information.");
      return;
    }

    const courseSummary = {
      id,
      name,
      country,
      city,
    };
    const holes = {};

    for (let i = 1; i <= 18; i++) {
      const coordsRaw = document.getElementById(`coords${i}`).value;
      const par = parseInt(document.getElementById(`par${i}`).value);

      const parts = coordsRaw.split(",");
      const lat = parseFloat(parts[0]?.trim());
      const lng = parseFloat(parts[1]?.trim());

      if (parts.length === 2 && !isNaN(lat) && !isNaN(lng) && !isNaN(par)) {
        holes[i] = {
          pin: { lat, lng },
          par,
        };
      } else if (coordsRaw || par) {
        alert(`Please enter valid coordinates and par for hole ${i}.`);
        return;
      }
    }

    const fullCourseData = {
      id,
      holes,
    };

    const output = {
      "courses.json entry": courseSummary,
      [`${id}.json`]: fullCourseData,
    };

    const jsonText = JSON.stringify(output, null, 2);
    const blob = new Blob([jsonText], { type: "application/json" });
    const fileName = `${id}_submission.json`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  document.getElementById("infoBtn").addEventListener("click", () => {
    document.getElementById("infoModal").style.display = "block";
  });

  document.getElementById("closeModalBtn").addEventListener("click", () => {
    document.getElementById("infoModal").style.display = "none";
  });

  // Sulje modal jos klikataan sen ulkopuolelle
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("infoModal");
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });
});
