# Class Announcer

A Next.js application for managing student rosters and sending email announcements to classes. Built with TypeScript, Tailwind CSS, and shadcn/ui components.

## Features

- **Student Management**: Import, export, and manage student rosters
- **Email Composition**: Rich email composer with HTML support and file attachments
- **Batch Email Sending**: Send announcements to multiple recipients with delivery tracking
- **Email History**: View sent email batches and individual delivery status
- **Multiple Email Providers**: Support for SendGrid and SMTP
- **Dark/Light Theme**: Toggle between themes with system preference detection

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuration

### Email Providers

Configure email sending in the Settings page:

- **None**: Simulate email sending (test mode)
- **SendGrid**: Requires `SENDGRID_API_KEY` environment variable
- **SMTP**: Requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` environment variables

### Environment Variables

```bash
# Email configuration
FROM_EMAIL=your-email@example.com
TEST_MODE=true

# SendGrid (optional)
SENDGRID_API_KEY=your-sendgrid-api-key

# SMTP (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Data directory (optional, defaults to ./data)
DATA_DIR=/path/to/data

# Demo mode for serverless deployments
DEMO_MODE=true
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### Vercel Demo Mode

When deployed to Vercel (or other serverless platforms), the application automatically enables **demo mode** to work around the lack of persistent file storage. In demo mode:

- All data (students, email history, settings) is stored in memory only
- Data is **reset when serverless functions cold start** (typically after periods of inactivity)
- This allows the application to function normally for demonstration purposes
- Email sending still works normally with configured providers

The demo mode is automatically enabled when:
- `NODE_ENV=production` AND `DEMO_MODE=true`

For production use with persistent data, deploy on a platform with persistent file storage or integrate with a proper database.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
