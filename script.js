
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


/* =========================================
   VERSION 2 - BROWSE BOOKS ELEMENTS
   ========================================= */

const browseCategories = document.getElementById("browseCategories");
const browseTitle = document.getElementById("browseTitle");
const browseMessage = document.getElementById("browseMessage");
const browseLoading = document.getElementById("browseLoading");
const browseResults = document.getElementById("browseResults");
const loadMoreButton = document.getElementById("loadMoreButton");

// Book details popup elements
const bookModal = document.getElementById("bookModal");
const closeModal = document.getElementById("closeModal");
const modalBody = document.getElementById("modalBody");
const similarBooks = document.getElementById("similarBooks");


// 3. APPLICATION STATE

let browseMode = "trending";
let currentBrowseSubject = "";
let browseOffset = 0;
let browseRequestId = 0;

const BOOKS_PER_PAGE = 24;

const selectedGenres = new Set();
const selectedTropes = new Set();

let currentBooks = [];

let visibleSearchBooks = 18;
const SEARCH_BOOKS_PER_PAGE = 18;

const searchLoadMoreButton =
  document.getElementById("searchLoadMoreButton");

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
    limit: "100",
    fields: [
      "key",
      "title",
      "author_name",
      "first_publish_year",
      "cover_i",
      "subject",
      "edition_count"
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
        editionCount: book.edition_count || 0,
        score,
        matches
      };
    });


// Rank by relevance first, then use edition count
// to prioritize more widely published books.

ranked.sort((a, b) => {
  // Keep books with stronger matches near the top
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  // When relevance is equal, show the book
  // with more recorded editions first
  return b.editionCount - a.editionCount;
});

  return ranked;
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


visibleSearchBooks = SEARCH_BOOKS_PER_PAGE;

displayBooks(
  currentBooks.slice(0, visibleSearchBooks),
  resultsContainer
);

searchLoadMoreButton.classList.toggle(
  "hidden",
  currentBooks.length <= visibleSearchBooks
);
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
  card.className = "book-card clickable";
card.dataset.bookKey = book.key;



card.classList.add("clickable");
card.tabIndex = 0;
card.setAttribute("role", "button");
card.setAttribute("aria-label", `View details for ${book.title}`);

card.addEventListener("click", (event) => {
  if (event.target.closest("button, a")) return;
  openBookDetails(book);
});

card.addEventListener("keydown", (event) => {
  if (event.target !== card) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openBookDetails(book);
  }
});


  // Cover
  const coverWrapper = document.createElement("div");
  coverWrapper.className = "book-cover-wrapper";

  if (book.coverId) {
    const image = document.createElement("img");
    image.className = "book-cover";
    image.src =
      `https://covers.openlibrary.org/b/id/${book.coverId}-L.jpg`;
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
  
displayBooks(currentBooks.slice(0, visibleSearchBooks), resultsContainer);

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


/* =========================================
   VERSION 2 - BROWSE GENRE BUTTONS
   ========================================= */

const browseGenres = [
  { name: "♡ Romance", subject: "romance" },
  { name: "✧ Fantasy", subject: "fantasy" },
  { name: "♡ Mystery", subject: "mystery" },
  { name: "✿ Thriller", subject: "thriller" },
  { name: "♡ Horror", subject: "horror" },
  { name: "✧ Science Fiction", subject: "science_fiction" },
  { name: "♡ Historical Fiction", subject: "historical_fiction" },
  { name: "✿ Young Adult", subject: "young_adult_fiction" },
  { name: "♡ Classics", subject: "classics" }
];

function createBrowseCategories() {
  browseGenres.forEach((genre) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "chip";
    button.textContent = genre.name;


button.addEventListener("click", () => {
  loadBrowseGenre(genre.subject, genre.name);

  browseCategories.querySelectorAll(".chip").forEach((chip) => {
    chip.classList.remove("selected");
    chip.setAttribute("aria-pressed", "false");
  });

  button.classList.add("selected");
  button.setAttribute("aria-pressed", "true");
});


    browseCategories.appendChild(button);
  });
}

createBrowseCategories();


/* =========================================
   VERSION 2 - LOAD BOOKS BY GENRE
   ========================================= */

