let _jokePrompt = "";

Object.defineProperty(window, "jokePrompt", {
    get: function() {
        console.log("🔍 jokePrompt ACCESSED:", _jokePrompt);
        return _jokePrompt;
    },
    set: function(value) {
        console.log("🚨 jokePrompt CHANGED TO:", value);
        _jokePrompt = value;
    }
});

// Category-Specific Refinements
const categoryPrompts = {
    "dad": `Generate a **funny, original dad joke** that is **actually witty**.
- The joke **must** have a clear **setup + punchline**.
- Use **playful, pun-based humor**.
- **Do NOT reuse common dad jokes** (e.g., "I'm hungry." "Hi, hungry, I'm Dad.").
- Ensure the joke **makes logical sense** and is **not nonsense.**`,
    "puns": "Create a **short and clever pun-based joke** with a **strong and logical wordplay punchline**.",
    "animal": "Create a **clever and funny animal-related joke** that **makes sense and has a logical punchline**.",
    "food": "Generate a **brand-new food joke** with a **strong setup and a funny, logical punchline**.",
    "tech": "Create a **modern and witty tech joke** using **relatable concepts** (computers, coding, AI, software, etc.), but ensure **the punchline is understandable** to a general audience.",
    "one-liner": `Generate a **truly clever and original one-liner joke.** 
- The joke must be **witty and clever**, not just a random statement.
- The joke must make **logical sense** and have a clear **setup + punchline**.
- **Avoid old, overused jokes**—create something **fresh and unique**.
- **Do NOT use generic intros like "Here’s a joke!" or "Sure, how about this?".**`,
    "sports": "Generate a **funny and original sports joke** with a **logical and clear punchline**.",
    "holidays": "Create a **unique holiday-themed joke** that makes sense and is **actually funny**.",
    "science": "Generate a **clever but simple science joke** with an **understandable punchline** (topics: physics, chemistry, biology, space, etc.). Avoid **obscure or forced references**.",
    "music": "Create a **truly funny joke about music** that **makes sense and is cleverly structured**.",
    "history": "Generate a **completely original and witty history joke** that is **funny and understandable**.",
    "random": "Generate a **truly funny joke** that follows logical humor patterns but feel free to mix styles like **puns, wordplay, or situational humor**.",
   "knock-knock": `Generate a **fully structured** knock-knock joke. The response **must** follow this format **exactly**: 

Knock, knock.  
Who’s there?  
[Response]  
[Response who?]  
[Punchline that is funny, makes logical sense, has a clever pun-based punchline and follows real knock-knock joke patterns.]

**RULES:**  
- The punchline **MUST** be a real wordplay, pun, or humorous phrase.  
- Do NOT generate incomplete or nonsense responses.  
- Keep it **natural and logical** (NO random, disjointed words).  
- **DO NOT** make up fake words or unfinished responses.
- **Do NOT repeat old jokes** or use overused ones like "Boo who?".  
- Stay within **40 tokens**.` 

};
let triviaHistory = [];
let currentTriviaIndex = -1;

// Tracks if a joke is being generated
let isGenerating = false;

// Stores last 50 jokes to prevent repeats
let jokeHistory = JSON.parse(localStorage.getItem("jokeHistory")) || [];
const MAX_JOKES = 60;
let currentJokeIndex = jokeHistory.length - 1;

// Function to store a joke and update index
function storeJoke(joke) {
    if (!joke || joke.trim() === "undefined") {
        console.error("Attempted to store an undefined joke. Skipping.");
        return;
    }
    jokeHistory.push(joke);
    if (jokeHistory.length > MAX_JOKES) {
        jokeHistory.shift(); // Keep only the last 50 jokes
    }
    localStorage.setItem("jokeHistory", JSON.stringify(jokeHistory));
    currentJokeIndex = jokeHistory.length - 1;
}

