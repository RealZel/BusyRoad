const WIDTH = 72;
const HEIGHT = 16;
const HORIZON = 7;
const ROAD_DEPTH = HEIGHT - 1 - HORIZON;
const WIPER_X = 35;
const WIPER_Y = HEIGHT - 1;
const WIPE_MS = 1280;
const pixels = new Array(HEIGHT).fill(null).map(() => new Array(WIDTH));
const SYMBOLS = "0123456789abcdefghijklmnopqrstuv";
const [
  SKY, LOW_SKY, HAZE, FAR_PEAK, RIDGE, RIDGE_LIGHT, GROUND, GROUND_DARK,
  ROAD, ROAD_LIGHT, EDGE, STRIPE, SUN, CLOUD, PINE, PINE_LIGHT,
  CAR, TAIL, POST, LAMP, GLOW, BEAM, GLASS,
  DROP, SNOW, LEAF, BUG, DUST, WIPER, WIPER_EDGE, BOLT_GLOW, BOLT,
] = SYMBOLS;

const PALETTES = {
  day: "366cb6 4e99ca 8dc8d9 677fa7 425d83 91b0c7 396c59 2b524a 2b344e 404e68 85bdb0 ffe6a1 ffe794 c2e2e2 183c42 4b8668 26304a ff6f55 445d74 fff1c5 f7bf77 66696f 91bac8",
  warm: "3a4677 954f83 f88c7c 66517a 483d70 d7859a 4f4059 392f4e 252538 373449 aa7b82 ffcd94 ffe097 fac0a4 302841 756080 2b203b ff655d 806375 fff0b3 ffab5f 66534d 916f86",
  wet: "2a3a59 415775 648499 475c78 344662 748a9c 3a555e 293f4b 192c40 2c4058 6f90a0 d2d8c1 f9e6bf 819baa 1d394a 456477 20283c ff746b 647787 fff3c4 b9a27b 4c5569 557e99",
  snow: "435b96 7397be bbd5e8 8098bc 5e7ca5 d5e7ed 879fbc 5c779c 384962 536480 b6d0dc fde8b8 fff2ce dcebf2 36526c 98b5c9 27374e ff7e67 67839d fff3c4 ccb49b 6d7882 8aa7c9",
  dust: "876d88 be9178 e9bb89 915f72 744b66 d19c86 a7775b 7d584e 483b4c 65515a dda77c ffe3a4 fff0ad fce0ac 61404b 956b69 30263b ff7464 7d5964 fff1b3 f8bf89 8a6f60 aa7e71",
  night: "101832 19284c 2d4367 233759 192b4a 385476 182f43 142739 142238 1f3149 3b5c75 f6d796 e7eddd 4b6380 122539 243d55 151c34 ff6557 536478 fff0ae f2a869 596274 3f5d7b",
};
const WEATHER_COLORS = "a7cede eefbff d8754a 462943 d6aa82 151a2b 86a4bc a8bdff f4f8ff";
const FLASH_WHITE = [226, 232, 255];

function xpmHeader(colors) {
  return "! XPM2\n" + WIDTH + " " + HEIGHT + " " + colors.length + " 1\n" +
    colors.map((color, index) => SYMBOLS[index] + " c #" + color).join("\n") + "\n";
}

function litPalette(colors, strength) {
  return colors.map((color, index) => {
    if (index >= SYMBOLS.indexOf(WIPER)) return color;
    return FLASH_WHITE.map((light, channel) => {
      const base = parseInt(color.slice(channel * 2, channel * 2 + 2), 16);
      return Math.round(base + Math.max(0, light - base) * strength).toString(16).padStart(2, "0");
    }).join("");
  });
}

const headers = {};
for (const palette in PALETTES) {
  const colors = (PALETTES[palette] + " " + WEATHER_COLORS).split(" ");
  headers[palette] = [xpmHeader(colors), xpmHeader(litPalette(colors, 0.15)), xpmHeader(litPalette(colors, 0.42))];
}

function dot(x, y, color) {
  if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) pixels[y][x] = color;
}

function span(x1, x2, y, color) {
  if (y >= 0 && y < HEIGHT && x2 >= 0 && x1 < WIDTH) {
    pixels[y].fill(color, Math.max(0, x1), Math.min(WIDTH, x2 + 1));
  }
}

function line(x1, y1, x2, y2, color) {
  const dx = Math.abs(x2 - x1);
  const dy = -Math.abs(y2 - y1);
  const sx = x1 < x2 ? 1 : -1;
  const sy = y1 < y2 ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    dot(x1, y1, color);
    if (x1 === x2 && y1 === y2) break;
    const next = 2 * error;
    if (next >= dy) {
      error += dy;
      x1 += sx;
    }
    if (next <= dx) {
      error += dx;
      y1 += sy;
    }
  }
}