async function loadBrowseGenre(subject, genreName) {

  browseRequestId++;
  browseMode = "genre";
  currentBrowseSubject = subject;
  browseOffset = 0;
  loadMoreButton.classList.add("hidden");

  browseTitle.textContent = `${genreName} Books ♡`;
  browseMessage.textContent = "Finding books for you... ♡";

  browseLoading.classList.remove("hidden");
  browseResults.replaceChildren();

  try {
    const url =
      `https://openlibrary.org/subjects/${subject}.json?limit=24`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Could not load books.");
    }

    const data = await response.json();


    browseOffset = (data.works || []).length;
    loadMoreButton.classList.toggle(
      "hidden",
      browseOffset < BOOKS_PER_PAGE
    );


    const books = (data.works || []).map((book) => ({
      key: book.key,
      title: book.title,
      author: book.authors?.[0]?.name || "Unknown author",
      year: book.first_publish_year || null,
      coverId: book.cover_id || null,
      subjects: (book.subject || []).slice(0, 8),
      matches: 0
    }));

    if (books.length === 0) {
      browseMessage.textContent =
        "No books found in this category. Try another genre! ♡";
    } else {
      browseMessage.textContent =
        `Explore ${books.length} books in this category! ♡`;

      displayBooks(books, browseResults);
    }

  } catch (error) {
    console.error("Browse error:", error);

    browseMessage.textContent =
      "Oops! We couldn't load these books. Please try again. ♡";

  } finally {
    browseLoading.classList.add("hidden");
  }
}


/* =========================================
   VERSION 2 - TRENDING BOOKS
   ========================================= */

async function loadTrendingBooks() {

  browseRequestId++;
  browseMode = "trending";
  currentBrowseSubject = "";
  browseOffset = 0;
  loadMoreButton.classList.add("hidden");

  browseTitle.textContent = "Trending Books ♡";
  browseMessage.textContent = "Finding popular reads for you... ♡";

  browseLoading.classList.remove("hidden");
  browseResults.replaceChildren();

  try {
    const response = await fetch(
      "https://openlibrary.org/trending/daily.json?limit=24"
    );

    if (!response.ok) {
      throw new Error("Could not load trending books.");
    }

    const data = await response.json();

    browseOffset = (data.works || []).length;
    loadMoreButton.classList.toggle(
      "hidden",
      browseOffset < BOOKS_PER_PAGE
    );


    const books = (data.works || []).map((book) => ({
      key: book.key,
      title: book.title,
      author: book.author_name?.[0] || "Unknown author",
      year: book.first_publish_year || null,
      coverId: book.cover_i || null,
      subjects: (book.subject || []).slice(0, 8),
      matches: 0
    }));

    browseMessage.textContent =
      `Explore ${books.length} trending reads! ♡`;

    displayBooks(books, browseResults);

  } catch (error) {
    console.error("Trending books error:", error);

    browseMessage.textContent =
      "Couldn't load trending books right now. Try browsing by genre! ♡";

  } finally {
    browseLoading.classList.add("hidden");
  }
}

// Automatically show trending books when the page opens
loadTrendingBooks();


/* =========================================
   VERSION 2 - BOOK DETAILS POPUP
   ========================================= */

