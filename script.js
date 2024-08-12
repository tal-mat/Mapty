'use strict';

// Workout class to define common properties and methods for different workout types
class Workout {
  date = new Date();
  // Using the last 10 numbers of the current date instead of an external library for unique ID
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  // Set a description for the workout based on its type and date
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }
}

// Running workout subclass
class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  // Calculate the pace of the running workout (min/km)
  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// Cycling workout subclass
class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  // Calculate the speed of the cycling workout (km/h)
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/////////////////////////////////////
// APPLICATION ARCHITECTURE

// DOM elements
const form = document.querySelector('.form');
const containerWorkoutsOperations = document.querySelector(
  '.workout__operations',
);
const btnDeleteWorkouts = document.querySelector('.delete__workouts');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// Main application class
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = []; // Array to hold all workouts

  constructor() {
    // Get the user's current position
    this._getPositions();

    // Get data from local storage
    this._getLocalStorage();

    // Show or hide operations based on whether workouts exist
    this.#workouts.length > 0 ? this._showOperations() : this._hideOperations();

    // Event listeners
    // For form submission to handle new workouts
    form.addEventListener('submit', this._newWorkout.bind(this));

    // To inputType to toggle between cadence and elevation fields
    inputType.addEventListener('change', this._toggleElevationField);

    // To workout container, moving the map view to the selected workout's location when it is clicked.
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // To delete workouts btn, set the #workouts list to empty.
    btnDeleteWorkouts.addEventListener('click', this._reset.bind(this));
  }

  // Retrieve the user's current geographic position
  _getPositions() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        },
      );
    }
  }

  // Load the map centered at the user's current position
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handle clicks on the map to show the workout form
    this.#map.on('click', this._showForm.bind(this));

    // Render workout markers on the map only after the map has loaded from the local storage
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  // Show the workout form when the map is clicked
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  // Hide the workout form and clear input fields
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // Hide the form and set back the display setting to original value 'grid'
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  // Show the operations section if there are workouts
  _showOperations() {
    containerWorkoutsOperations.classList.remove('hidden');
    containerWorkoutsOperations.classList.add('active');
  }

  // Hide the operations section if there are no workouts
  _hideOperations() {
    containerWorkoutsOperations.classList.remove('active');
    containerWorkoutsOperations.classList.add('hidden');
  }

  // Toggle between showing the cadence and elevation fields based on the workout type
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  // Handle the submission of a new workout
  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Prevent the default behavior of the form to re-render the map
    e.preventDefault();

    // Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // Get the coordinates where the map was clicked and add a marker for the workout
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If the workout is running, then create a running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check id data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If the workout is cycling, then create a cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check id data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add the new object to the workout array
    this.#workouts.push(workout);

    // Render the workout on the map as a marker
    this._renderWorkoutMarker(workout);

    // Render the workout on the list
    this._renderWorkout(workout);

    // Show the operations section if this is the first workout
    if (this.#workouts.length === 1) this._showOperations();

    // Hide the form + Clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  // Render a workout marker on the map
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }),
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍' : '🚴'} ${workout.description}`,
      )
      .openPopup();
  }

  // Render a workout in the list
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id=${workout.id}>
      <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍' : '🚴'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running') {
      html += `
        <div class='workout__details'>
            <span class='workout__icon'>⚡️</span>
            <span class='workout__value'>${workout.pace.toFixed(1)}</span>
            <span class='workout__unit'>min/km</span>
          </div>
          <div class='workout__details'>
            <span class='workout__icon'>🦶🏼</span>
            <span class='workout__value'>${workout.cadence}</span>
            <span class='workout__unit'>spm</span>
          </div>
    </li>        
      `;
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;
    }

    // Will insert the html as a sibling right after the form
    form.insertAdjacentHTML('afterend', html);
  }

  // Move map view to the workout location on list item click
  _moveToPopup(e) {
    // Wherever the user clicks on the sub-item of the workout, then item all be selected
    const workoutEL = e.target.closest('.workout');

    if (!workoutEL) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEL.dataset.id,
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  // Save workouts to local storage
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  // Load workout data from local storage at the start of the app; if no data exists, it returns.
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  // Reset the application by deleting all workouts
  _reset() {
    localStorage.removeItem('workouts');
    this.#workouts = [];
    this._hideOperations();
    location.reload();
  }
}

const app = new App();
