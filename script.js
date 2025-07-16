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

// Polish trading Sundays - 1st and last Sunday are usually trading
// Te daty są teraz używane do określenia, czy niedziela jest handlowa/niehandlowa
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
let events = JSON.parse(localStorage.getItem('sharedCalendarEvents')) || {};
let currentUser = null;
let currentlyEditingEventId = null;

// Colors for event categories
const eventColors = [
  '#3b82f6', '#10b981', '#f59e0b', '#6366f1', 
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6'
];

// Użytkownicy i hasła
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
  const password = passwordInput.value; // Nie trimujemy hasła, bo spacje mogą być częścią hasła
  
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
    usernameInput.value = ''; // Wyczyść pola po nieudanej próbie
    passwordInput.value = '';
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('calendarUser');
  document.getElementById('userDisplay').classList.add('hidden');
  document.getElementById('loginModal').classList.remove('hidden');
  // Opcjonalnie: wyczyść kalendarz i listę wydarzeń po wylogowaniu
  calendarGrid.innerHTML = '';
  eventsList.innerHTML = '';
  totalEvents.textContent = '0';
}

function initializeCalendar() {
  renderCalendar();
  renderEventsList();
  updateTodayDate();
  // loadCurrentEvents(); // Ta funkcja jest teraz zbędna
  
  // Set default time inputs to current time rounded to nearest 30 minutes
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = Math.floor(now.getMinutes() / 30) * 30;
  const roundedMinutes = minutes.toString().padStart(2, '0');
  
  eventStart.value = `${hours}:${roundedMinutes}`;
  eventEnd.value = `${(hours % 23) + 1}:${roundedMinutes}`;
}

