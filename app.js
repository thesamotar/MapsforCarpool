const YOUR_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Global state
let map;
let directionsService;
let directionsRenderer;
let maxWaypoints = 8;
let waypointCount = 0;

// Store selected places with their GPS coordinates
const routePoints = {
    start: null,
    end: null,
    waypoints: new Map()
};

// Make initApp globally accessible for the Maps API callback
window.initApp = initApp;

/**
 * Main initialization function
 */
async function initApp() {
    console.log("Initializing application...");
    await initializeMap();
    await setupAutocompleteInputs();
    setupEventListeners();
}

/**
 * Function 1: Initialize the map and default it based on user's current GPS location
 */
async function initializeMap() {
    // Load required Google Maps libraries
    const { Map } = await google.maps.importLibrary("maps");
    const { DirectionsService, DirectionsRenderer } = await google.maps.importLibrary("routes");

    // Default location (fallback if geolocation fails)
    const defaultLocation = { lat: 37.7749, lng: -122.4194 };

    // Initialize map
    map = new Map(document.getElementById("map"), {
        zoom: 12,
        center: defaultLocation,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        mapId: 'DEMO_MAP_ID'
    });

    // Initialize directions service and renderer
    directionsService = new DirectionsService();
    directionsRenderer = new DirectionsRenderer();
    directionsRenderer.setMap(map);

    // Try to get user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map.setCenter(userLocation);
                console.log("Map centered on user location:", userLocation);
            },
            (error) => {
                console.warn("Geolocation failed:", error.message);
                console.log("Using default location");
            }
        );
    } else {
        console.warn("Geolocation not supported by browser");
    }
}

/**
 * Set up autocomplete inputs for start, end, and waypoints
 */
async function setupAutocompleteInputs() {
    const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");

    // Setup Start input
    const startContainer = document.getElementById('start-container');
    startContainer.innerHTML = '';
    const startAutocomplete = new PlaceAutocompleteElement();
    startAutocomplete.id = "start-input";
    startAutocomplete.placeholder = "Enter start location";
    startContainer.appendChild(startAutocomplete);

    startAutocomplete.addEventListener("gmp-select", async (event) => {
        console.log("Start place select event triggered:", event);
        try {
            if (!event.placePrediction) {
                console.error("No placePrediction in event");
                return;
            }

            console.log("Converting placePrediction to place...");
            const place = await event.placePrediction.toPlace();

            console.log("Fetching place fields...");
            await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });

            console.log("Place data:", {
                location: place.location,
                formattedAddress: place.formattedAddress,
                displayName: place.displayName
            });

            if (place.location) {
                routePoints.start = {
                    location: place.location,
                    address: place.formattedAddress || place.displayName
                };
                console.log("✓ Start location captured:", routePoints.start);
            } else {
                console.error("Place has no location data");
            }
        } catch (error) {
            console.error("Error in start place select:", error);
        }
    });

    startAutocomplete.addEventListener("input", () => {
        routePoints.start = null;
    });

    // Setup End input
    const endContainer = document.getElementById('end-container');
    endContainer.innerHTML = '';
    const endAutocomplete = new PlaceAutocompleteElement();
    endAutocomplete.id = "end-input";
    endAutocomplete.placeholder = "Enter destination";
    endContainer.appendChild(endAutocomplete);

    endAutocomplete.addEventListener("gmp-select", async (event) => {
        console.log("End place select event triggered:", event);
        try {
            if (!event.placePrediction) {
                console.error("No placePrediction in event");
                return;
            }

            console.log("Converting placePrediction to place...");
            const place = await event.placePrediction.toPlace();

            console.log("Fetching place fields...");
            await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });

            console.log("Place data:", {
                location: place.location,
                formattedAddress: place.formattedAddress,
                displayName: place.displayName
            });

            if (place.location) {
                routePoints.end = {
                    location: place.location,
                    address: place.formattedAddress || place.displayName
                };
                console.log("✓ End location captured:", routePoints.end);
            } else {
                console.error("Place has no location data");
            }
        } catch (error) {
            console.error("Error in end place select:", error);
        }
    });

    endAutocomplete.addEventListener("input", () => {
        routePoints.end = null;
    });
}

/**
 * Setup event listeners for buttons
 */
function setupEventListeners() {
    const addWaypointBtn = document.getElementById('add-waypoint');
    const optimizeBtn = document.getElementById('optimize-btn');

    addWaypointBtn.addEventListener('click', addWaypoint);
    optimizeBtn.addEventListener('click', optimizeAndDisplayRoute);
}

/**
 * Add a new waypoint input
 */
