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

The docs can be served behind a login page. Set up once:

1. Copy `.env.example` to `.env` and set `DOCS_PASSWORD` to your desired password (or keep the generated one in `.env`).
2. Install dependencies: `npm install`
3. Start the docs: `mint dev` (runs on port 3000)
4. In another terminal, start the auth gateway: `npm run auth` (runs on port 8080)

Open **http://localhost:8080** — you’ll see the login page. After entering the correct password, you can browse the documentation. The password is stored in `.env`; do not commit `.env` to git.

Alternatively, run both the docs and the auth gateway with one command: `npm run dev:protected` (docs at 3000, gateway at 8080 — use http://localhost:8080 to access the protected docs).

## Publishing changes

Install our GitHub app from your [dashboard](https://dashboard.mintlify.com/settings/organization/github-app) to propagate changes from your repo to your deployment. Changes are deployed to production automatically after pushing to the default branch.

## Need help?

### Troubleshooting

- If your dev environment isn't running: Run `mint update` to ensure you have the most recent version of the CLI.
- If a page loads as a 404: Make sure you are running in a folder with a valid `docs.json`.

### Resources
- [Mintlify documentation](https://mintlify.com/docs)
