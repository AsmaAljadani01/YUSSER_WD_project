# YUSSER – Hajj & Umrah Booking Platform

A website for browsing and booking Hajj and Umrah campaigns (Gold / Silver / Economy), with booking and contact forms.

**Live demo:** https://asmaaljadani01.github.io/web-development-project/

**Team:** Nada Abdulkarim, Asma Aljadani

## Structure
```
*.html        pages (index, campaigns, booking, contactUS, viewBooking, aboutUS)
css/ js/ media/
backend/      optional Node.js + MySQL server
```

## Run
- **GitHub Pages (demo mode):** Settings → Pages → Deploy from a branch → `main` / `(root)`. Bookings are saved in the visitor's browser only.
- **Full mode (MySQL):**
  ```bash
  mysql -u root -p < backend/schema.sql
  cd backend && cp .env.example .env   # set DB_PASSWORD
  npm install && npm start             # http://localhost:3000
  ```

Never commit `.env` or `node_modules/`.
