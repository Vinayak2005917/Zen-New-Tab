const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const searchModeButtons = Array.from(document.querySelectorAll(".search-mode-option"));
const agentResponse = document.getElementById("agentResponse");
const agentBlur = document.getElementById("agentBlur");
const container = document.querySelector(".container");
let searchMode = "search";
const clockElement = document.getElementById("clock");
const clockHour = document.getElementById("clockHour");
const clockMinute = document.getElementById("clockMinute");
const clockPeriod = document.getElementById("clockPeriod");
const gmtTime = document.getElementById("gmtTime");
const texasTime = document.getElementById("texasTime");
const weatherTemperature = document.getElementById("weatherTemperature");
const weatherLocation = document.getElementById("weatherLocation");
const weatherIcon = document.getElementById("weatherIcon");
const weatherCondition = document.getElementById("weatherCondition");
const weatherFeels = document.getElementById("weatherFeels");
const weatherHumidity = document.getElementById("weatherHumidity");
const weatherWind = document.getElementById("weatherWind");
const weatherHigh = document.getElementById("weatherHigh");
const weatherLow = document.getElementById("weatherLow");
const weatherRain = document.getElementById("weatherRain");
const weatherElement = document.getElementById("weather");
const shortcutsElement = document.getElementById("shortcuts");
const shortcutDialog = document.getElementById("shortcutDialog");
const shortcutForm = document.getElementById("shortcutForm");
const shortcutNameInput = document.getElementById("shortcutName");
const shortcutUrlInput = document.getElementById("shortcutUrl");
const shortcutDialogTitle = document.getElementById("shortcutDialogTitle");
const shortcutDialogIcon = document.getElementById("shortcutDialogIcon");
shortcutDialogIcon.onerror = () => { shortcutDialogIcon.hidden = true; };
const storageKey = "zen-new-tab-shortcuts";
const defaultShortcuts = [];
const weatherLocationKey = "zen-new-tab-weather-location";
let shortcuts = loadShortcuts();
let editingIndex = null;
let openMenu = null;
let draggedItem = null;
let dragPlaceholder = null;
let activePointerId = null;
let dragStartX = 0;
let dragStartY = 0;
let dragStartLeft = 0;
let dragStartTop = 0;
let suppressShortcutClick = false;

function positionAgentBlur() {
  const containerRect = container.getBoundingClientRect();
  const searchRect = form.getBoundingClientRect();
  // Begin the blur behind the search field, then let it expand below the viewport.
  const top = Math.max(0, searchRect.top - containerRect.top - 2);
  agentBlur.style.left = `${searchRect.left - containerRect.left}px`;
  agentBlur.style.top = `${top}px`;
  agentBlur.style.width = `${searchRect.width}px`;
  agentBlur.style.height = `${Math.max(0, containerRect.height - top + window.innerHeight * 0.34)}px`;
}

window.addEventListener("resize", () => {
  if (container.classList.contains("has-agent-response")) positionAgentBlur();
});

