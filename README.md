# Linguo — Client‑Side AI Toolkit with Chrome Built‑in AI

Linguo is a Next.js web application that showcases privacy‑preserving, client‑side AI features powered by Google Chrome’s Built‑in AI APIs, including Gemini Nano. It demonstrates grammar proofreading, translation, summarization, prompt generation, writing assistance, and rewriting — all running locally in the browser for network resilience, zero server costs, and user privacy.

This project is designed for the Google Chrome Built‑in AI Challenge 2025 and implements key capabilities of the Prompt API, Proofreader API, Summarizer API, Translator API, Writer API, and Rewriter API.

---

## Why Client‑Side AI
- Creative freedom: Build proactively without server costs, quotas, or latency.
- Inherent privacy: User input and context never leave the device.
- Network resilience: Consistent UX even offline or on unstable connections.
- Hybrid strategy ready: Extend to Firebase AI Logic or Gemini Developer API when cloud augmentation is needed.

---

## Features
- Proofreader: Detects grammar/style issues, explains them, and applies fixes individually or in bulk.
- Translator: Translates text between multiple languages with a simple, fast UI.
- Summarizer: Distills long content into compact, readable summaries.
- Prompt: Generates structured prompts (multimodal‑ready with image/audio inputs) for downstream tasks.
- Writer: Produces original, engaging text to kickstart content creation.
- Rewriter: Improves clarity and tone with alternative phrasing suggestions.

All features run client‑side using Chrome’s Built‑in AI. Pages are available at:
- `/proofreader`
- `/translator`
- `/summarize`
- `/prompt`
- `/writer`
- `/rewriter`

---

## Architecture & Tech Stack
- Framework: Next.js (App Router) with React.
- Client‑side modules: `src/features/ai`, `src/types/chrome-ai.d.ts` (API typings), and dedicated pages under `src/app/*`.
- UI components: `EditorPane`, `EditorToolbar`, `OutputPane`, `SuggestionsHistoryTabs`.
- Type mapping and suggestion logic: `src/app/proofreader/page.tsx` implements the `Proofreader` corrections mapping.
- Styles: Global CSS (`src/app/globals.css`).

Project structure highlights:
```
linguo/
├── src/app/
│   ├── proofreader/
│   ├── translator/
│   ├── summarize/
│   ├── prompt/
│   ├── writer/
│   └── rewriter/
├── src/components/
│   ├── EditorPane.tsx
│   ├── SuggestionsHistoryTabs.tsx
│   └── EditorToolbar.tsx
└── src/types/
    └── chrome-ai.d.ts
```

---

## Proofreader Logic
Corrections from Chrome’s `Proofreader` API are handled via indices and replacements to produce descriptive and actionable suggestions.

- Input correction shape: `startIndex`, `endIndex`, `replacement`, `type`, `explanation`.
- Derived `originalSegment` from the user’s input string using `[startIndex, endIndex)`.
- Suggestion types:
  - Replace: `Change "go" to "goes"` (when both original and replacement exist and differ).
  - Remove: `Remove "with"` (when original exists but replacement is empty).
  - Add: `Add "to"` (when replacement exists and original length is zero).
- “Fix All” applies corrections in reverse order of `startIndex` to avoid index shifting.

Example:
```ts
// Replace example
// Original: She go to school.
// Correction: startIndex=4, endIndex=6, replacement="goes"
// Suggestion: Change "go" to "goes"

// Remove example
// Original: She is married with a doctor.
// Correction: startIndex=15, endIndex=19, replacement=""
// Suggestion: Remove "with"

// Add example
// Original: She is married a doctor.
// Correction: startIndex=15, endIndex=15, replacement="to"
// Suggestion: Add "to"
```

---

## Setup
1. Requirements
   - Chrome with Built‑in AI Early Preview (e.g., Canary/Dev channel). Sign up to the Early Preview Program to enable APIs and access documentation.
   - Node.js 18+ and npm.

2. Install dependencies
```
npm install
```

3. Run the dev server
```
npm run dev
```
Visit `http://localhost:3001/` and navigate to the feature pages.

4. Lint
```
npm run lint
```

---

## Usage Walkthrough
- Proofreader
  - Open `/proofreader`.
  - Enter text (e.g., `She is married with a doctor.`) and click `Generate Suggestions (AI)`.
  - Review suggestions under “Grammar” or “Rewrite”, then click `Apply Fix` or `Fix All Errors (AI)`.
  - DevTools console logs show structured corrections, mapped suggestions, and corrected content.

- Translator
  - Open `/translator`, input text, choose target language, and translate locally.

- Summarizer
  - Open `/summarize`, paste long content, generate concise summaries.

- Prompt / Writer / Rewriter
  - Use `/prompt` to generate structured prompts; `/writer` to create content; `/rewriter` to improve phrasing.

---

## Chrome Built‑in AI APIs Used
- Prompt API: Generate dynamic prompts and structured outputs (multimodal‑ready for image/audio).
- Proofreader API: Detect and fix grammar mistakes; provides indices and replacements.
- Summarizer API: Produce concise summaries of long text.
- Translator API: Translate text across languages client‑side.
- Writer API: Generate original, engaging text.
- Rewriter API: Improve clarity and tone with alternative phrasing.

