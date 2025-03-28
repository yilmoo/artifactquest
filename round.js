document.addEventListener("DOMContentLoaded", function () {
  console.debug("DOM fully loaded in round.js.");

  // Retrieve header element for dynamic update
  const roundHeader = document.getElementById("round-header");

  // Retrieve saved game state from localStorage
  let roundCount = parseInt(localStorage.getItem("roundCount") || "0");
  let score = parseFloat(localStorage.getItem("score") || "0");
  let usedQuestions = JSON.parse(localStorage.getItem("usedQuestions") || "[]");

  // Immediately update dynamic header based on current round
  if (roundHeader) {
    roundHeader.innerText = "ArtifactQuest - Round " + (roundCount + 1);
  }

  let artifacts = [];
  let currentArtifact = null;
  let selectedAnswer = null;
  let lives = 2;
  let objectCorrectOnFirstTry; // will be true if the object was correct on the first try
  let scale = 1;
  const MIN_SCALE = 1;
  const MAX_SCALE = 3;
  let timeExpired = false; // Flag for timer expiration
  let timerInterval = null;

  // Start timer if Time Limit mode is enabled
  function startTimer() {
    const timerOption = localStorage.getItem("timerOption");
    if (timerOption === "timeLimit") {
      let timeLimit = parseInt(localStorage.getItem("timeLimitValue") || "60", 10);
      const timerDisplay = document.getElementById("timer-display");
      timerDisplay.innerText = "Time left: " + timeLimit + " seconds";
      timerInterval = setInterval(() => {
        timeLimit--;
        timerDisplay.innerText = "Time left: " + timeLimit + " seconds";
        if (timeLimit <= 0) {
          clearInterval(timerInterval);
          timeExpired = true;
          // Lock out inputs and hide the submit button when time expires
          lockInputs();
          alert("Time's up!");
          // Finalize the round regardless of partial input
          finalizeSubmission();
        }
      }, 1000);
    }
  }
  
  function clearTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  // Fisher-Yates Shuffle utility
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  
  function updateScoreboard() {
    document.getElementById("round-display").innerText = roundCount;
    document.getElementById("score-display").innerText = score;
    // Display hearts only if lives remain
    document.getElementById("lives-display").innerText = lives > 0 ? "♥".repeat(lives) : "";
    localStorage.setItem("roundCount", roundCount);
    localStorage.setItem("score", score);
    localStorage.setItem("usedQuestions", JSON.stringify(usedQuestions));
  }
  
  // Lock out all inputs and hide the submit button
  function lockInputs() {
    document.querySelectorAll("#choices button").forEach(btn => btn.disabled = true);
    document.getElementById("year-slider").disabled = true;
    document.getElementById("submit-btn").style.display = "none";
  }
  
  // Finalize submission: this branch locks everything, calculates the final score for the round,
  // and shows the final feedback (with a Next Question or Finish Game button).
  function finalizeSubmission() {
    // Lock inputs and remove lives (both hearts disappear)
    lockInputs();
    lives = 0;
    updateScoreboard();
    
    const sliderYear = parseInt(document.getElementById("year-slider").value, 10);
    let yearDiff = 0;
    let isYearCorrect = false;
    if (typeof currentArtifact.correctYear === "number") {
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
    
    // Determine if the object answer is correct. If no answer was selected, treat it as incorrect.
    const objectIsCorrect = (selectedAnswer === currentArtifact.correctAnswer);
    
    // Calculate final points:
    // If there was no selection at all, award 0.
    // Otherwise, if the object is correct:
    //   - If it was correct on the first try, award 3; else award 1.
    // Year points are awarded only if the object is correct.
    let objectPoints = 0;
    if (selectedAnswer) {
      objectPoints = objectIsCorrect ? (objectCorrectOnFirstTry === true ? 3 : 1) : 0;
    }
    let yearPoints = 0;
    if (selectedAnswer && objectIsCorrect) {
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
    let questionScore = selectedAnswer ? (objectIsCorrect ? (objectPoints + yearPoints) : 0) : 0;
    
    score += questionScore;
    roundCount++;
    updateScoreboard();
    
    // Build final feedback message:
    let feedbackText = "";
    if (!selectedAnswer) {
      feedbackText = '<span class="feedback-object" style="color:red;">Time\'s up! No answer provided. You earned 0 point(s).</span><br>';
      feedbackText += '<span class="feedback-object" style="color:red;">The correct object was: ' + currentArtifact.correctAnswer + '.</span> ';
    } else {
      feedbackText += objectIsCorrect ?
        '<span class="feedback-object" style="color:green;">Correct object!</span> ' :
        '<span class="feedback-object" style="color:red;">Incorrect. The correct object is: ' + currentArtifact.correctAnswer + '.</span> ';
    }
    
    if (typeof currentArtifact.correctYear === "number") {
      feedbackText += '<span class="feedback-year">Correct Year: ' + currentArtifact.correctYear + '.</span> ';
    } else if (Array.isArray(currentArtifact.correctYear)) {
      feedbackText += '<span class="feedback-year">Correct Year Range: ' + currentArtifact.correctYear[0] + ' - ' + currentArtifact.correctYear[1] + '.</span> ';
    }
    
    if (selectedAnswer) {
      feedbackText += isYearCorrect ?
        '<span class="feedback-year" style="color:green;">Your year guess is correct.</span> ' :
        '<span class="feedback-year" style="color:red;">Your year guess was incorrect. ' +
        (typeof currentArtifact.correctYear === "number" ?
         'The correct year is ' + currentArtifact.correctYear :
         'The correct year range is ' + currentArtifact.correctYear[0] + '–' + currentArtifact.correctYear[1]) +
        ', and you were off by ' + yearDiff + ' year(s).</span> ';
      feedbackText += '<br><span class="feedback-points">You earned ' + questionScore + ' point(s) for this question.</span>';
    }
    
    document.getElementById("feedback").innerHTML = feedbackText;
    
    const mainContent = document.getElementById("main-content");
    mainContent.classList.add((selectedAnswer && objectIsCorrect && isYearCorrect) ? "flash-correct" : "flash-incorrect");
    setTimeout(() => {
      mainContent.classList.remove("flash-correct", "flash-incorrect");
    }, 500);
    
    // Show the Next Question button for rounds 1–4 or Finish Game button for round 5
    const feedbackDiv = document.getElementById("feedback");
    if (roundCount >= 5) {
      const finishButton = document.createElement("button");
      finishButton.innerText = "Finish Game";
      finishButton.id = "finish-btn";
      finishButton.style.marginTop = "20px";
      finishButton.onclick = function () { window.location.href = "finalscore.html"; };
      feedbackDiv.appendChild(document.createElement("br"));
      feedbackDiv.appendChild(finishButton);
    } else {
      const nextButton = document.createElement("button");
      nextButton.innerText = "Next Question";
      nextButton.id = "next-btn";
      nextButton.style.marginTop = "20px";
      nextButton.onclick = function () {
        // Make sure the submit button is visible again for the next round
        document.getElementById("submit-btn").style.display = "inline-block";
        nextButton.remove();
        loadNewArtifact();
      };
      feedbackDiv.appendChild(document.createElement("br"));
      feedbackDiv.appendChild(nextButton);
    }
  }
  
  // Submit button event listener: this handles both manual submission and partial feedback.
  document.getElementById("submit-btn").addEventListener("click", function () {
    // If timer is still running and no object selected, alert the user.
    if (!timeExpired && !selectedAnswer) {
      alert("Please select an answer.");
      return;
    }
    // Stop the timer as the user is submitting
    clearTimer();
    
    // Evaluate the current attempt
    const sliderYear = parseInt(document.getElementById("year-slider").value, 10);
    let yearDiff = 0;
    let isYearCorrect = false;
    if (typeof currentArtifact.correctYear === "number") {
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
    
    // Determine if the object answer is correct
    const objectIsCorrect = (selectedAnswer === currentArtifact.correctAnswer);
    const isPerfect = selectedAnswer && objectIsCorrect && isYearCorrect;
    
    // If the answer is not perfect and you still have a life to use, provide partial feedback
    if (!isPerfect && lives > 1 && !timeExpired) {
      lives--;
      updateScoreboard();
      objectCorrectOnFirstTry = objectIsCorrect; // record the first attempt's object result
      let interimFeedback = "";
      interimFeedback += objectIsCorrect ?
        '<span class="feedback-object" style="color:green;">Your object answer is correct.</span> ' :
        '<span class="feedback-object" style="color:red;">Your object answer is incorrect.</span> ';
      interimFeedback += isYearCorrect ?
        '<span class="feedback-year" style="color:green;">Your year guess is correct.</span>' :
        '<span class="feedback-year" style="color:red;">Your year guess is incorrect.</span>';
      interimFeedback += '<br><strong>Please try again. Lives remaining: ' + "♥".repeat(lives) + '</strong>';
      
      const sliderEl = document.getElementById("year-slider");
      sliderEl.classList.remove("slider-active");
      sliderEl.classList.add(isYearCorrect ? "slider-correct" : "slider-incorrect");
      
      document.getElementById("feedback").innerHTML = interimFeedback;
      
      // Re-enable inputs for the retry attempt and restart the timer
      document.getElementById("submit-btn").style.display = "inline-block";
      // (Keep the current selection and slider value so the user can adjust if needed)
      startTimer();
      return;
    } else {
      // Either the answer is perfect, no lives remain, or time has expired – finalize submission.
      finalizeSubmission();
    }
  });
  
  // Load a new artifact and prepare the round
  function loadNewArtifact() {
    clearTimer();
    lives = 2;
    timeExpired = false;
    updateScoreboard();
    objectCorrectOnFirstTry = undefined;
    
    // Update dynamic header based on the updated roundCount
    roundCount = parseInt(localStorage.getItem("roundCount") || "0");
    if (roundHeader) {
      roundHeader.innerText = "ArtifactQuest - Round " + (roundCount + 1);
    }
    
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
    const artifactImage = document.getElementById("artifact-image");
    artifactImage.src = currentArtifact.imageURL;
    artifactImage.alt = currentArtifact.correctAnswer;
  
    // Generate multiple-choice options
    const options = shuffle([currentArtifact.correctAnswer, ...currentArtifact.distractors]);
    const choicesDiv = document.getElementById("choices");
    choicesDiv.innerHTML = "";
    options.forEach(option => {
      const button = document.createElement("button");
      button.innerText = option;
      button.classList.remove("selected", "correct-final", "incorrect-final");
      button.style.border = "2px solid transparent";
      button.disabled = false;
      button.onclick = () => selectAnswer(button);
      choicesDiv.appendChild(button);
    });
  
    // Reset slider
    const slider = document.getElementById("year-slider");
    slider.value = slider.min;
    slider.disabled = false;
    slider.classList.remove("slider-active", "slider-correct", "slider-incorrect");
    document.getElementById("year-display").innerText = slider.value;
  
    // Clear feedback and selected answer
    selectedAnswer = null;
    document.getElementById("feedback").innerHTML = "";
    updateScoreboard();
    
    // Ensure the submit button is visible
    document.getElementById("submit-btn").style.display = "inline-block";
    
    // Start timer for this round
    startTimer();
  }
  
  // Slider event listener: update display as the slider moves
  document.getElementById("year-slider").addEventListener("input", function () {
    document.getElementById("year-display").innerText = this.value;
    this.classList.add("slider-active");
  });
  
  // Record the selected answer when a multiple-choice button is clicked
  function selectAnswer(buttonElement) {
    selectedAnswer = buttonElement.innerText;
    const buttons = document.querySelectorAll("#choices button");
    buttons.forEach(btn => {
      btn.classList.remove("selected");
      btn.style.border = "2px solid transparent";
    });
    buttonElement.classList.add("selected");
    buttonElement.style.border = "2px solid purple";
  }
  
  // Fetch artifact data and start the first round
  fetch("data.json")
    .then(response => response.json())
    .then(data => {
      artifacts = data;
      loadNewArtifact();
      document.getElementById("loading").style.display = "none";
      document.getElementById("main-content").style.display = "block";
    })
    .catch(error => {
      console.error("Error loading data:", error);
      document.getElementById("loading").innerText = "Error loading data. Please refresh the page.";
    });
  
  // Image zoom functionality
  document.getElementById("artifact-container").addEventListener("wheel", function (e) {
    e.preventDefault();
    const img = document.getElementById("artifact-image");
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
