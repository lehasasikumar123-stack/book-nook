
/* =========================================
   THE BOOK NOOK - JAVASCRIPT
   ========================================= */

// 1. GENRES AND TROPES

const genres = [
  "Fantasy",
  "Romance",
  "Mystery",
  "Thriller",
  "Horror",
  "Science Fiction",
  "Historical Fiction",
  "Contemporary",
  "Young Adult",
  "Literary Fiction"
];

const tropes = [
  "Enemies to Lovers",
  "Friends to Lovers",
  "Slow Burn",
  "Found Family",
  "Forbidden Love",
  "Fake Dating",
  "Forced Proximity",
  "Second Chance Romance",
  "Love Triangle",
  "Morally Gray Characters",
  "Grumpy Sunshine",
  "Secret Identity",
  "Chosen One",
  "Dark Academia"
];

// Approximate subject and keyword synonyms.
// These are clues, not verified trope labels.
const tropeKeywords = {
  "Enemies to Lovers": [
    "enemies to lovers", "rivals to lovers",
    "rivalry", "enemies"
  ],
  "Friends to Lovers": [
    "friends to lovers", "childhood friends",
    "friendship"
  ],
  "Slow Burn": [
    "slow burn", "slow-burn"
  ],
  "Found Family": [
    "found family", "chosen family",
    "friendship"
  ],
  "Forbidden Love": [
    "forbidden love", "forbidden romance",
    "star-crossed"
  ],
  "Fake Dating": [
    "fake dating", "fake relationship",
    "pretend relationship"
  ],
  "Forced Proximity": [
    "forced proximity", "close quarters"
  ],
  "Second Chance Romance": [
    "second chance", "reunited lovers"
  ],
  "Love Triangle": [
    "love triangle", "romantic triangle"
  ],
  "Morally Gray Characters": [
    "morally gray", "morally grey",
    "antihero", "anti-hero"
  ],
  "Grumpy Sunshine": [
    "grumpy sunshine", "opposites attract"
  ],
  "Secret Identity": [
    "secret identity", "hidden identity",
    "disguise"
  ],
  "Chosen One": [
    "chosen one", "prophecy", "destiny"
  ],
  "Dark Academia": [
    "dark academia", "boarding school",
    "secret society"
  ]
};

// 2. HTML ELEMENTS

const searchForm = document.getElementById("searchForm");
const descriptionInput = document.getElementById("description");

const genreContainer = document.getElementById("genreOptions");
const tropeContainer = document.getElementById("tropeOptions");

const searchButton = document.getElementById("searchButton");
const resultsContainer = document.getElementById("bookResults");
const resultsMessage = document.getElementById("resultsMessage");
const loadingElement = document.getElementById("loading");

const favoritesContainer = document.getElementById("favoritesGrid");
const emptyFavorites = document.getElementById("emptyFavorites");

// 3. APPLICATION STATE

const selectedGenres = new Set();
const selectedTropes = new Set();

let currentBooks = [];
let favorites = loadFavorites();

// 4. CREATE SELECTION BUTTONS

function createChips(items, container, selectedSet, className) {
  items.forEach((item) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = `chip ${className}`;
    button.textContent = item;

    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", () => {
      if (selectedSet.has(item)) {
        selectedSet.delete(item);
        button.classList.remove("selected");
        button.setAttribute("aria-pressed", "false");
      } else {
        selectedSet.add(item);
        button.classList.add("selected");
        button.setAttribute("aria-pressed", "true");
      }
    });

    container.appendChild(button);
  });
}

createChips(genres, genreContainer, selectedGenres, "genre-chip");
createChips(tropes, tropeContainer, selectedTropes, "trope-chip");

// 5. NORMALIZE TEXT FOR MATCHING

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPhrase(text, phrase) {
  const normalizedText = ` ${normalizeText(text)} `;
  const normalizedPhrase = ` ${normalizeText(phrase)} `;

  return normalizedText.includes(normalizedPhrase);
}

const stopWords = new Set([
  "a", "an", "the", "and", "or", "but", "with",
  "for", "from", "that", "this", "into", "about",
  "want", "book", "books", "story", "something",
  "like", "have", "has", "are", "was", "were",
  "read", "reading", "some", "very", "really",
  "would", "could", "should", "where", "there"
]);

function getKeywords(description) {
  return [...new Set(
    normalizeText(description)
      .split(" ")
      .filter(word => word.length > 2 && !stopWords.has(word))
  )];
}

// 6. BUILD THE SEARCH QUERY

