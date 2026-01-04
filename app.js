const YOUR_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Global state
let map;
let directionsService;
let directionsRenderer;
let maxWaypoints = 8;
let waypointCount = 0;
let markers = []; // Store custom markers for numbered route points
let polylines = []; // Store colored polylines for route segments

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
    await google.maps.importLibrary("geometry"); // For polyline decoding

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
    directionsRenderer = new DirectionsRenderer({
        suppressMarkers: true, // We'll add custom numbered markers
        suppressPolylines: true // We'll add custom colored polylines
    });
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
                    address: place.displayName || place.formattedAddress
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
                    address: place.displayName || place.formattedAddress
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
                    address: place.displayName || place.formattedAddress
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

    // Gather waypoints with their original names
    const waypoints = [];
    const waypointNames = [];
    routePoints.waypoints.forEach((point, id) => {
        if (point && point.location) {
            waypoints.push({
                location: point.location,
                stopover: true
            });
            waypointNames.push(point.address);
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
        waypoints: waypoints,
        // Store original names for display
        originName: routePoints.start.address,
        destinationName: routePoints.end.address,
        waypointNames: waypointNames
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

                // Display the optimized order in the sidebar with original names
                displayOptimizedOrder(response, routeData);

                console.log("Route optimized successfully");
            } else {
                console.error("Directions request failed:", status);
                alert(`Failed to calculate route: ${status}`);
            }
        }
    );
}

/**
 * Clear all existing markers from the map
 */
function clearMarkers() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

/**
 * Clear all existing polylines from the map
 */
function clearPolylines() {
    polylines.forEach(polyline => polyline.setMap(null));
    polylines = [];
}

/**
 * Create colored polylines for each route segment
 */
function createColoredPolylines(route) {
    // Array of distinct, darker colors for better visibility on maps
    const colors = [
        '#DC143C', // Crimson Red
        '#1E90FF', // Dodger Blue
        '#FF8C00', // Dark Orange
        '#9370DB', // Medium Purple
        '#20B2AA', // Light Sea Green
        '#FF1493', // Deep Pink
        '#4169E1', // Royal Blue
        '#32CD32', // Lime Green
        '#FF4500', // Orange Red
        '#8B008B'  // Dark Magenta
    ];

    const legs = route.legs;

    // Create a polyline for each leg with a different color
    legs.forEach((leg, index) => {
        const path = leg.steps.flatMap(step =>
            google.maps.geometry.encoding.decodePath(step.polyline.points)
        );

        const polyline = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: colors[index % colors.length],
            strokeOpacity: 0.8,
            strokeWeight: 5,
            map: map
        });

        polylines.push(polyline);
    });
}

/**
 * Create numbered markers for the route
 */
async function createNumberedMarkers(route) {
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
    const legs = route.legs;

    // Add marker for each stop
    legs.forEach((leg, index) => {
        // Create a pin with a number
        const pinElement = new PinElement({
            glyph: `${index + 1}`,
            glyphColor: "white",
            background: "#4285F4",
            borderColor: "#1a73e8",
            scale: 1.2
        });

        // Create marker at the start of this leg
        const marker = new AdvancedMarkerElement({
            map: map,
            position: leg.start_location,
            content: pinElement.element,
            title: `Stop ${index + 1}: ${leg.start_address}`
        });

        markers.push(marker);

        // Add the final destination marker after the last leg
        if (index === legs.length - 1) {
            const finalPinElement = new PinElement({
                glyph: `${index + 2}`,
                glyphColor: "white",
                background: "#EA4335",
                borderColor: "#c5221f",
                scale: 1.2
            });

            const finalMarker = new AdvancedMarkerElement({
                map: map,
                position: leg.end_location,
                content: finalPinElement.element,
                title: `Stop ${index + 2}: ${leg.end_address}`
            });

            markers.push(finalMarker);
        }
    });
}


/**
 * Shorten address to key identifying parts
 * Handles both place names (schools, museums, etc.) and street addresses
 */
function shortenAddress(fullAddress) {
    if (!fullAddress) return '';

    // Split address by commas
    const parts = fullAddress.split(',').map(part => part.trim());

    if (parts.length === 0) return fullAddress;

    const firstPart = parts[0];
    const secondPart = parts[1] || '';

    // Check if first part looks like a place name (not starting with a number)
    // Place names: "Central Park", "Google Headquarters", "St. Mary's Church"
    // Street addresses: "123 Main St", "456 Oak Avenue"
    const isPlaceName = !/^\d/.test(firstPart);

    if (isPlaceName) {
        // It's a place name
        // If the full place name is short enough, just return it
        if (firstPart.length <= 35) {
            return firstPart;
        }
        // If place name is long, shorten it but try to keep meaningful words
        const shortened = firstPart.substring(0, 32) + '...';
        return shortened;
    }

    // It's a street address - extract street and city
    if (parts.length >= 2) {
        const street = firstPart;
        const city = secondPart;

        // If street is too long, try to shorten it
        let shortStreet = street;
        if (street.length > 25) {
            // Try to extract just the street number and first part of street name
            const streetMatch = street.match(/^(\d+\s+\w+)/);
            if (streetMatch) {
                shortStreet = streetMatch[1] + '...';
            } else {
                shortStreet = street.substring(0, 22) + '...';
            }
        }

        // Shorten city if needed
        let shortCity = city;
        if (city.length > 15) {
            shortCity = city.substring(0, 12) + '...';
        }

        return `${shortStreet}, ${shortCity}`;
    }

    // Fallback: if address is short enough, return as is, otherwise truncate
    return fullAddress.length > 35 ? fullAddress.substring(0, 32) + '...' : fullAddress;
}

