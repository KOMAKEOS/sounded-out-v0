import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #ab67f7 0%, #d7b3ff 100%)',
          borderRadius: '40px',
        }}
      >
        <div
          style={{
            fontSize: '100px',
            color: 'white',
            fontWeight: 800,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          S
        </div>
      </div>
    ),
    { ...size }
  )
}
