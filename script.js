// Global variables for artifact data and user selections
let artifacts = [];
let currentArtifact = null;
let selectedAnswer = null;

// Score, round, lives, and used questions tracking
let roundCount = 0;
let score = 0;
let lives = 2;
let usedQuestions = [];

// Zoom settings for the artifact image
let scale = 1;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

// Volume control: initialize background music element
const music = document.getElementById('background-music');
music.volume = 1; // Volume initially 100%

// Utility: Fisher-Yates Shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Update Scoreboard Display, including lives shown as ♥
function updateScoreboard() {
  document.getElementById('round-display').innerText = roundCount;
  document.getElementById('score-display').innerText = score;
  document.getElementById('lives-display').innerText = "♥".repeat(lives);
}

// Load JSON data from data.json
fetch('data.json')
  .then(response => response.json())
  .then(data => {
    artifacts = data;
    loadNewArtifact();
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
  })
  .catch(error => {
    console.error('Error loading data:', error);
    document.getElementById('loading').innerText = 'Error loading data. Please refresh the page.';
  });

// Load and display a new artifact, avoiding repeats if possible
function loadNewArtifact() {
  // Reset lives for new question; do not reset usedQuestions between sessions
  lives = 2;
  updateScoreboard();

  let availableIndices = [];
  for (let i = 0; i < artifacts.length; i++) {
    if (!usedQuestions.includes(i)) {
      availableIndices.push(i);
    }
  }
  if (availableIndices.length === 0) {
    // If entire bank used, clear only then
    usedQuestions = [];
    availableIndices = artifacts.map((_, i) => i);
  }
  const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
  usedQuestions.push(randomIndex);
  currentArtifact = artifacts[randomIndex];

  // Update artifact image
  const artifactImage = document.getElementById('artifact-image');
  artifactImage.src = currentArtifact.imageURL;
  artifactImage.alt = currentArtifact.correctAnswer;

  // Generate multiple-choice options (shuffled)
  const options = shuffle([currentArtifact.correctAnswer, ...currentArtifact.distractors]);
  const choicesDiv = document.getElementById('choices');
  choicesDiv.innerHTML = '';
  options.forEach(option => {
    const button = document.createElement('button');
    button.innerText = option;
    button.classList.remove('selected', 'correct-final', 'incorrect-final');
    button.style.border = '2px solid transparent';
    button.onclick = () => selectAnswer(button);
    choicesDiv.appendChild(button);
  });

  // Reset slider and remove dynamic border classes
  const slider = document.getElementById('year-slider');
  slider.value = slider.min;
  slider.classList.remove('slider-active', 'slider-correct', 'slider-incorrect');
  document.getElementById('year-display').innerText = slider.value;
  
  // Clear previous selection and feedback
  selectedAnswer = null;
  document.getElementById('feedback').innerText = '';
  updateScoreboard();
}

// Update slider display as it moves; add active border
document.getElementById('year-slider').addEventListener('input', function () {
  document.getElementById('year-display').innerText = this.value;
  this.classList.add('slider-active');
});

// Record selected answer and highlight with purple border
function selectAnswer(buttonElement) {
  selectedAnswer = buttonElement.innerText;
  const buttons = document.querySelectorAll('#choices button');
  buttons.forEach(btn => {
    btn.classList.remove('selected');
    btn.style.border = '2px solid transparent';
  });
  buttonElement.classList.add('selected');
  buttonElement.style.border = '2px solid purple';
}

