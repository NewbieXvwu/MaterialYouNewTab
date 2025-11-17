# Quote Translation Feature

## Overview

This feature adds automatic translation capability for motivational quotes using OpenAI-compatible APIs. When enabled, quotes will be automatically translated to the user's current interface language using AI, with support for streaming responses and local caching.

## Features

1. **AI-Powered Translation**: Translates quotes using OpenAI-compatible API endpoints
2. **Streaming Support**: Real-time display of translation as it's being generated
3. **Local Caching**: Translations are cached locally to reduce API calls and improve performance
4. **Language-Aware**: Automatically translates to the current interface language
5. **Hidden for English**: Translation settings are automatically hidden when English is selected
6. **Customizable**: Users can configure API endpoint, API key, and model name
7. **Default Disabled**: Feature is disabled by default to respect user privacy and API costs

## Settings

### Location
The quote translation settings are located in the Settings panel, right below the "Motivational Quotes" toggle.

### Configuration Options

1. **Auto Translate Quotes** (Toggle)
   - Enable or disable automatic translation
   - Default: Disabled

2. **OpenAI API URL** (Text Input)
   - The API endpoint URL
   - Must be compatible with OpenAI's chat completion format
   - Default: `https://api.openai.com/v1/chat/completions`
   - Supports any OpenAI-compatible API (e.g., Azure OpenAI, local models)

3. **API Key** (Password Input)
   - Your API key for authentication
   - Stored locally in browser storage
   - Required for translation to work

4. **Model Name** (Text Input)
   - The AI model to use for translation
   - Default: `gpt-3.5-turbo`
   - Can be changed to any compatible model (e.g., `gpt-4`, `gpt-4-turbo`)

## How It Works

1. When a quote is displayed, the extension checks if translation is enabled
2. If enabled and the current language is not English, it generates a cache key
3. First checks local cache for existing translation
4. If not cached, makes a streaming API request to translate the quote
5. Translation is displayed in real-time as it streams in
6. Once complete, the translation is saved to local cache
7. Future displays of the same quote will use the cached translation

## Cache Management

- Translations are stored in `localStorage` under the key `quote_translations_cache`
- Cache is limited to 100 most recent translations
- Each cached entry includes:
  - The translated text
  - Timestamp of when it was cached
- Older entries are automatically removed when the limit is reached

## API Compatibility

The feature is designed to work with any API that follows the OpenAI chat completions format:

```json
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "system",
      "content": "You are a professional translator..."
    },
    {
      "role": "user",
      "content": "Quote to translate"
    }
  ],
  "stream": true,
  "temperature": 0.3
}
```

## Privacy & Security

- API keys are stored locally in the browser (localStorage)
- No data is sent to any server except the configured API endpoint
- Translation feature is disabled by default
- Users have full control over when and how translations occur
- Cache is stored locally and never sent to external servers

## Supported Languages

The feature automatically detects and translates to the following languages:
- Portuguese (pt)
- Simplified Chinese (zh)
- Traditional Chinese (zh_TW)
- Hindi (hi)
- Hungarian (hu)
- Czech (cs)
- Italian (it)
- Turkish (tr)
- Bengali (bn)
- Vietnamese (vi)
- Russian (ru)
- Uzbek (uz)
- Spanish (es)
- Japanese (ja)
- Korean (ko)
- Indonesian (idn)
- Marathi (mr)
- French (fr)
- Azerbaijani (az)
- Slovenian (sl)
- Nepali (np)
- Urdu (ur)
- German (de)
- Persian (fa)
- Arabic (ar_SA)
- Greek (el)
- Tamil (ta)
- Thai (th)
- Polish (pl)

## Troubleshooting

### Translation not appearing
1. Verify the feature is enabled in settings
2. Check that API key is entered correctly
3. Ensure API URL is correct
4. Check browser console for error messages

### Slow translation
- First translation may be slow as it contacts the API
- Subsequent displays of the same quote will be instant (cached)
- Consider using a faster model or local API endpoint

### API errors
- Verify your API key is valid and has sufficient credits
- Check that the API endpoint is accessible
- Ensure the model name is correct and available

## Technical Details

### Files Modified/Added
- `scripts/quote-translation.js` - Main translation logic
- `scripts/quotes.js` - Integration with existing quote system
- `index.html` - Settings UI elements
- `style.css` - Translation display styles
- All locale files in `locales/` - Translation keys for UI

### Storage Keys
- `quote_translation_settings` - User configuration
- `quote_translations_cache` - Cached translations

### Dependencies
- Requires modern browser with Fetch API support
- Streaming requires ReadableStream support
