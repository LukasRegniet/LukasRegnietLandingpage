Lukas Regniet CV Landingpage
=================================

Files included:
- index.html     (main page)
- styles.css     (custom styles, light/dark compatible)
- app.js         (interactivity, theme toggle, Vimeo loop, copy URL)
- Lukas Regniet CV 2025 Digital Transformation.pdf (your CV, linked in the Download CV button)
- README.txt     (this file)

How to run locally:
1. Put all files in one folder.
2. Open a terminal in that folder.
3. Start a local web server, for example:
   python3 -m http.server 8080
4. Open http://localhost:8080 in your browser.

Direct open by double-clicking index.html can work too,
aber ein kleiner lokaler Server ist besser (CORS, autoplay policies etc.).

Deploy:
Upload *all* these files into the same directory on your web server.

Notes:
- The hero video pulls from Vimeo and loops a 5s segment (7s → 12s) with a soft fade.
- Theme toggle (light / dark) is stored in localStorage and persists on reload.
- The site defaults to light mode on first load.