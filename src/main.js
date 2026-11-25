import manifest from "./appmeta/manifest.json";
import schema from "./appmeta/settings.json";
import { glass, renderRoad, resetGlass, wipe } from "./road.js";
import { PREVIEWS, fetchWeather, liveScene, readWeatherCache } from "./weather.js";

const API = "http://localhost/api/";
const FRAME_MS = 80;
const REFRESH_MS = 10 * 60 * 1000;
const RETRY_MS = 60 * 1000;
const DEFAULT_LOCATION = schema.fields.location.default;
const WIPER_SETTINGS = schema.fields.wiper_interval;
const started = Date.now();

let location = DEFAULT_LOCATION;
let fahrenheit = false;
let wiperInterval = 0;
let nextWipeAt = Infinity;
let weather = null;
let weatherStatus = "SYNC";
let preview = 0;
let previewPhase = null;
let scene = liveScene(location, null, started);
let nextSceneUpdate = 0;
let nextWeatherRequest = Infinity;
let drawing = false;
let stopped = false;
let dashboardKey = "";
let drawError = "";

const INK = "#FFFFFFFF";
const MUTE = "#AAAAAAFF";
const DIM = "#444444FF";

function text(id, value, x, y, font, color, width, align = "top_left") {
  const element = { id, type: "text", display: "back", align, x, y, font, color, text: value, z_index: 2 };
  if (width) element.width = width;
  return element;
}

function block(id, x, y, width, height, color) {
  return { id, type: "rectangle", display: "back", align: "top_left", x, y, width, height,
    fill: "solid", fill_colors: [color], border_width: 0, z_index: 1 };
}

const CYRILLIC = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
const ROMAN = "a b v g d e yo zh z i y k l m n o p r s t u f kh ts ch sh shch _ y _ e yu ya".split(" ");
const ACCENTS = { a: /[áàâäãåāăą]/g, c: /[çćč]/g, e: /[éèêëēęě]/g, i: /[íìîïīı]/g,
  l: /ł/g, n: /[ñńň]/g, o: /[óòôöõøōő]/g, s: /[śšş]/g, u: /[úùûüūůű]/g, z: /[źžż]/g };

function displayName(name) {
  const parts = name.split(",");
  if (parts.length > 2) name = parts[0] + "," + parts[parts.length - 1];
  let ascii = name.toLowerCase().replace(/[а-яё]/g, (letter) => ROMAN[CYRILLIC.indexOf(letter)]);
  for (const letter in ACCENTS) ascii = ascii.replace(ACCENTS[letter], letter);
  const printable = ascii.replace(/[_\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e]/g, "").replace(/^[\s,.-]+/, "").trim();
  return printable ? printable.toUpperCase() : "SELECTED CITY";
}

function temperatureText(celsius) {
  if (celsius == null) return "--";
  return fahrenheit ? Math.round(celsius * 9 / 5 + 32) + "F" : Math.round(celsius) + "C";
}

function dashboard(state, count) {
  const status = preview ? "DEMO " + preview + "/" + PREVIEWS.length :
    weatherStatus === "FRESH" ? (state.temperature == null ? "OFFLINE" : "LIVE") :
    weatherStatus === "CACHE" && state.temperature != null ? "CACHED" : weatherStatus === "SYNC" ? "SYNC" : "OFFLINE";
  const name = preview ? state.label : displayName(location.name);
  const condition = preview ? "WHEEL  WEATHER" : state.temperature == null ? "OPEN-METEO" : state.label;
  const light = state.phase === "night" ? "NIGHT" : state.phase === "day" ? "DAY" : state.phase.toUpperCase();
  const reading = temperatureText(state.temperature);
  const dirty = Math.min(8, Math.ceil(count / 4));
  const key = [status, name, condition, light, reading, dirty].join("|");
  if (key === dashboardKey) return null;
  return {
    key,
    elements: [
      block("back-top", 0, 0, 148, 14, "#222222FF"),
      text("title", "BUSYROAD", 5, 3, "small", INK),
      text("status", status, 142, 3, "tiny", INK, 0, "top_right"),
      { ...text("place", name, 5, 18, "normal", INK, 102), scroll_rate: 900, scroll_start_delay: 1200 },
      text("condition", condition, 5, 34, "tiny", MUTE, 103),
      text("temp", reading, 142, 18, "normal", INK, 0, "top_right"),
      text("light", light, 142, 34, "tiny", MUTE, 0, "top_right"),
      block("divider", 5, 46, 137, 1, DIM),
      text("glass", "GLASS", 5, 53, "tiny", MUTE),
      ...Array.from({ length: 8 }, (_, index) =>
        block("glass-" + index, 44 + index * 12, 53, 11, 6, index < dirty ? INK : DIM)),
      block("back-bottom", 0, 64, 148, 16, "#222222FF"),
      text("help", preview ? "START  WIPE    OK  LIVE" : "START  WIPE", 5, 65, "tiny", INK),
      text("help-light", preview ? "HOLD OK  DAY / NIGHT" : "WHEEL  DEMO", 5, 73, "tiny", INK),
    ],
  };
}