// Handle answer submission
document.getElementById('submit-btn').addEventListener('click', function () {
  if (!selectedAnswer) {
    alert('Please select an answer for what the object is.');
    return;
  }
  
  const sliderYear = parseInt(document.getElementById('year-slider').value, 10);
  let yearDiff = 0;
  let isYearCorrect = false;
  if (typeof currentArtifact.correctYear === 'number') {
    yearDiff = Math.abs(sliderYear - currentArtifact.correctYear);
    isYearCorrect = (yearDiff === 0);
  } else if (Array.isArray(currentArtifact.correctYear)) {
    const lower = currentArtifact.correctYear[0];
    const upper = currentArtifact.correctYear[1];
    if (sliderYear >= lower && sliderYear <= upper) {
      yearDiff = 0;
      isYearCorrect = true;
    } else {
      yearDiff = Math.min(Math.abs(sliderYear - lower), Math.abs(sliderYear - upper));
      isYearCorrect = false;
    }
  }
  
  const objectIsCorrect = (selectedAnswer === currentArtifact.correctAnswer);
  const isPerfect = objectIsCorrect && isYearCorrect;
  
  // First submission: if not perfect and lives > 1, give partial feedback:
  // Indicate if the object is correct and if the year guess is correct (but do not reveal correct year/delta)
  if (!isPerfect && lives > 1) {
    lives--;
    updateScoreboard();
    let interimFeedback = "";
    if (objectIsCorrect) {
      interimFeedback += '<span class="feedback-object" style="color:green;">Your object answer is correct.</span> ';
    } else {
      interimFeedback += '<span class="feedback-object" style="color:red;">Your object answer is incorrect.</span> ';
    }
    if (isYearCorrect) {
      interimFeedback += '<span class="feedback-year" style="color:green;">Your year guess is correct.</span>';
    } else {
      interimFeedback += '<span class="feedback-year" style="color:red;">Your year guess is incorrect.</span>';
    }
    interimFeedback += '<br><strong>Please try again. Lives remaining: ' + "♥".repeat(lives) + '</strong>';
    
    // Update slider border based on current year guess
    const sliderEl = document.getElementById('year-slider');
    sliderEl.classList.remove('slider-active');
    if (isYearCorrect) {
      sliderEl.classList.add('slider-correct');
    } else {
      sliderEl.classList.add('slider-incorrect');
    }
    
    document.getElementById('feedback').innerHTML = interimFeedback;
    return;
  }
  
  // Final submission: disable further submissions
  document.getElementById('submit-btn').disabled = true;
  
  // Update MC buttons: mark correct answer green and selected if wrong in red
  const buttons = document.querySelectorAll('#choices button');
  buttons.forEach(btn => {
    if (btn.innerText === currentArtifact.correctAnswer) {
      btn.classList.add('correct-final');
      btn.style.border = '2px solid green';
    } else if (btn.innerText === selectedAnswer) {
      btn.classList.add('incorrect-final');
      btn.style.border = '2px solid red';
    }
  });
  
  // Final slider styling
  const sliderEl = document.getElementById('year-slider');
  sliderEl.classList.remove('slider-active');
  if (isYearCorrect) {
    sliderEl.classList.add('slider-correct');
  } else {
    sliderEl.classList.add('slider-incorrect');
  }
  
  // Scoring Calculation:
  // If object is correct, award 3 points and if so, compute yearPoints = max(0, 2 - 0.5 * yearDiff), rounded to 1 decimal.
  let questionScore = 0;
  if (objectIsCorrect) {
    questionScore += 3;
    let yearPoints = Math.max(0, 2 - 0.5 * yearDiff);
    yearPoints = Math.round(yearPoints * 10) / 10;
    questionScore += yearPoints;
  }
  
  score += questionScore;
  roundCount++;
  updateScoreboard();
  
  // Build full detailed feedback message
  let feedbackText = "";
  if (objectIsCorrect) {
    feedbackText += '<span class="feedback-object" style="color:green;">Correct object!</span> ';
  } else {
    feedbackText += '<span class="feedback-object" style="color:red;">Incorrect. The correct object is: ' + currentArtifact.correctAnswer + '.</span> ';
  }
  if (typeof currentArtifact.correctYear === 'number') {
    feedbackText += '<span class="feedback-year">Correct Year: ' + currentArtifact.correctYear + '.</span> ';
  } else if (Array.isArray(currentArtifact.correctYear)) {
    feedbackText += '<span class="feedback-year">Correct Year Range: ' + currentArtifact.correctYear[0] + ' - ' + currentArtifact.correctYear[1] + '.</span> ';
  }
  if (isYearCorrect) {
    feedbackText += '<span class="feedback-year">Your year guess is correct.</span> ';
  } else {
    // Now reveal details if final submission is incorrect for year:
    feedbackText += '<span class="feedback-year" style="color:red;">Your year guess was incorrect. ';
    if (typeof currentArtifact.correctYear === 'number') {
      feedbackText += 'The correct year is ' + currentArtifact.correctYear;
    } else if (Array.isArray(currentArtifact.correctYear)) {
      feedbackText += 'The correct year range is from ' + currentArtifact.correctYear[0] + ' to ' + currentArtifact.correctYear[1];
    }
    feedbackText += ', and you were off by ' + yearDiff + ' year(s).</span> ';
  }
  feedbackText += '<br><span class="feedback-points">You earned ' + questionScore + ' point(s) for this question.</span>';
  
  const feedbackDiv = document.getElementById('feedback');
  feedbackDiv.innerHTML = feedbackText;
  
  // Apply flash effect on main content
  const mainContent = document.getElementById('main-content');
  if (objectIsCorrect && isYearCorrect) {
    mainContent.classList.add('flash-correct');
  } else {
    mainContent.classList.add('flash-incorrect');
  }
  setTimeout(() => {
    mainContent.classList.remove('flash-correct', 'flash-incorrect');
  }, 500);
  
  // End of question: if 5 rounds complete, show score summary; otherwise, add a "Next Question" button
  if (roundCount >= 5) {
    setTimeout(() => { showScore(); }, 500);
  } else {
    const nextButton = document.createElement('button');
    nextButton.innerText = 'Next Question';
    nextButton.id = 'next-btn';
    nextButton.style.marginTop = '20px';
    nextButton.onclick = function () {
      document.getElementById('submit-btn').disabled = false;
      nextButton.remove();
      loadNewArtifact();
    };
    feedbackDiv.appendChild(document.createElement('br'));
    feedbackDiv.appendChild(nextButton);
  }
});

