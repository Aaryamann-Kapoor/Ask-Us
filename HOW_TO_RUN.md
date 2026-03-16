
║              ASK-US — HOW TO RUN THE PROJECT             ║


STEP 1 — OPEN TERMINAL 1 (Backend)
════════════════════════════════════
1. Press  Windows Key + R
2. Type   cmd   and press Enter
3. Copy and paste this command:

   cd /d "Your-File-Path-To-The-Backend"

4. Press Enter
5. Then paste this command:

   python -m uvicorn app:app --reload

6. Press Enter
7. Wait until you see:
   ✅  INFO: Uvicorn running on http://127.0.0.1:8000

⚠️  DO NOT CLOSE THIS TERMINAL


STEP 2 — OPEN TERMINAL 2 (Frontend)
═════════════════════════════════════
1. Press  Windows Key + R  again
2. Type   cmd   and press Enter
3. Copy and paste this command:

   cd /d "Your-File-Path-To-The-Frontend"

4. Press Enter
5. Then paste this command:

   python -m http.server 3000

6. Press Enter
7. Wait until you see:
   ✅  Serving HTTP on 0.0.0.0 port 3000

⚠️  DO NOT CLOSE THIS TERMINAL


STEP 3 — OPEN THE APP
══════════════════════
1. Open your browser (Chrome recommended)
2. Type this in the address bar:

   http://localhost:3000

3. Press Enter
4. You should see the ASK-US app with a 🟢 GREEN dot
   in the top right corner saying "Gemini Connected"


STEP 4 — TRY A QUERY
═════════════════════
Type any of these in the chat box and press Ask:

   👉 Show monthly views trend by category
   👉 Compare likes and comments across all categories
   👉 Show sentiment score by region
   👉 Which category has the highest views?
   👉 Show ads enabled vs disabled views


TO STOP THE WEB APP
════════════════
Press  Ctrl + C  in both terminals to stop.


TROUBLESHOOTING
════════════════
❌ "python is not recognized"
   → Download Python from https://www.python.org/downloads/
   → During install, tick ✅ "Add Python to PATH"
   → Restart terminal and try again

❌ Green dot not showing / Backend Offline
   → Make sure Terminal 1 is running
   → Check that you see "Uvicorn running on http://127.0.0.1:8000"

❌ Page not loading
   → Make sure Terminal 2 is running
   → Make sure you typed http://localhost:3000 (not file://)

❌ Charts not changing per query
   → Replace app.py with the latest version from Claude
   → Restart Terminal 1

══════════════════════════════════════════════════════════════
  Both terminals MUST stay open while using the app!
══════════════════════════════════════════════════════════════
