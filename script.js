const API_KEY = "6b44fbff490d21f7aebd9348560774f4";

document.addEventListener("DOMContentLoaded", () => {
  getCurrentLocationWeather();
  registerServiceWorker();
  updateFavoritesTab();
});

document.querySelectorAll('input[name="unit"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    const city = document.getElementById("cityName").textContent;
    if (city) {
      getWeather();
    }
  });
});

async function getCurrentLocationWeather() {
  const locationLoader = document.getElementById("loader-location");
  if (locationLoader) locationLoader.classList.remove("hidden");

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const unit = document.querySelector('input[name="unit"]:checked').value;

      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=${unit}&appid=${API_KEY}`
        );

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const text = await response.text();
        if (!text) throw new Error("Empty response");

        const data = JSON.parse(text);
        displayWeather(data, unit);
        loadForecast(data.name, unit);
      } catch (error) {
        console.error("Error fetching location weather:", error);
        alert("Failed to fetch location weather.");
      } finally {
        if (locationLoader) locationLoader.classList.add("hidden");
      }
    }, (error) => {
      alert("Geolocation error: " + error.message);
      if (locationLoader) locationLoader.classList.add("hidden");
    });
  } else {
    alert("Geolocation not supported.");
    if (locationLoader) locationLoader.classList.add("hidden");
  }
}

function getLocation() {
  getCurrentLocationWeather();
}

async function getWeather() {
  const city = document.getElementById("cityInput").value.trim();
  const unit = document.querySelector('input[name="unit"]:checked').value;
  const loader = document.getElementById("loader");
  const weatherSection = document.getElementById("weatherDisplay");

  if (!city) return alert("Please enter a city name.");

  loader.classList.remove("hidden");
  weatherSection.classList.add("hidden");

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${unit}&appid=${API_KEY}`
    );

    if (!response.ok) throw new Error("City not found");

    const data = await response.json();
    displayWeather(data, unit);
    loadForecast(city, unit);
  } catch (err) {
    console.error("Error fetching weather:", err);
    alert("Failed to fetch weather.");
  } finally {
    loader.classList.add("hidden");
  }
}

document.getElementById("cityInput").addEventListener("keypress", (event) => {
  if (event.key === "Enter") getWeather();
});

function displayWeather(data, unit) {
  const icon = data.weather[0].icon;
  const weatherMain = data.weather[0].main;
  const weatherDescription = data.weather[0].description;

  document.getElementById("weatherIcon").src = `http://openweathermap.org/img/wn/${icon}@2x.png`;
  document.getElementById("temperature").textContent = Math.round(data.main.temp);
  document.getElementById("unit").textContent = unit === "metric" ? "°C" : "°F";
  document.getElementById("cityName").textContent = `${data.name} - ${weatherMain}`;

  const favToggle = document.getElementById("favoriteToggle");
  favToggle.checked = localStorage.getItem("favorite") === data.name;

  favToggle.onchange = () => {
    if (favToggle.checked) {
      localStorage.setItem("favorite", data.name);
      addToFavorites(data.name);
    } else {
      localStorage.removeItem("favorite");
      removeFromFavorites(data.name);
    }
    updateFavoritesTab();
  };

  setBackgroundVideo(weatherMain.toLowerCase());
  animateWeatherIcon(weatherMain.toLowerCase());

  document.getElementById("weatherDisplay").classList.remove("hidden");
  document.getElementById("weatherDisplay").classList.add("visible");
}

function addToFavorites(city) {
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  if (!favorites.includes(city)) {
    favorites.push(city);
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }
}

function removeFromFavorites(city) {
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  const updatedFavorites = favorites.filter((fav) => fav !== city);
  localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
}