// ✅ Function to Fetch a Joke from OpenAI API
async function fetchJoke(jokePrompt, retries = 3) {
    console.log("📢 Received jokePrompt in fetchJoke():", jokePrompt);

    // ✅ Ensure jokePrompt is properly received
    if (!jokePrompt || typeof jokePrompt !== "string" || jokePrompt.trim() === "") {
        console.error("🚨 ERROR: jokePrompt is INVALID or EMPTY inside fetchJoke()!");
        
        // Try to recover by checking the last valid jokePrompt
        if (typeof _jokePrompt !== "undefined" && _jokePrompt.trim() !== "") {
            console.warn("⚠️ Recovering from stored _jokePrompt:", _jokePrompt);
            jokePrompt = _jokePrompt;
        } else {
            console.error("🚨 CRITICAL ERROR: No valid jokePrompt found! Assigning fallback.");
            jokePrompt = "Generate a truly funny joke that follows logical humor patterns.";
        }
    }

    console.log("✅ FINAL jokePrompt inside fetchJoke():", jokePrompt);

    try {
        const requestBody = {
            model: "gpt-4o",
            messages: [
                { 
                    role: "user", 
                    content: jokePrompt + `\n\nGenerate a joke that has NOT been used before. Avoid repeating any joke from this list:\n${jokeHistory.slice(-15).join("\n")}\n\nEnsure the joke follows common joke structures and makes logical sense.`
                }
            ],
            max_tokens: 40,
            temperature: 1.4,
            frequency_penalty: 0.8,
            presence_penalty: 0.6
        };

        console.log("🔍 Full API Request Payload:", JSON.stringify(requestBody, null, 2));

        const response = await fetch("/.netlify/functions/joke", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(requestBody)
});

        const data = await response.json();
console.log("🚀 API Raw Response:", data);
        console.log("📢 API Returned Joke:", data.choices[0]?.message?.content);

if (!data.choices || data.choices.length === 0) {
            throw new Error("No choices found in API response");
}

        let joke = data.choices[0].message.content.trim();

        if (jokeHistory.includes(joke)) {
            console.warn("🚨 Duplicate joke detected, retrying...");
            if (retries > 0) {
                return fetchJoke(jokePrompt, retries - 1); // Retry fetching a new joke
            } else {
                console.error("❌ Max retries reached! Using a stored joke instead.");
                let nonDuplicateJoke = jokeHistory.find(j => j !== joke);
                if (nonDuplicateJoke) {
                    formatAndDisplayJoke(nonDuplicateJoke);
                } else {
                    formatAndDisplayJoke(joke);
                }
                return;
            }
        }                

        storeJoke(joke);
        formatAndDisplayJoke(joke);

    } catch (error) {  
        console.error("❌ Error fetching joke:", error);
        document.getElementById("joke-display").innerText = "Hmm, couldn’t fetch a joke. Try again.";
    } finally {  
        isGenerating = false;
        document.getElementById("loading-message").style.display = "none";
    }
} // ✅ This should be the final closing brace for fetchJoke()

    // ✅ Function to format and display the joke properly
function formatAndDisplayJoke(joke) {
    if (!joke || joke.trim() === "") {
        console.error("🚨 ERROR: Attempted to display an empty joke!");
        document.getElementById("joke-display").innerText = "Hmm, couldn’t fetch a joke. Try again.";
        return;
    }

    console.log("📢 Displaying joke:", joke);
    
    let formattedJoke;

    // ✅ Detect and format knock-knock jokes correctly
    if (joke.toLowerCase().startsWith("knock, knock")) {
        let lines = joke.split("\n").map(line => `<div class="joke-line">${line.trim()}</div>`).join("");
        formattedJoke = `<div class="knock-knock-joke">${lines}</div>`;
    } else {
        // ✅ Properly format general jokes
        const splitJoke = joke.match(/(.+?[?.!])\s+(.+)/);

        if (splitJoke) {
            formattedJoke = `<div class="joke-line"><strong>${splitJoke[1]}</strong></div>
                             <div class="joke-line">${splitJoke[2]}</div>`;
        } else {
            let words = joke.split(" ");
            let mid = Math.ceil(words.length / 2);
            if (words.length > 6) { 
                formattedJoke = `<div class="joke-line">${words.slice(0, mid).join(" ")}</div>
                                 <div class="joke-line">${words.slice(mid).join(" ")}</div>`;
            } else {
                formattedJoke = `<div class="joke-line">${joke}</div>`;
            }
        }
    }

    // ✅ Display formatted joke
    document.getElementById("joke-display").innerHTML = formattedJoke;
}

