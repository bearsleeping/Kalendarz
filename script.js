// DOM Elements
const calendarGrid = document.getElementById('calendarGrid');
const monthYear = document.getElementById('monthYear');
const eventsList = document.getElementById('eventsList');
const eventModal = document.getElementById('eventModal');
const eventDetailsModal = document.getElementById('eventDetailsModal');
const todayDate = document.getElementById('todayDate');
const totalEvents = document.getElementById('totalEvents');

// Form elements
const eventText = document.getElementById('eventText');
const eventStart = document.getElementById('eventStart');
const eventEnd = document.getElementById('eventEnd');
const eventPerson = document.getElementById('eventPerson');
const modalTitle = document.getElementById('modalTitle');
const eventDate = document.getElementById('eventDate');

// Event details elements
const eventDetailsTitle = document.getElementById('eventDetailsTitle');
const eventDetailsTime = document.getElementById('eventDetailsTime');
const eventDetailsPerson = document.getElementById('eventDetailsPerson');

// URL do Twojego serwera Node.js
const API_URL = 'http://localhost:5000/events'; // Zmień na adres URL Twojego serwera na Replit

// Polish trading Sundays - 1st and last Sunday are usually trading
const tradingSundays = new Set([
  '2023-12-24', '2023-12-31',
  '2024-03-24', '2024-04-28', '2024-06-30', '2024-08-25', '2024-12-15', '2024-12-22',
  '2025-01-26', '2025-04-13', '2025-04-27', '2025-06-29', '2025-08-31', '2025-12-21'
]);

// Polskie święta państwowe (stałe daty z nazwami)
const publicHolidays = {
  '01-01': 'Nowy Rok',
  '01-06': 'Trzech Króli',
  '05-01': 'Święto Pracy',
  '05-03': 'Święto Konstytucji 3 Maja',
  '08-15': 'Wniebowzięcie NMP',
  '11-01': 'Wszystkich Świętych',
  '11-11': 'Narodowe Święto Niepodległości',
  '12-25': 'Boże Narodzenie (I dzień)',
  '12-26': 'Boże Narodzenie (II dzień)'
};

// Polskie święta ruchome (dla 2024 i 2025 z nazwami)
const movableHolidays = {
  '2024': {
    '2024-03-31': 'Wielkanoc',
    '2024-04-01': 'Poniedziałek Wielkanocny',
    '2024-05-19': 'Zielone Świątki',
    '2024-05-30': 'Boże Ciało'
  },
  '2025': {
    '2025-04-20': 'Wielkanoc',
    '2025-04-21': 'Poniedziałek Wielkanocny',
    '2025-06-08': 'Zielone Świątki',
    '2025-06-19': 'Boże Ciało'
  }
};

// Calendar state
let currentDate = new Date();
let selectedDate = null;
let selectedDayElement = null;
let events = {}; // Będziemy ładować wydarzenia z serwera
let currentUser = null;
let currentlyEditingEventId = null;

// Colors for event categories
const eventColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#6366f1',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'
];

// Użytkownicy i hasła (przeniesione do backendu w prawdziwej aplikacji)
const users = {
  "liliana": "Dupachuj1",
  "Dominik": "gorylgada1"
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Check for existing session
  const storedUser = localStorage.getItem('calendarUser');
  if (storedUser) {
    currentUser = storedUser;
    document.getElementById('userDisplay').classList.remove('hidden');
    document.getElementById('usernameDisplay').textContent = currentUser;
    initializeCalendar();
  } else {
    document.getElementById('loginModal').classList.remove('hidden');
  }
});

function handleLogin() {
  const usernameInput = document.getElementById('loginUsername');
  const passwordInput = document.getElementById('loginPassword');
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    alert('Please enter both username and password.');
    return;
  }

  if (users[username] && users[username] === password) {
    currentUser = username;
    localStorage.setItem('calendarUser', currentUser);
    document.getElementById('userDisplay').classList.remove('hidden');
    document.getElementById('usernameDisplay').textContent = currentUser;
    document.getElementById('loginModal').classList.add('hidden');
    initializeCalendar();
  } else {
    alert('Invalid username or password.');
    usernameInput.value = '';
    passwordInput.value = '';
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('calendarUser');
  document.getElementById('userDisplay').classList.add('hidden');
  document.getElementById('loginModal').classList.remove('hidden');
  calendarGrid.innerHTML = '';
  eventsList.innerHTML = '';
  totalEvents.textContent = '0';
  events = {}; // Wyczyść wydarzenia po wylogowaniu
}