function updateClock() {
  const now = new Date();
  clockElement.dateTime = now.toISOString();
  const timeParts = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).formatToParts(now);
  clockHour.textContent = timeParts.find((part) => part.type === "hour").value;
  clockMinute.textContent = timeParts.find((part) => part.type === "minute").value;
  clockPeriod.textContent = timeParts.find((part) => part.type === "dayPeriod").value.toUpperCase();

  const gmtParts = new Intl.DateTimeFormat(undefined, {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).formatToParts(now);
  gmtTime.textContent = `${gmtParts.find((part) => part.type === "hour").value}:${gmtParts.find((part) => part.type === "minute").value} ${gmtParts.find((part) => part.type === "dayPeriod").value.toUpperCase()}`;

  const texasParts = new Intl.DateTimeFormat(undefined, {
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).formatToParts(now);
  texasTime.textContent = `${texasParts.find((part) => part.type === "hour").value}:${texasParts.find((part) => part.type === "minute").value} ${texasParts.find((part) => part.type === "dayPeriod").value.toUpperCase()}`;
}

function setWeatherMessage(message, icon = "☁") {
  weatherTemperature.textContent = message;
  weatherIcon.textContent = icon;
  weatherCondition.textContent = "Weather status";
  weatherFeels.textContent = "--";
  weatherHumidity.textContent = "--";
  weatherWind.textContent = "--";
  weatherHigh.textContent = "--";
  weatherLow.textContent = "--";
  weatherRain.textContent = "--";
}

function showWeather(position) {
  const { latitude, longitude } = position.coords;
  weatherLocation.textContent = "Finding weather...";

  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`)
    .then((response) => {
      if (!response.ok) throw new Error("Weather unavailable");
      return response.json();
    })
    .then((data) => {
      const current = data.current;
      const temperatureUnit = data.current_units.temperature_2m;
      const windUnit = data.current_units.wind_speed_10m;
      const humidityUnit = data.current_units.relative_humidity_2m || "%";
      const high = data.daily.temperature_2m_max[0];
      const low = data.daily.temperature_2m_min[0];
      const rain = data.daily.precipitation_probability_max[0];
      const timezoneLocation = formatWeatherLocation(data.timezone);
      weatherTemperature.textContent = `${Math.round(current.temperature_2m)}${temperatureUnit}`;
      weatherIcon.textContent = weatherSymbol(current.weather_code);
      weatherCondition.textContent = weatherDescription(current.weather_code);
      weatherLocation.textContent = timezoneLocation || "Current location";
      weatherFeels.textContent = `${Math.round(current.apparent_temperature)}${temperatureUnit}`;
      weatherHumidity.textContent = `${Math.round(current.relative_humidity_2m)}${humidityUnit}`;
      weatherWind.textContent = `${Math.round(current.wind_speed_10m)} ${windUnit}`;
      weatherHigh.textContent = `${Math.round(high)}${temperatureUnit}`;
      weatherLow.textContent = `${Math.round(low)}${temperatureUnit}`;
      weatherRain.textContent = `${Math.round(rain)}%`;
      return resolveWeatherLocation(latitude, longitude).then((locationName) => {
        if (locationName) {
          saveWeatherLocation(latitude, longitude, locationName);
          weatherLocation.textContent = locationName;
        } else {
          saveWeatherLocation(latitude, longitude, timezoneLocation);
        }
      });
    })
    .catch(() => {
      setWeatherMessage("Weather unavailable", "⚠");
      weatherLocation.textContent = "Try again later";
    });
}

function formatWeatherLocation(timezone) {
  return typeof timezone === "string" ? "Current location" : "";
}

async function resolveWeatherLocation(latitude, longitude) {
  if (latitude >= 12.75 && latitude <= 13.20 && longitude >= 77.40 && longitude <= 77.80) {
    return "Bengaluru";
  }
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (!response.ok) throw new Error("Reverse geocoding unavailable");
    const data = await response.json();
    const city = data.city || data.locality || data.principalSubdivision;
    if (!city) return "";
    if (/^bengaluru$/i.test(city) || /^bangalore$/i.test(city)) return "Bengaluru";
    if (/^kolkata$/i.test(city) || /^calcutta$/i.test(city)) return "Kolkata";
    return city;
  } catch {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10&accept-language=en`
      );
      if (!response.ok) throw new Error("Reverse geocoding unavailable");
      const data = await response.json();
      const city = data.address?.city
        || data.address?.town
        || data.address?.village
        || data.address?.county
        || data.address?.state;
      if (!city) return "";
      if (/^bengaluru$/i.test(city) || /^bangalore$/i.test(city)) return "Bengaluru";
      if (/^kolkata$/i.test(city) || /^calcutta$/i.test(city)) return "Kolkata";
      return city;
    } catch {
      return "";
    }
  }
}

function saveWeatherLocation(latitude, longitude, name) {
  try {
    localStorage.setItem(weatherLocationKey, JSON.stringify({
      latitude,
      longitude,
      name
    }));
  } catch {
    // Weather still works, but this browser is not allowing saved state.
  }
}

function loadWeatherLocation() {
  try {
    const saved = JSON.parse(localStorage.getItem(weatherLocationKey));
    if (!saved || !Number.isFinite(saved.latitude) || !Number.isFinite(saved.longitude)) return null;
    return saved;
  } catch {
    return null;
  }
}

function weatherDescription(code) {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Storm";
  return "Conditions";
}

function weatherSymbol(code) {
  if (code === 0) return "☀";
  if ([1, 2, 3, 45, 48].includes(code)) return "☁";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄";
  if ([95, 96, 99].includes(code)) return "⛈";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧";
  return "☁";
}

