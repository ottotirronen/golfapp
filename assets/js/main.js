let currentHole = 1;
let selectedCourseId = null;
let holePins = {};
let totalHoles = 18;
let allCourses = [];

const selector = document.getElementById("courseSelector");
const courseList = document.getElementById("courseList");

// Hae kentät ja täytä dropdown
fetch("/courses/courses.json")
  .then((res) => res.json())
  .then((courses) => {
    allCourses = courses;

    courseList.innerHTML = "";
    courses.forEach((course) => {
      const li = document.createElement("li");
      li.textContent = course.name;
      li.dataset.id = course.id;
      courseList.appendChild(li);
    });

    const savedCourseId = localStorage.getItem("selectedCourseId");
    if (savedCourseId) {
      const course = courses.find((c) => c.id === savedCourseId);
      if (course) {
        selectedCourseId = savedCourseId;
        selector.textContent = course.name;
        loadCourseData(savedCourseId);
      }
    }
  });

// Näytä/palauta dropdown
selector.addEventListener("click", () => {
  courseList.classList.toggle("hidden");
});

// Valinta dropdownista
courseList.addEventListener("click", (e) => {
  if (e.target.tagName === "LI") {
    const courseId = e.target.dataset.id;
    selectedCourseId = courseId;
    selector.textContent = e.target.textContent;
    localStorage.setItem("selectedCourseId", courseId);
    loadCourseData(courseId);
    courseList.classList.add("hidden");
  }
});

// Sulje dropdown, jos klikataan sen ulkopuolelle
document.addEventListener("click", (e) => {
  if (!selector.contains(e.target) && !courseList.contains(e.target)) {
    courseList.classList.add("hidden");
  }
});

function loadCourseData(courseId) {
  const course = allCourses.find((c) => c.id === courseId);
  if (course) {
    selector.textContent = course.name;
  }

  fetch(`/courses/${courseId}.json`)
    .then((res) => res.json())
    .then((data) => {
      holePins = data.holes || {};
      totalHoles = Object.keys(holePins).length || 18;

      currentHole = 1;
      localStorage.setItem("currentHole", currentHole);
      updateHoleDisplay();
    });
}

function updateHoleDisplay() {
  localStorage.setItem("currentHole", currentHole);
  const holeData = holePins[String(currentHole)];
  document.getElementById("holeNumber").textContent = holeData
    ? `Väylä ${currentHole}`
    : "Väylä -";
  document.getElementById("holePar").textContent = `Par ${
    holeData?.par || "-"
  }`;
  showDistanceStatus("-");
}

// Näytetään tila-/virheteksti ison numeron paikalla
function showDistanceStatus(text) {
  document.getElementById("distanceStatus").textContent = text;
  document.getElementById("distanceStatus").classList.remove("hidden");
  document.getElementById("distanceTriplet").classList.add("hidden");
}

// Näytetään etu/keski/taka-etäisyydet
function showDistanceValues(front, center, back) {
  document.getElementById("distanceStatus").classList.add("hidden");
  document.getElementById("distanceTriplet").classList.remove("hidden");
  document.getElementById("distanceFront").textContent = `${front} m`;
  document.getElementById("distanceCenter").textContent = `${center} m`;
  document.getElementById("distanceBack").textContent = `${back} m`;
}

document.getElementById("prevHole").addEventListener("click", () => {
  currentHole = currentHole > 1 ? currentHole - 1 : totalHoles;
  updateHoleDisplay();
});

document.getElementById("nextHole").addEventListener("click", () => {
  currentHole = currentHole < totalHoles ? currentHole + 1 : 1;
  updateHoleDisplay();
});

document.getElementById("calculateBtn").addEventListener("click", () => {
  const btn = document.getElementById("calculateBtn");
  btn.disabled = true;
  document.getElementById("spinner").style.display = "inline-block";

  manualLocationUpdate().finally(() => {
    btn.disabled = false;
    document.getElementById("spinner").style.display = "none";
  });
});