document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ DOM fully loaded, checking for joke-category...");

    const jokeCategory = document.getElementById("joke-category");

    if (!jokeCategory) {
        console.error("🚨 ERROR: joke-category dropdown not found!");
    } else {
        console.log("✅ joke-category dropdown detected:", jokeCategory);
    }

    // ✅ Menu Toggle Logic wuth Auto-Close
    const menuButton = document.querySelector("#menu-toggle");
    const mobileMenu = document.querySelector("#mobile-menu");

    if (!menuButton) {
        console.error("🚨 ERROR: menu-toggle button not found!");
    } else {
        console.log("✅ menu-toggle button detected:", menuButton);
    }

    if (!mobileMenu) {
        console.error("🚨 ERROR: mobile-menu not found!");
    } else {
        console.log("✅ mobile-menu detected:", mobileMenu);
    }

    // ✅ If both menu elements exist, add event listener
    if (menuButton && mobileMenu) {
        menuButton.addEventListener("click", function (event) {
            event.stopPropagation(); // Stops click from immediately closing the menu
            mobileMenu.style.display = (mobileMenu.style.display === "block") ? "none" : "block";
        });

        // ✅ Close menu when clicking anywhere outside of it
        document.addEventListener("click", function (event) {
            if (mobileMenu.style.display === "block" && !mobileMenu.contains(event.target) && event.target !== menuButton) {
                mobileMenu.style.display = "none";
                console.log("📌 Menu closed by outside click.");
            }
        });
    }
});

async function generateJoke() {
    console.log("🚀 START generateJoke() function");

    if (isGenerating) {
        console.warn("⚠️ Joke generation is already in progress!");
        return;
    }
    isGenerating = true;

    // ✅ 1️⃣ Log the button click detection
    console.log("🎯 Joke button clicked!");

    // ✅ 2️⃣ Log the joke category selection process
    const categoryDropdown = document.getElementById("joke-category");
const category = categoryDropdown ? categoryDropdown.value.trim().toLowerCase() : "";

console.log("🔍 Selected category:", category);

// ✅ Assign jokePrompt before calling fetchJoke()
if (!category || !categoryPrompts.hasOwnProperty(category)) {
    console.error("🚨 ERROR: Invalid or missing category. Using fallback joke.");
    jokePrompt = "Generate a truly funny joke.";
} else {
    jokePrompt = categoryPrompts[category];  // ✅ Assign correct category prompt
}

console.log("✅ Assigned jokePrompt:", jokePrompt);

    // ✅ 3️⃣ Log jokePrompt BEFORE formatting
    console.log("📢 jokePrompt BEFORE Formatting:", jokePrompt);

    // ✅ 4️⃣ Ensure jokePrompt is not empty before API call
    if (!jokePrompt || jokePrompt.trim() === "") {
        console.error("🚨 ERROR: jokePrompt is EMPTY before API request!");
        return;
    }

   // ✅ 5️⃣ Format the final joke prompt for API
const finalJokePrompt = `
You are an AI designed to generate **classic, structured, and genuinely funny jokes**. 
Follow these rules:
- ✅ Use well-known joke structures (Q&A, setup/punchline, wordplay, puns).
- ✅ The joke **must make sense** and be **something a human would actually say.**
- ✅ Keep it **short and snappy**—no more than 20 words.
- ✅ If generating a **knock-knock joke**, **strictly follow this format**:

  Knock, knock.  
  Who’s there?  
  [Response]  
  [Response who?]  
  [Punchline that is a **real pun or play on words**.]

- ❌ Do NOT generate nonsense, AI-like responses, or broken sentences.
- ❌ Do NOT change joke structure mid-joke.
- ❌ Do NOT use random words that don’t relate to the punchline.
- ❌ Do NOT add unnecessary explanations.

🚨 **IMPORTANT:**  
**Jokes must feel like something a human would tell and actually find funny!**  
Do not overcomplicate or force wordplay—make it flow naturally.

Now generate a **properly formatted, actually funny joke** that follows these rules: 
${jokePrompt}
`.trim();

    console.log("📢 FINAL Formatted Joke Prompt Sent to API:", finalJokePrompt);

    // ✅ 6️⃣ Log before sending to fetchJoke()
    console.log("🚀 Sending to fetchJoke():", finalJokePrompt);

    const lockedJokePrompt = jokePrompt.trim();  // 🔒 Lock joke prompt before API call
    console.log("🔒 Using lockedJokePrompt:", lockedJokePrompt);

    await fetchJoke();


    console.log("✅ generateJoke() function completed.");
}

