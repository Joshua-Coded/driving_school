# DriveReady

A web app for passing the driving theory test in 14 days. It works on phones, keeps working offline once loaded, and saves progress on the device.

## What's inside
- **403 questions** imported from `Driving_Theory_English_Answer_Pictures (1).docx`, each with its picture showing the correct answer, sorted into 10 topics.
- **14-day plan**: days 1–11 each cover a batch of about 37 questions (study, then practise). Days 12–14 cover weak spots and full mock exams.
- **Study mode**: one card at a time with the answer shown. **Practice mode**: you get feedback right away, and any question you miss comes back later in the same session.
- **Spaced repetition**: each question sits in a box from 0 to 5 (Leitner system). A question is mastered when you get it right 3 times in a row.
- **Mock exam**: random questions, a countdown, a question navigator, flags, and a full review afterwards. It defaults to 20 questions, 20 minutes and 12 to pass. You can change these in Progress → Settings.
- **Driving scenarios**: 9 animated top-down traffic situations with right-hand traffic. You choose what to do before a timer runs out, then watch what happens.
- **Answers to confirm**: 37 questions are marked because the source document gives different answers in different languages. The app shows a note on each one.

## Commands
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (can be hosted anywhere)
npm run data       # rebuild src/data + public/media from the .docx
```

To check the scenario choreography (wrong choices must crash or nearly miss, safe ones must keep a gap):
```bash
npx esbuild scripts/check_scenarios.ts --bundle --platform=node --format=esm --outfile=/tmp/check.mjs && node /tmp/check.mjs
```
