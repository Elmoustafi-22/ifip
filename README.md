# IFIP

IFIP is the Islamic Finance Internship Preparatory & Placement Program. It is a structured platform for managing application, training, assessment, and internship placement for aspiring professionals in the Islamic finance and ethical economy ecosystem.

## About the project

The platform supports the full candidate journey from program application through cohort onboarding, assessment, and placement with partner organizations.

Key program capabilities include:

- applicant registration, eligibility screening, and cohort admission
- four-week preparatory training with Islamic finance knowledge, professionalism, and workplace readiness
- assessment and readiness evaluation for internship suitability
- placement coordination with partner organizations across Islamic finance, advisory, technology, marketing, research, and operations

## Audience

The project is built to serve:

- university students and recent graduates
- early-career professionals seeking Islamic finance industry entry
- aspiring professionals interested in ethical finance, fintech, and impact investing

## Overview

The project is organized as a monorepo with separate frontend and backend applications:

- `ifip-backend/` — API server for authentication, applications, payments, file uploads, and notifications.
- `ifip-frontend/` — Next.js UI for applicants, partners, and administrators.

## How it works

The platform supports three main user surfaces:

- Public marketing and partner interest pages, including active partner listings and a partner application intake form
- Applicant flow with email verification, multi-step form, levy payment, and post-payment access
- Admin panel for reviewing paid applicants, managing cohorts, modules, placements, and partners

Key design principles:

- Pre-payment data lives in a temporary `Applicant` record that expires automatically if payment is not completed.
- A real `User` account and permanent `Application` are created only after verified payment via webhook.
- Admins review only paid, confirmed applicants; rejected or abandoned applicants are never persisted as active accounts.
- Payment is part of registration, not a separate final step.

## Tech stack

- Backend: Node.js, Express, TypeScript, MongoDB, Mongoose, JWT, Cloudinary, Paystack, Brevo
- Frontend: Next.js, React, TypeScript, Tailwind CSS, React Hook Form, React Query

## Repo layout

- `ifip-backend/`
  - `src/server.ts` — backend entry point
  - `src/controllers/` — route handlers
  - `src/models/` — Mongoose schemas
  - `src/routes/` — API routes
  - `src/services/` — integrations and utilities
  - `src/config/` — environment and runtime config
- `ifip-frontend/`
  - `app/` — Next.js app routes and pages
  - `lib/` — frontend utilities and API clients
  - `public/` — static assets

## Key features

- Applicant registration, application submission, and authentication
- Partner management and placement tracking
- Payment integration with Paystack
- File upload support via Cloudinary
- Notification workflows using Brevo email
- Admin dashboard and cohort management
- Public partner intake and partner organization management

## Getting started

### Backend

```bash
cd ifip-backend
npm install
npm run dev
```

### Frontend

```bash
cd ifip-frontend
npm install
npm run dev
```

## Environment variables

### Backend required variables

- `MONGO_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `APPLICANT_SESSION_SECRET`
- `SET_PASSWORD_TOKEN_SECRET`
- `RESET_PASSWORD_TOKEN_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLIENT_URL`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_CALLBACK_URL`
- `BREVO_API_KEY`
- `EMAIL_FROM`

### Frontend environment variables

- `NEXT_PUBLIC_API_BASE_URL` — backend API base URL used by the frontend

## Deployment

This repository should remain a single GitHub repo, but the frontend and backend should be deployed separately.

- Backend: deploy as an API service (Render, Railway, Heroku, Azure, AWS)
- Frontend: deploy as a Next.js app (Vercel, Netlify, Cloudflare Pages)

Make sure the deployed frontend uses the backend URL and that the backend allows CORS from your frontend domain.

## Contributing

If you want to extend this project, add new features in the appropriate folder and keep backend/frontend changes isolated.

## License

This repository does not include a license file. Add one if you want to open source the project.
