# AI Interview Coach

AI Interview Coach is a secure, production-ready AI-powered interview practice web application built for the **Gen AI Academy APAC / Google Cloud Run AI Challenge**.

The application allows authenticated users to practice realistic interviews across multiple digital marketing topics. Google Gemini generates interview questions, evaluates candidate answers, provides scores and feedback, suggests better answers, and progresses through increasingly practical interview questions.

The application is deployed on **Google Cloud Run** and uses **Firebase Authentication**, **Cloud Firestore**, the **Google AI Studio Gemini API**, and **Google Cloud Secret Manager**.

---

## Live Application

**Cloud Run Deployment**

https://ai-interview-coach-final-782933997269.asia-south1.run.app

---

## Public Code Repository

**GitHub Repository**

https://github.com/trustgold-tg/ai-interview-coach

---

## Project Overview

AI Interview Coach simulates a structured real-world interview experience.

Users can:

- Create an account and securely sign in
- Choose an interview topic
- Start a new AI-powered interview
- Answer realistic interview questions
- Skip questions when necessary
- Receive AI-generated evaluation and feedback
- View a score out of 10
- See strengths and improvement areas
- Review an improved sample answer
- Continue automatically to the next question
- Access previous interview sessions
- Delete unwanted interview history
- Maintain isolated interview data for each authenticated user

---

## Interview Topics

The application currently supports:

- Performance Marketing
- Google Ads
- Meta Ads
- GA4 & GTM
- Digital Marketing
- SEO

The question flow progresses from:

**Basic → Intermediate → Advanced → Scenario-Based**

For Performance Marketing interviews, Gemini can generate practical questions related to:

- Google Ads
- Meta Ads
- GA4
- Google Tag Manager
- Conversion Tracking
- Campaign Bidding
- Attribution
- Campaign Optimization
- Lead Quality
- Campaign Strategy

---

## AI Interview Evaluation

When a candidate provides an answer, the AI Coach evaluates it using a structured format.

Example:

```text
Score: 8/10

Strength:
Clear understanding of the concept and practical application.

Improvement:
Explain the business impact more clearly.

Better Answer:
A concise improved answer that could be used during a real interview.

Next Question:
The next interview question.