function updateScene(now, keepSnow = !preview) {
  const preset = PREVIEWS[preview - 1];
  const next = preset ? { ...preset, phase: previewPhase || preset.phase } : liveScene(location, weather, now);
  if (next.storm) {
    next.stormStartedAt = scene.storm && scene.kind === next.kind ? scene.stormStartedAt : now;
  }
  if (next.kind !== scene.kind) resetGlass(next.kind, now, keepSnow);
  scene = next;
}

function triggerWipe(now) {
  if (wipe() && wiperInterval > 0) nextWipeAt = now + wiperInterval;
}

async function refreshWeather() {
  nextWeatherRequest = Infinity;
  try {
    weather = await fetchWeather(location);
    weatherStatus = "FRESH";
    nextWeatherRequest = Date.now() + REFRESH_MS;
    console.log("Weather updated for " + location.name + " (WMO " + weather.code + ")");
  } catch (error) {
    weatherStatus = weather ? "CACHE" : "OFFLINE";
    nextWeatherRequest = Date.now() + RETRY_MS;
    console.warn("Weather update failed: " + error);
  }
  nextSceneUpdate = 0;
}

async function tick() {
  if (drawing || stopped) return;
  const now = Date.now();
  if (now >= nextWeatherRequest) void refreshWeather();
  if (now >= nextSceneUpdate) {
    updateScene(now);
    nextSceneUpdate = now + 1000;
  }
  if (now >= nextWipeAt) triggerWipe(now);

  drawing = true;
  try {
    const element = {
      id: "windshield", type: "xpmbitmap", display: "front", align: "top_left", x: 0, y: 0,
      data: renderRoad(scene, Math.max(0, now - started), now),
    };
    const rear = dashboard(scene, glass.length);
    const response = await fetch(API + "display/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        application_name: manifest.id,
        priority: 50,
        elements: rear ? [element, ...rear.elements] : [element],
      }),
    });
    if (!response.ok) throw new Error("display HTTP " + response.status + ": " + await response.text());
    if (rear) dashboardKey = rear.key;
    drawError = "";
  } catch (error) {
    if (String(error) !== drawError) console.error(error);
    drawError = String(error);
  } finally {
    drawing = false;
  }
}

const timer = setInterval(tick, FRAME_MS);
const unbind = listen("input", (event) => {
  const now = Date.now();
  if (event.key === "encoder") {
    const count = PREVIEWS.length + 1;
    preview = (preview + event.delta + count) % count;
    if (!preview) previewPhase = null;
    updateScene(now, false);
  } else if (event.key === "start" && event.action === "press") {
    triggerWipe(now);
  } else if (event.key === "ok" && event.action === "short") {
    preview = 0;
    previewPhase = null;
    updateScene(now, false);
  } else if (event.key === "ok" && event.action === "long" && preview) {
    previewPhase = scene.phase === "night" ? "day" : "night";
    updateScene(now);
  } else if (event.key === "back" && event.action === "short") {
    stopped = true;
    clearInterval(timer);
    setTimeout(unbind, 0);
  }
});

async function loadSettings() {
  const response = await fetch(API + "apps/settings?app_id=" + manifest.id);
  if (!response.ok) throw new Error("settings HTTP " + response.status);
  const { values = {} } = await response.json();
  const place = values.location;
  if (place && Number.isFinite(place.lat) && Number.isFinite(place.lon)) {
    location = { name: place.name || "Selected city", lat: place.lat, lon: place.lon };
  }
  fahrenheit = values.units === "fahrenheit";
  const interval = WIPER_SETTINGS.options.find((option) => option.value === values.wiper_interval);
  wiperInterval = Number(interval ? interval.value : WIPER_SETTINGS.default) * 1000;
}

async function boot() {
  try {
    await loadSettings();
  } catch (error) {
    console.warn("Using default settings: " + error);
  }
  if (stopped) return;
  const now = Date.now();
  if (wiperInterval > 0) nextWipeAt = now + wiperInterval;
  weather = readWeatherCache(location, now);
  if (weather) weatherStatus = "CACHE";
  updateScene(now);
  nextWeatherRequest = now;
}

void boot();
void tick();