// ✅ Ensure all event listeners are attached once the DOM is ready
document.addEventListener("DOMContentLoaded", function () {
    console.log("🚀 DOM Fully Loaded - Attaching Event Listeners");

    // ✅ Attach Joke Button Listener (with locked jokePrompt)
const jokeButton = document.getElementById("joke-button");
if (jokeButton) {
    jokeButton.removeEventListener("click", generateJoke);
    jokeButton.addEventListener("click", function () {
        if (isGenerating) return;
        isGenerating = true;

        // 🔒 Lock jokePrompt BEFORE calling generateJoke
        const lockedJokePrompt = jokePrompt;
        console.log("🔒 LOCKED Joke Prompt from Button Click:", lockedJokePrompt);

        generateJoke();
    });
    console.log("✅ Joke Button Event Listener Attached.");
} else {
    console.error("🚨 ERROR: Joke button not found!");
}

    // ✅ Attach Previous/Next Joke Navigation
    const prevJokeButton = document.getElementById("previous-joke-button");
    const nextJokeButton = document.getElementById("next-joke-button");
    if (prevJokeButton) prevJokeButton.addEventListener("click", showPreviousJoke);
    if (nextJokeButton) nextJokeButton.addEventListener("click", showNextJoke);
    
    // ✅ Attach Trivia Button Listener
    const triviaButton = document.getElementById("trivia-button");
    if (triviaButton) {
        triviaButton.removeEventListener("click", fetchTriviaQuestion);
        triviaButton.addEventListener("click", fetchTriviaQuestion);
        console.log("✅ Trivia Button Listener Attached");
    }

    // ✅ Attach Fun Facts Button Listener
    const funFactsButton = document.getElementById("fun-facts-button");
    if (funFactsButton) {
        funFactsButton.removeEventListener("click", fetchFunFacts);
        funFactsButton.addEventListener("click", fetchFunFacts);
        console.log("✅ Fun Facts Button Listener Attached");
    }
});

// Navigation for last 10 jokes
function showPreviousJoke() {
    if (jokeHistory.length === 0 || currentJokeIndex <= 0) {
        console.warn("🚨 No previous jokes available.");
        return;
    }

    currentJokeIndex--;
    let joke = jokeHistory[currentJokeIndex];

    if (!joke || joke.trim() === "undefined") {
        console.error("🚨 No joke found at index:", currentJokeIndex);
        document.getElementById("joke-display").innerText = "No joke available.";
        return;
    }

    console.log("⬅️ Displaying previous joke:", joke);
    formatAndDisplayJoke(joke);
}

