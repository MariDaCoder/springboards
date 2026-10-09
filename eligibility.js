(() => {
  const questionScreen = document.getElementById("questionScreen");
  const resultScreen = document.getElementById("resultScreen");
  const questionForm = document.getElementById("questionForm");
  const questionMount = document.getElementById("questionMount");
  const questionError = document.getElementById("questionError");
  const stepCount = document.getElementById("stepCount");
  const progressTrack = document.querySelector(".wizard-progress-track");
  const progressValue = document.getElementById("progressValue");
  const backButton = document.getElementById("backButton");
  const nextButton = document.getElementById("nextButton");
  const resultTop = document.getElementById("resultTop");
  const resultEyebrow = document.getElementById("resultEyebrow");
  const resultTitle = document.getElementById("resultTitle");
  const resultMessage = document.getElementById("resultMessage");
  const profileIntro = document.getElementById("profileIntro");
  const profileTags = document.getElementById("profileTags");
  const activityCode = document.getElementById("activityCode");
  const restartButton = document.getElementById("restartButton");

  if (!questionScreen || !resultScreen || !questionForm || !questionMount || !questionError ||
      !stepCount || !progressTrack || !progressValue || !backButton || !nextButton || !resultTop ||
      !resultEyebrow || !resultTitle || !resultMessage || !profileIntro || !profileTags || !activityCode ||
      !restartButton) return;

  const barrierChoices = [
    { value: "displaced-homemaker", label: "I’m rebuilding after caring for home or family", detail: "Displaced homemaker", icon: "🏡" },
    { value: "low-income", label: "My household income is limited", detail: "Low-income household", icon: "🌱" },
    { value: "native", label: "I’m American Indian, Alaska Native, or Native Hawaiian", detail: "Native community member", icon: "🧡" },
    { value: "disability", label: "I live with a disability", detail: "Person with a disability", icon: "♿" },
    { value: "justice-involved", label: "I’ve been involved with the justice system", detail: "Justice-involved / returning citizen", icon: "🤝" },
    { value: "foster-care", label: "I’m in foster care or have aged out", detail: "Foster care experience (adult pathway)", icon: "🏠" },
    { value: "english-literacy-cultural", label: "Language, reading, or cultural barriers make work harder to access", detail: "Language, literacy, or cultural barrier", icon: "💬" },
    { value: "farmworker", label: "I’m an eligible migrant or seasonal farmworker", detail: "Migrant or seasonal farmworker", icon: "🌾" },
    { value: "single-parent", label: "I’m raising a child on my own, or expecting a child on my own", detail: "Single parent / single expectant parent", icon: "🫶" },
    { value: "long-term-unemployed", label: "I’ve been out of work for 27 weeks or more", detail: "Long-term unemployed (27+ weeks)", icon: "📅" },
    { value: "public-assistance", label: "I receive public assistance or TANF, or my TANF benefits have ended", detail: "Public assistance / current or exhausted TANF", icon: "🧾" },
    { value: "dislocated-worker", label: "I lost my job and may qualify for support to get back to work", detail: "Worker displaced from a previous job", icon: "🧰" },
    { value: "homeless", label: "I’m without stable housing right now", detail: "Without stable housing", icon: "🧭" },
    { value: "none", label: "None of these sound like me", detail: "No barrier selected", icon: "↔️" },
    { value: "unsure", label: "I’m not sure yet", detail: "Barrier needs a conversation", icon: "❔" }
  ];

  const chronicChoices = [
    {
      value: "significant-unemployment",
      label: "I’m out of work now, and it’s been a big part of the last six months",
      detail: "Out of work for a significant part of the last 26 weeks",
      image: "/trades-team.webp",
      icon: "🗓️"
    },
    {
      value: "minimum-wage",
      label: "Most of my jobs have paid minimum wage",
      detail: "Work history is mainly minimum-wage jobs",
      image: "/classroom-training.webp",
      icon: "💵"
    },
    {
      value: "limited-mismatch-work",
      label: "My current job is seasonal, temporary, under 10 weeks, or below my skills",
      detail: "Short-term, seasonal, or below-skill work",
      image: "/hands-on-training.webp",
      icon: "🛠️"
    },
    {
      value: "ui",
      label: "I’m receiving unemployment benefits or have used them up",
      detail: "Receiving or exhausted unemployment benefits",
      image: "/classroom-discussion.webp",
      icon: "📄"
    },
    {
      value: "justice-recent",
      label: "I’m on parole or probation, or came home from jail or prison in the last year",
      detail: "Parole, probation, or release within the past 12 months",
      image: "/trades-team.webp",
      icon: "🔑"
    },
    {
      value: "low-income-standard",
      label: "My income is below the local basic-needs guideline",
      detail: "Income below the local basic-needs threshold",
      image: "/04_hero_photo_clean.webp",
      icon: "🏘️"
    },
    {
      value: "wioa-dislocated-worker",
      label: "I lost a job and qualify for help finding a new path",
      detail: "Eligible worker who lost a previous job",
      image: "/electrical-training.webp",
      icon: "🔌"
    },
    { value: "none", label: "None of these fit my situation", detail: "No chronic-unemployment scenario selected", icon: "↔️" },
    { value: "unsure", label: "I’m not sure—let’s talk it through", detail: "Work-history scenario needs a conversation", icon: "❔" }
  ];

  const answers = {};
  let currentQuestion = 0;
  let youthWorkHistoryApplies = false;

  const getQuestions = () => {
    const questions = [
      {
        name: "age",
        prompt: "How old are you?",
        help: "Transitional Jobs is an adult pathway. Choose the range that fits you today.",
        type: "single",
        layout: "compact",
        choices: [
          { value: "under-18", label: "17 or younger", detail: "I’m not yet 18", icon: "🌿" },
          { value: "18-24", label: "18–24", detail: "I’m a young adult", icon: "✨" },
          { value: "25-plus", label: "25 or older", detail: "I’m an adult", icon: "💪" },
          { value: "unsure", label: "I’d like help figuring that out", detail: "Let’s confirm together", icon: "❔" }
        ]
      },
      {
        name: "apprentice",
        prompt: "Are you currently an apprentice?",
        help: "Choose the answer that fits right now.",
        type: "single",
        layout: "compact",
        choices: [
          { value: "yes", label: "Yes, I’m an apprentice", icon: "🧑🏾‍🏭" },
          { value: "no", label: "No, I’m not an apprentice", icon: "🙌🏾" },
          { value: "unsure", label: "I’m not sure", icon: "❔" }
        ]
      }
    ];

    if (answers.age === "18-24") {
      questions.push({
        name: "youthWbl",
        prompt: "Have you already taken part in work-based learning as a young person?",
        help: "This can include a work experience placement or learning on a job site.",
        type: "single",
        layout: "compact",
        choices: [
          { value: "yes", label: "Yes, I have", icon: "🧰" },
          { value: "no", label: "No, I haven’t", icon: "🌟" },
          { value: "unsure", label: "I’m not sure", icon: "❔" }
        ]
      });
    }

    questions.push(
      {
        name: "barriers",
        prompt: "Which of these sound like your situation?",
        help: "Pick every one that fits. These are different life experiences that can make finding or keeping a good job harder.",
        type: "multiple",
        layout: "chips",
        choices: barrierChoices
      },
      {
        name: "chronic",
        prompt: "Which work or benefit situations have you experienced?",
        help: "Pick any card that feels familiar. We’re looking at the full picture—not just what’s happening this week.",
        type: "multiple",
        layout: "scenarios",
        choices: chronicChoices
      },
      {
        name: "inconsistentWork",
        prompt: "Have most of your jobs lasted about six months or less, with gaps between them?",
        help: "Think about the pattern across your work history. Short jobs followed by time out of work count.",
        type: "single",
        layout: "scenarios",
        choices: [
          { value: "yes", label: "Yes—short jobs and gaps are part of my story", detail: "My jobs have often been around six months or less, with breaks between them.", image: "/hands-on-training.webp", icon: "🔁" },
          { value: "no", label: "No—my work history has been mostly steady", detail: "I’ve usually stayed in jobs longer, without long gaps.", image: "/trades-team.webp", icon: "🧱" },
          { value: "unsure", label: "I’m not sure", detail: "I’d like someone to help me look at my work history.", icon: "❔" }
        ]
      }
    );
    return questions;
  };

  const isMultiChoice = (question) => question.type === "multiple";

  const updateProgress = (question, questionIndex, questionCount) => {
    stepCount.textContent = `Question ${questionIndex + 1} of ${questionCount}`;
    const percentage = Math.round(((questionIndex + 1) / questionCount) * 100);
    progressValue.style.width = `${percentage}%`;
    progressTrack.setAttribute("aria-valuenow", String(percentage));
    nextButton.hidden = !isMultiChoice(question);
    backButton.hidden = questionIndex === 0;
    nextButton.textContent = questionIndex === questionCount - 1 ? "See my next step →" : "Continue →";
  };

  const renderChoice = (question, choice, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    const isScenario = question.layout === "scenarios" && Boolean(choice.image);

    input.type = isMultiChoice(question) ? "checkbox" : "radio";
    input.name = question.name;
    input.value = choice.value;
    input.id = `${question.name}-${index}`;
    input.checked = isMultiChoice(question)
      ? (answers[question.name] || []).includes(choice.value)
      : answers[question.name] === choice.value;
    if (!isMultiChoice(question)) input.required = true;

    if (isScenario) {
      label.className = "wizard-scenario";
      label.htmlFor = input.id;
      label.append(input);
      const photo = document.createElement("span");
      photo.className = "wizard-scenario-photo";
      photo.setAttribute("aria-hidden", "true");
      if (choice.image) {
        const image = document.createElement("img");
        image.src = choice.image;
        image.alt = "";
        image.loading = "lazy";
        photo.append(image);
      }
      const mark = document.createElement("span");
      mark.className = "wizard-scenario-mark";
      mark.textContent = choice.icon || "✦";
      photo.append(mark);
      label.append(photo);
      const copy = document.createElement("span");
      copy.className = "wizard-scenario-copy";
      const title = document.createElement("strong");
      title.textContent = choice.label;
      copy.append(title);
      if (choice.detail) {
        const detail = document.createElement("span");
        detail.textContent = choice.detail;
        copy.append(detail);
      }
      label.append(copy);
      return label;
    }

    label.className = "wizard-choice";
    label.htmlFor = input.id;
    label.append(input);
    if (choice.icon) {
      const icon = document.createElement("span");
      icon.className = "wizard-choice-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = choice.icon;
      label.append(icon);
    }
    const copy = document.createElement("span");
    copy.className = "wizard-choice-copy";
    const title = document.createElement("strong");
    title.textContent = choice.label;
    copy.append(title);
    if (choice.detail) {
      const detail = document.createElement("span");
      detail.textContent = choice.detail;
      copy.append(detail);
    }
    label.append(copy);
    return label;
  };

  const renderQuestion = () => {
    const questions = getQuestions();
    currentQuestion = Math.min(currentQuestion, questions.length - 1);
    const question = questions[currentQuestion];
    questionMount.replaceChildren();
    questionError.textContent = "";
    updateProgress(question, currentQuestion, questions.length);

    const fieldset = document.createElement("fieldset");
    fieldset.className = "wizard-fieldset";
    fieldset.setAttribute("aria-describedby", question.help ? "activeQuestionHelp" : "");

    const legend = document.createElement("legend");
    legend.id = "questionTitle";
    legend.className = "wizard-question";
    legend.tabIndex = -1;
    legend.textContent = question.prompt;
    fieldset.append(legend);

    if (question.help) {
      const help = document.createElement("p");
      help.id = "activeQuestionHelp";
      help.className = "wizard-help";
      help.textContent = question.help;
      fieldset.append(help);
    }

    const options = document.createElement("div");
    options.className = `wizard-${question.layout === "scenarios" ? "scenarios" : "options"}${question.layout === "compact" ? " is-compact" : question.layout === "chips" ? " is-chips" : ""}`;
    question.choices.forEach((choice, index) => options.append(renderChoice(question, choice, index)));
    fieldset.append(options);
    questionMount.append(fieldset);

    fieldset.addEventListener("change", (event) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement)) return;
      questionError.textContent = "";
      if (isMultiChoice(question)) {
        const checked = Array.from(fieldset.querySelectorAll('input[type="checkbox"]:checked'));
        const exclusiveChoice = input.value === "none" || input.value === "unsure";
        if (exclusiveChoice && input.checked) {
          checked.forEach((other) => { if (other !== input) other.checked = false; });
        } else if (input.checked) {
          fieldset.querySelectorAll('input[value="none"], input[value="unsure"]').forEach((other) => { other.checked = false; });
        }
        answers[question.name] = Array.from(fieldset.querySelectorAll('input[type="checkbox"]:checked')).map((item) => item.value);
        return;
      }

      const previousAge = answers.age;
      answers[question.name] = input.value;
      if (question.name === "age") {
        youthWorkHistoryApplies = input.value === "18-24";
        if (previousAge !== input.value) delete answers.youthWbl;
      }
      if (question.name === "age" && input.value === "under-18") {
        showResult("not-eligible", "Age is the only thing holding this path back right now.", "Transitional Jobs is for adults 18 and older. You can still talk with Springboards about other ways to learn a trade and build your future.");
        return;
      }
      if (question.name === "apprentice" && input.value === "yes") {
        showResult("not-eligible", "You’re already on an apprenticeship path.", "Apprentices are not eligible for Transitional Jobs. Keep building on the path you’re on, and reach out if you want to explore other Springboards support.");
        return;
      }
      if (question.name === "youthWbl" && input.value === "yes") {
        showResult("not-eligible", "This Transitional Jobs path may not be the right fit today.", "Young people who have already taken part in work-based learning are not eligible for this program. Your skills still matter—our team can help you explore another next step.");
        return;
      }
      const latestQuestions = getQuestions();
      const nextQuestion = latestQuestions[currentQuestion + 1];
      if (nextQuestion) {
        currentQuestion += 1;
        renderQuestion();
      } else {
        evaluateAnswers();
      }
    });

    legend.focus({ preventScroll: true });
  };

  const addTag = (label) => {
    const item = document.createElement("li");
    item.className = "wizard-tag";
    item.textContent = label;
    profileTags.append(item);
  };

  const renderProfile = (outcome) => {
    profileTags.replaceChildren();
    const barrierValues = answers.barriers || [];
    const chronicValues = answers.chronic || [];
    barrierValues.forEach((value) => {
      const item = barrierChoices.find((choice) => choice.value === value);
      if (item && value !== "none" && value !== "unsure") addTag(item.detail);
    });
    chronicValues.forEach((value) => {
      const item = chronicChoices.find((choice) => choice.value === value);
      if (item && value !== "none" && value !== "unsure") addTag(item.detail);
    });
    if (answers.inconsistentWork === "yes") addTag("Short-term jobs with gaps between work");
    if (youthWorkHistoryApplies) addTag("Young adult · ages 18–24");
    if (!profileTags.childElementCount) {
      const fallback = outcome === "not-eligible"
        ? "No matching barrier or work-history tags selected"
        : "A team member can help fill in the details";
      addTag(fallback);
    }
  };

  function showResult(outcome, message, title) {
    questionScreen.hidden = true;
    resultScreen.hidden = false;
    resultTop.dataset.outcome = outcome;
    activityCode.hidden = outcome !== "eligible";
    if (outcome === "eligible") {
      resultEyebrow.textContent = "YOUR TRANSITIONAL JOBS PROFILE";
      resultTitle.textContent = "This could be your next step.";
      resultMessage.textContent = "Your answers line up with the starting points for paid work experience and hands-on skill-building. Let’s keep the momentum going with a conversation.";
      profileIntro.textContent = "Based on what you shared, here are the strengths and experiences to bring into your next-step conversation:";
    } else if (outcome === "not-eligible") {
      resultEyebrow.textContent = "A DIFFERENT NEXT STEP";
      resultTitle.textContent = title || "Not eligible for Transitional Jobs right now";
      resultMessage.textContent = message || "Your answers do not match the starting requirements for this paid work experience path. Springboards can still talk with you about other ways to build skills.";
      profileIntro.textContent = "Here’s a simple snapshot of what you shared:";
    } else {
      resultEyebrow.textContent = "LET’S CHECK THIS TOGETHER";
      resultTitle.textContent = "A quick conversation can help.";
      resultMessage.textContent = "There may be a path here, and a couple of details need a closer look. Our team can help connect the dots—no need to figure it all out alone.";
      profileIntro.textContent = "Here are the work and life experiences you selected. A team member can help confirm anything still unclear:";
    }
    renderProfile(outcome);
    resultTitle.focus();
  }

  function evaluateAnswers() {
    const barriers = answers.barriers || [];
    const chronic = answers.chronic || [];
    const hasBarrier = barriers.some((value) => value !== "none" && value !== "unsure");
    const hasChronicCriterion = chronic.some((value) => value !== "none" && value !== "unsure");
    const hasInconsistentCriterion = answers.inconsistentWork === "yes";
    const hasEmploymentCriterion = hasChronicCriterion || hasInconsistentCriterion;
    const hasHardExclusion = answers.age === "under-18" || answers.apprentice === "yes" || answers.youthWbl === "yes";
    const ageIsAdult = answers.age === "18-24" || answers.age === "25-plus";

    if (hasHardExclusion) {
      showResult("not-eligible");
      return;
    }

    const barrierWasUnclear = !hasBarrier && barriers.includes("unsure");
    const employmentWasUnclear = !hasEmploymentCriterion && (chronic.includes("unsure") || answers.inconsistentWork === "unsure");
    const exclusionWasUnclear = answers.age === "unsure" || answers.apprentice === "unsure" || (youthWorkHistoryApplies && answers.youthWbl === "unsure");
    if (exclusionWasUnclear || barrierWasUnclear || employmentWasUnclear) {
      showResult("review");
      return;
    }

    if (!ageIsAdult || !hasBarrier || !hasEmploymentCriterion) {
      let message = "Based on these answers, the starting requirements for this program are not all in place yet. A Career Center or Springboards team member can help you explore other ways to move forward.";
      if (!hasBarrier) message = "This path needs at least one listed barrier to employment, and none were selected. That does not close the door on other ways to build skills—let’s find a path that fits.";
      else if (!hasEmploymentCriterion) message = "This path looks for one qualifying work-history situation or a pattern of shorter jobs with gaps. A team member can help explore other opportunities if those don’t fit your story.";
      showResult("not-eligible", message);
      return;
    }

    showResult("eligible");
  }

  questionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const question = getQuestions()[currentQuestion];
    if (!isMultiChoice(question)) return;
    const selected = Array.from(questionForm.querySelectorAll(`input[name="${question.name}"]:checked`)).map((input) => input.value);
    if (!selected.length) {
      questionError.textContent = "Choose the answer that feels closest to your situation to keep going.";
      questionForm.querySelector("input")?.focus();
      return;
    }
    answers[question.name] = selected;
    const questions = getQuestions();
    if (currentQuestion < questions.length - 1) {
      currentQuestion += 1;
      renderQuestion();
    } else {
      evaluateAnswers();
    }
  });

  backButton.addEventListener("click", () => {
    if (currentQuestion === 0) return;
    const previousQuestion = getQuestions()[currentQuestion - 1];
    currentQuestion -= 1;
    if (previousQuestion?.name === "age") {
      youthWorkHistoryApplies = false;
    }
    renderQuestion();
  });

  restartButton.addEventListener("click", () => {
    Object.keys(answers).forEach((key) => delete answers[key]);
    currentQuestion = 0;
    youthWorkHistoryApplies = false;
    resultScreen.hidden = true;
    questionScreen.hidden = false;
    renderQuestion();
  });

  renderQuestion();
})();