async function updateFavoritesTab() {
  const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  const favoritesTab = document.getElementById("favoritesTab");
  favoritesTab.innerHTML = "";

  if (favorites.length === 0) {
    favoritesTab.innerHTML = "<p>No favorite cities added yet.</p>";
    return;
  }

  for (const city of favorites) {
    const div = document.createElement("div");
    div.className = "favorite-item";

    const cityName = document.createElement("span");
    cityName.textContent = city;
    cityName.className = "favorite-city";
    cityName.onclick = () => {
      document.getElementById("cityInput").value = city;
      getWeather();
    };

    const weatherInfo = document.createElement("span");
    weatherInfo.className = "favorite-weather";
    weatherInfo.textContent = "Loading...";

    const removeIcon = document.createElement("span");
    removeIcon.innerHTML = "❌";
    removeIcon.className = "remove-favorite-icon";
    removeIcon.onclick = () => {
      removeFromFavorites(city);
      updateFavoritesTab();
    };

    div.appendChild(cityName);
    div.appendChild(weatherInfo);
    div.appendChild(removeIcon);
    favoritesTab.appendChild(div);

    try {
      const unit = document.querySelector('input[name="unit"]:checked').value;
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${unit}&appid=${API_KEY}`
      );

      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

      const text = await response.text();
      if (!text) throw new Error("Empty weather info");

      const data = JSON.parse(text);
      weatherInfo.textContent = `${Math.round(data.main.temp)}${unit === "metric" ? "°C" : "°F"} - ${data.weather[0].main}`;
    } catch (error) {
      console.error(`Error fetching weather for ${city}:`, error);
      weatherInfo.textContent = "Error fetching weather";
    }
  }
}

async function loadForecast(city, unit) {
  const forecastLoader = document.getElementById("loader-forecast");
  if (forecastLoader) forecastLoader.classList.remove("hidden");

  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=${unit}&appid=${API_KEY}`
    );

    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);

    const text = await res.text();
    if (!text) throw new Error("Empty forecast response");

    const data = JSON.parse(text);
    const forecastContainer = document.getElementById("forecastContainer");
    if (!forecastContainer) return;

    forecastContainer.innerHTML = "";
    const uniqueDays = {};

    for (const entry of data.list) {
      const date = entry.dt_txt.split(" ")[0];
      if (!uniqueDays[date]) uniqueDays[date] = entry;
    }

    Object.entries(uniqueDays).slice(0, 5).forEach(([date, info]) => {
      const div = document.createElement("div");
      div.className = "forecast-day";
      div.innerHTML = `
        <div>${new Date(date).toLocaleDateString()}</div>
        <img src="http://openweathermap.org/img/wn/${info.weather[0].icon}.png" />
        <div>${Math.round(info.main.temp)}${unit === "metric" ? "°C" : "°F"}</div>
      `;
      forecastContainer.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading forecast:", error);
  } finally {
    if (forecastLoader) forecastLoader.classList.add("hidden");
  }
}

function toggleForecast() {
  document.getElementById("forecastContainer").classList.toggle("hidden");
}

function setBackgroundVideo(condition) {
  const body = document.body;
  body.className = "";

  if (condition.includes("rain")) {
    body.classList.add("bg-rain");
  } else if (condition.includes("cloud")) {
    body.classList.add("bg-cloudy");
  } else if (condition.includes("clear") || condition.includes("sun")) {
    body.classList.add("bg-clear");
  } else if (condition.includes("snow")) {
    body.classList.add("bg-snow");
  } else {
    body.classList.add("bg-default");
  }
}

function animateWeatherIcon(condition) {
  const icon = document.getElementById("weatherIcon");
  icon.style.transition = "transform 0.5s ease";
  icon.style.transform = "scale(1.2)";
  setTimeout(() => (icon.style.transform = "scale(1)"), 500);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && window.location.protocol === "https:") {
    navigator.serviceWorker
      .register("service-worker.js")
      .then(() => console.log("Service Worker Registered"))
      .catch((err) => console.error("Service Worker Failed:", err));
  } else {
    console.warn("Service Worker not registered. HTTPS is required.");
  }
}