function showNextJoke() {
    if (jokeHistory.length === 0 || currentJokeIndex >= jokeHistory.length - 1) {
        console.warn("🚨 No more jokes available.");
        return;
    }

    currentJokeIndex++;
    let joke = jokeHistory[currentJokeIndex];

    if (!joke || joke.trim() === "undefined") {
        console.error("🚨 No joke found at index:", currentJokeIndex);
        document.getElementById("joke-display").innerText = "No joke available.";
        return;
    }

    console.log("➡️ Displaying next joke:", joke);
    formatAndDisplayJoke(joke);
    }

// ✅ Universal Event Listeners (Trivia & Fun Facts)
document.addEventListener("DOMContentLoaded", function () {
    console.log("✅ Script Loaded!");

    // ✅ Check for Trivia Page
    let triviaButton = document.getElementById("trivia-button");
    if (triviaButton) {
        console.log("🎯 Trivia Page Detected!");
        triviaButton.addEventListener("click", fetchTriviaQuestion);
    }

    // ✅ Check for Fun Facts Page
    let funFactsButton = document.getElementById("fun-facts-button");
    if (funFactsButton) {
        console.log("🎉 Fun Facts Page Detected!");
        funFactsButton.addEventListener("click", fetchFunFacts);
    }

    // ✅ Check for Jokes Page
    let jokeButton = document.getElementById("joke-button");
    if (jokeButton) {
        console.log("🎭 Jokes Page Detected!");
        jokeButton.addEventListener("click", function () {
            console.log("🎯 Joke button clicked! Fetching joke...");
            
            const selectedCategory = document.getElementById("joke-category").value.trim().toLowerCase();
            if (!selectedCategory || !categoryPrompts.hasOwnProperty(selectedCategory)) {
                console.error("🚨 ERROR: Invalid or missing category. Assigning fallback.");
                jokePrompt = "Generate a truly funny joke that follows logical humor patterns.";
            } else {
                jokePrompt = categoryPrompts[selectedCategory];
                console.log("✅ Assigned Category-Specific Prompt:", jokePrompt);
            }

            fetchJoke(jokePrompt); // ✅ Now fetchJoke() receives the correct jokePrompt
        });
    }
});
        

// ✅ Trivia History Storage



// ✅ Proper CSV Parsing (Handles Quotes & Commas)
function parseCSVLine(line) {
    let parsedValues = [];
    let regex = /"([^"]*?)"|([^,]+)/g; // Matches quoted values and non-quoted values
    let match;

    while ((match = regex.exec(line)) !== null) {
        let value = match[1] !== undefined ? match[1].replace(/""/g, '"').trim() : match[2]?.trim();
        parsedValues.push(value);
    }

    return parsedValues;
}