async function initializeCalendar() {
  await fetchEvents(); // Pobierz wydarzenia z serwera
  renderCalendar();
  renderEventsList();
  updateTodayDate();

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = Math.floor(now.getMinutes() / 30) * 30;
  const roundedMinutes = minutes.toString().padStart(2, '0');

  eventStart.value = `${hours}:${roundedMinutes}`;
  eventEnd.value = `${(hours % 23) + 1}:${roundedMinutes}`;
}

// Nowa funkcja do pobierania wydarzeń z serwera
async function fetchEvents() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Przekształć listę wydarzeń z serwera na obiekt events { 'YYYY-MM-DD': [event1, event2] }
    events = data.reduce((acc, event) => {
      const date = event.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(event);
      return acc;
    }, {});
  } catch (error) {
    console.error('Error fetching events:', error);
    events = {}; // W przypadku błędu, ustaw pusty obiekt wydarzeń
  }
}


// Calendar rendering
function renderCalendar() {
  calendarGrid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthYear.textContent = currentDate.toLocaleDateString('pl-PL', {
    month: 'long',
    year: 'numeric'
  });

  let firstDay = new Date(year, month, 1).getDay();
  firstDay = (firstDay === 0) ? 6 : firstDay - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    createDayElement('', true);
  }

  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const monthDayStr = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    let dayOfWeek = new Date(year, month, day).getDay();
    dayOfWeek = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;

    const isToday = today.getFullYear() === year &&
                   today.getMonth() === month &&
                   today.getDate() === day;

    let extraClass = '';
    let tooltipText = '';

    if (publicHolidays[monthDayStr]) {
      extraClass += ' holiday';
      tooltipText = publicHolidays[monthDayStr];
    }
    else if (movableHolidays[year] && movableHolidays[year][dateStr]) {
      extraClass += ' holiday';
      tooltipText = movableHolidays[year][dateStr];
    }
    else if (dayOfWeek === 6) {
      if (tradingSundays.has(dateStr)) {
        extraClass += ' trading-day';
        tooltipText = 'Niedziela handlowa';
      } else {
        extraClass += ' non-trading-day';
        tooltipText = 'Niedziela niehandlowa';
      }
    }

    createDayElement(day, false, isToday, dateStr, extraClass, tooltipText);
  }

  const totalCells = 42;
  const daysAdded = calendarGrid.children.length;
  if (daysAdded < totalCells) {
    for (let day = 1; day <= totalCells - daysAdded; day++) {
      createDayElement('', true);
    }
  }

  highlightTodayEvents();
}

function createDayElement(day, isOtherMonth, isToday = false, dateStr = null, extraClass = '', tooltipText = '') {
  const dayElement = document.createElement('div');
  dayElement.className = `day-cell bg-gray-800 rounded p-2 min-h-20 cursor-pointer ${isOtherMonth ? 'opacity-50' : ''} ${
    isToday ? 'current-day bg-gray-700' : 'hover:bg-gray-700'
  } ${extraClass}`;

  dayElement.innerHTML = `<div class="text-right font-medium ${isToday ? 'text-primary-500 font-bold' : ''}">${day}</div>`;

  if (tooltipText) {
    dayElement.setAttribute('data-tooltip', tooltipText);
    dayElement.classList.add('tooltip');
  }

  if (dateStr && events[dateStr] && events[dateStr].length > 0) {
    const eventDot = document.createElement('div');
    eventDot.className = 'event-badge';
    eventDot.style.backgroundColor = events[dateStr][0].color || eventColors[0]; // Użyj domyślnego koloru, jeśli brak
    dayElement.appendChild(eventDot);
  }

  if (!isOtherMonth && dateStr) {
    dayElement.onclick = () => {
      selectDay(dateStr, dayElement);
    };
  }

  calendarGrid.appendChild(dayElement);
}

