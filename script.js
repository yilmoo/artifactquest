// Global variables for artifact data and user selections
let artifacts = [];
let currentArtifact = null;
let selectedAnswer = null;

// Score, round, and used questions tracking
let roundCount = 0;
let score = 0;
let usedQuestions = [];

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

// Update Scoreboard Display
function updateScoreboard() {
  document.getElementById('round-display').innerText = roundCount;
  document.getElementById('score-display').innerText = score;
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

// Load and display a new artifact, avoiding repeats (as possible)
function loadNewArtifact() {
  // Filter available (unused) indices
  let availableIndices = [];
  for (let i = 0; i < artifacts.length; i++) {
    if (!usedQuestions.includes(i)) {
      availableIndices.push(i);
    }
  }
  if (availableIndices.length === 0) {
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
    button.onclick = () => selectAnswer(option);
    choicesDiv.appendChild(button);
  });

  // Reset slider and update its display
  const slider = document.getElementById('year-slider');
  slider.value = slider.min;
  document.getElementById('year-display').innerText = slider.value;

  // Clear previous selection and feedback
  selectedAnswer = null;
  document.getElementById('feedback').innerText = '';
  
  updateScoreboard();
}

// Update the displayed slider year as it moves
document.getElementById('year-slider').addEventListener('input', function () {
  document.getElementById('year-display').innerText = this.value;
});

// Record the user's selected answer and update UI
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

// Handle answer submission and display detailed feedback with scoring
document.getElementById('submit-btn').addEventListener('click', function () {
  if (!selectedAnswer) {
    alert('Please select an answer for what the object is.');
    return;
  }
  
  const sliderYear = parseInt(document.getElementById('year-slider').value, 10);
  let yearDiff = 0;
  let isYearCorrect = false;
  
  // Determine if correctYear is a single number (exact year) or an array (range)
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
  
  // Scoring Calculation:
  // - If object is correct, award 3 points.
  // - Only if the object is correct, calculate year points as: max(0, 2 - 0.5 * yearDiff)
  let questionScore = 0;
  if (selectedAnswer === currentArtifact.correctAnswer) {
    questionScore += 3;
    let yearPoints = Math.max(0, 2 - 0.5 * yearDiff);
    // Round yearPoints to one decimal place
    yearPoints = Math.round(yearPoints * 10) / 10;
    questionScore += yearPoints;
  }
  // If the object is incorrect, no points for this round.
  
  score += questionScore;
  roundCount++;
  updateScoreboard();
  
  // Build detailed feedback message
  let feedbackText = '';
  if (selectedAnswer === currentArtifact.correctAnswer) {
    feedbackText += 'Correct object! ';
  } else {
    feedbackText += `Incorrect. The correct object is: ${currentArtifact.correctAnswer}. `;
  }
  if (typeof currentArtifact.correctYear === 'number') {
    feedbackText += `Correct Year: ${currentArtifact.correctYear}. `;
  } else if (Array.isArray(currentArtifact.correctYear)) {
    feedbackText += `Correct Year Range: ${currentArtifact.correctYear[0]} - ${currentArtifact.correctYear[1]}. `;
  }
  if (isYearCorrect) {
    feedbackText += 'Your year guess is correct. ';
  } else {
    feedbackText += `Your year guess was off by ${yearDiff} year(s). `;
  }
  feedbackText += `You earned ${questionScore} point(s) for this question.`;
  
  const feedbackDiv = document.getElementById('feedback');
  feedbackDiv.innerText = feedbackText;
  
  // Visual flash effect on main content based on correctness
  const mainContent = document.getElementById('main-content');
  if (selectedAnswer === currentArtifact.correctAnswer && isYearCorrect) {
    mainContent.classList.add('flash-correct');
  } else {
    mainContent.classList.add('flash-incorrect');
  }
  setTimeout(() => {
    mainContent.classList.remove('flash-correct', 'flash-incorrect');
  }, 500);
  
  // Check if the session (5 rounds) is complete
  if (roundCount >= 5) {
    setTimeout(() => {
      showScore();
    }, 500);
  } else {
    // Instead of auto-advancing, display a "Next Question" button for user control
    const nextButton = document.createElement('button');
    nextButton.innerText = 'Next Question';
    nextButton.id = 'next-btn';
    nextButton.style.marginTop = '20px';
    nextButton.onclick = function () {
      nextButton.remove();
      loadNewArtifact();
    };
    feedbackDiv.appendChild(document.createElement('br'));
    feedbackDiv.appendChild(nextButton);
  }
});

// Display score summary screen after 5 rounds
function showScore() {
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('scoreboard').style.display = 'none';
  const scoreDiv = document.getElementById('score-summary');
  scoreDiv.style.display = 'block';
  scoreDiv.innerHTML = `
    <h2>Your Score: ${score} / 25</h2>
    <p>You completed ${roundCount} rounds.</p>
    <button id="play-again">Play Again</button>
  `;
  document.getElementById('play-again').onclick = function () {
    roundCount = 0;
    score = 0;
    usedQuestions = [];
    updateScoreboard();
    scoreDiv.style.display = 'none';
    document.getElementById('scoreboard').style.display = 'block';
    document.getElementById('main-content').style.display = 'block';
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