function buildSearchQuery(description, chosenGenres, chosenTropes) {
  const parts = [];

  // Prefer genres and a few descriptive keywords.
  parts.push(...chosenGenres.slice(0, 2));

  const keywords = getKeywords(description).slice(0, 5);
  parts.push(...keywords);

  // If the user only selects tropes, add broad search terms.
  if (parts.length === 0 && chosenTropes.length > 0) {
    const romanceTropes = [
      "Enemies to Lovers", "Friends to Lovers",
      "Slow Burn", "Forbidden Love", "Fake Dating",
      "Second Chance Romance", "Grumpy Sunshine"
    ];

    parts.push(
      chosenTropes.some(trope => romanceTropes.includes(trope))
        ? "romance"
        : "fiction"
    );
  }

  return parts.join(" ") || "popular fiction";
}

// 7. REQUEST BOOKS FROM OPEN LIBRARY

async function fetchBooks(query) {
  const params = new URLSearchParams({
    q: query,
    limit: "40",
    fields: [
      "key",
      "title",
      "author_name",
      "first_publish_year",
      "cover_i",
      "subject"
    ].join(",")
  });

  const url = `https://openlibrary.org/search.json?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open Library request failed: ${response.status}`);
  }

  const data = await response.json();

  return Array.isArray(data.docs) ? data.docs : [];
}

// 8. SCORE BOOKS BY RELEVANCE

function calculateScore(book, keywords, chosenGenres, chosenTropes) {
  const title = normalizeText(book.title);
  const subjects = Array.isArray(book.subject)
    ? book.subject.join(" ")
    : "";

  const searchableText = `${title} ${normalizeText(subjects)}`;

  let score = 0;
  let matches = 0;

  // Genre matching
  chosenGenres.forEach((genre) => {
    if (containsPhrase(searchableText, genre)) {
      score += 5;
      matches++;
    }
  });

  // Description keyword matching
  keywords.forEach((keyword) => {
    if (containsPhrase(searchableText, keyword)) {
      score += 3;
      matches++;
    }
  });

  // Approximate trope matching
  chosenTropes.forEach((trope) => {
    const synonyms = tropeKeywords[trope] || [trope];

    if (synonyms.some(word => containsPhrase(searchableText, word))) {
      score += 8;
      matches++;
    }
  });

  // Small bonus for books with covers
  if (book.cover_i) {
    score += 1;
  }

  return { score, matches };
}

// 9. PREPARE AND RANK RESULTS

function rankBooks(books, description, chosenGenres, chosenTropes) {
  const keywords = getKeywords(description);

  const seen = new Set();

  const ranked = books
    .filter(book => book.key && book.title)
    .filter(book => {
      if (seen.has(book.key)) return false;
      seen.add(book.key);
      return true;
    })
    .map(book => {
      const { score, matches } = calculateScore(
        book,
        keywords,
        chosenGenres,
        chosenTropes
      );

      return {
        key: book.key,
        title: book.title,
        author: book.author_name?.[0] || "Unknown author",
        year: book.first_publish_year || null,
        coverId: book.cover_i || null,
        subjects: (book.subject || []).slice(0, 8),
        score,
        matches
      };
    });

  ranked.sort((a, b) => b.score - a.score);

  return ranked.slice(0, 18);
}

// 10. HANDLE THE SEARCH FORM

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const chosenGenres = [...selectedGenres];
  const chosenTropes = [...selectedTropes];

  if (!description && !chosenGenres.length && !chosenTropes.length) {
    resultsMessage.textContent =
      "Tell us a little about what you're looking for first! ♡";

    document.getElementById("recommendations").scrollIntoView();
    return;
  }

  searchButton.disabled = true;
  searchButton.textContent = "Searching... ♡";

  loadingElement.classList.remove("hidden");
  resultsContainer.replaceChildren();

  resultsMessage.textContent = "Finding stories for your reading mood...";

  document.getElementById("recommendations").scrollIntoView();

  try {
    const query = buildSearchQuery(
      description,
      chosenGenres,
      chosenTropes
    );

    const books = await fetchBooks(query);

    currentBooks = rankBooks(
      books,
      description,
      chosenGenres,
      chosenTropes
    );

    if (currentBooks.length === 0) {
      resultsMessage.textContent =
        "No books found this time. Try fewer keywords or a broader genre.";
    } else {
      resultsMessage.textContent =
        `Found ${currentBooks.length} possible reads for you! ` +
        "Matches are based on available book subjects and keywords.";

      displayBooks(currentBooks, resultsContainer);
    }

  } catch (error) {
    console.error("Book search error:", error);

    resultsMessage.textContent =
      "Oops! We couldn't reach the library right now. " +
      "Please try again in a moment. ♡";

  } finally {
    loadingElement.classList.add("hidden");
    searchButton.disabled = false;
    searchButton.textContent = "Find my next read ♡";
  }
});

