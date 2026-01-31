# Gemini Model Distribution Strategy

## Problem
Gemini 2.5 Flash was being used for ALL requests and hit rate limits:
- **607/250K TPM** (tokens per minute) - approaching limit
- **21/20 RPD** (requests per day) - **OVER DAILY LIMIT!**
- **4/5 RPM** (requests per minute) - near limit

## Solution
Distribute requests across multiple available models based on purpose.

## Current Model Assignment

| Purpose | Model | Reason |
|---------|-------|--------|
| **Quiz Generation** | `gemini-3-flash` | Accurate, avoid 2.5 rate limit |
| **Flashcards** | `gemini-2.5-flash-lite` | Lighter load, good quality |
| **AI Chat Tutor** | `gemini-3-flash` | Fast conversational responses |
| **Summaries** | `gemini-2.5-flash-lite` | Simple task, lightweight |
| **Embeddings** | `text-embedding-004` | Specialized embedding model |
| **Short Text** | `gemini-3-flash` | Quick responses |

## Available Models (Unused Capacity)

### Text-Out Models
- **Gemini 3 Flash**: 0/5 RPM, 0/250K TPM, 0/20 RPD ✅ NOW USING
- **Gemini 2.5 Flash Lite**: 0/10 RPM, 0/250K TPM, 0/20 RPD ✅ NOW USING

### Other Available Models (Reserved for Future)
- **Gemini 3 4B**: 0/30 RPM, 0/15K TPM (very fast, lightweight)
- **Gemini 3 2B**: 0/30 RPM, 0/15K TPM (smallest, fastest)
- **Gemini 3 27B**: 0/30 RPM (larger model for complex tasks)
- **Gemini 3 1B**: 0/30 RPM (tiny model for simple tasks)
- **Gemini 3 12B**: 0/30 RPM (medium-sized model)

## Fallback Strategy

If a model fails or hits rate limit, automatic fallback:
```
gemini-2.5-flash → gemini-3-flash → gemini-2.5-flash-lite
gemini-3-flash → gemini-2.5-flash-lite → gemini-2.5-flash
gemini-2.5-flash-lite → gemini-3-flash → gemini-2.5-flash
```

## Files Modified

1. **lib/ai/models.ts** (NEW)
   - Model configuration and purpose mapping
   - Fallback logic
   - Model capabilities reference

2. **lib/ai/gemini.ts**
   - Updated `getTextModel()` to accept purpose or model name
   - Default changed from `gemini-2.5-flash` to `gemini-3-flash`

3. **app/api/quiz/route.ts**
   - Now uses `gemini-3-flash` for quiz generation
   - Imported `getModelForPurpose()` helper

4. **app/api/flashcards/route.ts**
   - Now uses `gemini-2.5-flash-lite` for flashcards
   - Lighter model for flashcard generation

5. **app/api/chat/route.ts**
   - Now uses `gemini-3-flash` for chat responses
   - Fast conversational model

## Usage Example

```typescript
// In your API route
import { getModelForPurpose } from '@/lib/ai/models';

// Get model for specific purpose
const model = genAI.getGenerativeModel({
  model: getModelForPurpose('quiz'), // Returns 'gemini-3-flash'
});

// Or use the updated getTextModel()
import { getTextModel } from '@/lib/ai/gemini';
const model = getTextModel('chat'); // Returns model configured for chat
```

## Benefits

1. **Avoid Rate Limits**: Distribute load across multiple models
2. **Better Performance**: Use appropriate model for each task
3. **Cost Optimization**: Lighter models for simpler tasks
4. **Reliability**: Fallback models if primary fails
5. **Future Ready**: Easy to add new models or adjust strategy

## Next Steps (Optional)

1. Monitor which models are approaching limits
2. Consider using Gemini 3 2B/4B for very simple tasks
3. Implement automatic model switching based on real-time quota
4. Add retry logic with exponential backoff
5. Log model usage for analytics

## Notes

- All models maintain same temperature (0.3) and systemInstruction for consistency
- JSON extraction logic remains the same across all models
- Models are interchangeable - easy to swap if needed
- Configuration is centralized in `lib/ai/models.ts`
