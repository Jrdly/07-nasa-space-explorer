// Find the main controls and gallery on the page.
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const fetchButton = document.querySelector('.filters button');
const gallery = document.getElementById('gallery');

// Set up the date inputs from dateRange.js.
// The helper keeps the app locked to a 9-day window.
setupDateInputs(startInput, endInput);

// Create a loading message so the user knows the app is working.
const statusMessage = document.createElement('p');
statusMessage.className = 'status-message';
statusMessage.setAttribute('aria-live', 'polite');
gallery.before(statusMessage);

// Build the modal once so we can reuse it for every image click.
const modalOverlay = document.createElement('div');
modalOverlay.className = 'modal-overlay';
modalOverlay.hidden = true;
modalOverlay.innerHTML = `
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
		<button class="modal-close" type="button" aria-label="Close modal">&times;</button>
		<div class="modal-media" id="modalMedia"></div>
		<div class="modal-copy">
			<h2 id="modalTitle"></h2>
			<p class="modal-date" id="modalDate"></p>
			<p class="modal-explanation" id="modalExplanation"></p>
		</div>
	</div>
`;
document.body.append(modalOverlay);

const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');
const modalCloseButton = modalOverlay.querySelector('.modal-close');

function formatDateLabel(dateString) {
	const date = new Date(`${dateString}T00:00:00`);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

function getDateRange(startDate, endDate) {
	const dates = [];
	const currentDate = new Date(`${startDate}T00:00:00`);
	const finalDate = new Date(`${endDate}T00:00:00`);

	while (currentDate <= finalDate) {
		dates.push(currentDate.toISOString().split('T')[0]);
		currentDate.setDate(currentDate.getDate() + 1);
	}

	return dates;
}

async function fetchApodForDate(date) {
	const response = await fetch(
		`https://api.nasa.gov/planetary/apod?api_key=${apiKey}&date=${date}&thumbs=true`
	);

	if (!response.ok) {
		throw new Error(`NASA API request failed for ${date}`);
	}

	return response.json();
}

function clearGallery() {
	gallery.innerHTML = '';
}

function showLoadingMessage() {
	statusMessage.textContent = 'Loading NASA imagery...';
	statusMessage.classList.add('is-loading');
	gallery.setAttribute('aria-busy', 'true');
}

function hideLoadingMessage() {
	statusMessage.textContent = '';
	statusMessage.classList.remove('is-loading');
	gallery.removeAttribute('aria-busy');
}

function showErrorMessage(message) {
	statusMessage.textContent = message;
	statusMessage.classList.remove('is-loading');
}

function closeModal() {
	modalOverlay.hidden = true;
	modalMedia.innerHTML = '';
}

function openModal(item) {
	modalTitle.textContent = item.title;
	modalDate.textContent = formatDateLabel(item.date);
	modalExplanation.textContent = item.explanation;
	modalMedia.innerHTML = '';

	if (item.media_type === 'video') {
		const video = document.createElement('iframe');
		video.src = item.url;
		video.title = item.title;
		video.loading = 'lazy';
		video.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
		video.allowFullscreen = true;
		modalMedia.append(video);
	} else {
		const image = document.createElement('img');
		image.src = item.hdurl || item.url;
		image.alt = item.title;
		modalMedia.append(image);
	}

	modalOverlay.hidden = false;
	modalCloseButton.focus();
}

function createGalleryItem(item) {
	const card = document.createElement('article');
	card.className = 'gallery-item';

	const imageButton = document.createElement('button');
	imageButton.type = 'button';
	imageButton.className = 'gallery-image-button';
	imageButton.setAttribute('aria-label', `Open details for ${item.title}`);

	const image = document.createElement('img');
	image.alt = item.title;
	image.loading = 'lazy';
	image.src = item.media_type === 'video' ? item.thumbnail_url || item.url : item.url;

	imageButton.append(image);

	const title = document.createElement('h2');
	title.textContent = item.title;

	const date = document.createElement('p');
	date.className = 'gallery-date';
	date.textContent = formatDateLabel(item.date);

	const readMore = document.createElement('p');
	readMore.className = 'gallery-hint';
	readMore.textContent = 'Click the image to view the full explanation.';

	imageButton.addEventListener('click', () => openModal(item));

	card.append(imageButton, title, date, readMore);
	return card;
}

function renderGallery(items) {
	clearGallery();

	items.forEach((item) => {
		const card = createGalleryItem(item);
		gallery.append(card);
	});
}

async function loadGallery() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate) {
		showErrorMessage('Please choose a start and end date.');
		return;
	}

	showLoadingMessage();
	clearGallery();

	try {
		const dates = getDateRange(startDate, endDate);
		const apodData = await Promise.all(dates.map((date) => fetchApodForDate(date)));

		renderGallery(apodData);
		hideLoadingMessage();
	} catch (error) {
		console.error(error);
		clearGallery();
		showErrorMessage('Unable to load NASA images right now. Please try again.');
	}
}

fetchButton.addEventListener('click', loadGallery);

modalOverlay.addEventListener('click', (event) => {
	if (event.target === modalOverlay) {
		closeModal();
	}
});

modalCloseButton.addEventListener('click', closeModal);

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && !modalOverlay.hidden) {
		closeModal();
	}
});

// Load the default 9-day gallery as soon as the page opens.
loadGallery();