function selectDay(dateStr, element) {
  selectedDate = dateStr;
  selectedDayElement = element;

  const previouslySelected = document.querySelector('.day-cell.selected');
  if (previouslySelected) {
    previouslySelected.classList.remove('selected', 'highlight-secondary');
  }

  element.classList.add('selected', 'highlight-secondary');

  showNewEventModal();
}

// Event modal functions
function showNewEventModal() {
  if (!currentUser) {
    alert('Please log in to add events.');
    document.getElementById('loginModal').classList.remove('hidden');
    return;
  }

  if (!selectedDate) return;

  eventText.value = '';
  eventPerson.value = '';
  currentlyEditingEventId = null;
  modalTitle.textContent = 'Add New Event';

  const [year, month, day] = selectedDate.split('-');
  const date = new Date(year, month - 1, day);
  eventDate.textContent = date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  eventModal.classList.remove('hidden');
  document.getElementById('loginModal').classList.add('hidden');
}

function closeModal() {
  eventModal.classList.add('hidden');
  if (selectedDayElement) {
    selectedDayElement.classList.remove('selected', 'highlight-secondary');
  }
  selectedDate = null;
  selectedDayElement = null;
}

// Event details modal
function showEventDetails(eventId) {
  if (!currentUser) {
    alert('Please log in to view event details.');
    document.getElementById('loginModal').classList.remove('hidden');
    return;
  }

  let event = null;
  for (const date in events) {
    const foundEvent = events[date].find(e => e.id === eventId);
    if (foundEvent) {
      event = foundEvent;
      break;
    }
  }

  if (!event) return;

  eventDetailsTitle.textContent = event.title;

  const [year, month, day] = event.date.split('-');
  const date = new Date(year, month - 1, day);
  const dateStr = date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const startTime = formatTime(event.startTime);
  const endTime = formatTime(event.endTime);

  eventDetailsTime.textContent = `${dateStr} • ${startTime} - ${endTime}`;
  eventDetailsPerson.textContent = event.person;

  currentlyEditingEventId = eventId;

  eventDetailsModal.classList.remove('hidden');
}

function closeDetailsModal() {
  eventDetailsModal.classList.add('hidden');
  currentlyEditingEventId = null;
}

function editCurrentEvent() {
  if (!currentUser) {
    alert('Please log in to edit events.');
    document.getElementById('loginModal').classList.remove('hidden');
    return;
  }

  if (!currentlyEditingEventId) return;

  let event = null;
  for (const date in events) {
    const foundEvent = events[date].find(e => e.id === currentlyEditingEventId);
    if (foundEvent) {
      event = foundEvent;
      break;
    }
  }

  if (!event) return;

  // W tym przykładzie nie sprawdzamy createdBy, bo backend to obsłuży
  // if (event.createdBy !== currentUser) {
  //   alert('You can only edit events created by yourself.');
  //   return;
  // }

  modalTitle.textContent = 'Edit Event';
  eventText.value = event.title;
  eventStart.value = event.startTime;
  eventEnd.value = event.endTime;
  eventPerson.value = event.person;

  const [year, month, day] = event.date.split('-');
  const date = new Date(year, month - 1, day);
  eventDate.textContent = date.toLocaleDateString('pl-PL', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  eventModal.classList.remove('hidden');
  closeDetailsModal();
}

async function deleteCurrentEvent() {
  if (!currentUser) {
    alert('Please log in to delete events.');
    document.getElementById('loginModal').classList.remove('hidden');
    return;
  }

  if (!currentlyEditingEventId || !confirm('Are you sure you want to delete this event?')) return;

  try {
    const response = await fetch(`${API_URL}/${currentlyEditingEventId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        // Możesz dodać token autoryzacji, jeśli backend tego wymaga
      },
    });

    if (!response.ok) {
      // Jeśli backend zwróci błąd (np. brak uprawnień), wyświetl alert
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    await fetchEvents(); // Odśwież wydarzenia po usunięciu
    renderCalendar();
    renderEventsList();
    closeDetailsModal();
  } catch (error) {
    console.error('Error deleting event:', error);
    alert('Failed to delete event: ' + error.message);
  }
}

// Event management
async function saveEvent() {
  if (!currentUser) {
    alert('Please log in to save events.');
    document.getElementById('loginModal').classList.remove('hidden');
    return;
  }

  const title = eventText.value.trim();
  const start = eventStart.value;
  const end = eventEnd.value;
  const person = eventPerson.value.trim();

  if (!title || !start || !end || !person) {
    alert('Please fill in all fields');
    return;
  }

  if (start >= end) {
    alert('End time must be after start time');
    return;
  }

  const eventData = {
    title: title,
    startTime: start,
    endTime: end,
    person: person,
    date: selectedDate,
    // createdBy: currentUser, // Backend może to dodać automatycznie lub możesz wysłać
    // color: eventColors[Math.floor(Math.random() * eventColors.length)], // Kolor może być generowany na backendzie lub tutaj
  };

  try {
    let response;
    if (currentlyEditingEventId) {
      // Aktualizacja istniejącego wydarzenia
      response = await fetch(`${API_URL}/${currentlyEditingEventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // Możesz dodać token autoryzacji, jeśli backend tego wymaga
        },
        body: JSON.stringify(eventData),
      });
    } else {
      // Dodanie nowego wydarzenia
      response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Możesz dodać token autoryzacji, jeśli backend tego wymaga
        },
        body: JSON.stringify(eventData),
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    await fetchEvents(); // Odśwież wydarzenia po zapisie
    renderCalendar();
    renderEventsList();
    closeModal();
  } catch (error) {
    console.error('Error saving event:', error);
    alert('Failed to save event: ' + error.message);
  }
}

