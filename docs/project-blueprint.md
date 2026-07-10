# Sports Venue Booking Platform Blueprint

## 1. Recommended Tech Stack

- Frontend rendering: EJS with Express layouts
- Styling: custom CSS with reusable utility classes
- Backend: Node.js + Express.js
- Database: MongoDB + Mongoose
- Authentication: session-based auth with bcrypt password hashing
- Uploads: Multer with local storage now, cloud migration later
- Email: Nodemailer with SMTP
- Payments: service abstraction ready for Razorpay or Stripe integration
- Maps: store map link and coordinates, later attach Google Maps or Leaflet

## 2. Full Project Architecture

- Presentation layer: EJS views, partials, route handlers
- Application layer: controllers and services
- Domain layer: models, pricing logic, slot generation, booking rules
- Infrastructure layer: MongoDB, session store, mailer, uploads

## 3. Complete Feature Breakdown

- Public: home page, search, filters, venue details, featured venues, support page
- User: register, login, profile, booking history, cancel booking, wishlist, reviews
- Owner: dashboard, venue CRUD, slot blocking, offers, booking management, wallet summary
- Admin: dashboard, user management, owner approval, venue approval, booking oversight, reports
- Shared: notifications, validation, role-based access, image uploads, email workflows

## 4. Database Schema / Models

### User

- fullName
- email
- phone
- passwordHash
- role
- avatar
- isVerified
- isApproved
- favorites
- addresses

### Venue

- owner
- name
- slug
- sportTypes
- location { city, area, address, mapLink, coordinates }
- description
- amenities
- openingTime
- closingTime
- slotDurationMinutes
- pricing { baseTwoHourPrice, weekdayPrice, saturdayPrice, sundayPrice, advancePercentage }
- photos
- offers
- blockedSlots
- ratingSummary
- isFeatured
- isApproved
- status

### Booking

- bookingCode
- user
- owner
- venue
- sportType
- bookingDate
- slotStartTime
- slotEndTime
- slotKey
- pricingBreakdown { totalPrice, bookingAmount, remainingAmount, appliedOfferLabel, appliedCouponCode }
- bookingStatus
- paymentStatus
- paymentMethod
- paymentReference
- slotLocked
- cancellation { cancelledBy, cancelledAt, reason, refundAmount }

### Review

- user
- venue
- booking
- rating
- comment

### Offer

- venue
- owner
- title
- discountType
- discountValue
- code
- appliesOn
- startDate
- endDate
- isActive

### WalletTransaction

- owner
- booking
- venue
- amount
- type
- status
- note

## 5. Relationships Between Models

- One owner can have many venues
- One venue can have many offers, bookings, and reviews
- One user can have many bookings, reviews, and favorite venues
- One booking belongs to one user, one venue, and one owner
- One wallet transaction belongs to one owner and optionally one booking

## 6. Folder Structure

```text
Sport/
  docs/
  public/
    css/
    js/
    uploads/
  src/
    config/
    constants/
    controllers/
    middlewares/
    models/
    routes/
      web/
    services/
    utils/
    views/
      partials/
      pages/
        auth/
        venues/
        dashboard/
  server.js
```

## 7. Required Pages

- Home page
- Venue listing page
- Venue detail page
- Login page
- Register page
- User dashboard
- Booking history page
- Profile page
- Owner dashboard
- Venue create/edit page
- Owner booking management page
- Offers management page
- Wallet page
- Admin dashboard
- Manage users page
- Manage owners page
- Manage venues page
- Manage bookings page
- Reports page

## 8. User Flow

1. User visits home page and searches venues.
2. User opens venue detail page and checks available slots.
3. User logs in or registers.
4. User selects sport, date, and time slot.
5. System calculates total, advance, and remaining amount.
6. Booking is created and slot is locked.
7. Confirmation email is sent to user and owner.
8. User tracks status from dashboard.

## 9. Owner Flow

1. Owner registers and waits for admin approval.
2. Owner creates venue with pricing, timings, and photos.
3. Owner blocks unavailable slots and creates offers.
4. Owner receives booking notifications.
5. Owner confirms bookings and tracks earnings.

## 10. Admin Flow

1. Admin logs in.
2. Admin reviews owners and venues.
3. Admin manages disputes, bookings, and payouts.
4. Admin monitors analytics and reports.

## 11. Booking Flow

1. Generate slots from venue timing and slot duration.
2. Remove blocked slots and already booked slots.
3. User submits booking request.
4. Validate slot availability again on server.
5. Create booking in a transaction-ready flow.
6. Save price breakdown and payment status.
7. Lock slot using unique slot key.

## 12. Payment Flow

1. Calculate advance amount from configured percentage.
2. Store payment method and reference fields even before gateway integration.
3. Mark status as `Partial Paid` when advance is collected.
4. After full settlement, move to `Fully Paid`.
5. Create wallet transaction records for owner reporting.

## 13. Email Notification Flow

- Booking created: send detailed email to user and owner
- Booking cancelled: send cancellation email to both parties
- Owner approved: send approval email to owner
- Venue approved: send approval email to owner

## 14. Backend Routes

- `/` home page
- `/auth/register`
- `/auth/login`
- `/auth/logout`
- `/venues`
- `/venues/:slug`
- `/venues/:slug/book`
- `/dashboard`
- `/dashboard/bookings`
- `/owner/venues`
- `/owner/bookings`
- `/owner/offers`
- `/owner/wallet`
- `/admin/users`
- `/admin/owners`
- `/admin/venues`
- `/admin/bookings`

## 15. Controllers and Middleware Structure

- Controllers: request parsing + response rendering
- Services: pricing, slot generation, booking creation, email sending
- Middleware: auth, role checks, validation, upload handling, error handling

## 16. Authentication and Authorization Logic

- Session-based login for EJS app
- Hash passwords with bcrypt
- Store minimal user info in session
- `requireAuth` blocks guests
- `requireRole('owner')` and `requireRole('admin')` protect dashboards
- Approvals are enforced for owners before venue publishing

## 17. Slot Management Logic

- Slots are generated from opening time to closing time by slot duration
- Blocked slots are excluded
- Pending and confirmed bookings reserve the slot
- Unique booking slot key prevents double booking

## 18. Pricing Logic

- Weekday uses weekday price
- Saturday uses saturday price
- Sunday uses sunday price
- Active offers and valid coupons are checked after base price selection
- Advance amount is calculated from final discounted price

## 19. Scalable and Professional UI Design Plan

- Clean neutral sports-brand palette with energetic accent color
- Large hero search on home page
- Card-based venue grid with filters sidebar
- Detail page with gallery, venue facts, pricing box, slot picker, and reviews
- Dashboard layout with summary cards and action tables
- Mobile-first responsive design with simple forms and clear status badges

## 20. Step-by-Step Implementation Plan

1. Scaffold app structure and shared config
2. Build auth, role middleware, and session handling
3. Build core models: user, venue, booking, review, offer, wallet transaction
4. Build public venue pages and search filters
5. Build booking engine and pricing service
6. Build owner dashboard and venue management
7. Build admin dashboard and approvals
8. Add email notifications
9. Add payment gateway adapter
10. Add polish features: reviews, wishlist, coupons, invoices

## 21. Starter Code Module Plan

- Module 1: app bootstrap and configuration
- Module 2: authentication and role-aware middleware
- Module 3: venue model and public browsing
- Module 4: slot and pricing services
- Module 5: booking creation and notifications
- Module 6: owner and admin dashboards
- Module 7: advanced features and integrations