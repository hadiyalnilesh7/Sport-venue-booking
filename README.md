# Sports Venue Booking Platform

Production-style starter project for a sports venue booking platform with three roles: user, venue owner, and admin.

## Stack

- Node.js
- Express.js
- MongoDB with Mongoose
- EJS templates
- Session-based authentication
- Multer image upload
- Nodemailer email notifications

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy environment file:

```bash
copy .env.example .env
```

3. Update MongoDB and mail credentials in `.env`

4. Start development server:

```bash
npm run dev
```

5. Open `http://localhost:5000`

## Seed Demo Data

Run the seed command after MongoDB is running:

```bash
npm run seed
```

Demo accounts created by the seed script:

- Admin: `admin@sportbook.com` / `password123`
- Owner: `owner@sportbook.com` / `password123`
- User: `user@sportbook.com` / `password123`

## Project Guide

The full system design, database plan, flows, and implementation roadmap are documented in `docs/project-blueprint.md`.

## Current Starter Modules

- Authentication and role-aware session handling
- Venue listing and venue detail pages
- Slot availability generation
- Booking price calculation with weekday/weekend logic
- Booking creation with no double-booking rule
- Owner dashboard starter
- Admin dashboard starter
- Email notification service stub ready for SMTP

## Next Milestones

1. Add seed data
2. Add owner venue management forms
3. Add booking history and cancellation flow
4. Add reviews, coupons, wishlist, and wallet pages
5. Integrate real payment gateway