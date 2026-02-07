'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { X } from 'lucide-react';

interface EmailCapturePopupProps {
  userId: string;
  onClose: () => void;
}

export default function EmailCapturePopup({ userId, onClose }: EmailCapturePopupProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Update user profile with email and mark popup as shown
      const { error } = await supabase
        .from('profiles')
        .update({ 
          email_for_feedback: email,
          email_popup_shown: true,
          email_popup_shown_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      // Track analytics
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'email_captured',
          properties: { source: 'feedback_popup' }
        })
      });

      // Close with fade out
      setIsVisible(false);
      setTimeout(onClose, 300);
    } catch (error) {
      console.error('Error saving email:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMaybeLater = async () => {
    // Mark as shown so they don't see it again
    await supabase
      .from('profiles')
      .update({ 
        email_popup_shown: true,
        email_popup_shown_at: new Date().toISOString()
      })
      .eq('id', userId);

    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)'
      }}
    >
      {/* Glass morphism card */}
      <div 
        className="relative w-full max-w-md rounded-3xl p-8 transition-transform duration-300"
        style={{
          background: 'rgba(20, 20, 30, 0.9)',
          border: '1px solid rgba(171, 103, 247, 0.2)',
          boxShadow: `
            0 0 0 1px rgba(171, 103, 247, 0.1),
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 16px 64px rgba(171, 103, 247, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.05)
          `,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)'
        }}
      >
        {/* Close button */}
        <button
          onClick={handleMaybeLater}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5 text-white/60" />
        </button>

        {/* Content */}
        <div className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <h3 className="text-2xl font-semibold text-white">
              Help shape Sounded Out
            </h3>
            <p className="text-white/70 text-sm leading-relaxed">
              We're new. We're learning. Drop your email and we'll ask you 2-3 questions 
              next week about what would make this actually useful.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-[#AB67F7] focus:ring-2 focus:ring-[#AB67F7]/20 transition-all"
              style={{
                backdropFilter: 'blur(10px)'
              }}
            />

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #AB67F7 0%, #8B4FD9 100%)',
                boxShadow: `
                  0 4px 16px rgba(171, 103, 247, 0.4),
                  0 8px 32px rgba(171, 103, 247, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.2)
                `
              }}
            >
              {isSubmitting ? 'Sending...' : 'Count me in'}
            </button>
          </form>

          {/* Maybe later */}
          <button
            onClick={handleMaybeLater}
            className="w-full text-sm text-white/50 hover:text-white/70 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

