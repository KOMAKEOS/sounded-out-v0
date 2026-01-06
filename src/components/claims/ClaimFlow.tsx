'use client';

// ============================================================================
// SOUNDED OUT - CLAIM FLOW
// Allows venues and promoters to claim ownership
// Relationship layer for future monetization
// ============================================================================

import { useState } from 'react';

// ============================================================================
// INTERFACES
// ============================================================================

interface ClaimFlowProps {
  type: 'venue' | 'event';
  targetId: string;
  targetName: string;
  onSuccess: (claimId: string) => void;
  onCancel: () => void;
}

interface VerificationMethod {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  icon: React.ReactNode;
}

// ============================================================================
// VERIFICATION METHODS
// ============================================================================

const VENUE_VERIFICATION_METHODS: VerificationMethod[] = [
  {
    id: 'email',
    label: 'Official Email',
    description: 'Verify using your venue\'s official email domain',
    placeholder: 'your-name@venue-domain.com',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    id: 'website',
    label: 'Website',
    description: 'Link to your venue\'s official website',
    placeholder: 'https://your-venue.com',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    )
  },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Link to your venue\'s Instagram profile',
    placeholder: '@your_venue',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    )
  }
];

const EVENT_VERIFICATION_METHODS: VerificationMethod[] = [
  {
    id: 'ticket_link',
    label: 'Ticket Link',
    description: 'Link to your event\'s official ticket page',
    placeholder: 'https://ra.co/events/...',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
      </svg>
    )
  },
  {
    id: 'instagram',
    label: 'Instagram',
    description: 'Link to your Instagram post about this event',
    placeholder: 'https://instagram.com/p/...',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    )
  },
  {
    id: 'venue_approval',
    label: 'Venue Approval',
    description: 'Request approval from the verified venue',
    placeholder: 'The venue owner will be notified',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    )
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ClaimFlow({ type, targetId, targetName, onSuccess, onCancel }: ClaimFlowProps) {
  const [step, setStep] = useState<'method' | 'proof' | 'submitting' | 'success'>('method');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [proof, setProof] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);

  const verificationMethods = type === 'venue' ? VENUE_VERIFICATION_METHODS : EVENT_VERIFICATION_METHODS;

  // Get selected method details
  let selectedMethodDetails: VerificationMethod | null = null;
  if (selectedMethod) {
    for (let i = 0; i < verificationMethods.length; i++) {
      if (verificationMethods[i].id === selectedMethod) {
        selectedMethodDetails = verificationMethods[i];
        break;
      }
    }
  }

  async function handleSubmit(): Promise<void> {
    if (!selectedMethod || !proof.trim()) {
      setError('Please complete all fields');
      return;
    }

    setStep('submitting');
    setError(null);

    try {
      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: type,
          target_id: targetId,
          verification_method: selectedMethod,
          verification_proof: proof.trim(),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to submit claim');
        setStep('proof');
        return;
      }

      setClaimId(data.claim_id);
      setStep('success');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setStep('proof');
      console.error(err);
    }
  }

  function handleMethodSelect(methodId: string): void {
    setSelectedMethod(methodId);
    setStep('proof');
    setError(null);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 p-6 border-b border-zinc-700">
        <h2 className="text-xl font-semibold text-white mb-1">
          Claim this {type === 'venue' ? 'Venue' : 'Event'}
        </h2>
        <p className="text-zinc-400 text-sm">
          {targetName}
        </p>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Step 1: Select verification method */}
        {step === 'method' && (
          <div className="space-y-3">
            <p className="text-zinc-400 text-sm mb-4">
              How would you like to verify your ownership?
            </p>
            
            {verificationMethods.map((method: VerificationMethod) => (
              <button
                key={method.id}
                onClick={() => handleMethodSelect(method.id)}
                className="w-full text-left p-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-purple-500/50 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <div className="text-purple-400">
                    {method.icon}
                  </div>
                  <div>
                    <p className="text-white font-medium">{method.label}</p>
                    <p className="text-zinc-400 text-sm">{method.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Enter proof */}
        {step === 'proof' && selectedMethodDetails && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('method')}
              className="text-zinc-400 hover:text-white text-sm flex items-center gap-1 mb-2"
            >
              ← Change method
            </button>

            <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
              <div className="text-purple-400">
                {selectedMethodDetails.icon}
              </div>
              <div>
                <p className="text-white font-medium">{selectedMethodDetails.label}</p>
                <p className="text-zinc-400 text-xs">{selectedMethodDetails.description}</p>
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-sm mb-2">
                Verification Details
              </label>
              <input
                type="text"
                value={proof}
                onChange={(e) => setProof(e.target.value)}
                placeholder={selectedMethodDetails.placeholder}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!proof.trim()}
                className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
              >
                Submit Claim
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Submitting */}
        {step === 'submitting' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-purple-500 border-t-transparent mb-4" />
            <p className="text-zinc-400">Submitting your claim...</p>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h3 className="text-xl font-semibold text-white mb-2">
              Claim Submitted!
            </h3>
            
            <p className="text-zinc-400 text-sm mb-6">
              We'll review your claim and get back to you within 24-48 hours.
            </p>

            <div className="bg-zinc-800/50 rounded-lg p-4 mb-6">
              <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">What happens next?</p>
              <ul className="text-left text-sm text-zinc-300 space-y-2 mt-3">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">1.</span>
                  We verify your submitted proof
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">2.</span>
                  You'll receive an email with the result
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400">3.</span>
                  Once verified, you can edit and manage your {type}
                </li>
              </ul>
            </div>

            <button
              onClick={() => {
                if (claimId) onSuccess(claimId);
              }}
              className="w-full px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Footer note */}
      {(step === 'method' || step === 'proof') && (
        <div className="px-6 pb-6">
          <p className="text-zinc-500 text-xs text-center">
            Claiming is free and gives you control over your {type}'s information on Sounded Out.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CLAIM BUTTON COMPONENT
// Simple button to trigger claim flow
// ============================================================================

interface ClaimButtonProps {
  type: 'venue' | 'event';
  targetId: string;
  targetName: string;
  className?: string;
}

export function ClaimButton({ type, targetId, targetName, className = '' }: ClaimButtonProps) {
  const [showFlow, setShowFlow] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowFlow(true)}
        className={`
          inline-flex items-center gap-2 px-4 py-2 
          bg-zinc-800 hover:bg-zinc-700 
          border border-zinc-700 hover:border-purple-500/50
          text-zinc-300 hover:text-white
          rounded-lg text-sm font-medium transition
          ${className}
        `}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        Claim this {type}
      </button>

      {showFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowFlow(false)}
          />
          <div className="relative">
            <ClaimFlow
              type={type}
              targetId={targetId}
              targetName={targetName}
              onSuccess={() => setShowFlow(false)}
              onCancel={() => setShowFlow(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
