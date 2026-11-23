# iPhone Widgets

Home screen widgets for iPhone, written in JavaScript for the [Scriptable](https://scriptable.app) app. No Mac or Xcode needed.

## Widgets

| File | Size | What it shows |
| --- | --- | --- |
| `widgets/greeting-widget.js` | Small | Time-of-day greeting and today's date |
| `widgets/weather-calendar-widget.js` | Large | Current weather, high/low, big date, next calendar events, month grid, 6-day forecast |
| `widgets/illustrated-weather-widget.js` | Large | Your own picture, big weekday, weather sentence with humidity and wind, city, 4-day forecast |
| `widgets/year-progress-widget.js` | Medium | One dot per day of the year: past days black, today red, plus days left |
| `widgets/dot-clock-widget.js` | Small | Weekday, red dot-matrix time, month and day |
| `widgets/day-progress-widget.js` | Medium | Date, live time, 24 hour bars filled up to now, and % of the day passed |
| `widgets/photo-widget.js` | Medium | Photos from a Files folder (iCloud Drive → Scriptable → photo-widget), switching about every 15 minutes |

Weather comes from [Open-Meteo](https://open-meteo.com) (free, no API key) using your phone's location.

## Setup

1. Install **Scriptable** from the App Store.
2. In Scriptable, tap **+**, paste the code from one of the files, rename the script and tap **Done**.
3. Tap ▶️ once and allow Location (and Calendar for the weather-calendar widget).
4. Settings → Privacy & Security → Location Services → Scriptable → **While Using the App or Widgets**.
5. Long-press the home screen → **Edit** → add a Scriptable widget of the right size.
6. Long-press the widget → **Edit Widget** → choose the script.

For the illustrated widget, run the script in Scriptable and pick **Choose picture** to set the image.

## Notes

- iOS decides when widgets refresh, usually every 15+ minutes.
- If location or network is slow, the widgets fall back to the last saved weather.
