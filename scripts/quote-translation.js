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
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    customPrompt: "",
    prefetch: false
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
async function translateQuoteStreaming(quoteText, targetLang, onChunk, authorName = null) {
    const settings = getTranslationSettings();
    
    if (!settings.enabled || !settings.apiKey || targetLang === 'en') {
        return null;
    }
    
    // Create cache key including author if present
    const cacheKey = authorName ? `${quoteText}|${authorName}|${targetLang}` : `${quoteText}|${targetLang}`;
    
    // Check cache first
    const cache = getTranslationCache();
    const cachedData = cache[cacheKey];
    if (cachedData) {
        const cachedTranslation = cachedData.translation;
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
    let systemPrompt, textToTranslate;
    
    if (authorName) {
        // When translating both quote and author
        const defaultPromptWithAuthor = `You are a professional translator. Translate the following quote and author name to ${languageName}. Return ONLY the translated quote followed by a vertical bar | and then the translated author name. Format: [Translated Quote]|[Translated Author]`;
        systemPrompt = settings.customPrompt || defaultPromptWithAuthor;
        textToTranslate = `Quote: "${quoteText}"\nAuthor: ${authorName}`;
    } else {
        // When translating only quote
        const defaultPrompt = `You are a professional translator. Translate the given text to ${languageName}. Only output the translation, nothing else.`;
        systemPrompt = settings.customPrompt || defaultPrompt;
        textToTranslate = quoteText;
    }
    
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
                    { role: 'user', content: textToTranslate }
                ],
                stream: true,
                temperature: settings.temperature || 0.7
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
        
        // Save to cache with proper cache key
        if (fullTranslation) {
            const cache = getTranslationCache();
            cache[cacheKey] = {
                translation: fullTranslation,
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
        
        return fullTranslation;
    } catch (error) {
        console.error('Translation error:', error);
        return null;
    }
}

// Display translation with streaming
function displayQuoteTranslation(quoteText, targetLang, translationElement, authorName = null) {
    if (!translationElement) return;
    
    const settings = getTranslationSettings();
    if (!settings.enabled || targetLang === 'en') {
        const translationBlock = document.querySelector('.translationBlock');
        if (translationBlock) {
            translationBlock.style.display = 'none';
        }
        return;
    }
    
    const translationBlock = document.querySelector('.translationBlock');
    const translationAuthorElement = document.querySelector('.translationAuthorName span');
    const translationAuthorWrapper = document.querySelector('.translationAuthorWrapper');
    
    if (!translationBlock) return;
    
    translationElement.textContent = '';
    translationBlock.style.display = 'block';
    
    if (translationAuthorElement) {
        translationAuthorElement.textContent = '';
    }
    
    let fullTranslation = '';
    translateQuoteStreaming(quoteText, targetLang, (chunk, isComplete) => {
        if (chunk) {
            fullTranslation += chunk;
            // Check if we have the separator yet
            const separatorIndex = fullTranslation.indexOf('|');
            if (separatorIndex === -1) {
                // No separator yet, display everything as quote
                translationElement.textContent = fullTranslation;
            } else {
                // We have the separator, split quote and author
                const translatedQuote = fullTranslation.substring(0, separatorIndex).trim();
                const translatedAuthor = fullTranslation.substring(separatorIndex + 1).trim();
                translationElement.textContent = translatedQuote;
                if (translationAuthorElement) {
                    translationAuthorElement.textContent = translatedAuthor;
                }
            }
        }
        
        if (isComplete && translationAuthorWrapper && translationAuthorElement) {
            // Animate author name width
            requestAnimationFrame(() => {
                const fullWidth = translationAuthorElement.scrollWidth;
                const padding = 16;
                translationAuthorWrapper.style.width = (fullWidth + padding * 2) + "px";
            });
        }
    }, authorName);
}

// Test API connection
async function testTranslationAPI(customSettings = null) {
    const settings = customSettings || getTranslationSettings();
    
    if (!settings.apiKey) {
        return { success: false, message: 'API key is required', code: 'NO_API_KEY' };
    }
    
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
                    { role: 'system', content: 'You are a helpful assistant.' },
                    { role: 'user', content: 'Hello' }
                ],
                stream: false,
                max_tokens: 10
            })
        });
        
        if (!response.ok) {
            let errorDetails = '';
            try {
                const errorText = await response.text();
                errorDetails = errorText;
            } catch (e) {
                errorDetails = 'Unable to read error response';
            }
            return { 
                success: false, 
                message: `API Error: ${response.status} - ${response.statusText}`,
                code: response.status,
                details: errorDetails
            };
        }
        
        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            return { success: true, message: 'API connection successful!', code: 200 };
        } else {
            return { success: false, message: 'Unexpected API response format', code: 'INVALID_RESPONSE' };
        }
    } catch (error) {
        return { 
            success: false, 
            message: `Connection failed: ${error.message}`,
            code: 'NETWORK_ERROR'
        };
    }
}

