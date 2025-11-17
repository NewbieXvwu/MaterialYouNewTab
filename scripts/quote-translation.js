/*
 * Material You NewTab
 * Copyright (c) 2023-2025 XengShi
 * Licensed under the GNU General Public License v3.0 (GPL-3.0)
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

// Quote translation using OpenAI Compatible API with streaming support
const TRANSLATION_CACHE_KEY = "quote_translations_cache";
const TRANSLATION_SETTINGS_KEY = "quote_translation_settings";

// Default translation settings
const DEFAULT_TRANSLATION_SETTINGS = {
    enabled: false,
    apiUrl: "https://api.openai.com/v1/chat/completions",
    apiKey: "",
    model: "gpt-3.5-turbo"
};

// Get translation settings from localStorage
function getTranslationSettings() {
    const stored = localStorage.getItem(TRANSLATION_SETTINGS_KEY);
    return stored ? { ...DEFAULT_TRANSLATION_SETTINGS, ...JSON.parse(stored) } : DEFAULT_TRANSLATION_SETTINGS;
}

// Save translation settings to localStorage
function saveTranslationSettings(settings) {
    localStorage.setItem(TRANSLATION_SETTINGS_KEY, JSON.stringify(settings));
}

// Get translation cache
function getTranslationCache() {
    const stored = localStorage.getItem(TRANSLATION_CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
}

// Save translation to cache
function saveTranslationToCache(quoteText, targetLang, translation) {
    const cache = getTranslationCache();
    const cacheKey = `${quoteText}|${targetLang}`;
    cache[cacheKey] = {
        translation,
        timestamp: Date.now()
    };
    
    // Limit cache size to 100 entries (keep most recent)
    const entries = Object.entries(cache);
    if (entries.length > 100) {
        entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
        const limitedCache = Object.fromEntries(entries.slice(0, 100));
        localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(limitedCache));
    } else {
        localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(cache));
    }
}

// Get translation from cache
function getTranslationFromCache(quoteText, targetLang) {
    const cache = getTranslationCache();
    const cacheKey = `${quoteText}|${targetLang}`;
    return cache[cacheKey]?.translation;
}

// Get language name for prompt
function getLanguageName(langCode) {
    const languageNames = {
        'pt': 'Portuguese',
        'zh': 'Simplified Chinese',
        'zh_TW': 'Traditional Chinese',
        'hi': 'Hindi',
        'hu': 'Hungarian',
        'cs': 'Czech',
        'it': 'Italian',
        'tr': 'Turkish',
        'bn': 'Bengali',
        'vi': 'Vietnamese',
        'ru': 'Russian',
        'uz': 'Uzbek',
        'es': 'Spanish',
        'ja': 'Japanese',
        'ko': 'Korean',
        'idn': 'Indonesian',
        'mr': 'Marathi',
        'fr': 'French',
        'az': 'Azerbaijani',
        'sl': 'Slovenian',
        'np': 'Nepali',
        'ur': 'Urdu',
        'de': 'German',
        'fa': 'Persian',
        'ar_SA': 'Arabic',
        'el': 'Greek',
        'ta': 'Tamil',
        'th': 'Thai',
        'pl': 'Polish'
    };
    return languageNames[langCode] || 'English';
}

// Translate quote using OpenAI Compatible API with streaming
async function translateQuoteStreaming(quoteText, targetLang, onChunk) {
    const settings = getTranslationSettings();
    
    if (!settings.enabled || !settings.apiKey || targetLang === 'en') {
        return null;
    }
    
    // Check cache first
    const cachedTranslation = getTranslationFromCache(quoteText, targetLang);
    if (cachedTranslation) {
        // Simulate streaming for cached results
        if (onChunk) {
            let index = 0;
            const chunkSize = 3;
            const streamCached = () => {
                if (index < cachedTranslation.length) {
                    const chunk = cachedTranslation.slice(index, index + chunkSize);
                    onChunk(chunk, false);
                    index += chunkSize;
                    setTimeout(streamCached, 30);
                } else {
                    onChunk('', true);
                }
            };
            streamCached();
        }
        return cachedTranslation;
    }
    
    const languageName = getLanguageName(targetLang);
    const systemPrompt = `You are a professional translator. Translate the given text to ${languageName}. Only output the translation, nothing else.`;
    
    try {
        const response = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: settings.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: quoteText }
                ],
                stream: true,
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            console.error('Translation API error:', response.status, response.statusText);
            return null;
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullTranslation = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        if (onChunk) onChunk('', true);
                        break;
                    }
                    
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices?.[0]?.delta?.content;
                        if (content) {
                            fullTranslation += content;
                            if (onChunk) onChunk(content, false);
                        }
                    } catch (e) {
                        // Ignore parsing errors for incomplete JSON
                    }
                }
            }
        }
        
        // Save to cache
        if (fullTranslation) {
            saveTranslationToCache(quoteText, targetLang, fullTranslation);
        }
        
        return fullTranslation;
    } catch (error) {
        console.error('Translation error:', error);
        return null;
    }
}

// Display translation with streaming
function displayQuoteTranslation(quoteText, targetLang, translationElement) {
    if (!translationElement) return;
    
    const settings = getTranslationSettings();
    if (!settings.enabled || targetLang === 'en') {
        translationElement.style.display = 'none';
        return;
    }
    
    translationElement.textContent = '';
    translationElement.style.display = 'block';
    
    translateQuoteStreaming(quoteText, targetLang, (chunk, isComplete) => {
        if (chunk) {
            translationElement.textContent += chunk;
        }
    });
}

// Initialize translation settings UI
document.addEventListener('DOMContentLoaded', () => {
    const settings = getTranslationSettings();
    
    // Load settings into UI
    const enabledCheckbox = document.getElementById('quoteTranslationCheckbox');
    const apiUrlInput = document.getElementById('quoteTranslationApiUrl');
    const apiKeyInput = document.getElementById('quoteTranslationApiKey');
    const modelInput = document.getElementById('quoteTranslationModel');
    const saveButton = document.getElementById('saveQuoteTranslation');
    const apiUrlField = document.getElementById('quoteTranslationApiUrlField');
    const apiKeyField = document.getElementById('quoteTranslationApiKeyField');
    const modelField = document.getElementById('quoteTranslationModelField');
    
    if (enabledCheckbox) {
        enabledCheckbox.checked = settings.enabled;
        
        // Update visibility of API config fields based on checkbox
        function updateApiFieldsVisibility() {
            const isEnabled = enabledCheckbox.checked;
            if (apiUrlField) apiUrlField.style.display = isEnabled ? 'block' : 'none';
            if (apiKeyField) apiKeyField.style.display = isEnabled ? 'block' : 'none';
            if (modelField) modelField.style.display = isEnabled ? 'block' : 'none';
        }
        
        updateApiFieldsVisibility();
        
        enabledCheckbox.addEventListener('change', () => {
            settings.enabled = enabledCheckbox.checked;
            saveTranslationSettings(settings);
            updateApiFieldsVisibility();
            
            // Reload quote with translation if enabled
            if (settings.enabled && typeof loadAndDisplayQuote === 'function') {
                loadAndDisplayQuote(false);
            }
        });
    }
    
    if (apiUrlInput) {
        apiUrlInput.value = settings.apiUrl;
    }
    
    if (apiKeyInput) {
        apiKeyInput.value = settings.apiKey;
    }
    
    if (modelInput) {
        modelInput.value = settings.model;
    }
    
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            settings.apiUrl = apiUrlInput.value.trim() || DEFAULT_TRANSLATION_SETTINGS.apiUrl;
            settings.apiKey = apiKeyInput.value.trim();
            settings.model = modelInput.value.trim() || DEFAULT_TRANSLATION_SETTINGS.model;
            
            saveTranslationSettings(settings);
            
            // Show feedback
            saveButton.textContent = '✓';
            setTimeout(() => {
                const translation = translations[currentLanguage]?.saveAPI || 'Save';
                saveButton.textContent = translation;
            }, 1500);
            
            // Reload quote with new settings if translation is enabled
            if (settings.enabled && typeof loadAndDisplayQuote === 'function') {
                loadAndDisplayQuote(false);
            }
        });
    }
    
    // Hide translation settings when language is English
    function updateTranslationSettingsVisibility() {
        const quoteTranslationSettings = document.getElementById('quoteTranslationSettings');
        if (quoteTranslationSettings) {
            const currentLang = localStorage.getItem('selectedLanguage') || 'en';
            if (currentLang === 'en') {
                quoteTranslationSettings.style.display = 'none';
            } else {
                quoteTranslationSettings.style.display = 'block';
            }
        }
    }
    
    updateTranslationSettingsVisibility();
    
    // Update visibility when language changes
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
        languageSelector.addEventListener('change', updateTranslationSettingsVisibility);
    }
});
