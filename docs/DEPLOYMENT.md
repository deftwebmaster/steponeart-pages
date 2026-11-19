# Publishing and deployment

## How publishing works

```
John edits in Pages CMS ──► commit to GitHub (main) ──► host builds `npm run build` ──► dist/ goes live
```

Pages CMS only commits to GitHub. **Something has to build and upload the site after each commit.** The repository already has a **build check** (`.github/workflows/build-check.yml`) that builds and verifies every commit, but it **does not deploy**. No hosting account has been created or connected yet.

Choose **one** of the options below when the hosting destination is decided. Each one rebuilds the site automatically after every CMS save.

Build settings for any host:

| Setting | Value |
| --- | --- |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output folder | `dist` |
| Node version | 24 (from `.nvmrc`; at least 22.23.4) |

## Option A: Git-connected static host (simplest)

Hosts such as **Cloudflare Pages** or **Netlify** watch the GitHub repo and build on every commit:

1. Create the account (owner's decision), choose "Import from Git", and pick this repository.
2. Enter the build settings above. Set the env var `NODE_VERSION=24` if the host doesn't read `.nvmrc`.
3. Deploy, then add the custom domain `steponeart24.com` and follow the host's DNS instructions.
4. Both hosts serve `404.html` automatically for missing pages.

The existing build-check workflow can stay as an extra safety net.

## Option B: Existing shared hosting (cPanel, Apache, SFTP)

The site is static, so shared hosting works. Upload the **contents** of `dist/` to the web root (e.g. `public_html/`). The included `.htaccess` sets the 404 page and long caching for `/assets/`.

To make it automatic:

1. Create an SSH key for deployments and add its public key on the host.
2. In GitHub → **Settings → Secrets and variables → Actions**, add `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PATH`.
3. Copy `docs/deploy-templates/sftp-deploy.yml.example` to `.github/workflows/deploy-sftp.yml` and commit.

The template fails visibly if the upload fails. It never reports success without uploading. If the host only offers plain FTP, swap the rsync step for a maintained FTP deploy action using the same secrets.

## Option C: GitHub Pages

Possible too: set Pages → Source to "GitHub Actions" and add a workflow using `actions/upload-pages-artifact` + `actions/deploy-pages` after `npm run build`. Then point the domain at GitHub Pages.

## Manual deploy (any host, any time)

```bash
npm ci
npm run build
```

Upload everything inside `dist/` to the web root. Or download the `site-dist` artifact from the latest successful **Build check** run on GitHub (Actions tab), unzip it, and upload that.

## After connecting

- Make a small test edit in Pages CMS (e.g. change a price) and confirm it appears on the live site within a few minutes.
- If an edit doesn't appear, open GitHub → **Actions** (or the host's deploy log). A failed build shows the exact content problem, such as a duplicate slug, a missing photo description or an unsupported photo format.
