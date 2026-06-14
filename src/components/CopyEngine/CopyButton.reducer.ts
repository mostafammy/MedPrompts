export type CopyButtonState = 
  | { status: 'idle' }
  | { status: 'copying' }
  | { status: 'success' }
  | { status: 'manual-fallback' }
  | { status: 'error'; reason: string };

export type CopyButtonAction = 
  | { type: 'COPY_STARTED' }
  | { type: 'COPY_SUCCESS' }
  | { type: 'COPY_MANUAL' }
  | { type: 'COPY_ERROR'; reason: string }
  | { type: 'RESET' };

export function copyReducer(state: CopyButtonState, action: CopyButtonAction): CopyButtonState {
  switch (action.type) {
    case 'COPY_STARTED':
      return { status: 'copying' };
    case 'COPY_SUCCESS':
      return { status: 'success' };
    case 'COPY_MANUAL':
      return { status: 'manual-fallback' };
    case 'COPY_ERROR':
      return { status: 'error', reason: action.reason };
    case 'RESET':
      return { status: 'idle' };
    default:
      return state;
  }
}