function requestWeather(maximumAge = 30000) {
  weatherLocation.textContent = "Updating...";
  if (!navigator.geolocation) {
    requestIpWeather();
    return;
  }
  navigator.geolocation.getCurrentPosition(showWeather, () => {
    const savedWeatherLocation = loadWeatherLocation();
    if (savedWeatherLocation) {
      weatherLocation.textContent = savedWeatherLocation.name || "Saved location";
      showWeather({
        coords: {
          latitude: savedWeatherLocation.latitude,
          longitude: savedWeatherLocation.longitude
        }
      });
    } else {
      requestIpWeather();
    }
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge });
}

async function requestIpWeather() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    if (!response.ok) throw new Error("IP location unavailable");
    const data = await response.json();
    if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) {
      throw new Error("IP location unavailable");
    }
    showWeather({
      coords: {
        latitude: data.latitude,
        longitude: data.longitude
      }
    });
  } catch {
    setWeatherMessage("Location needed", "⚠");
    weatherLocation.textContent = "Allow location or open through HTTPS";
  }
}

function loadShortcuts() {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === null) return defaultShortcuts;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter(isValidShortcut) : defaultShortcuts;
  } catch {
    return defaultShortcuts;
  }
}

function isValidShortcut(shortcut) {
  if (!shortcut || typeof shortcut.name !== "string" || typeof shortcut.url !== "string") return false;
  try {
    return ["http:", "https:"].includes(new URL(shortcut.url).protocol);
  } catch {
    return false;
  }
}

function saveShortcuts() {
  localStorage.setItem(storageKey, JSON.stringify(shortcuts));
}

