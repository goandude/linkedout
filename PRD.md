# Product Requirements Document (PRD): LinkedOut

**Version:** 1.0  
**Date:** November 24, 2026  
**Target Hosting:** Vercel (Static / Client-Side Edge Hosting)  
**Storage Model:** 100% Local Browser Storage Only (Zero Server Persistence)  

---

## 1. Executive Summary

**LinkedOut** is a privacy-first, browser-based analytics and query tool that lets users explore, search, and analyze their exported LinkedIn personal data archive (`.zip`) entirely on their own device.

LinkedIn provides users with a rich data export containing years of messages, connections, job applications, learning history, published articles, and ad-targeting profiles. However, the export is delivered as dozens of disconnected CSV and HTML files with inconsistent formatting, making it difficult to search or derive insights.

LinkedOut solves this by ingesting the user's `.zip` archive directly in the browser, normalizing LinkedIn's schema quirks, persisting parsed tables locally on the user's device, and providing a fast, intuitive interface for full-text search, faceted filtering, SQL querying, and pre-built career/network insights—without ever transmitting personal data over the network.

---

## 2. Goals & Non-Goals

### Goals
1. **Zero-Upload Privacy:** All `.zip` extraction, CSV/HTML parsing, indexing, and querying execute 100% client-side in the browser. No user data is sent to Vercel servers, backend APIs, or external third-party services.
2. **Instant Insights from Raw Exports:** Support drag-and-drop ingestion of LinkedIn's `Basic_LinkedInDataExport_*.zip` (and `Complete_LinkedInDataExport_*.zip`), gracefully handling missing/optional files and LinkedIn-specific CSV quirks.
3. **Powerful Querying:** Enable non-technical users (via guided filters, search, and pre-built question cards) and power users (via an in-browser SQL console) to answer complex questions across joined datasets.
4. **Local Persistence:** Save parsed data and saved queries locally in the browser so users do not have to re-upload and re-parse their `.zip` on every visit, with a one-click "Wipe All Local Data" control.

### Non-Goals (v1)
- **No Cloud Sync or User Accounts:** No authentication, cloud database, or cross-device sync.
- **No Automatic LinkedIn Scraping or OAuth:** LinkedOut only operates on user-exported archives.
- **No Default External AI/LLM Calls:** No user data will be sent to external LLM APIs. (Any future AI/NLQ feature must be strictly opt-in, e.g., via local WebGPU/WebLLM or explicit user-provided keys with clear warnings).

---

## 3. Target Audience & User Personas

1. **The Job Seeker:** Wants to find warm introductions at target companies, review past job applications and screening answers, and clean up saved jobs/alerts.
2. **The Networker / Sales / Founder:** Wants to search 10,000+ historical LinkedIn messages, find connections by company/role/date, and see who endorsed or interacted with them.
3. **The Privacy-Conscious Professional:** Wants to audit what LinkedIn knows about them (`Ad_Targeting.csv`, `Receipts_v2.csv`, `Verifications.csv`, `Registration.csv`) without uploading their personal archive to a third-party SaaS.

---

## 4. Data Inventory & Schema Analysis

Based on inspection of a standard `Basic_LinkedInDataExport` archive, LinkedOut must support the following files, grouped by domain, along with their known structural quirks:

### 4.1 Network & Relationships
| File | Key Columns | Notes / Quirks |
| :--- | :--- | :--- |
| `Connections.csv` | `First Name`, `Last Name`, `URL`, `Email Address`, `Company`, `Position`, `Connected On` | **Quirk:** Contains a 3-line `Notes:` preamble and blank line before the CSV header. `Email Address` is sparsely populated based on connection privacy settings. |
| `Invitations.csv` | `From`, `To`, `Sent At`, `Message`, `Direction`, `inviterProfileUrl`, `inviteeProfileUrl` | Tracks both `INCOMING` and `OUTGOING` connection requests. |
| `Company Follows.csv` | `Organization`, `Followed On` | List of followed companies and timestamps. |
| `Events.csv` | `Event Name`, `Event Time`, `Status`, `External Url` | LinkedIn events attended/registered. |
| `Notes.csv` | `Connection First Name`, `Connection Last Name`, `Connection Profile URL`, `Note`, `Created On`, `Edited On` | Private CRM-style notes on connections (often empty). |
| `Endorsement_Received_Info.csv` | `Endorsement Date`, `Skill Name`, `Endorser First Name`, `Endorser Last Name`, `Endorser Public Url`, `Endorsement Status` | Skills endorsed by others. |
| `Endorsement_Given_Info.csv` | `Endorsement Date`, `Skill Name`, `Endorsee First Name`, `Endorsee Last Name`, `Endorsee Public Url`, `Endorsement Status` | Skills endorsed by the user. |
| `Recommendations_Given.csv` | `First Name`, `Last Name`, `Company`, `Job Title`, `Text`, `Creation Date`, `Status` | Recommendations written by the user (also support optional `Recommendations_Received.csv`). |

### 4.2 Messaging
| File | Key Columns | Notes / Quirks |
| :--- | :--- | :--- |
| `messages.csv` | `CONVERSATION ID`, `CONVERSATION TITLE`, `FROM`, `SENDER PROFILE URL`, `TO`, `RECIPIENT PROFILE URLS`, `DATE`, `SUBJECT`, `CONTENT`, `FOLDER`, `ATTACHMENTS` | **Largest file** (e.g., 2.7 MB+, 13,000+ lines). **Quirk:** Multi-line quoted `CONTENT` fields with embedded newlines; requires strict RFC-4180 CSV parsing. |
| `guide_messages.csv` | Same as `messages.csv` (without `ATTACHMENTS`) | Often header-only if unused. |
| `learning_coach_messages.csv` | Same as `messages.csv` (without `ATTACHMENTS`) | AI Learning Coach threads; often header-only. |
| `learning_role_play_messages.csv` | Same as `messages.csv` (without `ATTACHMENTS`) | Learning role-play threads; often header-only. |

### 4.3 Career, Profile & Content
| File | Key Columns | Notes / Quirks |
| :--- | :--- | :--- |
| `Profile.csv` | `First Name`, `Last Name`, `Maiden Name`, `Address`, `Birth Date`, `Headline`, `Summary`, `Industry`, `Zip Code`, `Geo Location`, `Twitter Handles`, `Websites`, `Instant Messengers` | Single-row core profile. |
| `Profile Summary.csv` | `Profile Summary` | Supplemental summary text. |
| `Positions.csv` | `Company Name`, `Title`, `Description`, `Location`, `Started On`, `Finished On` | Work history. |
| `Education.csv` | `School Name`, `Start Date`, `End Date`, `Notes`, `Degree Name`, `Activities` | Education history. |
| `Skills.csv` | `Name` | List of profile skills. |
| `Certifications.csv` | `Name`, `Url`, `Authority`, `Started On`, `Finished On`, `License Number` | Licenses & certifications. |
| `Patents.csv` | `Title`, `Description`, `Url`, `Issuer`, `Application Number`, `Filed On`, `Issued On`, `Patent Number` | Patents. |
| `Rich_Media.csv` | `Date/Time`, `Media Description`, `Media Link` | Uploaded/shared media links. |
| `Articles/Articles/*.html` | HTML documents | Published LinkedIn articles/long-form posts. Filenames include timestamps or slugs. |

