# Instagram posting

Nothing is posted unless an entry you approved sits in `posts.json`. The file is empty now.

## Queue a post

1. Put the pictures (carousel: 2 to 10 JPEGs, exactly 1080x1350) or the video (reel: one `.mp4`, optional cover JPEG) in this folder.
2. Add an entry to `posts.json`:

       {"id": "2026-10-15-manager", "account": "nokime.manager", "at": "2026-10-15T15:30:00+02:00",
        "type": "carousel", "media": ["social/2026-10-15-manager-1.jpg", "social/2026-10-15-manager-2.jpg"],
        "caption": "..."}

   `account` is `nokime.manager`, `nokime.jobs` or `nokime.fr`. A reel has `"type": "reel"`, `"media": ["social/x.mp4"]` and optionally `"cover": "social/x.jpg"`. The caption has no `#` and is at most 2 200 characters; two posts of one account never share a caption.
   `at` carries Paris's offset for that day: `+02:00` until 25 Oct 2026, `+01:00` from then on, and `Z` is refused. `check.py` says what to write.
3. `python3 tools/check.py` must pass. Push to main: the site goes live (nokime.fr/social/...) once the deploy gate lets it, and Instagram fetches the files from there.

## When it posts

At the `at` minute, from the 15:30 and 18:00 Paris slots: the workflow starts early (GitHub starts it hours late anyway), waits for each entry's minute and posts it. A run can post an entry that is up to 5 h 30 ahead of its start or up to 3 hours behind it. Another time of day may fall outside every start. A run reads the queue from main again before each entry and after each wait, so an entry you remove or change is not posted in its old form (a changed one is posted by a later start). A run that starts late says how many minutes late a post went out. To post one entry right now: Actions, "Instagram posts", Run workflow, give its `id`. "Dry run" validates and shows what is due, and posts nothing.

## Failure messages

- `IG_USER_ID_X and IG_TOKEN_X are not both set`: that account has no keys yet (below).
- `deploy pending (the deploy gate has not moved live yet)`: nokime.fr does not serve the file as committed. Check that the push passed its checks and the site updated, then run it by `id`.
- `already up`: a post with that caption is among the account's latest 50. Not an error.
- `not posting blind`: Instagram's list of the account's posts could not be read, so the duplicate check could not run. The next start retries.
- `Instagram refused ...`: Instagram's own error text follows (an expired token and a picture of the wrong size are the usual ones).
- `it may have gone out`: the publish call got no clear answer. Look at the account before running it again.
- `missed its window`: an entry's time passed, up to 7 days ago, and no start reached it; it is not on the account. The run fails so GitHub emails you. Run it by `id`, or remove the entry.
- `keys belong to @...`: the token stored under that account's name is another account's. Nothing was posted; store the right one with `ig-keys.sh`.
- `changed or removed after this run started`: the entry was edited or taken out of the queue while the run held. Not an error.
- `too close to the 6 h job limit`: the run waited too long to publish safely; the next start posts it.

## One-time steps per account

1. In Meta's dashboard (developers.facebook.com, your app, Instagram, API setup with Instagram login) generate an access token for the account.
2. On your Mac, with that token copied: `sh tools/ig-keys.sh manager` (or `jobs`, `nokime`). It reads the clipboard, asks you to copy the Instagram user id next, stores both as repository secrets and empties the clipboard. It prints only the secret names.
3. Optional: a `SECRETS_PAT` secret (a personal access token allowed to write secrets) lets the weekly refresh renew the tokens before their 60 days end. Without it the weekly run fails (and GitHub emails you) rather than let the tokens expire quietly.