async function openBookDetails(book) {
  // Show the popup
  bookModal.classList.remove("hidden");

  // Display a loading message
  modalBody.replaceChildren();

  const loadingMessage = document.createElement("p");
  loadingMessage.textContent = "Opening your next story... ♡";
  modalBody.appendChild(loadingMessage);

  // Clear previous similar books
  similarBooks.replaceChildren();

  try {
    // Get the book's full details from Open Library
    const response = await fetch(
      `https://openlibrary.org${book.key}.json`
    );

    if (!response.ok) {
      throw new Error("Could not load book details.");
    }

    const details = await response.json();

    // Open Library descriptions can be text or objects
    let description = details.description;

    if (typeof description === "object" && description !== null) {
      description = description.value;
    }

    if (!description) {
      description =
        "A full synopsis isn't available for this book yet. " +
        "Visit Open Library to explore more about this story. ♡";
    }

    // Create the book details layout
    const bookLayout = document.createElement("div");
    bookLayout.className = "modal-book";

    // Book cover
    const cover = document.createElement("img");
    cover.className = "modal-cover";
    cover.alt = `Cover of ${book.title}`;

    if (book.coverId) {
      cover.src =
        `https://covers.openlibrary.org/b/id/${book.coverId}-L.jpg`;
    } else {
      cover.style.display = "none";
    }

    // Book information
    const info = document.createElement("div");
    info.className = "modal-info";

    const title = document.createElement("h2");
    title.id = "modalTitle";
    title.textContent = book.title;

    const author = document.createElement("p");
    author.textContent = `by ${book.author}`;

    const year = document.createElement("p");
    year.textContent = book.year
      ? `First published: ${book.year}`
      : "";

    const synopsis = document.createElement("p");
    synopsis.className = "modal-description";
    synopsis.textContent = description;

    // Link to Open Library
    const link = document.createElement("a");
    link.className = "book-link";
    link.href = `https://openlibrary.org${book.key}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View on Open Library ↗";

    info.append(title, author, year, synopsis, link);
    bookLayout.append(cover, info);

    modalBody.replaceChildren(bookLayout);


    loadSimilarBooks(book, details);


  } catch (error) {
    console.error("Book details error:", error);

    modalBody.textContent =
      "Sorry, we couldn't load this book's details. " +
      "Please try again. ♡";
  }
}

// Close popup using the X button
closeModal.addEventListener("click", () => {
  bookModal.classList.add("hidden");
});

// Close popup by clicking outside the content
bookModal.addEventListener("click", (event) => {
  if (event.target === bookModal) {
    bookModal.classList.add("hidden");
  }
});

// Close popup by pressing Escape
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    bookModal.classList.add("hidden");
  }
});


/* =========================================
   VERSION 2 - SIMILAR BOOK RECOMMENDATIONS
   ========================================= */

async function loadSimilarBooks(book, details) {
  similarBooks.replaceChildren();

  const message = document.createElement("p");
  message.textContent = "Finding similar stories... ♡";
  similarBooks.appendChild(message);

  try {
    // Use the book's subjects to find similar stories
    const subjects = Array.isArray(details.subjects)
      ? details.subjects
      : book.subjects || [];

    // Prefer broad genres rather than very specific subjects
    const genreNames = [
      "romance",
      "fantasy",
      "mystery",
      "thriller",
      "horror",
      "science fiction",
      "historical fiction",
      "young adult",
      "fiction"
    ];

    const subject = subjects.find((item) =>
      genreNames.includes(item.toLowerCase())
    );

    const searchTerm = subject || subjects[0] || "fiction";

    const params = new URLSearchParams({
      subject: searchTerm,
      limit: "12",
      fields: "key,title,author_name,first_publish_year,cover_i,subject"
    });

    const response = await fetch(
      `https://openlibrary.org/search.json?${params}`
    );

    if (!response.ok) {
      throw new Error("Could not load similar books.");
    }

    const data = await response.json();

    const books = (data.docs || [])
      .filter((item) => item.key !== book.key && item.title)
      .slice(0, 6)
      .map((item) => ({
        key: item.key,
        title: item.title,
        author: item.author_name?.[0] || "Unknown author",
        year: item.first_publish_year || null,
        coverId: item.cover_i || null,
        subjects: (item.subject || []).slice(0, 8),
        matches: 0
      }));

    similarBooks.replaceChildren();

    if (books.length === 0) {
      similarBooks.textContent =
        "No similar books found this time. ♡";
      return;
    }

    displayBooks(books, similarBooks);

  } catch (error) {
    console.error("Similar books error:", error);

    similarBooks.textContent =
      "Couldn't load similar books right now. ♡";
  }
}


/* =========================================
   VERSION 2 - LOAD MORE BOOKS
   ========================================= */



