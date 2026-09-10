# One-click Windows updates

Download `Start-Bastion.bat` and put it on your Desktop. Keep Node.js 22.13+
and Git for Windows installed. Codex must already be installed for company
research (`npm install -g @openai/codex`).

Double-click the launcher. The first run clones the main branch of
https://github.com/Vershys/Investing-Interface.git into
`%LOCALAPPDATA%\Bastion\app`. It does not replace your old ZIP folder.
Later runs fetch updates and fast-forward that same installation. Dependencies
are installed when their inputs or Node version change, or after an interrupted
installation. The browser opens after the application responds successfully.

Keep the command window open. Close it before updating. If Windows blocks a
downloaded launcher, review its contents and its source before choosing whether
to run it; do not disable system protections globally.

Reports remain in `%USERPROFILE%\.bastion\research` by default and Codex manages
its existing account sign-in. If you customized `BASTION_RESEARCH_DATA`, retain
that setting. Local `.env` settings and local journal data from the old extracted
folder are not migrated by this launcher; keep that folder if you used them.

The update source is the GitHub **main** branch, not the live Site URL.
Changes made in ChatGPT must be committed and sent to that repository before
this launcher can obtain them. Website deployment and local updates are separate.
The launcher never uploads reports or account credentials to GitHub.

Updates stop on network/authentication errors, local edits, a changed remote,
or diverging history. They never force-reset, clean, or automatically stash files.
Send the visible error to ChatGPT if assistance is needed. The GitHub repository
is currently public; if it becomes private, Git will require your normal GitHub
authentication. No access tokens are embedded in the launcher.

Maintainer handoff: preserve this fixed bootstrap filename, repository URL and
`scripts/update-and-start.mjs` entrypoint so installed desktop launchers continue
to work. Publish tested local changes to GitHub main as part of delivering a
local Bastion update. Do not claim PC synchronization until that push succeeds.