// Prefetch next quote translation
async function prefetchNextQuoteTranslation() {
    const settings = getTranslationSettings();
    if (!settings.enabled || !settings.prefetch) {
        console.log('[Quote Translation] Prefetch disabled');
        return;
    }
    
    try {
        // Get quotes for current language
        if (typeof getQuotesForLanguage === 'function') {
            const quotes = await getQuotesForLanguage(false);
            if (quotes && quotes.length > 0) {
                // Select a random quote that will be shown next time
                const randomIndex = Math.floor(Math.random() * quotes.length);
                const selectedQuote = quotes[randomIndex];
                const currentLang = localStorage.getItem('selectedLanguage') || 'en';
                
                console.log('[Quote Translation] Prefetching translation for next quote:');
                console.log('  Quote:', selectedQuote.quote);
                console.log('  Author:', selectedQuote.author);
                console.log('  Target Language:', currentLang);
                
                // Prefetch translation in background
                if (currentLang !== 'en') {
                    const translation = await translateQuoteStreaming(
                        selectedQuote.quote, 
                        currentLang, 
                        null, 
                        selectedQuote.author
                    );
                    
                    if (translation) {
                        // Parse translation (format: translatedQuote|translatedAuthor)
                        const parts = translation.split('|');
                        const translatedQuote = parts[0]?.trim() || translation;
                        const translatedAuthor = parts[1]?.trim() || '';
                        
                        console.log('[Quote Translation] Prefetch completed:');
                        console.log('  Translated Quote:', translatedQuote);
                        console.log('  Translated Author:', translatedAuthor);
                        console.log('  This translation is now cached and will be used when the quote is displayed next time.');
                    } else {
                        console.log('[Quote Translation] Prefetch failed - no translation returned');
                    }
                } else {
                    console.log('[Quote Translation] Skipping prefetch - current language is English');
                }
            }
        }
    } catch (error) {
        console.error('[Quote Translation] Prefetch error:', error);
    }
}

