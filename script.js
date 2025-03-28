// ================== Home Screen Setup ==================

document.getElementById('play-button').addEventListener('click', function () {
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';
});

// ================== Main Game Logic ==================

let artifacts = [];
let currentArtifact = null;
let selectedAnswer = null;
let roundCount = 0;
let score = 0;
let lives = 2;
let usedQuestions = [];  // persists across sessions in this visit

let scale = 1;
const MIN_SCALE = 1;
const MAX_SCALE = 3;

// Utility: Fisher-Yates Shuffle
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Update the scoreboard (round, score, lives)
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

// Load a new artifact, avoiding repeats if possible
function loadNewArtifact() {
  lives = 2;  // Reset lives for this question
  updateScoreboard();
  
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
    button.classList.remove('selected', 'correct-final', 'incorrect-final');
    button.style.border = '2px solid transparent';
    button.onclick = () => selectAnswer(button);
    choicesDiv.appendChild(button);
  });
  
  // Reset slider and its display dynamically
  const slider = document.getElementById('year-slider');
  slider.value = slider.min;
  slider.classList.remove('slider-active', 'slider-correct', 'slider-incorrect');
  document.getElementById('year-display').innerText = slider.value;
  
  selectedAnswer = null;
  document.getElementById('feedback').innerText = '';
  updateScoreboard();
}

// Update slider live on input and add active styling
document.getElementById('year-slider').addEventListener('input', function () {
  document.getElementById('year-display').innerText = this.value;
  this.classList.add('slider-active');
});

// When an answer is selected, highlight with a purple border
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

// Handle answer submission with partial feedback on first try and full details on final submission
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
  
  // If not perfect on first submission and lives remain, provide partial feedback:
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
    
    const sliderEl = document.getElementById('year-slider');
    sliderEl.classList.remove('slider-active');
    sliderEl.classList.add(isYearCorrect ? 'slider-correct' : 'slider-incorrect');
    
    document.getElementById('feedback').innerHTML = interimFeedback;
    return;
  }
  
  // Final submission: disable further submissions for this question.
  document.getElementById('submit-btn').disabled = true;
  
  // Update MC button styling: mark correct answer green; if selected answer is wrong, mark it red.
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
  
  const sliderEl = document.getElementById('year-slider');
  sliderEl.classList.remove('slider-active');
  sliderEl.classList.add(isYearCorrect ? 'slider-correct' : 'slider-incorrect');
  
  // Revised Tiered Year Scoring:
  // If the object is correct, award 3 points plus:
  //    If delta is 0: 2 points
  //    If delta <= 5: 1.5 points
  //    If delta <= 10: 1 point
  //    If delta <= 15: 0.5 points
  //    Else: 0 points.
  let yearPoints = 0;
  if (objectIsCorrect) {
    if (yearDiff === 0) {
      yearPoints = 2;
    } else if (yearDiff <= 5) {
      yearPoints = 1.5;
    } else if (yearDiff <= 10) {
      yearPoints = 1;
    } else if (yearDiff <= 15) {
      yearPoints = 0.5;
    }
  }
  
  let questionScore = 0;
  if (objectIsCorrect) {
    questionScore += 3;
    questionScore += yearPoints;
  }
  
  score += questionScore;
  roundCount++;
  updateScoreboard();
  
  // Build detailed final feedback message:
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
    feedbackText += '<span class="feedback-year" style="color:green;">Your year guess is correct.</span> ';
  } else {
    feedbackText += '<span class="feedback-year" style="color:red;">Your year guess was incorrect. ';
    if (typeof currentArtifact.correctYear === 'number') {
      feedbackText += 'The correct year is ' + currentArtifact.correctYear;
    } else if (Array.isArray(currentArtifact.correctYear)) {
      feedbackText += 'The correct year range is ' + currentArtifact.correctYear[0] + '–' + currentArtifact.correctYear[1];
    }
    feedbackText += ', and you were off by ' + yearDiff + ' year(s).</span> ';
  }
  feedbackText += '<br><span class="feedback-points">You earned ' + questionScore + ' point(s) for this question.</span>';
  
  const feedbackDiv = document.getElementById('feedback');
  feedbackDiv.innerHTML = feedbackText;
  
  const mainContent = document.getElementById('main-content');
  mainContent.classList.add((objectIsCorrect && isYearCorrect) ? 'flash-correct' : 'flash-incorrect');
  setTimeout(() => {
    mainContent.classList.remove('flash-correct', 'flash-incorrect');
  }, 500);
  
  // For the final (5th) question, show a "Finish Game" button instead of "Next Question"
  if (roundCount >= 5) {
    const finishButton = document.createElement('button');
    finishButton.innerText = 'Finish Game';
    finishButton.id = 'finish-btn';
    finishButton.style.marginTop = '20px';
    finishButton.onclick = function () {
      showScore();
    };
    feedbackDiv.appendChild(document.createElement('br'));
    feedbackDiv.appendChild(finishButton);
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

// Show score summary after 5 rounds with celebratory styling and a "Play Again" option.
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
    // Do not reset usedQuestions, to minimize repeats.
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

// Image Zoom Functionality on artifact display
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
