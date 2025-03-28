document.addEventListener("DOMContentLoaded", function () {
  // Debug: Log that DOM is ready
  console.debug("DOM fully loaded and parsed.");

  // ================== Home Screen Setup ==================
  const playButton = document.getElementById('play-button');
  if (playButton) {
    playButton.addEventListener('click', function () {
      console.debug("Play button clicked.");
      document.getElementById('home-screen').style.display = 'none';
      document.getElementById('game-screen').style.display = 'block';
    });
  } else {
    console.error("Play button not found!");
  }

  // ================== Main Game Logic ==================
  let artifacts = [];
  let currentArtifact = null;
  let selectedAnswer = null;
  let roundCount = 0;
  let score = 0;
  let lives = 2;
  let usedQuestions = [];  // persists during the visit
  let objectCorrectOnFirstTry; // undefined initially
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

  // Load and display a new artifact, minimizing repeats if possible
  function loadNewArtifact() {
    lives = 2;  // reset lives for new question
    updateScoreboard();
    objectCorrectOnFirstTry = undefined;  // clear previous attempt info

    let availableIndices = [];
    for (let i = 0; i < artifacts.length; i++) {
      if (!usedQuestions.includes(i)) availableIndices.push(i);
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

    // Reset slider and its display
    const slider = document.getElementById('year-slider');
    slider.value = slider.min;
    slider.classList.remove('slider-active', 'slider-correct', 'slider-incorrect');
    document.getElementById('year-display').innerText = slider.value;

    selectedAnswer = null;
    document.getElementById('feedback').innerText = '';
    updateScoreboard();
  }

  // Update slider display live and add active styling
  document.getElementById('year-slider').addEventListener('input', function () {
    document.getElementById('year-display').innerText = this.value;
    this.classList.add('slider-active');
  });

  // Record user's selected answer and highlight with purple border
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

    // On first submission, if not perfect and lives remain, show partial feedback
    if (!isPerfect && lives > 1) {
      lives--;
      updateScoreboard();
      // Record if the object was correct on first try
      objectCorrectOnFirstTry = objectIsCorrect;

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

    // Final submission
    document.getElementById('submit-btn').disabled = true;

    // Update MC buttons styling
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

    // Revised Year Scoring (Tiered Scoring)
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
      } else {
        yearPoints = 0;
      }
    }

    // Object scoring: if object was correct on first try, 3 points; if on final submission, 1 point; else 0.
    let objectPoints = 0;
    if (objectIsCorrect) {
      objectPoints = (objectCorrectOnFirstTry === true) ? 3 : 1;
    }

    let questionScore = objectIsCorrect ? objectPoints + yearPoints : 0;

    score += questionScore;
    roundCount++;
    updateScoreboard();

    // Build detailed final feedback
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

    // For question 5, show a "Finish Game" button; otherwise, "Next Question"
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

  // Show score summary after 5 rounds with celebratory styling and a Play Again button.
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
      // Do not reset usedQuestions so that repeats are minimized.
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

  // Image Zoom Functionality
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
});
