# Telegram Mini Game Demo

This repository is a demo version created to showcase Telegram Mini App game mechanics, mobile-first UI, point collection, task completion, referral concept, and leaderboard-ready architecture.

It is not the full production source code. Production deployment requires secure Telegram authentication validation, PostgreSQL configuration, bot integration, environment secrets, and deployment setup.
## Screenshots

### Home / Game Screen

![Home Screen](./assets/1-home.png)

### Tasks Screen

![Tasks Screen](./assets/2-tasks.png)

### Referral Screen

![Referral Screen](./assets/3-referral.png)

### Leaderboard Screen

![Rank Screen](./assets/4-rank.png)
## What is included

- React + TypeScript + Vite frontend
- Mobile-first Telegram Mini App layout
- Rhythm tap game loop
- Points, task completion, and progress bar
- Referral concept with demo invite data
- Leaderboard-ready UI using mock data
- Browser-safe demo mode

## What is intentionally excluded

- Real Telegram bot token
- Production `.env`
- PostgreSQL credentials
- Production Docker and reverse proxy configuration
- Full backend business logic
- Anti-abuse and referral enforcement logic
- Private deployment details

## Local Demo

```bash
npm install
npm run dev
```

Open the Vite URL in your browser. When not opened inside Telegram, this demo uses mock Telegram/session data so the UI can be reviewed safely.

## Environment

Copy `.env.example` if you want to point the demo UI at an API during local experiments. The public demo works with mock data by default.