// 📚 Fetch and Format Trivia Questions
async function fetchTriviaQuestion() {
    console.log("🚀 Trivia function reached!");
    console.log("✅ Fetching new trivia...");

    let triviaElement = document.getElementById("trivia-display");
    if (!triviaElement) {
        console.error("❌ ERROR: trivia-display element is missing!");
        return;
    }

    try {
        const response = await fetch("Trivia Questions.csv");
        const text = await response.text();
        const lines = text.split("\n").filter(line => line.trim());

        let selectedLine = lines[Math.floor(Math.random() * lines.length)];
        let parsedValues = parseCSVLine(selectedLine).filter(value => value.trim() !== "");

        console.log("✅ Fully Processed CSV Values:", parsedValues);

        if (parsedValues.length < 5) {
            console.error("❌ ERROR: Invalid CSV format:", selectedLine);
            return;
        }

        let questionIndex = parsedValues.length - 5;
        let question = parsedValues[questionIndex]?.replace(/["']/g, "").trim() || "⚠️ Missing Question";
        let choices = parsedValues.slice(questionIndex + 1, questionIndex + 4).map(choice => choice.replace(/["']/g, "").trim() || "⚠️ Missing Choice");
        let correctAnswerKey = parsedValues[questionIndex + 4]?.trim().replace(/['"]+/g, "") || "⚠️";

        let answerMap = { "A": choices[0], "B": choices[1], "C": choices[2] };
        let correctAnswer = answerMap[correctAnswerKey] || "⚠️ Invalid Answer Key";

        if (correctAnswer === "⚠️ Invalid Answer Key") {
            console.error("❌ ERROR: Correct answer key does not match available choices:", correctAnswerKey, choices);
            return;
        }

        // ✅ Store Trivia in Local Storage
        let newTrivia = { question, correctAnswer, choices };
        triviaHistory.push(newTrivia);

        if (triviaHistory.length > 20) {
            triviaHistory.shift();
        }

        localStorage.setItem("triviaHistory", JSON.stringify(triviaHistory));  // ✅ Save to storage
        localStorage.setItem("lastTriviaQuestion", JSON.stringify(newTrivia)); // ✅ Save last question separately

        currentTriviaIndex = triviaHistory.length - 1;
        displayTriviaQuestion(newTrivia);
    } catch (error) {
        console.error("❌ Error fetching trivia:", error);
        triviaElement.innerText = "Failed to load trivia.";
    }
}

// ✅ Display Trivia Question
function displayTriviaQuestion(storedQuestion) {
    let triviaElement = document.getElementById("trivia-display");
    if (!triviaElement) {
        console.error("❌ ERROR: trivia-display element is missing!");
        return;
    }

    // Clear existing content
    triviaElement.innerHTML = "";  

    let formattedQuestion = `<strong>${storedQuestion.question}</strong><br><ul>`;
    storedQuestion.choices.forEach((option, index) => {
        let letter = String.fromCharCode(65 + index);
        formattedQuestion += `<li><button class="trivia-option" data-answer="${option}">${letter}: ${option}</button></li>`;
    });
    formattedQuestion += `</ul><p id="trivia-feedback"></p>`;

    // Append the question first
    triviaElement.innerHTML = formattedQuestion;

  // Ensure triviaElement exists before adding buttons
if (!document.getElementById("trivia-display")) {
    console.error("🚨 ERROR: trivia-display element is missing!");
} else {
    let navButtons = document.createElement("div");
    navButtons.id = "trivia-nav-buttons";
    navButtons.innerHTML = `
        <p><strong>View Previous Trivia Question</strong></p>
        <button id="prev-trivia" class="nav-arrow">&larr; Previous</button>
        <button id="next-trivia" class="nav-arrow">Next &rarr;</button>
    `;

    // Append buttons only if they don’t already exist
    if (!document.getElementById("trivia-nav-buttons")) {
        document.getElementById("trivia-display").appendChild(navButtons);
    }
}

// 🔥 Now that buttons exist, add event listeners
document.getElementById("prev-trivia").addEventListener("click", showPreviousTrivia);
document.getElementById("next-trivia").addEventListener("click", showNextTrivia);


    // Setup event listeners
    setupTriviaEventListeners(storedQuestion);
}

// Attach event listeners for trivia navigation buttons ONLY if on the Trivia page
document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("trivia-section")) {  // ✅ Check if we're on the Trivia page
        console.log("✅ Trivia Page Detected, Attaching Listeners...");

        // ✅ Load Stored Trivia History
        let storedTriviaHistory = JSON.parse(localStorage.getItem("triviaHistory")) || [];
        if (storedTriviaHistory.length > 0) {
            triviaHistory = storedTriviaHistory;
            currentTriviaIndex = triviaHistory.length - 1;
            console.log("✅ Trivia history loaded, but no question displayed on page load.");
            console.log("✅ Loaded stored Trivia History:", triviaHistory);
        } else {
            console.log("⚠️ No stored Trivia history found.");
        }

        setTimeout(() => { // Ensure buttons exist before adding listeners
            let prevTriviaButton = document.getElementById("prev-trivia");
            let nextTriviaButton = document.getElementById("next-trivia");

            if (prevTriviaButton) {
                prevTriviaButton.removeEventListener("click", showPreviousTrivia);
                prevTriviaButton.addEventListener("click", showPreviousTrivia);
                console.log("✅ Previous Trivia button listener added.");
            } else {
                console.warn("🚨 Previous Trivia button not found - Skipping.");
            }

            if (nextTriviaButton) {
                nextTriviaButton.removeEventListener("click", showNextTrivia);
                nextTriviaButton.addEventListener("click", showNextTrivia);
                console.log("✅ Next Trivia button listener added.");
            } else {
                console.warn("🚨 Next Trivia button not found - Skipping.");
            }
        }, 1000); // Small delay to ensure buttons exist

        let triviaButton = document.getElementById("trivia-button");

        if (triviaButton) {
            triviaButton.removeEventListener("click", fetchTriviaQuestion);
            triviaButton.addEventListener("click", fetchTriviaQuestion);
            console.log("✅ Trivia button event listener attached.");
        } else {
            console.warn("🚨 Trivia button not found - Skipping.");
        }
    }
});

// ✅ Answer Click Event Listeners
function setupTriviaEventListeners(storedQuestion) {
    document.querySelectorAll(".trivia-option").forEach(button => {
        button.addEventListener("click", function () {
            let selectedAnswer = this.dataset.answer;
            if (selectedAnswer === storedQuestion.correctAnswer) {
                this.style.backgroundColor = "green";
                document.getElementById("trivia-feedback").innerText = "✅ Correct!";
            } else {
                this.style.backgroundColor = "red";
                document.getElementById("trivia-feedback").innerText = "❌ Incorrect!";
            }
        });
    });
}

function updateTriviaNavButtons() {
    let prevTriviaButton = document.getElementById("prev-trivia");
    let nextTriviaButton = document.getElementById("next-trivia");

    if (!prevTriviaButton || !nextTriviaButton) {
        console.warn("🚨 Trivia navigation buttons not found.");
        return;
    }

    prevTriviaButton.disabled = currentTriviaIndex <= 0;
    nextTriviaButton.disabled = currentTriviaIndex >= triviaHistory.length - 1;
}
// ✅ Navigation Buttons
function showPreviousTrivia() {
    if (triviaHistory.length === 0 || currentTriviaIndex <= 0) {
        console.warn("🚨 No previous trivia available.");
        return;
    }

    currentTriviaIndex--;
    displayTriviaQuestion(triviaHistory[currentTriviaIndex]);
    updateTriviaNavButtons();
}

function showNextTrivia() {
    if (triviaHistory.length === 0 || currentTriviaIndex >= triviaHistory.length - 1) {
        console.warn("🚨 No more trivia available.");
        return;
    }

    currentTriviaIndex++;
    displayTriviaQuestion(triviaHistory[currentTriviaIndex]);
    updateTriviaNavButtons();
}

// ✅ Fun Facts History (For Navigation)
let funFactsHistory = [];
let currentFunFactsIndex = -1;

// ✅ Load stored Fun Facts history from localStorage
let storedFunFactsHistory = JSON.parse(localStorage.getItem("funFactsHistory")) || [];
if (storedFunFactsHistory.length > 0) {
    funFactsHistory = storedFunFactsHistory;
    currentFunFactsIndex = funFactsHistory.length - 1;
    console.log("✅ Fun Facts history loaded, but no fact displayed on page load.");
}

// 📚 Fetch and Format Fun Facts (Fully Strips Quotes & Ignores ID)
async function fetchFunFacts() {
    console.log("✅ Fetching new fun fact...");

    let funFactsElement = document.getElementById("fun-facts-display");
    if (!funFactsElement) {
        console.error("❌ ERROR: fun-facts-display element is missing!");
        return;
    }

    try {
        const response = await fetch("Fun Facts.csv");
        const text = await response.text();
        const lines = text.split("\n").filter(line => line.trim());

        let selectedLine = lines[Math.floor(Math.random() * lines.length)];
        let parsedValues = selectedLine.split(",");
        
        if (parsedValues.length < 2) {
            console.error("❌ ERROR: Invalid CSV format:", selectedLine);
            return;
        }

        let funFactsText = parsedValues.slice(1).join(",").trim();
        funFactsText = funFactsText.replace(/^"+|"+$/g, '');

        // ✅ Store Fun Fact in history and localStorage
        funFactsHistory.push(funFactsText);
        localStorage.setItem("funFactsHistory", JSON.stringify(funFactsHistory));

        // ✅ Update the current index and display
        currentFunFactsIndex = funFactsHistory.length - 1;
        displayFunFacts();
    } catch (error) {
        console.error("❌ Error fetching fun facts:", error);
        funFactsElement.innerText = "Failed to load fun facts.";
    }
}

// 📢 Fix **displayFunFact** function so it correctly shows the text
function displayFunFacts() {
    let funFactsElement = document.getElementById("fun-facts-display");
    if (!funFactsElement) {
        console.error("❌ ERROR: fun-facts-display element is missing!");
        return;
    }

    if (currentFunFactsIndex >= 0 && currentFunFactsIndex < funFactsHistory.length) {
        funFactsElement.innerHTML = `<strong>${funFactsHistory[currentFunFactsIndex]}</strong>`;
    } else {
        funFactsElement.innerHTML = "No fun facts available.";
    }

    updateFunFactsNavigation();
}

// Attach event listeners for fun fact navigation buttons
document.addEventListener("DOMContentLoaded", function () {
    let prevFunFactsButton = document.getElementById("prev-fun-facts");
    let nextFunFactsButton = document.getElementById("next-fun-facts");

    if (prevFunFactsButton) {
        prevFunFactsButton.addEventListener("click", showPreviousFunFacts);
    }
    if (nextFunFactsButton) {
        nextFunFactsButton.addEventListener("click", showNextFunFacts);
    }
});

// ⬅️➡️ Navigation Buttons for Fun Facts
function showPreviousFunFacts() {
    if (funFactsHistory.length === 0 || currentFunFactsIndex <= 0) {
        console.warn("🚨 No previous fun fact available.");
        return;
    }

    currentFunFactsIndex--;
    displayFunFacts();
    updateFunFactsNavButtons();
}

function showNextFunFacts() {
    if (funFactsHistory.length === 0 || currentFunFactsIndex >= funFactsHistory.length - 1) {
        console.warn("🚨 No more fun facts available.");
        return;
    }

    currentFunFactsIndex++;
    displayFunFacts();
    updateFunFactsNavButtons();
}

function updateFunFactsNavButtons() {
    let prevFunFactsButton = document.getElementById("prev-fun-facts");
    let nextFunFactsButton = document.getElementById("next-fun-facts");

    if (!prevFunFactsButton || !nextFunFactsButton) {
        console.warn("🚨 Fun Facts navigation buttons not found.");
        return;
    }

    prevFunFactsButton.disabled = currentFunFactsIndex <= 0;
    nextFunFactsButton.disabled = currentFunFactsIndex >= funFactsHistory.length - 1;
}

// ✅ Enable/Disable Navigation Buttons
function updateFunFactsNavigation() {
    document.getElementById("prev-fun-facts").disabled = currentFunFactsIndex <= 0;
    document.getElementById("next-fun-facts").disabled = currentFunFactsIndex >= funFactsHistory.length - 1;
}

// ✅ Attach Event Listener for Fun Fact Button
document.addEventListener("DOMContentLoaded", function () {
    let funFactsButton = document.getElementById("fun-facts-button");
    if (funFactsButton) {
        funFactsButton.addEventListener("click", fetchFunFacts);
        console.log("✅ Fun Facts button event listener attached successfully!");
    }
    document.addEventListener("touchstart", function () {
        document.querySelectorAll("button").forEach(button => {
            button.style.backgroundColor = "";  // Resets background color
            button.style.color = "";  // Resets text color
            button.blur();  // Removes focus from button
        });
    }, { passive: true });
    
});


