export type TopicInputState =
  | { status: 'idle' }
  | { status: 'typing'; value: string }
  | { status: 'validating' }
  | { status: 'error'; reason: string }
  | { status: 'ready'; topic: string };

export type TopicInputAction =
  | { type: 'INPUT_CHANGED'; value: string }
  | { type: 'VALIDATION_STARTED' }
  | { type: 'VALIDATION_PASSED'; topic: string }
  | { type: 'VALIDATION_FAILED'; reason: string }
  | { type: 'RESET' };

export function topicInputReducer(state: TopicInputState, action: TopicInputAction): TopicInputState {
  switch (action.type) {
    case 'INPUT_CHANGED':
      if (action.value.trim() === '') return { status: 'idle' };
      return { status: 'typing', value: action.value };
    case 'VALIDATION_STARTED':
      return { status: 'validating' };
    case 'VALIDATION_PASSED':
      return { status: 'ready', topic: action.topic };
    case 'VALIDATION_FAILED':
      return { status: 'error', reason: action.reason };
    case 'RESET':
      return { status: 'idle' };
    default:
      return state;
  }
}
