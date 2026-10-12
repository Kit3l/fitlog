# FitLog

A free, private lift, food and body tracker for the family. It runs on GitHub Pages, works offline on your phone, and syncs each person's data to a private GitHub repo.

- **Lifts:** your program preloaded, last session's numbers beside each set, a nudge when it's time to add weight.
- **Food:** 70+ Kenyan foods with household portions (1 egg, 1 fist of ugali, 1 chapati) and calorie and protein totals against your daily targets.
- **Body:** weight with a 7-day average, waist, steps, and a pace check against your goal date.
- **Family:** one profile per person, each with its own goals, targets and program.

## How it fits together

| Repo | Visibility | Holds |
| --- | --- | --- |
| `fitlog` | Public | The app files only. No personal data. |
| `fitlog-data` | **Private** | One JSON file per person, written by the app. |

GitHub Pages only serves private repos on a paid plan, so the app lives in a public repo and the health data lives in a separate private one. Never put data in the public repo.

## Setup (about 15 minutes)

### 1. Create the app repo and upload the files

1. On github.com, create a new repo named `fitlog`, set to **Public**, with "Add a README" ticked.
2. Open the repo, choose **Add file, then Upload files**, and select **all the files from this folder** (17 files, all in one folder, no subfolders). Replace the README if asked.
3. Commit the upload.

### 2. Turn on GitHub Pages

Repo **Settings, then Pages**. Under "Build and deployment", set Source to **Deploy from a branch**, branch **main**, folder **/ (root)**, and save. After a minute the app is live at:

`https://YOUR-USERNAME.github.io/fitlog/`

### 3. Create the private data repo

Create a second repo named `fitlog-data`, set to **Private**, with "Add a README" ticked (so the repo exists and has a branch). Leave it empty otherwise.

### 4. Create an access token for the data repo only

1. GitHub, then **Settings, Developer settings, Personal access tokens, Fine-grained tokens, Generate new token**.
2. Name it `fitlog`. Set an expiry (up to a year) and put a reminder in your calendar to renew it.
3. **Repository access:** *Only select repositories*, then choose `fitlog-data`.
4. **Permissions, Repository permissions, Contents:** *Read and write*.
5. Generate it and copy the token (it starts with `github_pat_`). GitHub shows it once.

This token can touch only the one private data repo, nothing else on your account. GitHub's screens change now and then, so the wording may differ slightly.

### 5. Install on your iPhone

1. Open the app link in **Safari** (not Chrome).
2. Tap **Share, then Add to Home Screen**.
3. **Open it from the home screen icon from now on.** On iPhone, the installed app and Safari keep separate storage, so entries made in a Safari tab will not appear in the icon.
4. Create your profile, then go to **More, Connect sync** and enter your GitHub username, `fitlog-data`, and the token. When it says Synced, you're set.

### 6. Add the family

On your phone: **More, Copy family setup code**. Send it privately to each family member. On their phone, after installing the app, they tap **Connect sync**, paste the code, and then **create their own profile**. Everyone sees the profile list, and each person only needs to open their own.

The setup code contains the token. Share it only with family, in a private message. If a phone is lost or the code leaks, delete the token on GitHub and create a new one.

## Day to day

- **At the gym:** open Lifts, tap the tick on each set. If you tick a set with empty boxes, it fills in last time's numbers.
- **Food:** Add food, search ("sima" finds ugali, "dagaa" finds omena), pick a portion. For anything not listed, use Quick add or New food.
- **Offline:** everything works with no signal and syncs when you're back online. The badge at the top shows the state.
- **Backup:** More, Save backup, once a week. Save it to Files or iCloud Drive.

## Good to know

- **PINs are a privacy screen, not security.** They stop another person on the same phone from opening your profile. Anyone with the family setup code could read the data files in the repo.
- Food values are approximate (about ±10-15%), and home cooking varies, especially oil. Use the log for consistency.
- Calorie and protein targets from "Suggest targets" are estimates. Adjust after two weeks using your weight trend.
- If two phones edit the same entry, the most recent change wins. Different entries never overwrite each other.
- Deleting a profile removes its entries on all synced phones.

## Updating the app

Upload the changed files to the `fitlog` repo (same names replace the old ones). Change the `CACHE` version at the top of `sw.js` (for example `fitlog-v1.0.1`) so phones pick up the update. Phones load the new version the next time the app is opened, sometimes after a second launch.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| "Data repo not found" | Check the username and repo name. The token must include `fitlog-data`. |
| "Token does not have write access" | Edit the token and set Contents to Read and write. |
| "GitHub rejected the token" | It expired or was revoked. Make a new one and use Change connection. |
| Page is blank on the phone | Pages takes a minute to publish. Check Settings, Pages shows a green "live" message. |
| Entries missing in the icon app | You entered them in a Safari tab. Sync them, or re-enter them from the icon. |
