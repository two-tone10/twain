# Keep: response to App Review (4.3(a), 4.3(b), 4.2.6)

Rejection: 2026-10-16, submission 83ca664f-815d-43a6-a2b7-3df16e3f0df0, build 8.
Account-wide plan and vocabulary rules: `two-tone10/purpose-platform` → `docs/app-store/ACCOUNT_CLEANUP.md`.

## Before sending (every box must be ticked; the letter claims these were done)

- [ ] **"whys" → "pulls" in every user-facing string.** Aliis owns "whys". Known spots: insight headline in `src/keep/insight.mjs` ("N different whys"), why pages `src/app/why/[k].js` (title, "No why counts for more than another"), `src/app/decks.js` ("Every deck carries all seven whys"), Sky / results labels, onboarding, store description and screenshots. Keys and route names (`why/[k]`, `whys` fields) may stay; only visible text changes. Update `src/keep/insight.test.mjs` expectations.
- [ ] **No other app's words** in UI or store text: no "lens", "worth it", "purpose" as a headline, "reflection", "journal".
- [ ] **New keywords** (see ACCOUNT_CLEANUP.md): `game,stars,party game,friends,couples,personality,icebreaker,quiz,constellation,self discovery`
- [ ] **External TestFlight round done** (link https://testflight.apple.com/join/WQs4xPuV); question 4 rewritten with real tester feedback and the changes it led to.
- [ ] **Build 9** contains all of the above (not delivered by `eas update`). Attach build 9 to the submission, then paste everything below the line into App Review → Reply to App Review.

---

Hello App Review,

Thank you for the detailed questions. We believe Keep meets guidelines 4.3(a), 4.3(b) and 4.2.6, and answer each question below. We have also attached a new build (build 9) with the changes listed at the end of this message.

1. What the app does and the problem it solves

Keep is a short, timed game about the gap between what people say they want to do with their free time and what they actually choose. Moments (a slow coffee, a trail you've never tried, dinner with old friends) fall down the screen like stars for about 45 seconds, and the player taps the five they would keep. Because there is no time to deliberate, the choices reflect what the player actually reaches for rather than what they think they should want.

Each round is scored into one of 49 named constellations, and over several rounds the app shows the player a pattern across seven "pulls", the kinds of reasons people choose a moment (Delight, Setting, Novelty, Company, Skill, Taste, Direction). It also shows where their quick choices differ from what they say they value.

The game then turns insight into action. After a round the player picks one star to actually do this week, names a day and who it's with, and Keep checks back afterward to ask whether they did it and whether they were glad. Over time the Kept tab separates three things: what you reach for, what you actually do, and what you were glad you did. Popular apps and research both treat these as one thing.

The problem it solves: most people who get free time back let it drift into more work or scrolling, because they've never noticed what they actually enjoy. Questionnaires and journals ask people to state preferences, and people answer with what they think they should want. Keep measures behavior under light time pressure instead, and then checks it against what happens in real life.

2. Intended users

Adults and older teens (rated 16+) who feel their free time slips away, and who would play a one-minute game but would not fill out a journal or a values questionnaire. Two groups in particular:
- People in transition (new city, new job, recently retired, empty nest) rebuilding how they spend weekends and evenings.
- Friends and couples who want a light way to learn what the other person actually enjoys. Match mode has two people catch the same stars on their own phones and guess three of each other's five.

3. The gap in the market

The self-reflection category is dominated by journals, mood trackers and habit trackers. Those apps record what you already planned to do; none of them helps you find out what you want to do in the first place. Personality quizzes do try that, but they rely on self-report, give you a fixed label, and stop there.

Keep differs in three ways that we have not found together in any other app:
- It infers preferences from fast choices in a game instead of from self-report.
- It closes the loop. A choice becomes a plan, and the plan becomes a check-in that records whether you did it and whether you were glad. It separates wanting from liking, a distinction well established in motivation research that we are not aware of any consumer app tracking.
- It is social without being competitive: a shared daily drop, plus Match and Circles, which compare your reading of a friend rather than ranking players. There are no streaks, leaderboards or points to grind.

4. Beta testing

[REWRITE AFTER THE EXTERNAL TESTFLIGHT ROUND: number of outside testers, how long, and 3–4 pieces of feedback in their words with the change each led to. Keep the developer-testing paragraph below as the first half.]

Keep was tested by me, the developer, not by an outside group of testers. I installed every build through TestFlight (builds 3 through 8, October 9–15, 2026) and played it daily on my own iPhone, alongside simulator and Android emulator testing. Each round of play led to changes in the production build, for example:
- The decorative italic typeface was hard to read at small sizes on a phone, so all emphasis now uses a plain, highly legible sans-serif.
- I am color-blind, and the seven categories were hard to tell apart by hue alone. The themes now separate categories by brightness as well as color, so players with color-vision differences can read their sky.
- I replaced the original two-player "Duel" mode with Match, where each player guesses three of the other's five picks. Guessing what a friend will choose serves the game's purpose of learning about each other better than a head-to-head score.
- Because the game is open to players 16 and up, I removed every place a player could type text that someone else would see. Friends appear as star names chosen from a fixed list, circle names come from a list, and anything a player writes stays on their own phone. This means there is no user-written content for anyone to encounter.

5. Standalone or part of a suite

Keep is a standalone product. It does not require, link to or unlock any other app on our account, and it has its own codebase, its own backend, and its own category (Games).

Our developer account also publishes Invariably and Incipit. Those are place-based reflection journals: you search for a real bookshop or café on a map, record a visit, and write a private, encrypted reflection about why the place matters to you. Keep has no maps, places, visits, journal entries or subscriptions. It is a timed arcade-style game with multiplayer modes.

What these apps share is an idea, not code. I am a professor of psychology at Cornell University. I study purpose in life and how it relates to health and well-being, especially among youth and young adults, and I research ways to help people develop a positive sense of purpose. Our apps are based on the science and research I have conducted over the past two decades, and each one puts a different part of that research into practice. Keep uses seven reason categories drawn from it, the different reasons people choose how to spend their time, from simple pleasure to a sense of life direction. Our journal apps use the same research framework in a different form and for a different activity, much as two apps can both draw on cognitive-behavioral therapy and still be different products.

6. Could this be delivered inside another app on our account?

No. Invariably and Incipit are calm, place-based journals in the Lifestyle and Books categories: a user goes somewhere, then writes about it. Keep is a real-time, 45-second touch game with sound, haptics, a daily shared round, multiplayer matching and a home-screen widget. Putting a timed game inside a place journal would serve neither audience: people looking for a quick game would never find it inside a journal, and journal users don't expect an arcade game. The core interaction, audience, category and session length are all different.

7. Shared code, frameworks or assets with other apps on our account

No significant shared code or assets. Keep's game engine, scoring, constellation system, plans and check-ins, multiplayer (Match, Circles, daily drop) and widget were all written for this app and live in their own repository. Its backend is a separate Supabase project used by no other app. Its moment library (over 400 original moments) is not used by any other app.

The only things in common are standard frameworks (Expo / React Native, Supabase) and our company website, lipurposefe.com, which hosts each app's privacy policy, support page and universal links. The seven reason categories described in answer 5 are a shared research concept, not shared code or content.

8. Shared codebase, SDK or content library with any third-party app

No. Beyond standard open-source frameworks (Expo, React Native, Skia for rendering the sky), Keep uses no third-party template, SDK or content library. All game content was written for Keep.

9. Created for a client or third party

No. Keep was conceived, designed and built by us, LiPurposeFe LLC, and is submitted under our own developer account. We are the provider of all of its content, concept and branding. It was not built from a commercial template or an app generation service.

Changes in build 9

- Keep's seven categories are now called "pulls" throughout, a term used only in this app. Its wording, keywords and screenshots no longer use language from our other apps.
- [LIST THE CHANGES MADE FROM TESTER FEEDBACK.]

Thank you for your time. We're happy to provide a TestFlight walkthrough or any further detail.