function renderShortcuts() {
  shortcutsElement.replaceChildren();

  shortcuts.forEach((shortcut, index) => {
    const item = document.createElement("div");
    item.className = "shortcut-item";
    item.dataset.shortcutIndex = index;
    item.shortcut = shortcut;

    const link = document.createElement("a");
    link.className = "shortcut";
    link.href = shortcut.url;
    link.title = shortcut.name;
    link.draggable = false;
    const favicon = document.createElement("img");
    favicon.src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(shortcut.url).hostname)}&sz=64`;
    favicon.alt = "";
    favicon.onerror = () => { favicon.style.visibility = "hidden"; };
    const label = document.createElement("span");
    label.textContent = shortcut.name;
    link.append(favicon, label);
    link.addEventListener("click", (event) => {
      if (!suppressShortcutClick) return;
      event.preventDefault();
      suppressShortcutClick = false;
    });
    item.append(link);

    const menuButton = document.createElement("button");
    menuButton.className = "shortcut-menu-button";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", `Options for ${shortcut.name}`);
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "⋮";
    item.append(menuButton);

    const menu = document.createElement("div");
    menu.className = "shortcut-menu";
    menu.hidden = true;
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => openShortcutDialog(Number(item.dataset.shortcutIndex)));
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-shortcut";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      shortcuts.splice(Number(item.dataset.shortcutIndex), 1);
      saveShortcuts();
      renderShortcuts();
    });
    menu.append(editButton, removeButton);
    item.append(menu);

    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      if (openMenu && openMenu !== menu) {
        closeOpenMenu();
      }
      menu.hidden = !menu.hidden;
      menuButton.setAttribute("aria-expanded", String(!menu.hidden));
      openMenu = menu.hidden ? null : menu;
    });
    item.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button")) return;
      draggedItem = item;
      activePointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      const rect = item.getBoundingClientRect();
      dragStartLeft = rect.left;
      dragStartTop = rect.top;
    });
    shortcutsElement.append(item);
  });

  const addButton = document.createElement("button");
  addButton.className = "add-shortcut";
  addButton.type = "button";
  addButton.setAttribute("aria-label", "Add");
  addButton.innerHTML = '<span class="add-shortcut-icon" aria-hidden="true">+</span><span>Add</span>';
  addButton.addEventListener("click", () => openShortcutDialog());
  shortcutsElement.append(addButton);
}

shortcutsElement.addEventListener("pointermove", (event) => {
  if (!draggedItem || activePointerId !== event.pointerId) return;
  const distance = Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY);
  if (!draggedItem.classList.contains("is-dragging") && distance > 5) {
    draggedItem.setPointerCapture(event.pointerId);
    const draggedRect = draggedItem.getBoundingClientRect();
    draggedItem.classList.add("is-dragging");
    dragPlaceholder = document.createElement("div");
    dragPlaceholder.className = "shortcut-placeholder";
    dragPlaceholder.style.width = `${draggedRect.width}px`;
    dragPlaceholder.style.height = `${draggedRect.height}px`;
    dragPlaceholder.style.flexBasis = `${draggedRect.width}px`;
    shortcutsElement.insertBefore(dragPlaceholder, draggedItem);
    draggedItem.style.left = `${dragStartLeft}px`;
    draggedItem.style.top = `${dragStartTop}px`;
    closeOpenMenu();
  }
  if (!draggedItem.classList.contains("is-dragging")) return;

  draggedItem.style.left = `${event.clientX - (dragStartX - dragStartLeft)}px`;
  draggedItem.style.top = `${event.clientY - (dragStartY - dragStartTop)}px`;

  const items = Array.from(shortcutsElement.querySelectorAll(".shortcut-item"))
    .filter((shortcutItem) => shortcutItem !== draggedItem);
  const shortcutsRect = shortcutsElement.getBoundingClientRect();
  const getLayoutRect = (shortcutItem) => ({
    left: shortcutsRect.left + shortcutItem.offsetLeft,
    top: shortcutsRect.top + shortcutItem.offsetTop,
    right: shortcutsRect.left + shortcutItem.offsetLeft + shortcutItem.offsetWidth,
    bottom: shortcutsRect.top + shortcutItem.offsetTop + shortcutItem.offsetHeight,
    width: shortcutItem.offsetWidth,
    height: shortcutItem.offsetHeight
  });
  const hoveredItem = items.find((shortcutItem) => {
    const rect = getLayoutRect(shortcutItem);
    return event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
  });
  if (!hoveredItem) return;

  const hoveredRect = getLayoutRect(hoveredItem);
  const insertAfter = event.clientX > hoveredRect.left + hoveredRect.width / 2;
  const anchor = insertAfter ? hoveredItem.nextSibling : hoveredItem;
  if (anchor === dragPlaceholder || dragPlaceholder.nextSibling === hoveredItem && !insertAfter
      || dragPlaceholder.previousSibling === hoveredItem && insertAfter) return;
  items.forEach((shortcutItem) => shortcutItem.getAnimations().forEach((animation) => animation.cancel()));
  const beforeRects = new Map(items.map((shortcutItem) => [shortcutItem, shortcutItem.getBoundingClientRect()]));
  shortcutsElement.insertBefore(dragPlaceholder, anchor);
  animateShortcutReorder(items, beforeRects);
});

shortcutsElement.addEventListener("pointerup", finishShortcutDrag);
shortcutsElement.addEventListener("pointercancel", finishShortcutDrag);

function animateShortcutReorder(items, beforeRects) {
  items.forEach((shortcutItem) => {
    const before = beforeRects.get(shortcutItem);
    const after = shortcutItem.getBoundingClientRect();
    const deltaX = before.left - after.left;
    const deltaY = before.top - after.top;
    if (!deltaX && !deltaY) return;
    shortcutItem.animate([
      { transform: `translate(${deltaX}px, ${deltaY}px)` },
      { transform: "translate(0, 0)" }
    ], { duration: 420, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
  });
}

function finishShortcutDrag(event) {
  if (!draggedItem || activePointerId !== event.pointerId) return;
  const item = draggedItem;
  activePointerId = null;
  if (item.classList.contains("is-dragging")) {
    suppressShortcutClick = true;
    const items = Array.from(shortcutsElement.querySelectorAll(".shortcut-item"))
      .filter((shortcutItem) => shortcutItem !== item);
    const beforeRects = new Map(items.map((shortcutItem) => [shortcutItem, shortcutItem.getBoundingClientRect()]));
    const draggedRect = item.getBoundingClientRect();
    shortcutsElement.insertBefore(item, dragPlaceholder);
    dragPlaceholder.remove();
    item.classList.remove("is-dragging");
    item.style.removeProperty("left");
    item.style.removeProperty("top");
    const destinationRect = item.getBoundingClientRect();
    item.animate([
      { transform: `translate(${draggedRect.left - destinationRect.left}px, ${draggedRect.top - destinationRect.top}px)` },
      { transform: "translate(0, 0)" }
    ], { duration: 420, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
    animateShortcutReorder(items, beforeRects);
    shortcuts = Array.from(shortcutsElement.querySelectorAll(".shortcut-item"), (shortcutItem, index) => {
      shortcutItem.dataset.shortcutIndex = index;
      return shortcutItem.shortcut;
    });
    saveShortcuts();
    dragPlaceholder = null;
    window.setTimeout(() => { suppressShortcutClick = false; }, 0);
  }
  draggedItem = null;
}

function closeOpenMenu() {
  if (!openMenu) return;
  openMenu.hidden = true;
  openMenu.previousElementSibling.setAttribute("aria-expanded", "false");
  openMenu = null;
}

function openShortcutDialog(index = null) {
  editingIndex = index;
  const shortcut = index === null ? { name: "", url: "" } : shortcuts[index];
  shortcutDialogTitle.textContent = index === null ? "Add" : "Edit shortcut";
  shortcutNameInput.value = shortcut.name;
  shortcutUrlInput.value = shortcut.url;
  updateShortcutDialogIcon(shortcut.url);
  closeOpenMenu();
  shortcutDialog.showModal();
  shortcutNameInput.focus();
}

function updateShortcutDialogIcon(url) {
  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      shortcutDialogIcon.hidden = true;
      return;
    }
    shortcutDialogIcon.src =
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsedUrl.hostname)}&sz=64`;
    shortcutDialogIcon.hidden = false;
  } catch {
    shortcutDialogIcon.hidden = true;
  }
}

searchModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    searchMode = button.dataset.mode;
    searchModeButtons.forEach((option) => {
      const active = option === button;
      option.classList.toggle("is-active", active);
      option.setAttribute("aria-pressed", String(active));
    });
    input.placeholder = searchMode === "agent" ? "Ask the agent..." : "Search...";
    agentResponse.hidden = true;
    container.classList.remove("has-agent-response");
    input.focus();
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  if (searchMode === "agent") {
    positionAgentBlur();
    agentResponse.hidden = false;
    container.classList.add("has-agent-response");
    agentResponse.textContent = "Thinking…";
    input.disabled = true;
    try {
      const response = await fetch(
        `http://localhost:8000/chat?message=${encodeURIComponent(query)}`
      );
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      const data = await response.json();
      agentResponse.textContent = data.response ?? "The agent returned no response.";
    } catch (error) {
      agentResponse.textContent = `Could not reach the agent. Make sure it is running at http://localhost:8000. ${error.message}`;
    } finally {
      input.disabled = false;
      input.focus();
    }
  } else {
    window.location.href =
      "https://www.google.com/search?q=" + encodeURIComponent(query);
  }
});

shortcutForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = shortcutNameInput.value.trim();
  const url = shortcutUrlInput.value.trim();
  if (!name || !isValidShortcut({ name, url })) {
    shortcutUrlInput.setCustomValidity("Enter a valid http or https website URL.");
    shortcutUrlInput.reportValidity();
    return;
  }
  shortcutUrlInput.setCustomValidity("");
  const shortcut = { name, url: new URL(url).href };
  if (editingIndex === null) shortcuts.push(shortcut);
  else shortcuts[editingIndex] = shortcut;
  saveShortcuts();
  renderShortcuts();
  shortcutDialog.close();
});

shortcutUrlInput.addEventListener("input", () => {
  shortcutUrlInput.setCustomValidity("");
  updateShortcutDialogIcon(shortcutUrlInput.value.trim());
});
document.getElementById("cancelShortcut").addEventListener("click", () => shortcutDialog.close());
document.addEventListener("click", () => {
  closeOpenMenu();
});
shortcutDialog.addEventListener("click", (event) => {
  if (event.target === shortcutDialog) shortcutDialog.close();
});
updateClock();
window.setInterval(updateClock, 1000);

const savedWeatherLocation = loadWeatherLocation();
if (savedWeatherLocation) {
  if (savedWeatherLocation.name) weatherLocation.textContent = savedWeatherLocation.name;
}
requestWeather();

weatherElement.addEventListener("click", () => requestWeather(0));
weatherElement.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    requestWeather(0);
  }
});

renderShortcuts();