// Events list rendering
function renderEventsList() {
  eventsList.innerHTML = '';
  let allEvents = [];
  let totalCount = 0;

  for (const date in events) {
    if (events.hasOwnProperty(date)) {
      allEvents = allEvents.concat(events[date]);
    }
  }

  allEvents.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);

    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    return a.startTime.localeCompare(b.startTime);
  });

  if (allEvents.length === 0) {
    eventsList.innerHTML = `
      <div class="text-center py-10 text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>No events scheduled.</p>
      </div>
    `;
    totalEvents.textContent = '0';
    return;
  }

  allEvents
    .forEach(event => {
    const eventElement = document.createElement('div');
    eventElement.className = 'bg-gray-700 rounded-lg p-3 mb-2 cursor-pointer transition hover:bg-gray-600';
    eventElement.onclick = () => showEventDetails(event.id);

    const startTime = formatTime(event.startTime);
    const endTime = formatTime(event.endTime);

    const eventDateObj = new Date(event.date);
    const formattedEventDate = eventDateObj.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric' });

    eventElement.innerHTML = `
      <div class="flex justify-between items-center">
        <div class="font-medium">${event.title}</div>
        <div class="text-xs text-gray-400">${formattedEventDate}</div>
      </div>
      <div class="text-sm text-gray-300 mt-1 flex justify-between items-center">
        <div class="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          ${event.person} (${event.createdBy || 'Unknown'})
        </div>
        <div class="text-xs text-gray-400">${startTime} - ${endTime}</div>
      </div>
    `;

    eventsList.appendChild(eventElement);
    totalCount++;
  });

  totalEvents.textContent = totalCount;
}

// Helper functions
function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Funkcja generateId() nie jest już potrzebna, bo ID generuje backend
// function generateId() {
//   return Date.now().toString(36) + Math.random().toString(36).substr(2);
// }

// Funkcja saveEvents() nie jest już potrzebna, bo dane są zapisywane przez API
// function saveEvents() {
//   localStorage.setItem('sharedCalendarEvents', JSON.stringify(events));
// }

function updateTodayDate() {
  const today = new Date();
  todayDate.textContent = today.toLocaleDateString('pl-PL', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
}

function highlightTodayEvents() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

  if (events[todayStr]) {
    // You could add additional highlighting logic here
  }
}

async function clearAllEvents() {
  if (confirm('Are you sure you want to delete ALL events? This cannot be undone.')) {
    // W przypadku usuwania wszystkich wydarzeń, musisz zaimplementować endpoint na backendzie
    // który usunie wszystkie wydarzenia. W obecnym server.js nie ma takiej funkcji.
    // Możesz dodać np. app.delete('/events', ...)
    alert('This feature is not yet implemented for the backend. Please delete events individually.');
    // Poniższy kod jest dla localStorage, nie dla API
    // events = {};
    // saveEvents();
    // renderCalendar();
    // renderEventsList();
  }
}

// Month navigation
function nextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
}

function prevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
}
