import { ImageResponse } from 'next/og';

// Edge runtime is handled by OpenNext adapter automatically
// export const runtime = 'edge'; // Removed due to OpenNext compat issues

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const subject = searchParams.get('subject')?.slice(0, 50) || 'Medical';
    const topic = searchParams.get('topic')?.slice(0, 100) || 'Study Prompt';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            backgroundColor: '#09090b', // zinc-950
            padding: '80px',
            fontFamily: 'sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <div style={{ color: '#ffffff', fontSize: '48px', fontWeight: 800 }}>
              Med<span style={{ color: '#2563eb' }}>Prompt</span>
            </div>
            <div
              style={{
                marginLeft: '20px',
                paddingLeft: '20px',
                borderLeft: '4px solid #27272a',
                color: '#a1a1aa',
                fontSize: '32px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {subject}
            </div>
          </div>
          
          <div
            style={{
              fontSize: '84px',
              fontStyle: 'normal',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1.1,
              marginTop: '20px',
              maxWidth: '900px',
            }}
          >
            {topic}
          </div>
          
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#18181b',
              padding: '16px 24px',
              borderRadius: '16px',
              border: '1px solid #27272a',
            }}
          >
            <div style={{ color: '#e4e4e7', fontSize: '24px', fontWeight: 500 }}>
              Generated Board-Exam Prompt
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('OG error:', message);
    return new Response('Failed to generate image', { status: 500 });
  }
}
