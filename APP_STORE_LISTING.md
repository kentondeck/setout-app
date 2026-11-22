# Setout — App Store Listing

> Updated for the resubmission after the Guideline 3.1.2 rejection of build
> 23. Version stays 1.0.1 — it was never released, so the new build goes up
> under the existing rejected version record rather than a new one. Build 24
> was consumed by a TestFlight upload during testing, so the submission build
> is 25. Every claim here must match what the app actually does: metadata
> that oversells is Guideline 2.3, a separate rejection reason from the one we
> are already answering.

## App Name (30 chars max)
Setout

## Subtitle (30 chars max)
On-site toolkit for tradies

## Promotional Text (170 chars max — editable anytime without resubmitting)
Equal spacing, balusters, gradients and concrete slabs — free, unlimited. Go Pro for cloud backup that keeps every job, photo and quote safe.

## Primary Category
Business

## Secondary Category
Utilities

---

## Description (paste into App Store Connect)

The construction tool for tradies who need fast, accurate numbers on site.

Decking, framing, stairs, roof pitch, concrete, cladding, fencing, cut lists, baluster gaps, gradients, excavation and more — 15 calculators that give you the answer in seconds and work with no signal.

• Step-by-step Build Sequencer — 80+ job guides for NZ & AU
• Save calculations to a job and export a client-ready quote PDF
• Apprentice mode shows the working behind every result
• Log receipts and keep a tool inventory for the accountant

FREE, FOREVER
Equal Spacing, Balusters and Gradient — unlimited, no subscription. Concrete slabs too, along with saved jobs, the receipts log and your tool list. Every Build Sequencer guide opens free and shows the first half of its steps.

SETOUT PRO
Cloud backup for every job, photo, quote and receipt. Lose your phone, break it or upgrade it — sign in on the new one and your whole history comes back. Pro also opens Decking, Wall Framing, Stairs, Roof Pitch, Roofing, Cladding, Cut List, Raked Wall, Square Check, Excavation and Fencing, the concrete post hole and mix tools, and the rest of every Sequencer guide.

Annual or weekly, each with a 2-week free trial for new subscribers. Prices are shown in the app in your local currency before you buy. Payment is charged to your Apple ID at confirmation and renews unless cancelled at least 24 hours before the period ends — manage or cancel anytime in your App Store settings. If your subscription lapses you can still restore anything you backed up.

Terms of Use: https://www.setoutapp.co.nz/terms
Privacy Policy: https://www.setoutapp.co.nz/privacy

---

## Keywords (100 chars max — separate with commas, no spaces after commas)
## Note: "Setout" (name) + the subtitle are indexed separately — don't repeat them here.
## "calculator" moved into keywords when it came out of the subtitle, so the search term is kept.
calculator,builder,carpenter,chippie,tradie,decking,framing,stairs,roof,concrete,cladding,fencing

## Support URL
https://www.setoutapp.co.nz

## Privacy Policy URL
https://www.setoutapp.co.nz/privacy

---

## Version Release Notes (What's New — 1.0.1, build 25)
Five calculators are now free and unlimited, forever — along with the Build Sequencer, receipts and tool list. Setout Pro adds cloud backup for every job, photo and quote, so a new phone picks up exactly where the old one left off. New annual plan alongside the weekly one.

---

## App Store Privacy Questionnaire Answers

> Already answered correctly in App Store Connect and published. Recorded here
> so this file matches the live state — an earlier version of this doc claimed
> nothing was linked to the user, which cloud backup contradicted. If the two
> ever disagree again, App Store Connect is the truth, not this file.

**Data linked to you** (as published):
- Purchases — purchase history, via Apple / RevenueCat
- Contact Info — email address, stored only when the user opts into cloud backup, used to identify the account for backup and restore
- User Content — photos or videos, and job records, quotes and receipts the user chooses to back up

**Data not linked to you:**
- Usage Data (product interaction) — via privacy-friendly, cookieless analytics (Umami), used for app functionality/analytics, NOT for tracking

**Data used to track you:**
- None

> Cloud backup is opt-in and off by default. Without it, calculations, jobs,
> settings and photos stay on the device. Subscription status is handled by
> Apple / RevenueCat. The app is not used to track users across other
> companies' apps or websites.

---

## Age Rating
4+ (no objectionable content)

## Pricing
Free to download. **Setout Pro** is an auto-renewing subscription offered as an in-app purchase, with a 2-week free trial for new subscribers:
- Annual — NZ$29.99 / AUD equivalent per storefront
- Weekly — NZ$1.99 / AUD equivalent per storefront

---

## App Review Notes (App Store Connect → App Review Information → Notes)