async function loadMoreBrowseBooks() {
  const requestId = ++browseRequestId;

  loadMoreButton.disabled = true;
  loadMoreButton.textContent = "Loading books... ♡";
  browseLoading.classList.remove("hidden");

  try {
    let url;

    if (browseMode === "genre") {
      url = `https://openlibrary.org/subjects/${currentBrowseSubject}.json?limit=${BOOKS_PER_PAGE}&offset=${browseOffset}`;
    } else {
      url = `https://openlibrary.org/trending/daily.json?limit=${BOOKS_PER_PAGE}&offset=${browseOffset}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("Could not load more books.");
    }

    const data = await response.json();

    if (requestId !== browseRequestId) return;

    const works = data.works || [];

    const books = works
      .filter((book) => book.key && book.title)
      .map((book) => ({
        key: book.key,
        title: book.title,
        author: browseMode === "genre"
          ? book.authors?.[0]?.name || "Unknown author"
          : book.author_name?.[0] || "Unknown author",
        year: book.first_publish_year || null,
        coverId: browseMode === "genre"
          ? book.cover_id || null
          : book.cover_i || null,
        subjects: (book.subject || []).slice(0, 8),
        matches: 0
      }));

    // Keep existing books and append the new ones
    const existingKeys = new Set(
      [...browseResults.querySelectorAll("[data-book-key]")]
        .map((card) => card.dataset.bookKey)
    );

    books.forEach((book) => {
      if (existingKeys.has(book.key)) return;

      const card = createBookCard(book);
      card.dataset.bookKey = book.key;

      browseResults.appendChild(card);
      existingKeys.add(book.key);
    });

    browseOffset += works.length;

    // Hide the button when there are no more results
    loadMoreButton.classList.toggle(
      "hidden",
      works.length < BOOKS_PER_PAGE
    );

    browseMessage.textContent =
      `Showing ${browseResults.children.length} books ♡`;

  } catch (error) {
    console.error("Load more error:", error);
    browseMessage.textContent =
      "Couldn't load more books. Please try again. ♡";
  } finally {
    if (requestId === browseRequestId) {
      browseLoading.classList.add("hidden");
      loadMoreButton.disabled = false;
      loadMoreButton.textContent = "Load more books ♡";
    }
  }
}

loadMoreButton.addEventListener("click", loadMoreBrowseBooks);


/* =========================================
   VERSION 3 - BOOKTOK CATEGORY BUTTONS
   ========================================= */

// Get the BookTok elements from our HTML
const booktokCategories = document.getElementById("booktokCategories");
const booktokResults = document.getElementById("booktokResults");
const booktokLoading = document.getElementById("booktokLoading");

// Categories visitors can choose
const booktokGenres = [
  { name: "♡ All Favorites", category: "all" },
  { name: "✧ Romantasy", category: "romantasy" },
  { name: "♡ Romance", category: "romance" },
  { name: "✿ Fantasy", category: "fantasy" },
  { name: "✧ Mystery & Thriller", category: "mystery" }
];

// Create the category buttons
function createBooktokCategories() {
  booktokGenres.forEach((genre) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "chip";
    button.textContent = genre.name;
    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", () => {
      // Remove selection from other buttons
      booktokCategories.querySelectorAll(".chip").forEach((chip) => {
        chip.classList.remove("selected");
        chip.setAttribute("aria-pressed", "false");
      });

      // Highlight the selected button
      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");

      // We'll connect this to book recommendations next!
    displayBooktokBooks(genre.category);    });

    booktokCategories.appendChild(button);
  });

  // Select All Favorites when the page first loads
  const firstButton = booktokCategories.querySelector(".chip");

  if (firstButton) {
    firstButton.classList.add("selected");
    firstButton.setAttribute("aria-pressed", "true");
  }
}

createBooktokCategories();


/* =========================================
   VERSION 3 - BOOKTOK BOOK COLLECTION
   ========================================= */

// Curated BookTok favorites.
// Each book belongs to one or more categories.

const booktokBooks = [
  {
    title: "Fourth Wing",
    author: "Rebecca Yarros",
    categories: ["romantasy", "fantasy"]
  },
  {
    title: "A Court of Thorns and Roses",
    author: "Sarah J. Maas",
    categories: ["romantasy", "fantasy"]
  },
  {
    title: "Powerless",
    author: "Lauren Roberts",
    categories: ["romantasy", "fantasy"]
  },
  {
    title: "Divine Rivals",
    author: "Rebecca Ross",
    categories: ["romantasy", "fantasy"]
  },
  {
    title: "The Serpent and the Wings of Night",
    author: "Carissa Broadbent",
    categories: ["romantasy", "fantasy"]
  },
  {
    title: "The Love Hypothesis",
    author: "Ali Hazelwood",
    categories: ["romance"]
  },
  {
    title: "Icebreaker",
    author: "Hannah Grace",
    categories: ["romance"]
  },
  {
    title: "Better Than the Movies",
    author: "Lynn Painter",
    categories: ["romance"]
  },
  {
    title: "It Ends with Us",
    author: "Colleen Hoover",
    categories: ["romance"]
  },
  {
    title: "The Seven Husbands of Evelyn Hugo",
    author: "Taylor Jenkins Reid",
    categories: ["romance"]
  },
  {
    title: "Six of Crows",
    author: "Leigh Bardugo",
    categories: ["fantasy"]
  },
  {
    title: "The Cruel Prince",
    author: "Holly Black",
    categories: ["fantasy", "romantasy"]
  },
  {
    title: "The Housemaid",
    author: "Freida McFadden",
    categories: ["mystery"]
  },
  {
    title: "A Good Girl's Guide to Murder",
    author: "Holly Jackson",
    categories: ["mystery"]
  },
  {
    title: "Verity",
    author: "Colleen Hoover",
    categories: ["mystery"]
  },
  {
    title: "The Silent Patient",
    author: "Alex Michaelides",
    categories: ["mystery"]
  }
];


/* =========================================
   VERSION 3 - DISPLAY BOOKTOK BOOKS
   ========================================= */

// Store the books after Open Library finds them
let loadedBooktokBooks = [];

// Find one book using its title and author
async function fetchBooktokBook(book) {
  const params = new URLSearchParams({
    title: book.title,
    author: book.author,
    limit: "5",
    fields: "key,title,author_name,first_publish_year,cover_i,subject"
  });

  const response = await fetch(
    `https://openlibrary.org/search.json?${params}`
  );

  if (!response.ok) {
    throw new Error(`Could not find ${book.title}`);
  }

  const data = await response.json();

  // Prefer an exact title and author match
  const match = (data.docs || []).find((item) => {
    const sameTitle =
      normalizeText(item.title) === normalizeText(book.title);

    const sameAuthor = (item.author_name || []).some(
      (name) =>
        normalizeText(name).includes(normalizeText(book.author))
    );

    return sameTitle && sameAuthor;
  });

  if (!match) return null;

  return {
    key: match.key,
    title: match.title,
    author: match.author_name?.[0] || book.author,
    year: match.first_publish_year || null,
    coverId: match.cover_i || null,
    subjects: (match.subject || []).slice(0, 8),
    matches: 0,
    categories: book.categories
  };
}

// Display the selected BookTok category
function displayBooktokBooks(category = "all") {
  const books = category === "all"
    ? loadedBooktokBooks
    : loadedBooktokBooks.filter(
        (book) => book.categories.includes(category)
      );

  displayBooks(books, booktokResults);
}

// Load our curated books when the website opens
async function loadBooktokBooks() {
  booktokLoading.classList.remove("hidden");

  try {
    const results = await Promise.allSettled(
      booktokBooks.map((book) => fetchBooktokBook(book))
    );

    loadedBooktokBooks = results
      .filter(
        (result) =>
          result.status === "fulfilled" && result.value
      )
      .map((result) => result.value);

    displayBooktokBooks();

  } catch (error) {
    console.error("BookTok loading error:", error);
    booktokResults.textContent =
      "Couldn't load BookTok favorites right now. ♡";

  } finally {
    booktokLoading.classList.add("hidden");
  }
}

loadBooktokBooks();


// Load more personalized search recommendations
searchLoadMoreButton.addEventListener("click", () => {
  visibleSearchBooks += SEARCH_BOOKS_PER_PAGE;

  displayBooks(
    currentBooks.slice(0, visibleSearchBooks),
    resultsContainer
  );

  searchLoadMoreButton.classList.toggle(
    "hidden",
    visibleSearchBooks >= currentBooks.length
  );
});

