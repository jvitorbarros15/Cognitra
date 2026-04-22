# Internationalization (i18n) Setup

This project is configured for multi-language support using `next-i18next` and `react-i18next`.

## Supported Languages

- **English** (en) - Default language
- **Portuguese (Brazil)** (pt-BR) - Primary translation

## File Structure

```
public/locales/
├── en/
│   └── common.json          # English translations
└── pt-BR/
    └── common.json          # Portuguese translations
```

## Using Translations in Components

### In React Components (Client-side)

```jsx
'use client';

import { useTranslation } from 'react-i18next';

export default function MyComponent() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('navigation.home')}</h1>
      <button>{t('buttons.save')}</button>
      <p>Current language: {i18n.language}</p>
    </div>
  );
}
```

### Language Switcher

The `LanguageSwitcher` component is included in your components. Add it to your NavBar to let users switch languages:

```jsx
import LanguageSwitcher from '@/components/LanguageSwitcher';

<LanguageSwitcher />
```

The selected language is persisted in localStorage.

## Adding New Translations

1. Add keys to both language files:

**public/locales/en/common.json**
```json
{
  "mySection": {
    "newKey": "Hello"
  }
}
```

**public/locales/pt-BR/common.json**
```json
{
  "mySection": {
    "newKey": "Olá"
  }
}
```

2. Use in your component:
```jsx
const { t } = useTranslation();
t('mySection.newKey'); // Returns "Hello" or "Olá" based on current language
```

## Adding a New Language

1. Create a new folder under `public/locales/` (e.g., `es` for Spanish)
2. Copy `en/common.json` and translate
3. Update `next-i18next.config.js`:

```javascript
locales: ['en', 'pt-BR', 'es'],
```

4. Update the LanguageSwitcher if needed

## Current Translation Keys

Translation keys are organized by section:

- **common** - General UI terms (language, etc.)
- **navigation** - Navigation menu items
- **buttons** - Button labels
- **messages** - Alert and notification messages
- **notebook** - Notebook feature strings
- **recording** - Recording/timer feature strings

Expand these sections as you add more features to the app.