### 4.4 Job Search & Learning
| File | Key Columns | Notes / Quirks |
| :--- | :--- | :--- |
| `Jobs/Job Applications.csv` | `Application Date`, `Contact Email`, `Contact Phone Number`, `Company Name`, `Job Title`, `Job Url`, `Resume Name`, `Question And Answers` | Submitted Easy Apply / LinkedIn applications. |
| `Jobs/Saved Jobs.csv` | `Saved Date`, `Job Url`, `Job Title`, `Company Name` | Bookmarked jobs. |
| `Jobs/Job Seeker Preferences.csv` | `Locations`, `Industries`, `Company Employee Count`, `Preferred Job Types`, `Job Titles`, `Open To Recruiters`, `Dream Companies`, `Job Seeker Activity Level`, `Job Seeking Urgency Level`, etc. | 20+ preference columns. |
| `Jobs/Job Applicant Saved Answers.csv` | `Question`, `Answer` | Reusable application answers. |
| `Job Applicant Saved Screening Question Responses.csv` | `Question`, `Answer` | Screening responses (note root-level path vs `Jobs/`). |
| `SavedJobAlerts.csv` | `ALERT_PARAMETERS`, `QUERY_CONTEXT`, `SAVED_SEARCH_ID` | Encoded job alert parameters. |
| `Learning.csv` | `Content Title`, `Content Description`, `Content Type`, `Content Last Watched Date (if viewed)`, `Content Completed At (if completed)`, `Content Saved`, `Notes taken on videos (if taken)` | **Quirk:** Header row ends with a trailing comma (empty column name) that must be stripped during normalization. |

### 4.5 Account, Privacy, Billing & Ad Targeting
| File | Key Columns | Notes / Quirks |
| :--- | :--- | :--- |
| `Ad_Targeting.csv` | `Member Age`, `Buyer Groups`, `Company Names` (x3), `Company Follower of`, `Company Category`, `Company Size`, `Degrees`, `Devices`, `Member Schools`, `Fields of Study`, `Job Functions`, `Member Gender`, `Graduation Year`, `Member Groups`, `Company Industries`, `Member Interests`, `Member Traits`, `High Value Audience Segments`, `Profile Locations`, `Job Seniorities`, `Member Skills`, `Standard Audience Segments`, `Job Titles` (x3), `Years of Experience`, etc. | **Quirk:** Contains **duplicate column headers** (`Company Names` appears 3 times; `Job Titles` appears 3 times). Values are semicolon-delimited lists. |
| `Receipts_v2.csv` | `First Name`, `Last Name`, `Billing Country`, `Postal Code`, `Transaction Made At`, `Payment Method Type`, `Invoice Number`, `Description`, `Tax Amount`, `Sub Total`, `Total Amount`, `Currency Code` | LinkedIn Premium / ad / service receipts. |
| `Registration.csv` | `Registered At`, `Registration Ip`, `Subscription Types` | Account creation metadata. |
| `Email Addresses.csv` | `Email Address`, `Confirmed`, `Primary`, `Updated On` | Linked emails. |
| `PhoneNumbers.csv` | `Extension`, `Number`, `Type` | Linked phone numbers. |
| `Whatsapp Phone Numbers.csv` | `Number`, `Extension`, `Is_WhatsApp_Number` | WhatsApp integration numbers. |
| `Verifications/Verifications.csv` | `First name`, `Middle name`, `Last name`, `Verification type`, `Organization name`, `Verified date`, `Expiry date`, etc. | Identity/workplace verification records. |

---

## 5. Core Features & Supported Queries

### 5.1 Data Ingestion & Normalization Pipeline
- **Drag-and-Drop Zip Upload:** Accepts `.zip` files (or a folder of extracted CSVs/HTMLs) directly in the browser.
- **Automated Pre-Processing:**
  - Strip `Notes:` preamble lines from `Connections.csv`.
  - Deduplicate repeated column headers in `Ad_Targeting.csv` (e.g., `Company Names_1`, `Company Names_2`, `Company Names_3` or merge into unified array).
  - Strip trailing empty columns (e.g., `Learning.csv`).
  - Parse `Articles/Articles/*.html` to extract title, publish/modified date, and clean plain text + rendered HTML preview.
  - Normalize date strings across LinkedIn's inconsistent formats (e.g., `20 Nov 2026`, `2026-10-08 01:09:20 UTC`, `MM/DD/YYYY`).
- **Dataset Health Summary:** Immediately after import, display a summary of detected files, row counts, date ranges, and any skipped/empty files.