async function addWaypoint() {
    if (waypointCount >= maxWaypoints) {
        alert("Maximum 8 intermediate stops allowed.");
        return;
    }

    const waypointsContainer = document.getElementById('waypoints-container');
    const id = `waypoint-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'waypoint-input';
    div.dataset.waypointId = id;

    const pac = new google.maps.places.PlaceAutocompleteElement();
    pac.dataset.uid = id;
    pac.placeholder = "Enter stop";

    pac.addEventListener("gmp-select", async (event) => {
        console.log(`Waypoint ${id} select event triggered:`, event);
        try {
            if (!event.placePrediction) {
                console.error("No placePrediction in event");
                return;
            }

            console.log("Converting placePrediction to place...");
            const place = await event.placePrediction.toPlace();

            console.log("Fetching place fields...");
            await place.fetchFields({ fields: ["location", "formattedAddress", "displayName"] });

            console.log("Place data:", {
                location: place.location,
                formattedAddress: place.formattedAddress,
                displayName: place.displayName
            });

            if (place.location) {
                routePoints.waypoints.set(id, {
                    location: place.location,
                    address: place.formattedAddress || place.displayName
                });
                console.log(`✓ Waypoint ${id} captured:`, routePoints.waypoints.get(id));
            } else {
                console.error("Place has no location data");
            }
        } catch (error) {
            console.error(`Error in waypoint ${id} place select:`, error);
        }
    });

    pac.addEventListener("input", () => {
        routePoints.waypoints.delete(id);
    });

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => {
        waypointsContainer.removeChild(div);
        routePoints.waypoints.delete(id);
        waypointCount--;
    };

    div.appendChild(pac);
    div.appendChild(removeBtn);
    waypointsContainer.appendChild(div);
    waypointCount++;
}

/**
 * Function 2: Get input locations and convert them to GPS coordinates
 * This function is called within optimizeAndDisplayRoute to ensure fresh data
 */
function handleInputs() {
    console.log("Gathering route inputs...");
    console.log("Current routePoints state:", {
        start: routePoints.start,
        end: routePoints.end,
        waypoints: Array.from(routePoints.waypoints.entries())
    });

    // Validate start location
    if (!routePoints.start || !routePoints.start.location) {
        console.error("Start location validation failed:", routePoints.start);
        alert("Please select a valid start location from the autocomplete suggestions.");
        return null;
    }

    // Validate end location
    if (!routePoints.end || !routePoints.end.location) {
        console.error("End location validation failed:", routePoints.end);
        alert("Please select a valid end location from the autocomplete suggestions.");
        return null;
    }

    // Gather waypoints
    const waypoints = [];
    routePoints.waypoints.forEach((point, id) => {
        if (point && point.location) {
            waypoints.push({
                location: point.location,
                stopover: true
            });
        }
    });

    console.log("Route data gathered:", {
        origin: routePoints.start,
        destination: routePoints.end,
        waypoints: waypoints
    });

    return {
        origin: routePoints.start.location,
        destination: routePoints.end.location,
        waypoints: waypoints
    };
}

/**
 * Function 3: Find optimal route with optimizeWaypoints enabled and plot it on the map
 */
async function optimizeAndDisplayRoute() {
    console.log("Optimizing route...");

    // Call handleInputs to get current GPS coordinates
    const routeData = handleInputs();

    if (!routeData) {
        return; // handleInputs already showed an error message
    }

    // Request directions with waypoint optimization
    directionsService.route(
        {
            origin: routeData.origin,
            destination: routeData.destination,
            waypoints: routeData.waypoints,
            optimizeWaypoints: true,
            travelMode: google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
            if (status === "OK") {
                // Display the route on the map
                directionsRenderer.setDirections(response);

                // Display the optimized order in the sidebar
                displayOptimizedOrder(response);

                console.log("Route optimized successfully");
            } else {
                console.error("Directions request failed:", status);
                alert(`Failed to calculate route: ${status}`);
            }
        }
    );
}

/**
 * Display the optimized route order in the sidebar
 */
function displayOptimizedOrder(response) {
    const route = response.routes[0];
    const orderList = document.getElementById('route-list');
    const outputPanel = document.getElementById('output-panel');

    orderList.innerHTML = '';
    outputPanel.classList.remove('hidden');

    const legs = route.legs;

    // Display each leg of the journey
    legs.forEach((leg, index) => {
        const li = document.createElement('li');
        li.textContent = `${index + 1}. ${leg.start_address}`;
        orderList.appendChild(li);

        // Add the final destination after the last leg
        if (index === legs.length - 1) {
            const lastLi = document.createElement('li');
            lastLi.textContent = `${index + 2}. ${leg.end_address}`;
            orderList.appendChild(lastLi);
        }
    });

    // If waypoints were optimized, log the new order
    if (route.waypoint_order && route.waypoint_order.length > 0) {
        console.log("Optimized waypoint order:", route.waypoint_order);
    }
}

/**
 * Bootstrap: Load Google Maps API
 */
(function () {
    // Check if script is already loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        if (window.google && window.google.maps) {
            initApp();
        }
        return;
    }

    // Load the Google Maps API script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${YOUR_API_KEY}&callback=initApp&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
        console.error("Failed to load Google Maps API script.");
        alert("Failed to load Google Maps. Please check your API key and internet connection.");
    };
    document.head.appendChild(script);
})();