// Display score summary after 5 rounds with celebratory styling and a "Play Again" button.
// Note: Do NOT reset usedQuestions between sessions to avoid repeats.
function showScore() {
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('scoreboard').style.display = 'none';
  const scoreDiv = document.getElementById('score-summary');
  scoreDiv.style.display = 'block';
  scoreDiv.innerHTML = `
    <h2>Congratulations!</h2>
    <h2>Your Score: ${score} / 25</h2>
    <p>You completed ${roundCount} rounds.</p>
    <button id="play-again">Play Again</button>
  `;
  document.getElementById('play-again').onclick = function () {
    // Do NOT reset usedQuestions between sessions so that repeats are avoided as much as possible.
    roundCount = 0;
    score = 0;
    updateScoreboard();
    scoreDiv.style.display = 'none';
    document.getElementById('scoreboard').style.display = 'block';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('submit-btn').disabled = false;
    loadNewArtifact();
  };
}

// --- Image Zoom Functionality ---
document.getElementById('artifact-container').addEventListener('wheel', function(e) {
  e.preventDefault();
  const img = document.getElementById('artifact-image');
  const rect = this.getBoundingClientRect();
  const offsetX = e.clientX - rect.left;
  const offsetY = e.clientY - rect.top;
  const originX = (offsetX / rect.width) * 100;
  const originY = (offsetY / rect.height) * 100;
  img.style.transformOrigin = `${originX}% ${originY}%`;
  if (e.deltaY < 0) {
    scale = Math.min(scale + 0.1, MAX_SCALE);
  } else {
    scale = Math.max(scale - 0.1, MIN_SCALE);
  }
  img.style.transform = `scale(${scale})`;
});

// --- Volume Control Functionality ---
const volumeButton = document.getElementById('volume-button');
const volumeSlider = document.getElementById('volume-slider');

function updateVolume() {
  const vol = volumeSlider.value / 100; // convert percentage to decimal
  music.volume = vol;
  if (vol === 0) {
    volumeButton.innerText = "🔇";
  } else {
    volumeButton.innerText = "🔊";
  }
}

// When the volume slider changes, update the music volume
volumeSlider.addEventListener('input', updateVolume);

// Toggle mute when volume button is clicked
volumeButton.addEventListener('click', function() {
  if (music.muted) {
    music.muted = false;
    volumeButton.innerText = "🔊";
    updateVolume(); // update volume from slider
  } else {
    music.muted = true;
    volumeButton.innerText = "🔇";
  }
});