// Sijainti haku painikkeen logiikka
async function manualLocationUpdate() {
  if (!selectedCourseId) {
    showDistanceStatus("Valitse ensin kenttä.");
    return;
  }

  if (!holePins[String(currentHole)]) {
    showDistanceStatus("Lippua ei löytynyt...");
    return;
  }

  document.getElementById("spinner").style.display = "inline-block";
  document.getElementById("distanceDisplay").style.display = "none";

  return new Promise((resolve) => {
    getAccuratePosition((position) => {
      updateDistanceFromPosition(position);
      document.getElementById("spinner").style.display = "none";
      document.getElementById("distanceDisplay").style.display = "";
      resolve();
    });
  });
}

function updateDistanceFromPosition(position) {
  const userLat = position.coords.latitude;
  const userLng = position.coords.longitude;

  const holeData = holePins[String(currentHole)];

  if (!holeData || !holeData.pin) {
    showDistanceStatus("Väylän lippua ei löytynyt.");
    return;
  }

  const { front, center, back } = holeData.pin;

  if (
    !isValidCoord(front) ||
    !isValidCoord(center) ||
    !isValidCoord(back)
  ) {
    showDistanceStatus("Koordinaatteja ei löytynyt.");
    return;
  }

  const frontDistance = calculateDistance(
    userLat,
    userLng,
    parseFloat(front.lat),
    parseFloat(front.lng),
  );
  const centerDistance = calculateDistance(
    userLat,
    userLng,
    parseFloat(center.lat),
    parseFloat(center.lng),
  );
  const backDistance = calculateDistance(
    userLat,
    userLng,
    parseFloat(back.lat),
    parseFloat(back.lng),
  );

  showDistanceValues(frontDistance, centerDistance, backDistance);
}

function isValidCoord(point) {
  return (
    point && !isNaN(parseFloat(point.lat)) && !isNaN(parseFloat(point.lng))
  );
}

// Lasketaan väylän koordinaattien ja käyttäjän välinen sijainti
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Haetaan käyttäjän sijainti käyttäen geolocationia
function getAccuratePosition(callback, maxWait = 5000, desiredAccuracy = 10) {
  let watchId = null;
  let bestPosition = null;
  let bestAccuracy = Infinity;
  let locationEventCount = 0;
  let finished = false;

  const finish = (position, errorMessage) => {
    if (finished) return;
    finished = true;
    navigator.geolocation.clearWatch(watchId);

    const btn = document.getElementById("calculateBtn");

    if (position) {
      callback(position);
    } else {
      document.getElementById("spinner").style.display = "none";
      document.getElementById("distanceDisplay").style.display = "";
      showDistanceStatus(errorMessage || "Sijaintia ei löydy.");
    }

    if (btn) btn.disabled = false;
  };

  const success = (position) => {
    const accuracy = position.coords.accuracy || 999;
    locationEventCount++;

    // Hylätään ensimmäinen sijainti
    if (locationEventCount === 1) {
      console.log("First location ignored to avoid cache.");
      return;
    }

    // Tallenna paras sijainti tähän asti
    if (!bestPosition || accuracy < bestAccuracy) {
      bestPosition = position;
      bestAccuracy = accuracy;
    }

    // Jos tarkkuus on riittävä, lopeta heti
    if (accuracy <= desiredAccuracy) {
      console.log(
        `Accepted position at accuracy ${accuracy}m after ${locationEventCount} updates`,
      );
      finish(position);
    }
  };

  const error = (err) => {
    console.warn("Location error received:", err);
    if (err.code === err.PERMISSION_DENIED) {
      finish(null, "Salli sijainti selaimen asetuksista.");
    }
  };

  watchId = navigator.geolocation.watchPosition(success, error, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: maxWait,
  });

  setTimeout(() => {
    if (!finished) {
      console.log("Timeout reached. Returning best available position.");
      finish(bestPosition);
    }
  }, maxWait + 500);
}
