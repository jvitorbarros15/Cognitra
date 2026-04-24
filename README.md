# Cognitra

Cognitra is an intelligent learning platform designed to help students organize, understand, and retain course material more effectively. Built with modern web technologies, it combines traditional note taking with AI powered study tools.

## Features

- **Class Management**: Create and organize classes with lecture tracking
- **Intelligent Notes**: AI-assisted notebook with highlighting and annotation capabilities
- **Mind Mapping**: Visual concept mapping to organize ideas and relationships
- **Study Materials**: Generate flashcards and study aids from your notes
- **Lectures**: Record and manage lecture content with time tracking
- **Multi-language Support**: Available in English and Portuguese
- **User Authentication**: Secure login with Firebase
- **Cloud Storage**: Store all materials in the cloud for anytime access

## Tech Stack

- **Frontend**: React 19, Next.js 16
- **Styling**: Tailwind CSS
- **AI Integration**: OpenAI, LangChain
- **Backend & Database**: Firebase
- **Internationalization**: next-i18next
- **Visualization**: React Flow

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   OPENAI_API_KEY=your_openai_key
   ```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

- `src/app` - Next.js routes and pages
- `src/components` - React components
- `src/lib` - Utilities and Firebase configuration

## License

This project is private and proprietary.