/**
 * Display the optimized route order in the sidebar
 */
function displayOptimizedOrder(response, routeData) {
    const route = response.routes[0];
    const orderList = document.getElementById('route-list');
    const outputPanel = document.getElementById('output-panel');

    orderList.innerHTML = '';
    outputPanel.classList.remove('hidden');

    const legs = route.legs;

    // Build ordered list of original place names
    // Start with origin
    const orderedNames = [routeData.originName];

    // Add waypoints in optimized order
    if (route.waypoint_order && route.waypoint_order.length > 0) {
        route.waypoint_order.forEach(index => {
            orderedNames.push(routeData.waypointNames[index]);
        });
    } else if (routeData.waypointNames.length > 0) {
        // If no optimization or no waypoints, add in original order
        orderedNames.push(...routeData.waypointNames);
    }

    // Add destination
    orderedNames.push(routeData.destinationName);

    console.log("=== Route Display Debug ===");
    console.log("Route Data:", routeData);
    console.log("Ordered Names:", orderedNames);
    console.log("Waypoint Order:", route.waypoint_order);

    // Same color array as used in polylines
    const colors = [
        '#DC143C', '#1E90FF', '#FF8C00', '#9370DB', '#20B2AA',
        '#FF1493', '#4169E1', '#32CD32', '#FF4500', '#8B008B'
    ];

    // Clear old markers and polylines, then add new ones
    clearMarkers();
    clearPolylines();
    createNumberedMarkers(route);
    createColoredPolylines(route);

    // Display each leg of the journey with colored line indicators
    legs.forEach((leg, index) => {
        const li = document.createElement('li');
        li.style.listStyle = 'none';
        li.style.display = 'flex';
        li.style.flexDirection = 'column';
        li.style.gap = '5px';
        li.style.padding = '12px 0';
        li.style.borderBottom = '1px solid #f0f0f0';

        // Container for line and route text
        const routeContainer = document.createElement('div');
        routeContainer.style.display = 'flex';
        routeContainer.style.alignItems = 'center';
        routeContainer.style.gap = '10px';

        // Create colored line indicator
        const colorLine = document.createElement('span');
        colorLine.style.width = '30px';
        colorLine.style.height = '4px';
        colorLine.style.backgroundColor = colors[index % colors.length];
        colorLine.style.flexShrink = '0';
        colorLine.style.borderRadius = '2px';
        colorLine.style.boxShadow = '0 1px 2px rgba(0,0,0,0.2)';

        // Create text content - "Place A → Place B" format
        const fromPlace = orderedNames[index];
        const toPlace = orderedNames[index + 1];
        const textSpan = document.createElement('span');
        textSpan.textContent = `${shortenAddress(fromPlace)} → ${shortenAddress(toPlace)}`;
        textSpan.style.fontSize = '0.9rem';
        textSpan.style.lineHeight = '1.4';
        textSpan.style.fontWeight = '500';
        textSpan.title = `${fromPlace} to ${toPlace}`; // Show full names on hover

        routeContainer.appendChild(colorLine);
        routeContainer.appendChild(textSpan);

        // Create distance and time info
        const infoContainer = document.createElement('div');
        infoContainer.style.display = 'flex';
        infoContainer.style.gap = '15px';
        infoContainer.style.marginLeft = '40px'; // Align with text
        infoContainer.style.fontSize = '0.8rem';
        infoContainer.style.color = '#666';

        // Distance
        const distanceSpan = document.createElement('span');
        distanceSpan.textContent = `📍 ${leg.distance.text}`;
        distanceSpan.style.display = 'flex';
        distanceSpan.style.alignItems = 'center';
        distanceSpan.style.gap = '4px';

        // Duration
        const durationSpan = document.createElement('span');
        durationSpan.textContent = `⏱️ ${leg.duration.text}`;
        durationSpan.style.display = 'flex';
        durationSpan.style.alignItems = 'center';
        durationSpan.style.gap = '4px';

        infoContainer.appendChild(distanceSpan);
        infoContainer.appendChild(durationSpan);

        li.appendChild(routeContainer);
        li.appendChild(infoContainer);
        orderList.appendChild(li);
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