const STARS = [[7, 1], [13, 3], [23, 0], [27, 2], [35, 1], [47, 0], [63, 2], [68, 1]];
const FAR_MOUNTAINS = [5, 4, 4, 2, 1, 3, 4, 5, 4, 5, 6, 7, 7, 6, 5, 3, 2, 2, 4, 5, 3, 4, 5, 6, 5];
const NEAR_MOUNTAINS = [4, 3, 3, 5, 6, 6, 5, 4, 4, 5, 6, 7, 7, 7, 7, 7, 6, 6, 5, 4, 5, 5, 4, 4, 6];

function landscape(scene, time, bend, wet) {
  const { phase, kind } = scene;
  const night = phase === "night";
  const warm = phase === "dusk" || phase === "dawn";
  const cloudy = kind === "cloud" || scene.cloudy;
  for (let y = 0; y < HEIGHT; y++) {
    pixels[y].fill(y < 3 ? SKY : y < 6 ? LOW_SKY : y < 8 ? HAZE : y % 2 ? GROUND : GROUND_DARK);
  }

  if (night) {
    if (!wet && !cloudy) {
      for (const [x, y] of STARS) dot(x, y, RIDGE_LIGHT);
    }
  } else if (!wet && !cloudy) {
    const x = phase === "dawn" ? 17 : 53;
    const y = warm ? 3 : 1;
    span(x - 2, x + 2, y, SUN);
    span(x - 3, x + 3, y + 1, SUN);
    span(x - 2, x + 2, y + 2, SUN);
  }

  if (wet || cloudy || !night) {
    const shift = Math.floor(time / 1400);
    const clouds = wet || cloudy ? 5 : 2;
    for (let i = 0; i < clouds; i++) {
      const x = (i * 19 + 15 + shift) % 88 - 8;
      const y = i % 2;
      span(x, x + 7 + i % 3, y + 1, CLOUD);
      span(x + 2, x + 7, y, CLOUD);
    }
  }

  for (let x = 0; x < WIDTH; x++) {
    const far = FAR_MOUNTAINS[Math.floor((x + 3 + Math.floor(bend / 2)) / 3 + 25) % 25];
    const near = NEAR_MOUNTAINS[Math.floor((x + 4 - Math.floor(bend)) / 3 + 25) % 25];
    for (let y = far; y < HORIZON + 1; y++) {
      pixels[y][x] = y === far && far < 4 && !night ? RIDGE_LIGHT : FAR_PEAK;
    }
    for (let y = near; y <= HORIZON; y++) pixels[y][x] = RIDGE;
  }
  if (kind === "fog") {
    const drift = Math.round(Math.sin(time / 2500) * 8);
    span(0, 41 + drift, HORIZON - 2, HAZE);
    span(25 + drift, WIDTH - 1, HORIZON - 1, HAZE);
    span(0, WIDTH - 1, HORIZON, CLOUD);
    span(0, WIDTH - 1, HORIZON + 1, HAZE);
  }
}

function roadCenter(depth, bend) {
  return Math.round(35 + bend * (1 - depth) * (1 - depth));
}

function pavement(time, bend, night, wet) {
  for (let y = HORIZON; y < HEIGHT; y++) {
    const distance = y - HORIZON;
    const depth = distance / ROAD_DEPTH;
    const center = roadCenter(depth, bend);
    const half = 1 + Math.round(24 * depth * depth + 7 * depth);
    const shoulder = distance > 4 ? 2 : 1;
    span(center - half - shoulder, center + half + shoulder, y, distance % 2 ? PINE_LIGHT : GROUND);
    span(center - half, center + half, y, ROAD);
    dot(center - half, y, EDGE);
    dot(center + half, y, EDGE);
    if (night && distance >= 2) {
      const beam = Math.round(half * (0.58 + depth / 3));
      span(center - beam, center + beam, y, distance % 3 === 0 ? ROAD_LIGHT : BEAM);
    } else if (wet && distance >= 2) {
      span(center - half + 3, center - Math.round(half / 2), y, ROAD_LIGHT);
      span(center + Math.round(half / 2), center + half - 3, y, ROAD_LIGHT);
    }
    if (distance > 0 && ((3 / depth + time / 170) % 5) < 2.8) {
      span(center, center + (distance > 4 ? 1 : 0), y, STRIPE);
    }
  }
}