Note: API availability may depend on Early Preview status and Chrome version. Join the Early Preview Program for the latest documentation and access.

---

## Challenge Requirements Checklist
- New, original project (2025): This app is new for the 2025 challenge.
- Uses Chrome Built‑in AI: Integrates Proofreader, Translator, Summarizer, Prompt, Writer, Rewriter APIs.
- Submission materials:
  - Text description: This README outlines features, functionality, APIs used, and the problem solved (client‑side privacy and resilience for language tasks).
  - Demo video: Record <3 minutes showing the app functioning locally; upload to YouTube/Vimeo and include the link.
  - Public GitHub repository: This repo should include an open source license and testing instructions.
  - Public application access: Deploy or provide a live link for judging; include credentials if private.
  - Language: All written and video parts in English.

---

## Deployment
- Static hosting (recommended): Vercel/Netlify or any static host that supports Next.js.
- Privacy: No server required for AI features; all logic runs in the browser.
- Hybrid option: Add Firebase AI Logic or Gemini Developer API if you need cloud augmentation.

---

## Troubleshooting
- API not available: Ensure you’re enrolled in the Early Preview Program and using a compatible Chrome build.
- Console error `TypeError: Cannot read properties of null (reading 'value')`:
  - Typically triggered by DOM listeners during selection/input changes; it does not affect proofreader application logic.
  - Refresh the page, re‑enter text, and re‑generate suggestions. Check DevTools logs under the proofreader console groups.
- Suggestions look odd (e.g., "Change 'X' to 'X'"):
  - Confirm you are on a recent build; the mapping uses `startIndex`, `endIndex`, `replacement` and derives `originalSegment` correctly.

---

## Roadmap
- UI toggle to display raw corrections (`type`, `explanation`) inline.
- Export/import sessions for cross‑device workflows.
- Enhanced language detection and auto‑translate pipelines.
- Multimodal prompt examples (image/audio) when available in the Prompt API.
- Optional hybrid cloud integrations for heavier tasks.

---

## Contributing
- Issues and PRs are welcome. Please describe feature requests clearly and include reproduction steps for bugs.

---

## License
- An open source license is required for challenge submissions. We recommend adding an MIT or Apache‑2.0 license to the repository.

---

## Acknowledgments
- Google Chrome Built‑in AI team and Gemini Nano.
- Community contributors exploring client‑side AI and privacy‑first experiences.

---

## Usage Instructions

To use Linguo, open the application in Google Chrome on a build that supports Built‑in AI (recent Canary or Dev versions work best). If you’re running locally, install dependencies and start the development server, then visit `http://localhost:3001/` in Chrome. If the app is deployed (for example on Vercel), simply open your site URL in Chrome. The app will show a message if the on‑device AI model is not yet available on your browser, but the interface remains usable.

Begin on the Prompt page. Type your idea or task into the input and click Generate to produce a concise, actionable prompt tailored to your needs. Use Regenerate if you want alternative phrasing, and copy the resulting prompt from the output panel for use elsewhere.

For grammar and style improvements, go to the Proofreader page. Paste text directly or attach a document, then click Generate Suggestions (AI). The app presents issues with short explanations and offers precise fixes. Apply changes one by one or choose Fix All to update everything at once. Your corrected content appears in the output panel and is saved in the session history so you can retrace changes.

To condense long material, visit the Summarize page. Paste an article, report, or imported document, and click Summarize (AI). Linguo produces a compact, readable summary that captures the key points, ready to be copied or shared.

For multilingual work, open the Translator page. Paste your source text, select the target language, and click Translate (AI). The translated output displays immediately and can be copied into your workflow or refined further with the Rewriter.

When you need a fresh draft, use the Writer page. Enter a topic or short brief and click Write (AI) to generate an initial version. If you want variations, regenerate for alternative takes and iterate until you’re satisfied.

To improve clarity, tone, or phrasing without changing meaning, switch to the Rewriter page. Paste the text you want refined and click Rewrite (AI). Review the alternatives and choose the version that best fits your voice or audience before copying it out.

At any time, you can attach `.docx` or `.pdf` files using the clip icon in the editor toolbar. The document’s text is loaded into the editor, where you can proofread, translate, summarize, write, or rewrite it as needed. Imported content flows seamlessly between tools: for instance, you can proofread a section, then summarize the result, and finally rewrite a paragraph for tone.

Linguo is resilient to connectivity issues. Once Chrome’s Built‑in AI model has been downloaded and configured on your device, the core AI features continue to work even when the internet connection is weak or unavailable. If the model isn’t ready yet or your browser doesn’t support the APIs, the app will inform you and you can still use the interface and non‑AI functions while you prepare your environment.

For the smoothest experience, keep Chrome up to date and allow the browser time to complete the one‑time on‑device model setup the first time you use AI features. If something seems off, refresh the page and try again—availability can vary by device and build. You can freely move between tools and reuse output across pages, building a simple, private, end‑to‑end workflow for everyday writing tasks.
