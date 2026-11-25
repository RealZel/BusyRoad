export const PREVIEWS = [
  { phase: "day", kind: "bugs", label: "BUGS", temperature: 24 },
  { phase: "dusk", kind: "leaves", label: "AUTUMN LEAVES", temperature: 12 },
  { phase: "day", kind: "dust", label: "DUST", temperature: 29 },
  { phase: "day", kind: "rain", label: "RAIN", temperature: 11 },
  { phase: "day", kind: "snow", label: "SNOW", temperature: -4 },
  { phase: "night", kind: "hail", label: "HAIL STORM", temperature: 6, storm: true },
  { phase: "night", kind: "clear", label: "CLEAR SKY", temperature: 15 },
  { phase: "day", kind: "cloud", label: "CLOUDY", temperature: 17 },
  { phase: "day", kind: "fog", label: "FOG", temperature: 8 },
  { phase: "day", kind: "rain", label: "DRIZZLE", temperature: 10, intensity: 0.55 },
  { phase: "day", kind: "rain", label: "DOWNPOUR", temperature: 13, intensity: 1.6 },
  { phase: "day", kind: "rain", label: "FREEZING RAIN", temperature: -1, freezing: true },
  { phase: "day", kind: "rain", label: "FREEZING DRIZZLE", temperature: -2, freezing: true, intensity: 0.55 },
  { phase: "day", kind: "rain", label: "THUNDERSTORM", temperature: 20, storm: true, intensity: 1.35 },
];

const CACHE_KEY = "busyroad-weather";
const MAX_CACHE_AGE = 3 * 60 * 60 * 1000;
const RAD = Math.PI / 180;

function locationKey(location) {
  return location.lat.toFixed(4) + "," + location.lon.toFixed(4);
}

function usable(data, now) {
  return data && Number.isFinite(data.observed) &&
    now - data.observed <= MAX_CACHE_AGE && data.observed - now <= 30 * 60 * 1000;
}

export function readWeatherCache(location, now) {
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (saved && saved.location === locationKey(location) && usable(saved.data, now)) {
      return saved.data;
    }
  } catch (error) {
    console.warn("Weather cache unavailable: " + error);
  }
  return null;
}

export async function fetchWeather(location) {
  const coords = locationKey(location).split(",");
  const response = await fetch(
    "https://api.open-meteo.com/v1/forecast?latitude=" + coords[0] +
    "&longitude=" + coords[1] + "&timezone=auto&timeformat=unixtime" +
    "&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&forecast_days=1"
  );
  if (!response.ok) throw new Error("Open-Meteo HTTP " + response.status);
  const body = await response.json();
  const current = body.current;
  if (!current || !Number.isFinite(current.time) || !Number.isFinite(current.weather_code) ||
      !Number.isFinite(current.temperature_2m)) {
    throw new Error("Open-Meteo returned incomplete current conditions");
  }
  const data = {
    observed: current.time * 1000,
    temperature: current.temperature_2m,
    code: current.weather_code,
    wind: current.wind_speed_10m || 0,
    humidity: current.relative_humidity_2m == null ? 75 : current.relative_humidity_2m,
    offset: body.utc_offset_seconds || 0,
  };
  if (!usable(data, Date.now())) throw new Error("Open-Meteo observation is stale");
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ location: locationKey(location), data }));
  } catch (error) {
    console.warn("Could not save weather: " + error);
  }
  return data;
}

function solarPhase(location, now) {
  // Approximate solar declination and the equation of time using the selected coordinates.
  const date = new Date(now);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const day = (now - yearStart) / 86400000;
  const angle = 2 * Math.PI * (day - 0.5) / 365.2422;
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(angle) - 0.032077 * Math.sin(angle)
    - 0.014615 * Math.cos(2 * angle) - 0.040849 * Math.sin(2 * angle));
  const dec = 0.006918 - 0.399912 * Math.cos(angle) + 0.070257 * Math.sin(angle)
    - 0.006758 * Math.cos(2 * angle) + 0.000907 * Math.sin(2 * angle)
    - 0.002697 * Math.cos(3 * angle) + 0.001480 * Math.sin(3 * angle);
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + eq + location.lon * 4;
  const hour = ((minutes % 1440 + 1440) % 1440 / 4 - 180) * RAD;
  const lat = location.lat * RAD;
  const elevation = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(hour);
  if (elevation < Math.sin(-5 * RAD)) return "night";
  if (elevation < Math.sin(5 * RAD)) return hour > 0 ? "dusk" : "dawn";
  return "day";
}

export function liveScene(location, weather, now) {
  const phase = solarPhase(location, now);
  if (!usable(weather, now)) return { phase, kind: "clear", label: "WEATHER UNAVAILABLE" };

  const { code, temperature, wind, humidity, offset } = weather;
  if (code === 96 || code === 99) return { phase, kind: "hail", label: "HAIL STORM", temperature, storm: true };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { phase, kind: "snow", label: "SNOW", temperature };
  }
  if (code === 95 || code === 97) {
    return { phase, kind: "rain", label: "THUNDERSTORM", temperature, storm: true, intensity: code === 97 ? 1.6 : 1.35 };
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    const drizzle = code <= 57;
    const freezing = code === 56 || code === 57 || code === 66 || code === 67;
    const downpour = code === 65 || code === 82;
    const label = drizzle ? "DRIZZLE" : downpour ? "DOWNPOUR" : "RAIN";
    return { phase, kind: "rain", label: freezing ? "FREEZING " + label : label, temperature,
      freezing, intensity: drizzle ? 0.55 : downpour ? 1.6 : 1 };
  }
  if (code === 45 || code === 48) return { phase, kind: "fog", label: "FOG", temperature };
  if (wind >= 24 && humidity <= 35) return { phase, kind: "dust", label: "DRY & WINDY", temperature };
  const month = new Date(now + offset * 1000).getUTCMonth();
  const autumn = location.lat >= 0 ? month >= 8 && month <= 10 : month >= 2 && month <= 4;
  if (autumn && wind >= 12 && temperature >= 4) {
    return { phase, kind: "leaves", label: "AUTUMN WIND", temperature };
  }
  if (temperature >= 16 && wind < 24 && phase !== "night") {
    return { phase, kind: "bugs", label: code >= 2 ? "CLOUDY" : "SUNNY", temperature, cloudy: code >= 2 };
  }
  return { phase, kind: code >= 2 ? "cloud" : "clear", label: code >= 2 ? "CLOUDY" : "CLEAR", temperature };
}