// 11. CREATE BOOK CARDS

function createBookCard(book) {
  const card = document.createElement("article");
  card.className = "book-card";

  // Cover
  const coverWrapper = document.createElement("div");
  coverWrapper.className = "book-cover-wrapper";

  if (book.coverId) {
    const image = document.createElement("img");
    image.className = "book-cover";
    image.src =
      `https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`;
    image.alt = `Cover of ${book.title}`;
    image.loading = "lazy";

    image.addEventListener("error", () => {
      image.remove();

      const fallback = document.createElement("div");
      fallback.className = "no-cover";
      fallback.textContent = book.title;

      coverWrapper.appendChild(fallback);
    });

    coverWrapper.appendChild(image);
  } else {
    const fallback = document.createElement("div");
    fallback.className = "no-cover";
    fallback.textContent = book.title;

    coverWrapper.appendChild(fallback);
  }

  // Book information
  const info = document.createElement("div");
  info.className = "book-info";

  const title = document.createElement("h3");
  title.textContent = book.title;

  const author = document.createElement("p");
  author.className = "book-author";
  author.textContent =
    `by ${book.author}${book.year ? ` · ${book.year}` : ""}`;

  const badge = document.createElement("span");
  badge.className = "match-badge";
  badge.textContent =
    book.matches > 0
      ? `${book.matches} matching clue${book.matches === 1 ? "" : "s"}`
      : "Suggested read";

  const description = document.createElement("p");
  description.className = "book-description";

  description.textContent = book.subjects.length
    ? `Themes: ${book.subjects.slice(0, 4).join(", ")}`
    : "Explore this book to learn more about its story.";

  // Buttons
  const actions = document.createElement("div");
  actions.className = "book-actions";

  const detailsLink = document.createElement("a");
  detailsLink.className = "book-link";
  detailsLink.textContent = "View book ↗";
  detailsLink.href = `https://openlibrary.org${book.key}`;
  detailsLink.target = "_blank";
  detailsLink.rel = "noopener noreferrer";

  const favoriteButton = document.createElement("button");
  favoriteButton.type = "button";
  favoriteButton.className = "favorite-button";

  const isSaved = favorites.some(item => item.key === book.key);

  favoriteButton.textContent = isSaved ? "♥ Saved" : "♡ Save";
  favoriteButton.classList.toggle("saved", isSaved);

  favoriteButton.addEventListener("click", () => {
    toggleFavorite(book);
  });

  actions.append(detailsLink, favoriteButton);

  info.append(title, author, badge, description, actions);
  card.append(coverWrapper, info);

  return card;
}

// 12. DISPLAY BOOKS

function displayBooks(books, container) {
  container.replaceChildren();

  const fragment = document.createDocumentFragment();

  books.forEach(book => {
    fragment.appendChild(createBookCard(book));
  });

  container.appendChild(fragment);
}

// 13. FAVORITES WITH LOCAL STORAGE

function loadFavorites() {
  try {
    const stored = JSON.parse(
      localStorage.getItem("bookNookFavorites") || "[]"
    );

    return Array.isArray(stored)
      ? stored.filter(book => book && book.key && book.title)
      : [];
  } catch (error) {
    console.warn("Could not load saved favorites:", error);
    return [];
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(
      "bookNookFavorites",
      JSON.stringify(favorites)
    );
  } catch (error) {
    console.warn("Could not save favorites:", error);
  }
}

function toggleFavorite(book) {
  const existingIndex = favorites.findIndex(
    item => item.key === book.key
  );

  if (existingIndex >= 0) {
    favorites.splice(existingIndex, 1);
  } else {
    favorites.push(book);
  }

  saveFavorites();

  // Update both sections so heart buttons stay synchronized.
  displayBooks(currentBooks, resultsContainer);
  renderFavorites();
}

function renderFavorites() {
  emptyFavorites.classList.toggle(
    "hidden",
    favorites.length > 0
  );

  displayBooks(favorites, favoritesContainer);
}

// 14. INITIALIZE THE PAGE

renderFavorites();

console.log("The Book Nook is ready! ♡");
