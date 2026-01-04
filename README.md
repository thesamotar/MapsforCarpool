# Maps for Carpool

A web application for optimizing carpool routes with multiple stops. Built with vanilla JavaScript and Google Maps API, this tool helps you find the most efficient route when picking up or dropping off multiple passengers.

## Features

- 🗺️ **Interactive Map Interface** - Visual route planning with Google Maps
- 📍 **Smart Location Search** - Google Places autocomplete for easy address input
- 🎯 **Route Optimization** - Automatically calculates the most efficient route order
- 🎨 **Color-Coded Route Segments** - Each leg of the journey displayed in a distinct color
- 🔢 **Numbered Markers** - Visual indicators showing the optimized stop sequence
- ➕ **Multiple Waypoints** - Support for up to 8 intermediate stops
- 📱 **Responsive Design** - Clean, modern UI that works on all devices
- 🌍 **Geolocation** - Automatically centers map on your current location

## How It Works

1. **Enter Start Location** - Type your starting address and select from autocomplete suggestions
2. **Add Intermediate Stops** - Click "+ Add Stop" to add passenger pickup/dropoff locations (up to 8)
3. **Enter End Location** - Type your final destination
4. **Optimize Route** - Click "Suggest Optimal Route" to calculate the best path
5. **View Results** - See numbered markers on the map and an ordered list of stops in the sidebar

The app uses Google's Directions API with waypoint optimization to minimize travel time and distance.

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Build Tool**: Vite
- **APIs**: 
  - Google Maps JavaScript API
  - Google Places API
  - Google Directions API
- **Markers**: Google Maps Advanced Marker Element with Pin Element

## Setup & Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/thesamotar/MapsforCarpool.git
   cd MapsforCarpool
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your Google Maps API key:
   ```
   VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## Building for Production

```bash
npm run build
```


## Project Structure

```
MapsforCarpool/
├── app.js           # Main application logic
├── index.html       # HTML structure
├── style.css        # Styling
├── package.json     # Dependencies and scripts
├── .env            # Environment variables (API key)
└── README.md       # This file
```

## API Requirements

This application requires a Google Maps API key with the following APIs enabled:
- Maps JavaScript API
- Places API
- Directions API

Get your API key at: https://console.cloud.google.com/

## Version History

### Version 1.5.0 - January 4, 2026 (Commit: 6971479)
**Added distance and duration display for route segments**
- 📏 Added distance information for each route segment
  - Displays distance in appropriate units (km/mi)
  - Example: "📍 3.2 km"
- ⏱️ Added duration/travel time for each segment
  - Shows estimated travel time based on current traffic
  - Example: "⏱️ 8 mins"
- 🎨 Enhanced route list layout
  - Two-line layout for each segment
  - Top line: colored line + route segment
  - Bottom line: distance and time info (indented)
  - Route text now bold for better readability
- 📊 Data sourced from Google Directions API
  - Accurate distance and time calculations
  - Takes into account traffic conditions and road types

### Version 1.4.0 - January 4, 2026 (Commit: a9d8c48)
**Fixed place name display and redesigned route list UI**
- 🏷️ Fixed place name display to show actual names instead of geocoded addresses
  - Now uses `displayName` instead of `formattedAddress` from Google Places API
  - Correctly displays "Loyola School" instead of "Q7G3+CFC, Telco Colony"
  - Preserves user-entered place names throughout the route optimization
- 🎨 Redesigned route list to "Place A → Place B" format
  - Changed from individual stop listing to segment-based display
  - Shows journey segments: "School → Park → Museum"
  - Clearer visualization of the route progression
- 📏 Replaced colored dots with colored horizontal lines
  - 30px × 4px colored lines with rounded corners
  - Better visual correlation with route segments on map
  - More modern and compact design
- ✂️ Added intelligent address shortening
  - `shortenAddress()` function handles both place names and street addresses
  - Keeps place names under 35 characters for readability
  - Preserves key information (street number, city) for addresses
  - Full names shown on hover tooltips
- 🔄 Enhanced route data handling
  - Pass original place names through `routeData` object
  - Build `orderedNames` array respecting waypoint optimization
  - Maintain name-to-location mapping throughout optimization

### Version 1.3.0 - January 4, 2026 (Commit: 90606fc)
**Added color-coded route segments and visual indicators**
- 🎨 Implemented custom colored polylines for each route segment
  - Each leg of the journey displays in a distinct, vibrant color
  - 10 high-contrast colors optimized for map visibility
  - Colors: Crimson Red, Dodger Blue, Dark Orange, Medium Purple, Light Sea Green, Deep Pink, Royal Blue, Lime Green, Orange Red, Dark Magenta
- 🔄 Suppressed default DirectionsRenderer polylines for custom rendering
- 🎯 Updated route list with colored circle indicators
  - Colored dots in sidebar match route segment colors on map
  - Replaced serial numbers with visual color-coding
  - Final destination highlighted with red indicator and bold text
- 📚 Imported Google Maps geometry library for polyline decoding
- 🧹 Added clearPolylines() function to manage route updates
- ✨ Enhanced visual correlation between map and route list

### Version 1.2.0 - January 3, 2026 (Commit: 694cde1)
**Added numbered markers and updated branding**
- ✨ Added custom numbered markers for route stops
  - Blue markers (#4285F4) for intermediate stops
  - Red marker (#EA4335) for final destination
  - Markers display stop sequence (1, 2, 3, etc.)
- 🏷️ Updated app name from "Route Optimizer" to "Maps for Carpool"
- 🔘 Changed button text to "Suggest Optimal Route"
- 💡 Implemented AdvancedMarkerElement with PinElement for modern marker styling
- 🧹 Added clearMarkers() function to remove old markers before displaying new route
- 📍 Markers include tooltips showing stop number and full address

### Version 1.1.0 - January 3, 2026 (Commit: d7b9a3f)
**Fixed autocomplete event handling for Google Maps API updates**
- 🐛 Fixed critical bug where start and end locations weren't being captured
- 🔄 Updated event name from deprecated `gmp-placeselect` to `gmp-select`
- 🔧 Changed event handling to use `event.placePrediction.toPlace()` instead of `event.place`
- 📝 Added comprehensive error handling and logging for debugging
- ✅ Fixed location capture for start, end, and waypoint inputs
- 🔍 Added detailed console logging to track place selection events

### Version 1.0.0 - January 1, 2026 (Commit: 2ff33c3)
**Initial Release**
- 🎉 Initial implementation of Maps for Carpool
- 🗺️ Google Maps integration with interactive map display
- 📍 Google Places autocomplete for address input
- 🛣️ Route optimization using Google Directions API
- ➕ Dynamic waypoint addition (up to 8 intermediate stops)
- 📋 Sidebar display of optimized route order
- 🌍 Geolocation support to center map on user's location
- 🎨 Clean, modern UI with responsive design
- ⚙️ Environment variable support for API key management


## License
This project is open source and available under the MIT License.

## Author
- GitHub: [@thesamotar](https://github.com/thesamotar)

## Acknowledgments

- Google Maps Platform for providing the mapping and routing APIs
- Vite for the fast development build tool

---
