# Mintlify Starter Kit

Use the starter kit to get your docs deployed and ready to customize.

Click the green **Use this template** button at the top of this repo to copy the Mintlify starter kit. The starter kit contains examples with

- Guide pages
- Navigation
- Customizations
- API reference pages
- Use of popular components

**[Follow the full quickstart guide](https://starter.mintlify.com/quickstart)**

## Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint) to preview your documentation changes locally. To install, use the following command:

```
npm i -g mint
```

Run the following command at the root of your documentation, where your `docs.json` is located:

```
mint dev
```

View your local preview at `http://localhost:3000`.

### Password-protected access

The docs can be served behind a login page so that opening the docs always shows the login first.

1. Copy `.env.example` to `.env` and set `DOCS_PASSWORD` to your desired password (or keep the generated one in `.env`).
2. Install dependencies: `npm install`
3. Run both the docs and the auth gateway: `npm run dev:protected`

Then open **http://localhost:3000** (not 3001). You’ll see the login page first; after entering the correct password, you can browse the documentation. The gateway runs on port 3000 and proxies to the docs on 3001, so **always use http://localhost:3000** to view the protected docs. The password is stored in `.env`; do not commit `.env` to git.

To run the two separately: start `mint dev --port 3001` in one terminal, then `npm run auth` in another. The auth gateway will listen on port 3000.

## Publishing changes

Install our GitHub app from your [dashboard](https://dashboard.mintlify.com/settings/organization/github-app) to propagate changes from your repo to your deployment. Changes are deployed to production automatically after pushing to the default branch.

### Password protection on the live site (docs.estizee.app) — free, no Mintlify Pro

This repo includes **your own** auth proxy so the published docs show a login page first, without paying for Mintlify’s native auth.

1. **Deploy the auth proxy to Vercel**
   - Push this repo to GitHub (if needed), then go to [vercel.com](https://vercel.com) and **Import** this repository.
   - In the project’s **Settings → Environment Variables**, add:
     - `DOCS_PASSWORD` — the password users must enter (e.g. the one in your `.env`).
     - `MINTLIFY_ORIGIN` — the Mintlify URL your docs are served from (e.g. `https://estizee.mintlify.app`). You can find it in [Mintlify Dashboard → Deployment / Custom domain](https://dashboard.mintlify.com) (it’s usually `https://<your-project-slug>.mintlify.app`).
   - Deploy. Vercel will give you a URL like `docs-3-xxx.vercel.app`.

2. **Point docs.estizee.app to Vercel**
   - In Vercel: **Project → Settings → Domains** → add `docs.estizee.app` and follow the DNS instructions.
   - In your DNS provider (where estizee.app is managed): add or update a **CNAME** for `docs` so that `docs.estizee.app` points to `cname.vercel-dns.com` (or the target Vercel shows). Remove any existing CNAME that pointed docs to Mintlify.

3. **Result**
   - Visiting **docs.estizee.app** (or any path like `/getting-started/introduction`) hits the proxy first. Unauthenticated users see the login page; after entering the correct password they can browse the docs. Use `/logout` to sign out.

## Need help?

### Troubleshooting

- If your dev environment isn't running: Run `mint update` to ensure you have the most recent version of the CLI.
- If a page loads as a 404: Make sure you are running in a folder with a valid `docs.json`.

### Resources
- [Mintlify documentation](https://mintlify.com/docs)