### 5.2 Wildcard & Pattern Matching Engine
All search bars, filter inputs, and pre-generated query templates must support intuitive wildcard and pattern matching (case-insensitive by default, with an optional case-sensitive or Regex toggle):
- **Supported Wildcards:**
  - `*` (or `%`): Matches zero or more characters (e.g., `Micro*`, `*Engineer*`, `*@gmail.com`).
  - `?`: Matches any single character (e.g., `V?P`, `J?n`).
  - **Quoted Exact Match:** `"Product Manager"` matches the exact phrase without partial-word noise.
  - **Negation (`-` or `NOT`):** Exclude terms (e.g., `Engineer -Intern`, `*@* -*@gmail.com`).
  - **Regex Mode (`/pattern/`):** Optional power-user toggle for complex patterns (e.g., `/^(VP|SVP|EVP)\b/i`).
- **Wildcard-Enabled Fields:**
  - **Names:** `First Name`, `Last Name`, full name (`First + Last`), `FROM`/`TO` in messages, endorser/endorsee names.
  - **Companies:** `Connections.Company`, `Positions.Company Name`, `Company Follows.Organization`, `Saved Jobs.Company Name`, `Job Applications.Company Name`.
  - **Titles / Roles:** `Connections.Position`, `Positions.Title`, `Saved Jobs.Job Title`, `Job Applications.Job Title` (e.g., `*VP*`, `*Director*`, `*Founder*`, `C*O`).
  - **Email IDs & URLs:** `Connections.Email Address`, `Email Addresses.Email Address`, `Job Applications.Contact Email`, LinkedIn profile URLs (e.g., `*@company.com`, `*.edu`, `*@gmail.com`).
  - **Skills, Content & Notes:** `Endorsement_*.Skill Name`, `Learning.Content Title`, `messages.CONTENT`, `Notes.Note`.

### 5.3 Pre-Generated Query Library ("Questions LinkedOut Can Answer")
Users can run one-click, parameterized pre-generated queries organized by domain (with live inputs for `[Company]`, `[Title]`, `[Wildcard]`, or `[Date Range]`):

1. **Network & People Queries (`Connections.csv`, `Invitations.csv`, `Endorsements`, `Recommendations`)**
   - *"Who in my network works for `[Company]`?"* — Wildcard/fuzzy search on `Connections.Company` (e.g., `*Google*`, `Meta*`) with optional `Position` filter.
   - *"People with a particular title (`[Title Pattern]`)"* — Wildcard search on `Connections.Position` (e.g., `*VP*`, `*Principal*`, `*CISO*`, `*Recruiter*`).
   - *"Wildcard People Finder (Name / Title / Company / Email)"* — Combined multi-field filter (e.g., `Name: John*` AND `Company: *Stripe*` AND `Email: *@*`).
   - *"Email Domain & Contactable Connections"* — Filter connections with non-empty `Email Address`, group by domain (`*@gmail.com`, `*@acme.com`, `*.edu`), and export to CSV.
   - *"Top Companies & Role Breakdown"* — Ranked bar charts of `Connections` by `Company` and common title keywords (e.g., Engineer, Manager, Director, VP, Founder).
   - *"Network Growth & Cohort Explorer"* — Time-series of `Connected On` by month/year; click any period to see who joined your network then.
   - *"Pending & Historical Invitations"* — Filter `Invitations.csv` by `Direction` (`INCOMING` vs. `OUTGOING`), date, and whether a custom `Message` was included.
   - *"Endorsement & Recommendation Graph"* — Who endorsed me for `[Skill]` (`Endorsement_Received_Info.csv`), who I endorsed (`Endorsement_Given_Info.csv`), and recommendations I wrote (`Recommendations_Given.csv`).

2. **Cross-Dataset Relationship Queries (`Connections` + `messages.csv` + `Endorsements`)**
   - *"Who at `[Company]` have I actually messaged?"* — Joins `Connections.csv` with `messages.csv` on profile URL / name to separate warm contacts from cold connections.
   - *"Warmest Connections"* — Ranks 1st-degree connections by message count, recency, and mutual endorsements.
   - *"Dormant Connections to Reconnect With"* — Connections matching `[Company]` or `[Title]` whom you haven't messaged in `> 12 months` (or never messaged).
   - *"Unconnected Message Contacts"* — People you have exchanged messages with in `messages.csv` who are **not** in `Connections.csv`.

