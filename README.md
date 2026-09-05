# AI Interview Coach

AI Interview Coach is a web application that simulates realistic job interviews using Gemini on Google Cloud.

Users can select an interview topic, answer AI-generated interview questions, receive feedback and scores, and review previous interview sessions.

## Features

- Firebase Email/Password Authentication
- Multiple interview topics:
  - Performance Marketing
  - Google Ads
  - Meta Ads
  - GA4 & GTM
  - Digital Marketing
  - SEO
- Gemini-generated interview questions
- AI evaluation of candidate answers
- Score, strengths and improvement suggestions
- Ability to skip to the next interview question
- Interview history stored per authenticated user
- Secure backend deployed on Google Cloud Run

## Technology Stack

- Google Cloud Run
- Vertex AI Gemini
- Firebase Authentication
- Cloud Firestore
- Google Secret Manager
- Node.js
- Express.js
- HTML
- CSS
- JavaScript

## Architecture

Browser  
→ Firebase Authentication  
→ Cloud Run Node.js Backend  
→ Vertex AI Gemini  
→ Cloud Firestore

Sensitive configuration is handled through Google Secret Manager.

## Live Demo

https://ai-interview-coach-final-782933997269.asia-south1.run.app

## Cloud Run Region

`asia-south1`

## Project Structure

```text
ai-interview-coach-final-app/
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── server.js
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

## Run Locally

Install dependencies:

```bash
npm install
```

Start the application:

```bash
npm start
```

The application runs on port `8080` by default.

## Security

No private API keys, service-account credentials or application secrets are stored in this repository.

Sensitive values used by the deployed application are stored securely using Google Secret Manager.

## Deployment

The application is deployed to Google Cloud Run.

Region:

```text
asia-south1
```

Required challenge verification label:

```text
dev-tutorial=cloud-run-ai-challenge
```

## Challenge

Built for the Gen AI Academy APAC / Google Cloud Run AI Challenge.

#AccelerateAIwithCloudRun