// Calendar rendering
function renderCalendar() {
  calendarGrid.innerHTML = '';
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Update month/year display
  monthYear.textContent = currentDate.toLocaleDateString('pl-PL', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  // Get first day of month and total days
  // Zmodyfikowane obliczanie firstDay, aby poniedziałek był 0, a niedziela 6
  let firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  firstDay = (firstDay === 0) ? 6 : firstDay - 1; // Jeśli niedziela (0), to 6; w przeciwnym razie -1
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Create blank cells for days before first day of month (based on Monday start)
  for (let i = 0; i < firstDay; i++) {
    createDayElement('', true); // Pusta komórka, isOtherMonth = true
  }
  
  // Create cells for current month
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; // Format YYYY-MM-DD
    const monthDayStr = `${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; // Format MM-DD
    
    let dayOfWeek = new Date(year, month, day).getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    dayOfWeek = (dayOfWeek === 0) ? 6 : dayOfWeek - 1; // Konwersja na 0=Pon, ..., 6=Niedziela

    const isToday = today.getFullYear() === year && 
                   today.getMonth() === month && 
                   today.getDate() === day;
    
    let extraClass = '';
    let tooltipText = '';

    // Sprawdź, czy to święto państwowe (stałe)
    if (publicHolidays[monthDayStr]) {
      extraClass += ' holiday';
      tooltipText = publicHolidays[monthDayStr];
    } 
    // Sprawdź, czy to święto państwowe (ruchome)
    else if (movableHolidays[year] && movableHolidays[year][dateStr]) {
      extraClass += ' holiday';
      tooltipText = movableHolidays[year][dateStr];
    }
    // Sprawdź, czy to niedziela
    else if (dayOfWeek === 6) { // Niedziela
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
  
  // Calculate how many more cells we need to complete the grid (6 rows x 7 columns)
  const totalCells = 42; // 6 tygodni * 7 dni
  const daysAdded = calendarGrid.children.length; // Liczba już dodanych komórek
  if (daysAdded < totalCells) {
    for (let day = 1; day <= totalCells - daysAdded; day++) {
      createDayElement('', true); // Pusta komórka, isOtherMonth = true
    }
  }
  
  // Highlight today's events
  highlightTodayEvents();
}

function createDayElement(day, isOtherMonth, isToday = false, dateStr = null, extraClass = '', tooltipText = '') {
  const dayElement = document.createElement('div');
  dayElement.className = `day-cell bg-gray-800 rounded p-2 min-h-20 cursor-pointer ${isOtherMonth ? 'opacity-50' : ''} ${
    isToday ? 'current-day bg-gray-700' : 'hover:bg-gray-700'
  } ${extraClass}`;
  
  // Add day number
  dayElement.innerHTML = `<div class="text-right font-medium ${isToday ? 'text-primary-500 font-bold' : ''}">${day}</div>`;
  
  // Add tooltip if text is provided
  if (tooltipText) {
    dayElement.setAttribute('data-tooltip', tooltipText);
    dayElement.classList.add('tooltip'); // Dodaj klasę tooltip
  }

  if (dateStr && events[dateStr] && events[dateStr].length > 0) {
    // Add event indicator dot
    const eventDot = document.createElement('div');
    eventDot.className = 'event-badge';
    eventDot.style.backgroundColor = events[dateStr][0].color;
    dayElement.appendChild(eventDot);
  }
  
  // Add click handler
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
  
  // Remove previous selection highlight
  const previouslySelected = document.querySelector('.day-cell.selected');
  if (previouslySelected) {
    previouslySelected.classList.remove('selected', 'highlight-secondary');
  }
  
  // Add highlight to selected day
  element.classList.add('selected', 'highlight-secondary');
  
  // Show modal for new event
  showNewEventModal();
}

// Event modal functions
function showNewEventModal() {
  // Sprawdź, czy użytkownik jest zalogowany
  if (!currentUser) {
    alert('Please log in to add events.');
    document.getElementById('loginModal').classList.remove('hidden');
    return;
  }

  if (!selectedDate) return;
  
  // Reset form
  eventText.value = '';
  eventPerson.value = '';
  currentlyEditingEventId = null;
  modalTitle.textContent = 'Add New Event';
  
  // Format and display the selected date
  const [year, month, day] = selectedDate.split('-');
  const date = new Date(year, month - 1, day);
  eventDate.textContent = date.toLocaleDateString('pl-PL', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Show modal and hide login modal if open
  eventModal.classList.remove('hidden');
  document.getElementById('loginModal').classList.add('hidden');
}

function closeModal() {
  eventModal.classList.add('hidden');
  // Usuń podświetlenie wybranego dnia po zamknięciu modala
  if (selectedDayElement) {
    selectedDayElement.classList.remove('selected', 'highlight-secondary');
  }
  selectedDate = null;
  selectedDayElement = null;
}

// Event details modal
function showEventDetails(eventId) {
  // Sprawdź, czy użytkownik jest zalogowany
  if (!currentUser) {
    alert('Please log in to view event details.');
    document.getElementById('loginModal').classList.remove('hidden');
    return;
  }

  // Find the event
  let event = null;
  for (const date in events) {
    const foundEvent = events[date].find(e => e.id === eventId);
    if (foundEvent) {
      event = foundEvent;
      break;
    }
  }
  
  if (!event) return;
  
  // Update modal content
  eventDetailsTitle.textContent = event.title;
  
  // Format the date
  const [year, month, day] = event.date.split('-');
  const date = new Date(year, month - 1, day);
  const dateStr = date.toLocaleDateString('pl-PL', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Format the time
  const startTime = formatTime(event.startTime);
  const endTime = formatTime(event.endTime);
  
  eventDetailsTime.textContent = `${dateStr} • ${startTime} - ${endTime}`;
  eventDetailsPerson.textContent = event.person;
  
  // Store the current event ID
  currentlyEditingEventId = eventId;
  
  // Show modal
  eventDetailsModal.classList.remove('hidden');
}

function closeDetailsModal() {
  eventDetailsModal.classList.add('hidden');
  currentlyEditingEventId = null;
}

function editCurrentEvent() {
  // Sprawdź, czy użytkownik jest zalogowany i czy jest twórcą wydarzenia
  if (!currentUser) {
    alert('Please log in to edit events.');
    document.getElementById('loginModal').classList.remove('hidden');
    return;
  }

  if (!currentlyEditingEventId) return;
  
  // Find the event
  let event = null;
  for (const date in events) {
    const foundEvent = events[date].find(e => e.id === currentlyEditingEventId);
    if (foundEvent) {
      event = foundEvent;
      break;
    }
  }
  
  if (!event) return;

  // Tylko twórca wydarzenia może je edytować
  if (event.createdBy !== currentUser) {
    alert('You can only edit events created by yourself.');
    return;
  }
  
  // Populate form
  modalTitle.textContent = 'Edit Event';
  eventText.value = event.title;
  eventStart.value = event.startTime;
  eventEnd.value = event.endTime;
  eventPerson.value = event.person;
  
  // Format and display the selected date
  const [year, month, day] = event.date.split('-');
  const date = new Date(year, month - 1, day);
  eventDate.textContent = date.toLocaleDateString('pl-PL', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Switch to edit mode
  eventModal.classList.remove('hidden');
  closeDetailsModal();
}

function deleteCurrentEvent() {
  // Sprawdź, czy użytkownik jest zalogowany i czy jest twórcą wydarzenia
  if (!currentUser) {
    alert('Please log in to delete events.');
    document.getElementById('loginModal').classList.remove('hidden');
    return;
  }

  if (!currentlyEditingEventId || !confirm('Are you sure you want to delete this event?')) return;
  
  let eventToDelete = null;
  let eventDateToDelete = null;

  for (const date in events) {
    const foundEvent = events[date].find(e => e.id === currentlyEditingEventId);
    if (foundEvent) {
      eventToDelete = foundEvent;
      eventDateToDelete = date;
      break;
    }
  }

  if (!eventToDelete) return;

  // Tylko twórca wydarzenia może je usunąć
  if (eventToDelete.createdBy !== currentUser) {
    alert('You can only delete events created by yourself.');
    return;
  }
  
  events[eventDateToDelete] = events[eventDateToDelete].filter(e => e.id !== currentlyEditingEventId);
  
  // Remove date key if no events left
  if (events[eventDateToDelete].length === 0) {
    delete events[eventDateToDelete];
  }
  
  saveEvents();
  renderCalendar();
  renderEventsList(); // Odśwież listę wydarzeń po usunięciu
  closeDetailsModal();
}

// Event management
function saveEvent() {
  // Sprawdź, czy użytkownik jest zalogowany
  if (!currentUser) {
    alert('Please log in to save events.');
    document.getElementById('loginModal').classList.remove('hidden');
    return;
  }

  // Validate form
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
  
  // Create or update event
  const eventId = currentlyEditingEventId || generateId();
  const event = {
    id: eventId,
    title,
    startTime: start,
    endTime: end,
    person,
    date: selectedDate,
    color: eventColors[Math.floor(Math.random() * eventColors.length)],
    createdBy: currentUser, // Dodano informację o twórcy wydarzenia
    createdAt: new Date().toISOString()
  };
  
  // Add or update event
  if (!events[selectedDate]) {
    events[selectedDate] = [];
  }
  
  if (currentlyEditingEventId) {
    // Find and replace existing event
    const index = events[selectedDate].findIndex(e => e.id === currentlyEditingEventId);
    if (index !== -1) {
      // Sprawdź, czy użytkownik jest twórcą wydarzenia przed edycją
      if (events[selectedDate][index].createdBy !== currentUser) {
        alert('You can only edit events created by yourself.');
        return;
      }
      events[selectedDate][index] = event;
    } else {
      // Jeśli wydarzenie nie zostało znalezione w bieżącej dacie (np. data została zmieniona), dodaj jako nowe
      events[selectedDate].push(event);
    }
  } else {
    // Add new event
    events[selectedDate].push(event);
  }
  
  // Sort events by time
  events[selectedDate].sort((a, b) => {
    return a.startTime.localeCompare(b.startTime);
  });
  
  saveEvents();
  renderCalendar();
  renderEventsList(); // Odśwież listę wydarzeń po zapisie
  closeModal();
}

// Events list rendering
function renderEventsList() {
  eventsList.innerHTML = '';
  let allEvents = [];
  let totalCount = 0;

  // Iteruj po wszystkich datach w obiekcie events
  for (const date in events) {
    if (events.hasOwnProperty(date)) {
      // Dodaj wszystkie wydarzenia z danej daty do listy allEvents
      allEvents = allEvents.concat(events[date]);
    }
  }

  // Sortuj wszystkie wydarzenia najpierw po dacie, a potem po czasie
  allEvents.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime(); // Sortuj po dacie
    }
    return a.startTime.localeCompare(b.startTime); // Sortuj po czasie, jeśli daty są takie same
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
  
  // Render events
  allEvents
    .forEach(event => {
    const eventElement = document.createElement('div');
    eventElement.className = 'bg-gray-700 rounded-lg p-3 mb-2 cursor-pointer transition hover:bg-gray-600';
    eventElement.onclick = () => showEventDetails(event.id);
    
    const startTime = formatTime(event.startTime);
    const endTime = formatTime(event.endTime);

    // Formatowanie daty wydarzenia
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
          ${event.person} (${event.createdBy})
        </div>
        <div class="text-xs text-gray-400">${startTime} - ${endTime}</div>
      </div>
    `;
    
    eventsList.appendChild(eventElement);
    totalCount++; // Zliczaj tylko wyświetlane wydarzenia
  });
  
  // Update total events count
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

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function saveEvents() {
  localStorage.setItem('sharedCalendarEvents', JSON.stringify(events));
}

function updateTodayDate() {
  const today = new Date();
  todayDate.textContent = today.toLocaleDateString('pl-PL', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
}

function loadCurrentEvents() {
  // Ta funkcja jest teraz zbędna, ponieważ renderEventsList wyświetla wszystkie wydarzenia
  // i aktualizuje totalEvents.
  // Pozostawiam ją pustą, aby uniknąć błędów, jeśli jest gdzieś wywoływana.
}

function highlightTodayEvents() {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  
  if (events[todayStr]) {
    // You could add additional highlighting logic here
  }
}

function clearAllEvents() {
  if (confirm('Are you sure you want to delete ALL events? This cannot be undone.')) {
    events = {};
    saveEvents();
    renderCalendar();
    renderEventsList();
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
