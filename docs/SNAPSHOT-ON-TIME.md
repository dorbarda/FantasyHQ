# Run the ESPN snapshot on time (cron-job.org)

GitHub's own `schedule` often starts hours late. cron-job.org (free, runs on its
servers — your computer can be off) calls GitHub at the exact time and starts
the **ESPN snapshot** workflow, the same as pressing "Run workflow" by hand.
The GitHub schedule stays as a backup; an extra run with no changes makes no commit.

## Step 1 — GitHub token (5 min)

1. GitHub → your photo → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Name: `cron-job.org ESPN snapshot`.
3. Expiration: up to 1 year. **Put a reminder in your calendar** for that date.
4. Repository access: **Only select repositories** → `dorbarda/FantasyHQ`.
5. Permissions → Repository permissions → **Actions: Read and write**.
   Nothing else. (This token can only start/stop workflows — it cannot change code.)
6. **Generate token** and copy it (starts with `github_pat_`). You see it only once.

## Step 2 — cron-job.org (5 min)

1. Sign up at https://cron-job.org (free).
2. **Create cronjob**:
   - Title: `ESPN snapshot`
   - URL: `https://api.github.com/repos/dorbarda/FantasyHQ/actions/workflows/espn-snapshot.yml/dispatches`
   - Schedule: **Custom** → every day, hours **5** and **10**, minute **47**.
3. **Advanced** tab:
   - Time zone: **Asia/Jerusalem** (summer/winter time is then handled for you)
   - Request method: **POST**
   - Headers (add each one):

     | Key | Value |
     |---|---|
     | `Authorization` | `Bearer github_pat_...` (your token) |
     | `Accept` | `application/vnd.github+json` |
     | `X-GitHub-Api-Version` | `2022-11-28` |
     | `Content-Type` | `application/json` |

   - Request body: `{"ref":"main"}`
4. **Notifications**: turn on "notify me when an execution fails".
5. Save, then press **Test run**. A good result is status **204** (empty answer).
   Check GitHub → Actions → ESPN snapshot: a new run with event `workflow_dispatch`.

## Before 10 Mar 2028

GitHub says API version `2022-11-28` stops working on 10 Mar 2028 (the
`Sunset` header in the test-run response). Before then, change the
`X-GitHub-Api-Version` header to the current version listed at
https://docs.github.com/en/rest/about-the-rest-api/api-versions.

## If it fails

| Status | Meaning |
|---|---|
| 401 | Token wrong or expired → make a new one (Step 1), paste it in the header |
| 403 | Token is missing **Actions: Read and write** |
| 404 | URL typo, or the token doesn't include the FantasyHQ repo |
| 422 | Body is not exactly `{"ref":"main"}` |