3. **Message Search & Conversation Analytics (`messages.csv`)**
   - *"Full-Text & Wildcard Message Search"* — Instant keyword/wildcard search across `CONTENT`, `SUBJECT`, `FROM`, and `TO` with date range and `FOLDER` filters.
   - *"Top Messaging Contacts & Response Balance"* — Rank contacts by total messages exchanged, sent vs. received ratio, and last contact date.
   - *"Conversations with Attachments"* — Filter threads where `ATTACHMENTS` is non-empty.
   - *"Referral & Intro History"* — Pre-built search for keywords like `referral`, `intro`, `coffee`, `catch up`, `hiring`, or `role`.

4. **Job Hunt & Career Tracker (`Jobs/*.csv`, `Positions.csv`, `Certifications.csv`)**
   - *"Saved vs. Applied Jobs"* — Compare `Jobs/Saved Jobs.csv` against `Jobs/Job Applications.csv` to surface saved jobs not yet applied to.
   - *"Who Do I Know at My Saved/Applied Companies?"* — Cross-references `Saved Jobs.csv` / `Job Applications.csv` `Company Name` against `Connections.Company`.
   - *"Application Q&A Bank"* — Searchable view of `Job Applicant Saved Answers.csv`, `Job Applicant Saved Screening Question Responses.csv`, and `Question And Answers` from past applications.
   - *"Saved Job Alerts & Preferences"* — Human-readable view of `SavedJobAlerts.csv` and `Jobs/Job Seeker Preferences.csv`.
   - *"Career Timeline"* — Unified chronological view of `Positions.csv`, `Education.csv`, `Certifications.csv`, and `Patents.csv`.

5. **Learning & Content Archive (`Learning.csv`, `Articles/Articles/*.html`, `Rich_Media.csv`)**
   - *"Learning Progress & Video Notes"* — Filter `Learning.csv` by Completed vs. In-Progress vs. Saved, and wildcard-search `Content Title` and `Notes taken on videos`.
   - *"Article & Media Reader"* — Browse, full-text search, and read `Articles/Articles/*.html` and `Rich_Media.csv` in a clean reader view.

6. **Privacy, Ads & Spend Audit ("What LinkedIn Knows About Me")**
   - *"Ad Targeting Profile"* — Visual breakdown of `Ad_Targeting.csv` (inferred age, seniority, industries, company sizes, interests, and high-value audience segments).
   - *"Lifetime LinkedIn Spend"* — Total spend, currency breakdown, and invoice timeline from `Receipts_v2.csv`.
   - *"Account & Verification Footprint"* — Summary of `Registration.csv`, `Email Addresses.csv`, `PhoneNumbers.csv`, `Whatsapp Phone Numbers.csv`, and `Verifications.csv`.

### 5.4 Power-User Querying: In-Browser SQL & Query Builder
- **Visual Filter Builder:** Multi-condition `AND/OR` filters on any table (`matches wildcard`, `contains`, `equals`, `not equals`, `before/after date`, `is not empty`).
- **SQL Console:** Embedded **DuckDB-Wasm** (or SQLite-Wasm) exposing every parsed CSV/HTML table as a queryable SQL table with `ILIKE` / `REGEXP_MATCHES` support (e.g., `SELECT c."First Name", c."Last Name", c."Position", COUNT(m."CONVERSATION ID") FROM connections c LEFT JOIN messages m ON ... WHERE c."Company" ILIKE '%google%' GROUP BY 1, 2, 3`).
- **Saved Queries & Export:** Users can bookmark custom SQL/filter queries in `localStorage` and export any query result as `.csv` or `.json`.

---

## 6. Technical Architecture (Vercel + Local-Only Storage)

### 6.1 Frontend & Hosting
- **Framework:** Next.js (App Router, static export `output: 'export'` or purely client-rendered React pages) or Vite + React + TypeScript.
- **Hosting:** Deployed on **Vercel** as static assets. Zero serverless functions or API routes will receive user data.
- **Strict Content Security Policy (CSP):** Configure `vercel.json` / `next.config` headers with `connect-src 'self'` (blocking any accidental outbound network calls after page load).