function roadside(time, bend, night, snowy) {
  // Each approaching object follows the same perspective as the road markings.
  const travel = (time / 1900) % 1;
  for (let index = 2; index >= 0; index--) {
    const z = (index + travel) / 3;
    const depth = z * z;
    const y = HORIZON + Math.round(depth * ROAD_DEPTH);
    const center = roadCenter(depth, bend);
    const offset = Math.round(5 + (27 * depth + 9) * depth + 7 * depth);
    if (night) {
      const h = 1 + Math.round(depth * 5);
      for (const direction of [-1, 1]) {
        const x = center + direction * (offset - (direction < 0 ? 2 : 0));
        const lightX = x - direction;
        line(x, y - h, x, y, POST);
        dot(x, y - h, LAMP);
        dot(lightX, y - h, LAMP);
        if (h > 2) {
          dot(lightX - direction, y - h, GLOW);
          dot(lightX, y - h + 1, GLOW);
          if (y < 14) dot(x - direction * 5, y + 1, GLOW);
        }
      }
    } else {
      const x = center - offset - 4;
      const top = y - 2 - Math.round(depth * 4);
      dot(x, top, PINE);
      for (let row = top + 1; row < y; row++) {
        const half = Math.min(3, 1 + Math.floor((row - top - 1) / 2));
        span(x - half, x + half, row, PINE);
        dot(x - half, row, snowy ? DROP : PINE_LIGHT);
      }
      dot(x, y, PINE);
      const marker = center + offset - 2;
      dot(marker, y, POST);
      dot(marker, y - 1, y >= 10 ? TAIL : POST);
    }
  }
  const carX = roadCenter(0.25, bend) + 3;
  span(carX, carX + 3, 9, CAR);
  dot(carX, 9, TAIL);
  dot(carX + 3, 9, TAIL);
}

function airborne(scene, time) {
  const kind = scene.kind;
  const rain = kind === "rain";
  const snow = kind === "snow";
  const hail = kind === "hail";
  if (!rain && !snow && !hail && kind !== "leaves" && kind !== "dust") return;
  const count = rain ? Math.round(23 * (scene.intensity || 1)) : snow ? 16 : hail ? 18 : 7;
  const tick = time / (snow ? 175 : rain || hail ? 51 : 121);
  for (let i = 0; i < count; i++) {
    const y = Math.floor((tick * (1 + i % 4 / 6) + i * 6.3) % HEIGHT);
    const shift = Math.floor(tick * (snow ? 0.6 : 1.4) + y);
    const x = (i * 29 + (i * i % 23) + shift) % WIDTH;
    if (rain) {
      dot(x, y, GLASS);
      if (i % 3 === 0) dot(x + 1, y + 1, scene.freezing ? SNOW : DROP);
    } else if (snow || hail) {
      dot(x, y, i % 3 === 0 ? SNOW : DROP);
      if (hail && i % 3 === 0) dot(x - 1, y - 1, SNOW);
    } else {
      dot(x, y, kind === "dust" ? DUST : LEAF);
    }
  }
}

export const glass = [];
const CAPACITY = { rain: 43, snow: 40, hail: 36, leaves: 24, dust: 37, bugs: 23 };
const SPAWN_MS = { rain: 180, snow: 220, hail: 190, leaves: 510, dust: 300, bugs: 740 };
let nextDebris = 0;
let wipeMotion = null;

function splat(kind, now) {
  glass.push({
    x: 2 + Math.floor(Math.random() * 68),
    y: 1 + Math.floor(Math.random() * 13),
    variation: Math.floor(Math.random() * 4),
    born: now,
    kind,
  });
}

function debrisCount(kind) {
  let count = 0;
  for (const hit of glass) {
    if (hit.kind === kind) count++;
  }
  return count;
}

export function resetGlass(kind, now, keepSnow = false) {
  if (keepSnow) {
    for (let i = glass.length - 1; i >= 0; i--) {
      if (glass[i].kind !== "snow") glass.splice(i, 1);
    }
  } else {
    glass.length = 0;
  }
  const limit = CAPACITY[kind] || 0;
  const initial = Math.min(Math.round(limit / 4), limit - debrisCount(kind));
  for (let i = 0; i < initial; i++) splat(kind, now);
  nextDebris = now + 600;
}

export function wipe() {
  if (wipeMotion) return false;
  wipeMotion = { startedAt: null, progress: 0 };
  return true;
}

function wipeAngle(progress) {
  const travel = 1 - Math.abs(2 * progress - 1);
  return -Math.PI * travel * travel * (3 - 2 * travel);
}

function sweep(from, to) {
  const low = Math.min(from, to) - 0.04;
  const high = Math.max(from, to) + 0.04;
  for (let i = glass.length - 1; i >= 0; i--) {
    const hit = glass[i];
    const angle = Math.atan2(hit.y - WIPER_Y, hit.x - WIPER_X);
    if (angle >= low && angle <= high) glass.splice(i, 1);
  }
}

