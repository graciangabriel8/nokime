#!/bin/sh
# Stores one Instagram account's token and user id as repository secrets, from your clipboard, so neither is ever typed,
# shown or pasted into a chat. Run on your Mac after generating a token in Meta's dashboard:
#
#     sh tools/ig-keys.sh manager        # or jobs, or nokime
#
# It asks you to copy the access token, then the Instagram user id (digits), and presses nothing else for you. Both are
# checked first and stored only if both pass; the clipboard is emptied after each. It prints only the secret names.
set -eu
REPO="graciangabriel8/nokime"

case "${1:-}" in
  manager) ACC=MANAGER ;;
  jobs)    ACC=JOBS ;;
  nokime)  ACC=NOKIME ;;
  *) echo "usage: sh tools/ig-keys.sh manager|jobs|nokime" >&2; exit 2 ;;
esac
for tool in gh pbpaste pbcopy; do
  command -v "$tool" >/dev/null 2>&1 || { echo "$tool is not available here: run this on your Mac, with gh logged in" >&2; exit 1; }
done

printf 'Copy the ACCESS TOKEN for the %s account in Meta'"'"'s dashboard, then press Return. ' "$ACC"
read -r _
TOKEN="$(pbpaste)"
printf '' | pbcopy        # out of the clipboard as soon as it is held
case "$TOKEN" in
  '') echo "The clipboard is empty: nothing stored." >&2; exit 1 ;;
  *[[:space:]]*) echo "The clipboard holds a space or a line break inside: that is not a token. Nothing stored." >&2; exit 1 ;;
esac
if [ "${#TOKEN}" -lt 20 ]; then echo "That is too short to be an access token. Nothing stored." >&2; exit 1; fi

printf 'Now copy the INSTAGRAM USER ID of the same account (numbers only), then press Return. '
read -r _
UID_VALUE="$(pbpaste)"
printf '' | pbcopy
case "$UID_VALUE" in
  ''|*[!0-9]*) echo "That is not an Instagram user id (digits only). Nothing stored." >&2; exit 1 ;;
esac

printf '%s' "$TOKEN" | gh secret set "IG_TOKEN_$ACC" -R "$REPO"
printf '%s' "$UID_VALUE" | gh secret set "IG_USER_ID_$ACC" -R "$REPO"
echo "Stored IG_TOKEN_$ACC and IG_USER_ID_$ACC in $REPO. The clipboard is empty."
