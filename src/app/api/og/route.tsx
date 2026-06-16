import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const subject = searchParams.get('subject');
    const topic = searchParams.get('topic');

    if (!subject || !topic) {
      return new Response('Missing subject or topic', { status: 400 });
    }

    // Convert slug back to title case for display
    const titleCaseTopic = topic
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
      
    const titleCaseSubject = subject.charAt(0).toUpperCase() + subject.slice(1);

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#09090b', // zinc-950
            padding: '80px',
            position: 'relative',
          }}
        >
          {/* Subtle background gradient */}
          <div
            style={{
              position: 'absolute',
              top: '-20%',
              left: '-10%',
              width: '120%',
              height: '120%',
              background: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15) 0%, rgba(9, 9, 11, 0) 70%)',
            }}
          />

          {/* Logo / Brand Area */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#e4e4e7', // zinc-200
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#3b82f6', marginRight: '8px' }}>Promptica</span>
            </div>
          </div>

          {/* Main Content Area */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            {/* Subject Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '8px 24px',
                background: 'rgba(59, 130, 246, 0.1)', // blue-500/10
                borderRadius: '100px',
                border: '1px solid rgba(59, 130, 246, 0.2)', // blue-500/20
                color: '#60a5fa', // blue-400
                fontSize: 24,
                fontWeight: 600,
                marginBottom: '32px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {titleCaseSubject}
            </div>

            {/* Topic Title */}
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.1,
                letterSpacing: '-0.04em',
                marginBottom: '24px',
                maxWidth: '900px',
                display: 'flex',
                justifyContent: 'center',
                textAlign: 'center',
              }}
            >
              {titleCaseTopic}
            </div>
            
            {/* Subtitle */}
            <div
              style={{
                fontSize: 32,
                color: '#a1a1aa', // zinc-400
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              Medical Board Study Prompt
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              display: 'flex',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <div style={{ color: '#52525b', fontSize: 24, fontWeight: 500 }}>
              medprompts.mostafayaser.earth
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (e) {
    console.error(e);
    return new Response(`Failed to generate image`, {
      status: 500,
    });
  }
}