function updateGlass(kind, now) {
  for (let i = glass.length - 1; i >= 0; i--) {
    const hit = glass[i];
    if (hit.kind === "rain" && now - hit.born > 18000) glass.splice(i, 1);
  }
  if (CAPACITY[kind] && !wipeMotion && now >= nextDebris) {
    if (debrisCount(kind) < CAPACITY[kind]) splat(kind, now);
    nextDebris = now + SPAWN_MS[kind];
  }

  if (!wipeMotion) return null;
  // Start at the parked pose on the first frame and show both endpoints even if a draw is late.
  if (wipeMotion.startedAt === null) wipeMotion.startedAt = now;
  const previous = wipeMotion.progress;
  const target = (now - wipeMotion.startedAt) / WIPE_MS;
  const endpoint = previous < 0.5 ? 0.5 : 1;
  const progress = Math.max(previous, Math.min(target, endpoint, previous + 0.125));
  const angle = wipeAngle(progress);
  sweep(wipeAngle(previous), angle);
  wipeMotion.progress = progress;
  if (progress === 1) {
    wipeMotion = null;
    nextDebris = Math.max(nextDebris, now + 350);
  }
  return angle;
}

function drawGlass(freezing) {
  for (const { x, y, kind, variation } of glass) {
    switch (kind) {
      case "rain":
        dot(x, y, freezing ? SNOW : DROP);
        if (variation > 0) dot(x + 1, y + 1, GLASS);
        break;
      case "snow":
        dot(x, y - 1, DROP);
        dot(x - 1, y, DROP);
        dot(x + 1, y, DROP);
        if (variation > 0) dot(x, y + 1, DROP);
        dot(x, y, SNOW);
        break;
      case "hail":
        dot(x, y, SNOW);
        dot(x + 1, y, DROP);
        if (variation > 1) dot(x, y - 1, SNOW);
        break;
      case "leaves":
        dot(x, y, GLOW);
        dot(x + 1, y, LEAF);
        dot(x + variation % 2, y + 1, LEAF);
        break;
      case "bugs":
        dot(x, y, BUG);
        dot(x - 1, y - 1, DUST);
        if (variation > 0) dot(x + 1, y + 1, BUG);
        break;
      case "dust":
        dot(x, y, DUST);
        if (variation > 0) dot(x + 1, y - 1, DUST);
        break;
    }
  }
}

const LIGHTNING_DELAY_MS = 900;
const LIGHTNING_PERIOD_MS = 7600;
const LIGHTNING_PATHS = [
  [[0, 0], [-4, 3], [0, 3], [-5, 7]],
  [[-2, 5], [3, 5], [5, 7]],
];

function lightningAt(stormStartedAt, now) {
  if (stormStartedAt == null) return null;
  const age = now - stormStartedAt - LIGHTNING_DELAY_MS;
  if (age < 0) return null;
  const pulse = age % LIGHTNING_PERIOD_MS;
  if (pulse >= 370) return null;
  return { level: pulse < 190 ? 2 : 1, strike: Math.floor(age / LIGHTNING_PERIOD_MS) };
}

function drawLightning(strike) {
  const x = 11 + (31 + strike * 23) % 51;
  for (const [offset, color] of [[1, BOLT_GLOW], [0, BOLT]]) {
    for (const path of LIGHTNING_PATHS) {
      for (let index = 1; index < path.length; index++) {
        const [x1, y1] = path[index - 1];
        const [x2, y2] = path[index];
        line(x + offset + x1, y1, x + offset + x2, y2, color);
      }
    }
  }
}

export function renderRoad(scene, time, now) {
  const { phase, kind } = scene;
  const night = phase === "night";
  const wet = kind === "rain" || kind === "hail" || kind === "snow" || kind === "fog";
  let palette = "day";
  if (night) palette = "night";
  else if (kind === "snow") palette = "snow";
  else if (wet) palette = "wet";
  else if (kind === "dust") palette = "dust";
  else if (phase !== "day") palette = "warm";

  const lightning = lightningAt(scene.stormStartedAt, now);
  const bend = Math.sin(time / 4600) * 6 + Math.sin(time / 10300) * 3;
  landscape(scene, time, bend, wet);
  if (lightning && lightning.level === 2) drawLightning(lightning.strike);
  pavement(time, bend, night, wet);
  roadside(time, bend, night, kind === "snow");
  airborne(scene, time);
  const angle = updateGlass(kind, now);
  drawGlass(scene.freezing);
  if (angle !== null) {
    const x = WIPER_X + Math.round(40 * Math.cos(angle));
    const y = WIPER_Y + Math.round(40 * Math.sin(angle));
    line(WIPER_X, WIPER_Y, x, y, WIPER);
    line(WIPER_X, WIPER_Y - 1, x - 1, y - 1, WIPER_EDGE);
  }
  return headers[palette][lightning ? lightning.level : 0] + pixels.map((row) => row.join("")).join("\n");
}