// Initialize translation settings UI
document.addEventListener('DOMContentLoaded', () => {
    const settings = getTranslationSettings();
    
    // Load settings into UI
    const enabledCheckbox = document.getElementById('quoteTranslationCheckbox');
    const apiUrlInput = document.getElementById('quoteTranslationApiUrl');
    const apiKeyInput = document.getElementById('quoteTranslationApiKey');
    const modelInput = document.getElementById('quoteTranslationModel');
    const temperatureInput = document.getElementById('quoteTranslationTemperature');
    const customPromptInput = document.getElementById('quoteTranslationCustomPrompt');
    const prefetchCheckbox = document.getElementById('quoteTranslationPrefetch');
    const saveButton = document.getElementById('saveQuoteTranslation');
    const testButton = document.getElementById('testQuoteTranslationAPI');
    const apiUrlField = document.getElementById('quoteTranslationApiUrlField');
    const apiKeyField = document.getElementById('quoteTranslationApiKeyField');
    const modelField = document.getElementById('quoteTranslationModelField');
    const temperatureField = document.getElementById('quoteTranslationTemperatureField');
    const customPromptField = document.getElementById('quoteTranslationCustomPromptField');
    const prefetchField = document.getElementById('quoteTranslationPrefetchField');
    const saveField = document.getElementById('quoteTranslationSaveField');
    
    if (enabledCheckbox) {
        enabledCheckbox.checked = settings.enabled;
        
        // Update visibility of API config fields based on checkbox
        function updateApiFieldsVisibility() {
            const isEnabled = enabledCheckbox.checked;
            if (apiUrlField) apiUrlField.style.display = isEnabled ? 'block' : 'none';
            if (apiKeyField) apiKeyField.style.display = isEnabled ? 'block' : 'none';
            if (modelField) modelField.style.display = isEnabled ? 'block' : 'none';
            if (temperatureField) temperatureField.style.display = isEnabled ? 'block' : 'none';
            if (customPromptField) customPromptField.style.display = isEnabled ? 'block' : 'none';
            if (prefetchField) prefetchField.style.display = isEnabled ? 'block' : 'none';
            if (saveField) saveField.style.display = isEnabled ? 'block' : 'none';
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
    
    if (temperatureInput) {
        temperatureInput.value = settings.temperature || 0.7;
    }
    
    if (customPromptInput) {
        customPromptInput.value = settings.customPrompt || '';
    }
    
    if (prefetchCheckbox) {
        prefetchCheckbox.checked = settings.prefetch || false;
    }
    
    if (testButton) {
        testButton.addEventListener('click', async () => {
            testButton.disabled = true;
            testButton.textContent = '...';
            
            // Use current values from input fields, not saved settings
            const currentSettings = {
                apiUrl: apiUrlInput?.value.trim() || DEFAULT_TRANSLATION_SETTINGS.apiUrl,
                apiKey: apiKeyInput?.value.trim() || '',
                model: modelInput?.value.trim() || DEFAULT_TRANSLATION_SETTINGS.model,
                temperature: parseFloat(temperatureInput?.value) || 0.7
            };
            
            const result = await testTranslationAPI(currentSettings);
            
            if (result.success) {
                testButton.textContent = '✓';
                testButton.style.backgroundColor = '#4caf50';
                console.log('[Quote Translation] API test successful:', result.message);
            } else {
                testButton.textContent = '✗';
                testButton.style.backgroundColor = '#f44336';
                console.error('[Quote Translation] API test failed:');
                console.error('  Error Code:', result.code);
                console.error('  Error Message:', result.message);
                if (result.details) {
                    console.error('  Error Details:', result.details);
                }
                // Show alert with error information
                const errorMsg = `Code: ${result.code}\nMessage: ${result.message}`;
                alert(errorMsg);
            }
            
            setTimeout(() => {
                testButton.disabled = false;
                testButton.style.backgroundColor = '';
                // Restore original text - will be handled by language system
                if (typeof translations !== 'undefined' && typeof currentLanguage !== 'undefined') {
                    const translation = translations[currentLanguage]?.testAPIConnection || 'Test Connection';
                    testButton.textContent = translation;
                } else {
                    testButton.textContent = 'Test Connection';
                }
            }, 3000);
        });
    }
    
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            settings.apiUrl = apiUrlInput.value.trim() || DEFAULT_TRANSLATION_SETTINGS.apiUrl;
            settings.apiKey = apiKeyInput.value.trim();
            settings.model = modelInput.value.trim() || DEFAULT_TRANSLATION_SETTINGS.model;
            settings.temperature = parseFloat(temperatureInput?.value) || 0.7;
            settings.customPrompt = customPromptInput?.value.trim() || '';
            settings.prefetch = prefetchCheckbox?.checked || false;
            
            saveTranslationSettings(settings);
            
            // Show feedback
            saveButton.textContent = '✓';
            setTimeout(() => {
                if (typeof translations !== 'undefined' && typeof currentLanguage !== 'undefined') {
                    const translation = translations[currentLanguage]?.saveAPI || 'Save';
                    saveButton.textContent = translation;
                } else {
                    saveButton.textContent = 'Save';
                }
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
    
    // Trigger prefetch if enabled
    if (settings.enabled && settings.prefetch) {
        setTimeout(() => {
            prefetchNextQuoteTranslation();
        }, 3000);
    }
});
