
# ♡ The Book Nook

A cute, personalized book discovery website that helps readers
find their next favorite book based on genres, keywords, and tropes.

## About the Project

The Book Nook is a frontend web application built using
HTML, CSS, and JavaScript.

Users can describe their ideal story, select their favorite
genres and literary tropes, and discover book recommendations
using data from the Open Library API.

## Features

- Search for books using natural-language descriptions
- Select multiple genres and tropes
- Retrieve real book data from Open Library
- Rank books using keyword and subject matching
- View book covers, authors, and publication years
- Save favorite books to a personal bookshelf
- Store favorites using browser localStorage
- Responsive design for mobile and desktop

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Open Library Search API
- Open Library Covers API
- Git and GitHub

## How to Run Locally

1. Clone this repository.
2. Open the project folder in VS Code.
3. Open `index.html` using Live Server.
4. Enter a book description or select genres and tropes.
5. Click "Find my next read" to discover books.

## Recommendation System

The application uses a simple rule-based scoring system.

Books receive points for matching:
- Selected genres
- Keywords in the user's description
- Trope-related keywords in available book metadata

Results are ranked by their scores.

Note: Trope matches are approximate because Open Library
does not consistently provide detailed trope metadata.

## API

Book information is provided by Open Library:

https://openlibrary.org/developers/api

## Future Improvements

- More accurate trope matching
- Multiple API search strategies
- Better book descriptions
- Advanced recommendation filtering
- Reading status tracking
- Personalized user accounts

## Credits

Book data and cover images are provided by Open Library.

## Author

Created as a beginner web development portfolio project.
