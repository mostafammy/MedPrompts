# API Contracts

## `POST /api/generate`

**Purpose**: Generates a prompt based on the selected subject, topic, and dynamic variables.

**Request Payload**:
```typescript
interface GenerateRequest {
  subjectId: string;
  topic: string;
  variables?: Record<string, string>; // e.g. { "LANGUAGE": "German", "ANALOGY_DOMAIN": "Cooking" }
}
```

**Response**:
*Unchanged.* Returns `text/plain` or JSON with the `prompt` output, or error codes matching `EngineError`.