```
Hello App Review team,

This build responds to the Guideline 3.1.2 rejection of build 23
(submission ID 97d65c19).

1. WHAT CHANGED

Setout Pro is no longer an unlock for offline calculators. It now provides
a server-hosted service: a subscriber's jobs, site photos, quotes and
receipts are backed up to our hosted database and file storage, and can be
restored onto a replacement device. That storage is provisioned and
maintained for the life of the account. A subscriber whose subscription
lapses can still restore data they previously stored.

An annual plan has been added alongside the weekly plan. On each option the
billed amount is the most prominent pricing element, and free-trial
eligibility is verified with StoreKit before any trial is advertised, so a
customer who has already used their introductory offer is shown the
standard price rather than a trial.

2. WHAT IS FREE

No login or account is required to use the app.

Free and unlimited: the Equal Spacing, Balusters and Gradient calculators;
concrete slab calculations; saved jobs; the receipts log; the tool
inventory. Every Build Sequencer guide opens free and shows the first half
of its steps.

Setout Pro adds: cloud backup and restore; the Decking, Wall Framing,
Stairs, Roof Pitch, Roofing, Cladding, Cut List, Raked Wall, Square Check,
Excavation and Fencing calculators; the concrete post hole and mix tools;
and the remaining steps of each Sequencer guide.

3. HOW TO REACH THE SUBSCRIPTION SCREEN

- Settings > Cloud backup > "See Setout Pro", or
- open a Pro calculator such as Stairs or Decking and run it once.

Sandbox purchases, Restore Purchases and Redeem Code are all on that
screen. Plans are NZ$29.99 per year or NZ$1.99 per week, each with a
2-week free trial for new subscribers.

4. PURPOSE AND AUDIENCE

Setout is an on-site tool for builders, carpenters and apprentices in
Australia and New Zealand. Stud and plate counts, decking, stair rise and
going, roofing, concrete, cladding, fencing and cut lists are normally
worked out by hand on site, which is slow and error-prone, and one mistake
wastes expensive material. Setout calculates instantly, shows the
step-by-step working (useful for apprentices), and keeps jobs, quotes and
receipts organised. Calculators work offline.

5. SETUP AND ACCESS

On first launch the user selects a region (Australia or New Zealand) and
accepts the terms, then everything is available. The optional cloud backup
account (Settings > Cloud backup) only stores the user's own data, is
created with an email address and a one-time code, and is not required for
any calculator. Account deletion is at Settings > Cloud backup > Delete
account.

6. EXTERNAL SERVICES

Apple StoreKit (payments); RevenueCat (subscription entitlement); Supabase
(email one-time-code sign-in and hosted storage for the optional backup);
Sentry (crash reporting); Umami (cookieless, privacy-friendly analytics, not
used for tracking).

7. REGIONAL DIFFERENCES

Calculators work identically in every region. Only the compliance notes,
which reference local standards by name (Australia: NCC / AS; New Zealand:
NZBC / NZS), and a few trade defaults and terms adapt by region. Nothing is
region-locked.

8. REGULATED INDUSTRY AND USER CONTENT

Setout is a productivity tool and does not operate in a highly regulated
industry or include protected third-party material. The compliance notes
are our own general guidance and name standards without reproducing their
text; the app and its Terms state that outputs are estimates and must be
verified against official standards and consents. There is no
user-generated content visible to other users — jobs, quotes, receipts and
photos are private to each account.

Kind regards,
Setout Holdings Limited
```

**Review screenshot for the subscription:** `setout-paywall-screenshot.png` — shows both plans, the billed amounts, the trial, the renewal disclosure and the restore control.

---

## Subscription Metadata (App Store Connect → Subscriptions)

**Group:** Setout Pro (ID 22439571) — check the group display name reads "Setout Pro", not "Setout aPro".

Both products sit at the same level, because they offer identical access and differ only in billing period.

### `setout_pro_annual`
- **Reference Name (internal):** Setout Pro Annual
- **Duration:** 1 year, 1 Year Upfront · **Intro offer:** Free, 2 weeks, new subscribers, no end date
- **Price:** NZ$29.99
- **Display Name (≤30 chars):** Setout Pro Annual
- **Description (≤45 chars):** Cloud backup and every calculator.

### `setout_pro_weekly`
- **Reference Name (internal):** Setout Pro Weekly
- **Duration:** 1 week · **Intro offer:** Free, 2 weeks, new subscribers, no end date
- **Price:** NZ$1.99
- **Display Name (≤30 chars):** Setout Pro
- **Description (≤45 chars):** Cloud backup and every calculator.

> Introductory offers are one per subscription group per Apple ID. A customer
> who takes the trial on either plan gets no trial on the other, which is why
> the app checks eligibility with StoreKit before showing trial copy.
