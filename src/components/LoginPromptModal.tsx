'use client'

import Link from 'next/link'

// ============================================================================
// LOGIN PROMPT MODAL - Shows when guests try to save
// Clean, non-intrusive design with "keep exploring" option
// ============================================================================

interface LoginPromptModalProps {
  isOpen: boolean
  onClose: () => void
  action?: 'save' | 'follow' | 'general'
}

export default function LoginPromptModal({ 
  isOpen, 
  onClose, 
  action = 'save' 
}: LoginPromptModalProps) {
  if (!isOpen) return null

  const messages = {
    save: {
      title: 'Save events you love',
      subtitle: 'Create a free account to save events and get personalised recommendations.',
      emoji: '❤️',
    },
    follow: {
      title: 'Follow your favourites',
      subtitle: 'Sign up to follow venues and artists, and never miss their events.',
      emoji: '⭐',
    },
    general: {
      title: 'Get the full experience',
      subtitle: 'Create a free account to unlock all features.',
      emoji: '✨',
    },
  }

  const { title, subtitle, emoji } = messages[action]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 500,
          animation: 'fadeIn 200ms ease-out',
        }}
      />
      
      {/* Modal */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '340px',
          background: '#1a1a1f',
          borderRadius: '20px',
          padding: '28px 24px',
          zIndex: 501,
          animation: 'slideUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: '#666',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {/* Content */}
        <div style={{ textAlign: 'center' }}>
          {/* Emoji icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(171,103,247,0.2), rgba(171,103,247,0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '28px',
            }}
          >
            {emoji}
          </div>

          <h3
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: 'white',
              marginBottom: '8px',
            }}
          >
            {title}
          </h3>

          <p
            style={{
              fontSize: '14px',
              color: '#999',
              lineHeight: 1.5,
              marginBottom: '24px',
            }}
          >
            {subtitle}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Link
              href="/signup"
              style={{
                display: 'block',
                padding: '14px 20px',
                background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 700,
                color: 'white',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Create Free Account
            </Link>

            <Link
              href="/login"
              style={{
                display: 'block',
                padding: '14px 20px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 600,
                color: '#999',
                textDecoration: 'none',
                textAlign: 'center',
              }}
            >
              Sign In
            </Link>
          </div>

          {/* Keep exploring option */}
          <button
            onClick={onClose}
            style={{
              marginTop: '16px',
              padding: '10px',
              background: 'none',
              border: 'none',
              fontSize: '13px',
              color: '#666',
              cursor: 'pointer',
            }}
          >
            No thanks, keep exploring →
          </button>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0; 
            transform: translate(-50%, -45%); 
          }
          to { 
            opacity: 1; 
            transform: translate(-50%, -50%); 
          }
        }
      `}</style>
    </>
  )
}