### 6.2 Client-Side Processing Stack
- **Unzipping:** `fflate` (fast, lightweight, streaming-capable in-browser ZIP decompression).
- **CSV Parsing:** `PapaParse` (Web Worker mode to keep UI responsive while parsing `messages.csv` 13k+ lines).
- **HTML Parsing:** Browser-native `DOMParser` for `Articles/Articles/*.html`.
- **Query Engine:**
  - **DuckDB-Wasm** (runs analytical SQL queries directly in the browser via WebAssembly) OR **MiniSearch** (for fast inverted-index full-text search across `messages.csv` and `Articles`) + structured table filtering.

### 6.3 Local Storage Architecture (`localStorage` vs. `IndexedDB` / `OPFS`)
> [!IMPORTANT]
> Standard browser `localStorage` has a strict **5–10 MB** quota and is synchronous/string-only. A single LinkedIn export's `messages.csv` (2.7 MB raw) plus `Connections.csv` and search indexes can easily exceed `localStorage` limits—especially for users with larger exports.

To satisfy the **"local storage only (no server/cloud)"** requirement reliably:
1. **`IndexedDB` (via Dexie.js or DuckDB-Wasm OPFS):** Primary local persistence for all parsed tables, article HTML/text, and search indexes (supports hundreds of MBs to GBs locally on the user's disk).
2. **`localStorage`:** Used for lightweight metadata, UI preferences (theme, active dataset timestamp), and user-saved queries/bookmarks.
3. **Session-Only Mode (Optional Toggle):** Allow users to run in "Ephemeral Memory-Only Mode" where closing the tab immediately discards all parsed data without writing to `IndexedDB`.

### 6.4 Progressive Web App (PWA) & Offline Support
LinkedOut must be a full **Progressive Web App** so users can install it locally and run it completely offline—even after closing and reopening the app with no internet connection:
- **Web App Manifest (`manifest.webmanifest`):** Defines app name, description, adaptive/maskable icons, `display: "standalone"`, and theme colors so users can install LinkedOut on Windows, macOS, Linux, iOS, and Android.
- **Service Worker Precaching (`vite-plugin-pwa` / Workbox):** Precaches the entire static app shell—HTML, JS/CSS bundles, Web Workers, local fonts, and WebAssembly binaries (e.g., `DuckDB-Wasm` `.wasm` assets)—on first visit. Zero runtime CDN dependencies (no external Google Fonts or CDN-hosted WASM).
- **Offline Launch & Re-Import:** Once installed/cached, opening LinkedOut offline loads the cached app shell, reads previously imported data from `IndexedDB`/`OPFS`, and even allows importing a new `.zip` export while offline.
- **Vercel Deployment Headers:** Configure `vercel.json` so `sw.js` is served with `Cache-Control: public, max-age=0, must-revalidate` while hashed static/WASM assets are immutably cached, ensuring clean offline updates when online.

---

## 7. Security & Privacy Requirements

1. **No Telemetry on Data:** If any basic page-view analytics are ever used on Vercel, they must never capture query strings, search terms, file names, or row counts. Ideally, ship with zero third-party analytics scripts.
2. **Offline-Capable After Load:** Once the Vercel page assets are loaded, disconnecting from the internet should still allow full zip upload, parsing, and querying.
3. **One-Click Data Purge:** Prominent **"Clear Local Data"** button in the header/settings that wipes `IndexedDB`, `OPFS`, and `localStorage` keys and confirms zero bytes remain.
4. **Transparent Privacy Indicator:** A persistent UI badge (`Local-Only Mode • 0 bytes sent to server`) with an explanation of how data is stored in the browser.

---

## 8. UX / UI Flow & Responsive Design

1. **Landing / Empty State:**
   - Clear privacy promise ("Your LinkedIn data never leaves your browser").
   - Drag-and-drop `.zip` dropzone + tap-to-browse file picker (for mobile/tablet) + brief instructions on how to request the archive from LinkedIn (`Settings & Privacy → Data Privacy → Get a copy of your data`).
   - Optional **"Install App"** prompt (when browser `beforeinstallprompt` fires) for offline desktop/mobile use.
2. **Ingestion Progress View:**
   - Web Worker progress bar showing files detected, normalized, and indexed.
3. **Main Workspace:**
   - **Left Sidebar:** Domain navigation (`Overview`, `Network`, `Messages`, `Jobs`, `Learning & Articles`, `Ad & Privacy Audit`, `SQL Console`).
   - **Top Bar:** Global search bar (searches across Connections, Messages, Learning, Articles), dataset timestamp, offline-ready status indicator (`Offline Ready • Local-Only`), and `Clear Local Data` button.
   - **Main Canvas:** Interactive cards/charts at the top + virtualized data table (`@tanstack/react-table`) with column sorting, filtering, and CSV export.

### 8.1 Responsive Layout & Multi-Device Support
- **Desktop (`>= 1024px`):** Persistent left domain sidebar, multi-column summary cards, side-by-side message thread list + detail pane, and full virtualized data tables.
- **Tablet (`768px–1023px`):** Collapsible slide-over navigation drawer, 2-column summary grid, and horizontally scrollable tables with a sticky primary column.
- **Mobile (`< 768px`):**
  - Compact top bar with hamburger drawer + bottom quick-nav bar for core domains (`Network`, `Messages`, `Search`, `Audit`).
  - **Responsive Card View:** Dense multi-column tables (such as `Connections` and `Job Applications`) automatically switch to stacked, scannable cards on narrow viewports with a toggle to view raw table columns if needed.
  - Touch-friendly filter chips, tap targets (`>= 44px`), and full-screen modal/sheet for reading `messages.csv` threads and `Articles/*.html`.

---

## 9. Success Metrics (Client-Side / Qualitative)

- **Time to First Query:** Parse and index a ~3–5 MB LinkedIn `.zip` export in **< 3 seconds** on a standard laptop.
- **Query Responsiveness:** Full-text search across 13,000+ message lines returns results in **< 100 ms**.
- **Zero Network Exfiltration:** 0 outbound network requests containing user data verified via browser DevTools Network tab.
- **Offline & PWA Readiness:** 100% Lighthouse PWA installability & offline launch verified (app loads and queries `IndexedDB` with network disabled).
- **Responsive Usability:** Zero horizontal page overflow across mobile (`375px`), tablet (`768px`), and desktop (`1440px`) viewports.

---

## 10. Phased Roadmap

### Phase 1: MVP (Core Local Explorer & Offline PWA)
- Client-side `.zip` ingestion (`fflate` + `PapaParse` in Web Worker) with LinkedIn quirk normalizers (`Connections.csv` preamble, `Ad_Targeting.csv` duplicate headers, `Learning.csv` trailing comma).
- `IndexedDB` persistence + `Clear Local Data` wipe + `localStorage` saved preferences.
- **PWA & Offline Support:** `manifest.webmanifest` + Service Worker precaching all app shell and worker assets for full offline execution.
- **Responsive UI:** Adaptive desktop sidebar, mobile drawer/bottom nav, and card-view fallback for mobile tables.
- Dedicated views for **Network (`Connections`, `Invitations`, `Endorsements`)**, **Messages (`messages.csv` full-text search & thread viewer)**, **Jobs**, **Learning**, and **Ad Targeting Audit**.

### Phase 2: Power Query & Analytics
- Embedded **DuckDB-Wasm** SQL console with schema autocomplete and sample queries (e.g., cross-table joins between `Connections` and `messages`).
- Interactive visualizations (network growth timeline, top companies, messaging frequency, LinkedIn spend breakdown).
- HTML Article reader for `Articles/Articles/*.html`.

### Phase 3: Advanced Local Intelligence
- Optional **WebGPU / WebLLM** local-in-browser natural language to SQL (zero API keys, zero server calls).
- Diff/compare mode when importing a newer LinkedIn export `.zip` (e.g., *"Who removed me / new connections since last export"*).
