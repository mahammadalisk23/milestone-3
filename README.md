# milestone-3

This repository contains an AI-powered soil analytics web application designed to help farmers and agricultural users evaluate soil health, get fertilizer recommendations, and identify the most suitable crops for their land.

## Project overview

The app analyzes soil parameters such as Nitrogen, Phosphorus, Potassium, pH, organic matter, and moisture. It then:

- calculates a soil health score
- identifies deficiencies and risks
- provides recommendation-based fertilizer and management advice
- ranks crops by suitability for the provided soil conditions
- generates downloadable PDF reports
- supports English, Hindi, and Kannada language interfaces
- works as a mobile-friendly progressive web app (PWA)

## Repository structure

- `soil-analytics-app/` — main application source code
  - backend logic for recommendations and scoring
  - frontend UI and PWA assets
  - localized support for multiple languages

## Tech stack

- JavaScript
- Node.js
- Express
- HTML/CSS
- Progressive Web App (PWA) features

## Getting started

Navigate to the app folder and install dependencies:

```bash
cd soil-analytics-app
npm install
npm start
```

Then open your browser at:

```text
http://localhost:3000
```

## Purpose

This project demonstrates a rule-based agricultural decision-support system that combines soil-testing data with user-friendly recommendations in a simple browser-based interface.