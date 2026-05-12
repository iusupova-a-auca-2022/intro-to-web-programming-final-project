# IWP - Discussion Forum & News Aggregator

This project is designed to act as a website that allows for communication with other people, sharing ideas and opinions, asking questions, and partaking in discussions.
Further, the user is able to find and stay updated with the latest news on various topics. 

Most people use multiple platforms to stay informed about what is happening in the world and to discuss these events, their thoughts and opinions.
This project brings both into a single, unified space, allowing users to read news, 
then discuss what they have read directly in the forum, all without leaving the website.


## Features

### 1. Forum
* Create, read, and delete posts
* Nested comments
* Upvote / downvote system with one vote per user per post
* Category filtering
* Pagination across all post listings

### 2. Popular
* Posts ranked by vote count
* Time range filtering
* Trending Topics sidebar pulled from post titles

### 3. News
* Fetches and stores real articles and news
* Articles stored in database for fast filtering and search
* Keyword search across titles and descriptions
* Category filtering
* Source badges on every article card
* Pagination
* Clicking any article opens the original page in a new tab

### 4. Authentication
* Registration and login with hashed passwords
* JWT-based sessions
* Different colors assigned to user avatars on registration
* Posting, commenting, and voting require login


## Architecture

### Browser:
* index.html - structure
* style.css - style
* script.js - API calls, logic

▼
### Flask Backend:
* auth.py - register, login
* posts.py - CRUD, voting
* comments.py - nested comments
* news.py - fetch, search

▼
### PostgreSQL Database:
* users
* posts
* comments
* votes
* news_articles

▼
### External News API:
* Fetched on startup, stored in DB


## Tech Stack
* Fronted - HTML, CSS, JavaScript
* Backend - Python, Flask
* Database - PostgreSQL


## Setup & Run Instructions

### Prerequisites:
* Python 3.13+
* PostgreSQL
* API key

### 1. Create the database
#### In pgAdmin or psql:
    CREATE DATABASE forumnews;

### 2. Configure the backend
#### Open backend/config.py and set your PostgreSQL password and news API key:
    SQLALCHEMY_DATABASE_URI = "postgresql://postgres:YOUR_PASSWORD@localhost:5432/forumnews"
    NEWS_API_KEY = "your_key"

### 3. Install dependencies
    cd backend
 
#### Create and activate virtual environment:
    python -m venv venv
    venv\Scripts\activate # Windows
    source venv/bin/activate # macOS / Linux
 
#### Install packages:
    pip install -r requirements.txt

### 4. Start the backend
    python app.py

### 5. Start the frontend
#### Open a second terminal:
    cd frontend
    python -m http.server 8080
#### Open your browser at http://localhost:8080


## Screenshots
#### Forum Page
<img src="screenshots/Forum-page.png">

#### Popular Page
<img src="screenshots/Popular-page.png">

#### News Page
<img src="screenshots/News-page.png">

#### Login Page
<img src="screenshots/Login-page.png">

#### Singup Page
<img src="screenshots/Signup-page.png">

#### Create New Post
<img src="screenshots/New-Post.png">

#### Post Page
<img src="screenshots/Post-page.png">

#### Comments
<img src="screenshots/Comments.png">

#### Create New Comment
<img src="screenshots/New-Comment.png">


## Demo Video
https://youtu.be/rH1R9rWb8ok

## Feedback Video
Magalimova Diana, a senior of Software Engineering
https://youtu.be/qgKBxY8S40U