# BusyRoad

**English** · [Русский](README.ru.md)

A first-person pixel-art drive for BUSY Bar that follows the weather in your city. Rain, snowflakes, and leaves build up on the windshield. Press **Start** to sweep them away.

![Autumn road at sunset, captured in BUSY Bar Emulator](screenshots/cover.png)

Built for the [BUSY JS Apps Contest hackathon](https://busy.app/pages/js-apps-contest).

## How it works

The **72 × 16 front display** shows the road, lane markings, and passing scenery. The **160 × 80 rear display** shows the city, temperature, time of day, and how much debris has collected on the windshield.

BusyRoad fetches current weather for your city's coordinates about every 10 minutes. It calculates dawn, dusk, and night from the sun's position. Headlights and streetlights illuminate the road at night. During a thunderstorm, lightning briefly lights up the sky, road, and shoulder. [Weather data from Open-Meteo](https://open-meteo.com/en/docs).

Rain, snow, and debris move through the scene. Droplets, flakes, leaves, dust, and bug splats accumulate on the glass until the wiper passes over them. In **LIVE** mode, stuck snowflakes stay on the windshield even after the snowfall ends.

## Modes and controls

- **LIVE** follows the weather and time of day in your selected city. If the connection drops, BusyRoad can show the last saved weather data for up to three hours.
- **DEMO** lets you browse 14 scenes and switch each one between day and night. The autumn scene opens at sunset.

| Control | Action |
| --- | --- |
| **Start / Pause** | Run the windshield wiper. |
| **Turn the wheel** | Select a demo scene. |
| **Hold OK** | Switch between day and night in demo mode. |
| **Press OK** | Return to live weather. |
| **Back** | Exit the app. |

## Scene gallery

All 28 frames were captured in the official BUSY Bar Emulator.

| Scene | Day | Night |
| --- | :---: | :---: |
| **Clear sky**<br>An open horizon with stars over the road at night. | ![Clear sky by day](screenshots/scenes/clear-day.png) | ![Clear sky at night](screenshots/scenes/clear-night.png) |
| **Cloudy**<br>Clouds pass over the mountains and hide the sun. | ![Cloudy by day](screenshots/scenes/cloudy-day.png) | ![Cloudy at night](screenshots/scenes/cloudy-night.png) |
| **Fog**<br>Bands of mist obscure the horizon. | ![Fog by day](screenshots/scenes/fog-day.png) | ![Fog at night](screenshots/scenes/fog-night.png) |
| **Drizzle**<br>Small, scattered droplets settle on the glass. | ![Drizzle by day](screenshots/scenes/drizzle-day.png) | ![Drizzle at night](screenshots/scenes/drizzle-night.png) |
| **Rain**<br>Drops streak past the windshield and the road starts to glisten. | ![Rain by day](screenshots/scenes/rain-day.png) | ![Rain at night](screenshots/scenes/rain-night.png) |
| **Downpour**<br>A curtain of heavy rain over wet asphalt. | ![Downpour by day](screenshots/scenes/downpour-day.png) | ![Downpour at night](screenshots/scenes/downpour-night.png) |
| **Freezing drizzle**<br>Sparse, bright specks of icy precipitation. | ![Freezing drizzle by day](screenshots/scenes/freezing-drizzle-day.png) | ![Freezing drizzle at night](screenshots/scenes/freezing-drizzle-night.png) |
| **Freezing rain**<br>Bright droplets collect on the windshield as rain falls. | ![Freezing rain by day](screenshots/scenes/freezing-rain-day.png) | ![Freezing rain at night](screenshots/scenes/freezing-rain-night.png) |
| **Snow**<br>Flakes fly toward the car and stick to the windshield. | ![Snow by day](screenshots/scenes/snow-day.png) | ![Snow at night](screenshots/scenes/snow-night.png) |
| **Thunderstorm**<br>A lightning bolt briefly illuminates the wet road. | ![Thunderstorm by day](screenshots/scenes/thunderstorm-day.png) | ![Thunderstorm at night](screenshots/scenes/thunderstorm-night.png) |
| **Hailstorm**<br>Hail hits the windshield as lightning flashes overhead. | ![Hailstorm by day](screenshots/scenes/hail-day.png) | ![Hailstorm at night](screenshots/scenes/hail-night.png) |
| **Autumn leaves**<br>Wind carries leaves across the road, and some stick to the glass. | ![Autumn leaves by day](screenshots/scenes/leaves-day.png) | ![Autumn leaves at night](screenshots/scenes/leaves-night.png) |
| **Dust**<br>A dry wind lifts dust from the roadside. | ![Dust by day](screenshots/scenes/dust-day.png) | ![Dust at night](screenshots/scenes/dust-night.png) |
| **Bug splats**<br>Insects leave marks that build up on the windshield. | ![Bug splats by day](screenshots/scenes/bugs-day.png) | ![Bug splats at night](screenshots/scenes/bugs-night.png) |

## Settings

Open **Apps → BusyRoad** on your BUSY Bar's local web page. Save your changes and restart BusyRoad. [Open the emulator settings](http://127.0.0.1:8640/).

| Setting | Options |
| --- | --- |
| **City and country** | Search for your city and choose the matching country. The default is San Francisco, US. |
| **Temperature units** | **Celsius** (°C, default) or **Fahrenheit** (°F) on the rear display. |
| **Wiper interval** | **Manual** (default), or every **5, 10, 20, 30, or 60 seconds**. Pressing **Start** runs the wiper and restarts the interval. |

The local web interface uses BUSY's city search. BusyRoad sends the selected coordinates to Open-Meteo to fetch the weather. [Privacy notice](PRIVACY.md).

## Build and run

Use Node.js **22.12 or later** and start the [official BUSY Bar Emulator](https://github.com/busy-app/busybar-emulator).

```sh
npm ci
npm run build
npm run app:install -- --addr 127.0.0.1:8640
npm run app:run -- --addr 127.0.0.1:8640
```

The build produces `dist/app.busyroad.drive.tgz`. You can also upload this package through your BUSY Bar's web interface. In the browser-based emulator, both displays and all controls are on the [emulator page](http://127.0.0.1:8640/emulator).
