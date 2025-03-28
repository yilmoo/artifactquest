// Global variables for artifact data and user selections
let artifacts = [];
let currentArtifact = null;
let selectedAnswer = null;

// Zoom settings for the artifact image
let scale = 1;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

// Utility: Fisher-Yates Shuffle to randomize an array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Load JSON data from data.json (ensure this file is in the project root)
fetch('data.json')
  .then(response => response.json())
  .then(data => {
    artifacts = data;
    loadNewArtifact();
  })
  .catch(error => console.error('Error loading data:', error));

// Load and display a new artifact
function loadNewArtifact() {
  // Reset image zoom to default
  scale = 1;
  document.getElementById('artifact-image').style.transform = `scale(${scale})`;

  // Randomly select an artifact from the data
  currentArtifact = artifacts[Math.floor(Math.random() * artifacts.length)];

  // Update the artifact image and alt text
  const artifactImage = document.getElementById('artifact-image');
  artifactImage.src = currentArtifact.imageURL;
  artifactImage.alt = currentArtifact.correctAnswer;

  // Create multiple-choice options (shuffled)
  const options = shuffle([currentArtifact.correctAnswer, ...currentArtifact.distractors]);
  const choicesDiv = document.getElementById('choices');
  choicesDiv.innerHTML = ''; // Clear previous options

  options.forEach(option => {
    const button = document.createElement('button');
    button.innerText = option;
    button.onclick = () => selectAnswer(option);
    choicesDiv.appendChild(button);
  });

  // Reset the year slider and update its display
  const slider = document.getElementById('year-slider');
  slider.value = slider.min;
  document.getElementById('year-display').innerText = slider.value;
  
  // Clear any previously selected answer and feedback
  selectedAnswer = null;
  document.getElementById('feedback').innerText = '';
}

// Update the displayed year when the slider moves
document.getElementById('year-slider').addEventListener('input', function () {
  document.getElementById('year-display').innerText = this.value;
});

// Record the user's selected answer and highlight the corresponding button
function selectAnswer(answer) {
  selectedAnswer = answer;
  const buttons = document.querySelectorAll('#choices button');
  buttons.forEach(btn => {
    if (btn.innerText === answer) {
      btn.style.backgroundColor = '#4caf50';
      btn.style.color = '#fff';
    } else {
      btn.style.backgroundColor = '#3498db';
      btn.style.color = '#fff';
    }
  });
}

// Handle answer submission and display feedback
document.getElementById('submit-btn').addEventListener('click', function () {
  if (!selectedAnswer) {
    alert('Please select an answer for what the object is.');
    return;
  }
  
  const sliderYear = parseInt(document.getElementById('year-slider').value, 10);
  let yearDiff = 0;
  let isYearCorrect = false;
  
  // Determine if correctYear is an exact year (number) or a range (array)
  if (typeof currentArtifact.correctYear === 'number') {
    yearDiff = Math.abs(sliderYear - currentArtifact.correctYear);
    isYearCorrect = (yearDiff === 0);
  } else if (Array.isArray(currentArtifact.correctYear)) {
    let lower = currentArtifact.correctYear[0];
    let upper = currentArtifact.correctYear[1];
    if (sliderYear >= lower && sliderYear <= upper) {
      yearDiff = 0;
      isYearCorrect = true;
    } else {
      yearDiff = Math.min(Math.abs(sliderYear - lower), Math.abs(sliderYear - upper));
      isYearCorrect = false;
    }
  }
  
  let feedbackText = '';
  
  // Provide feedback on object guess
  if (selectedAnswer === currentArtifact.correctAnswer) {
    feedbackText += 'Correct object! ';
  } else {
    feedbackText += `Incorrect. The correct object is: ${currentArtifact.correctAnswer}. `;
  }
  
  // Provide feedback on year guess
  if (isYearCorrect) {
    feedbackText += 'Your year guess is correct.';
  } else {
    feedbackText += `Your year guess was off by ${yearDiff} year(s).`;
  }
  
  // Display feedback
  document.getElementById('feedback').innerText = feedbackText;

  // After 3 seconds, load a new artifact
  setTimeout(() => {
    loadNewArtifact();
  }, 3000);
});

// --- Image Zoom Functionality ---
// Enable zooming of the artifact image using the scroll wheel.
document.getElementById('artifact-container').addEventListener('wheel', function (e) {
  e.preventDefault(); // Prevent page scrolling during zoom

  const img = document.getElementById('artifact-image');
  const rect = this.getBoundingClientRect();

  // Calculate the cursor's relative position (percentage) within the container
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  const originX = (offsetX / rect.width) * 100;
  const originY = (offsetY / rect.height) * 100;
  img.style.transformOrigin = `${originX}% ${originY}%`;

  // Adjust zoom scale based on scroll direction
  if (e.deltaY < 0) {
    scale = Math.min(scale + 0.1, MAX_SCALE);
  } else {
    scale = Math.max(scale - 0.1, MIN_SCALE);
  }
  img.style.transform = `scale(${scale})`;
});

