const YOUR_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let map;
let directionsService;
let directionsRenderer;
const maxWaypoints = 8;
let waypointCount = 0;

// Store high-precision coordinate data when available
const selectedPlaces = {
    start: null,
    end: null,
    waypoints: new Map()
};

window.initApp = initApp;

async function initApp() {
    console.log("Initializing App...");
    await initializeMap();
    await setupInputs();
}

async function initializeMap() {
    const { Map } = await google.maps.importLibrary("maps");
    const { DirectionsService, DirectionsRenderer } = await google.maps.importLibrary("routes");

    const defaultLocation = { lat: 37.7749, lng: -122.4194 };
    map = new Map(document.getElementById("map"), {
        zoom: 12,
        center: defaultLocation,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        mapId: 'DEMO_MAP_ID'
    });

    directionsService = new DirectionsService();
    directionsRenderer = new DirectionsRenderer();
    directionsRenderer.setMap(map);
}

async function setupInputs() {
    const { PlaceAutocompleteElement } = await google.maps.importLibrary("places");

    // --- Start Input ---
    const startContainer = document.getElementById('start-container');
    startContainer.innerHTML = '';
    const startAutocomplete = new PlaceAutocompleteElement();
    startAutocomplete.id = "start-input";
    startAutocomplete.placeholder = "Enter start location";
    startContainer.appendChild(startAutocomplete);

    startAutocomplete.addEventListener("gmp-placeselect", async (event) => {
        if (event.place) {
            await event.place.fetchFields({ fields: ["location"] });
            selectedPlaces.start = event.place.location;
            console.log("Start Place Selected:", selectedPlaces.start);
        }
    });

    // Reset precision data if user types
    startAutocomplete.addEventListener("input", () => { selectedPlaces.start = null; });

    // --- End Input ---
    const endContainer = document.getElementById('end-container');
    endContainer.innerHTML = '';
    const endAutocomplete = new PlaceAutocompleteElement();
    endAutocomplete.id = "end-input";
    endAutocomplete.placeholder = "Enter destination";
    endContainer.appendChild(endAutocomplete);

    endAutocomplete.addEventListener("gmp-placeselect", async (event) => {
        if (event.place) {
            await event.place.fetchFields({ fields: ["location"] });
            selectedPlaces.end = event.place.location;
            console.log("End Place Selected:", selectedPlaces.end);
        }
    });

    endAutocomplete.addEventListener("input", () => { selectedPlaces.end = null; });

    // --- Buttons ---
    const addWaypointBtn = document.getElementById('add-waypoint');
    const optimizeBtn = document.getElementById('optimize-btn');
    const waypointsContainer = document.getElementById('waypoints-container');

    const newAddBtn = addWaypointBtn.cloneNode(true);
    addWaypointBtn.parentNode.replaceChild(newAddBtn, addWaypointBtn);

    newAddBtn.addEventListener('click', () => {
        if (waypointCount >= maxWaypoints) {
            alert("Maximum 8 intermediate stops allowed.");
            return;
        }
        addWaypoint(waypointsContainer);
    });

    const newOptimizeBtn = optimizeBtn.cloneNode(true);
    optimizeBtn.parentNode.replaceChild(newOptimizeBtn, optimizeBtn);
    newOptimizeBtn.addEventListener('click', calculateAndDisplayRoute);
}

function addWaypoint(container) {
    const id = `waypoint-${Date.now()}`;
    const div = document.createElement('div');
    div.className = 'waypoint-input';

    const pac = new google.maps.places.PlaceAutocompleteElement();
    pac.dataset.uid = id;
    pac.placeholder = "Enter stop";

    pac.addEventListener("gmp-placeselect", async (event) => {
        if (event.place) {
            await event.place.fetchFields({ fields: ["location"] });
            selectedPlaces.waypoints.set(id, event.place.location);
        }
    });

    pac.addEventListener("input", () => {
        selectedPlaces.waypoints.delete(id);
    });

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '&times;';
    removeBtn.className = 'remove-btn';
    removeBtn.onclick = () => {
        container.removeChild(div);
        selectedPlaces.waypoints.delete(id);
        waypointCount--;
    };

    div.appendChild(pac);
    div.appendChild(removeBtn);
    container.appendChild(div);
    waypointCount++;
}

// *** CRITICAL HELPER FUNCTION ***
// This function forces the extraction of text from the Shadow DOM
function getInputValue(element) {
    if (!element) return "";

    // 1. Try standard value
    if (element.value) return element.value;

    // 2. Try piercing Shadow DOM to find the real <input>
    if (element.shadowRoot) {
        const internalInput = element.shadowRoot.querySelector('input');
        if (internalInput && internalInput.value) {
            return internalInput.value;
        }
    }

    return "";
}

function gatherRouteInputs() {
    // 1. Get Start
    const startEl = document.getElementById('start-input');
    // Prefer the object (LatLng), fallback to text string
    const origin = selectedPlaces.start || getInputValue(startEl);

    // 2. Get End
    const endEl = document.getElementById('end-input');
    const destination = selectedPlaces.end || getInputValue(endEl);

    // Debugging logs to help you see what's happening
    console.log("Gathering Inputs...");
    console.log("Origin:", origin);
    console.log("Destination:", destination);

    if (!origin || !destination) {
        alert("Please provide valid Start and End locations.");
        return null;
    }

    // Check for empty strings if user left fields blank
    if (typeof origin === 'string' && origin.trim() === '') return null;
    if (typeof destination === 'string' && destination.trim() === '') return null;

    // 3. Get Waypoints
    const waypoints = [];
    const waypointEls = document.querySelectorAll('#waypoints-container gmp-place-autocomplete');

    waypointEls.forEach(pac => {
        const id = pac.dataset.uid;
        const locationObj = selectedPlaces.waypoints.get(id);
        const textVal = getInputValue(pac);

        // Prefer object, fallback to text
        const finalLoc = locationObj || textVal;

        if (finalLoc && finalLoc !== '') {
            waypoints.push({ location: finalLoc, stopover: true });
        }
    });

    return { origin, destination, waypoints };
}

async function calculateAndDisplayRoute() {
    const routeData = gatherRouteInputs();
    if (!routeData) {
        alert("Please enter a start and end location.");
        return;
    }

    directionsService.route({
        origin: routeData.origin,
        destination: routeData.destination,
        waypoints: routeData.waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
    }, (response, status) => {
        if (status === "OK") {
            directionsRenderer.setDirections(response);
            displayOptimizedOrder(response);
        } else {
            console.error("Directions Failed. Status:", status);
            alert('Directions request failed: ' + status);
        }
    });
}

function displayOptimizedOrder(response) {
    const route = response.routes[0];
    const orderList = document.getElementById('route-list');
    const outputPanel = document.getElementById('output-panel');

    if (orderList) {
        orderList.innerHTML = '';
        outputPanel.classList.remove('hidden');

        const routeLegs = route.legs;
        routeLegs.forEach((leg, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${leg.start_address}`;
            orderList.appendChild(li);

            if (index === routeLegs.length - 1) {
                const lastLi = document.createElement('li');
                lastLi.textContent = `Destination: ${leg.end_address}`;
                orderList.appendChild(lastLi);
            }
        });
    }
}

// Bootstrapper
(function () {
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        if (window.google && window.google.maps) {
            initApp();
        }
        return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${YOUR_API_KEY}&callback=initApp&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
        console.error("Failed to load Google Maps API script.");
        alert("Failed to load Google Maps.");
    };
    document.head.appendChild(script);
})();