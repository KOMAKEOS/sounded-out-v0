'use client';

// ============================================================================
// SOUNDED OUT - PROMOTION CHECKOUT MODAL
// Final confirmation and Stripe redirect
// ============================================================================

import { useState } from 'react';
import type { PromotionTier } from '@/types/revenue';
import { formatPriceGBP } from '@/types/revenue';

// ============================================================================
// INTERFACES
// ============================================================================

interface PromotionCheckoutModalProps {
  isOpen: boolean;
  eventId: string;
  eventName: string;
  tier: PromotionTier;
  onClose: () => void;
  onSuccess: (promotionId: string) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PromotionCheckoutModal({
  isOpen,
  eventId,
  eventName,
  tier,
  onClose,
  onSuccess
}: PromotionCheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleCheckout(): Promise<void> {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/promotions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          tier_id: tier.id,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to create checkout session');
        return;
      }

      // Store promotion ID for success page
      if (data.promotion_id) {
        sessionStorage.setItem('pending_promotion_id', data.promotion_id);
      }

      // Redirect to Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      // log stripped;
    } finally {
      setLoading(false);
    }
  }

  // Calculate dates
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + tier.duration_days);
  
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-1">
            Confirm Your Boost
          </h2>
          <p className="text-zinc-400 text-sm">
            Review your promotion details
          </p>
        </div>

        {/* Event info */}
        <div className="bg-zinc-800/50 rounded-lg p-4 mb-4">
          <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Event</p>
          <p className="text-white font-medium">{eventName}</p>
        </div>

        {/* Order summary */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Promotion Tier</span>
            <span className="text-white font-medium">{tier.name}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Duration</span>
            <span className="text-white">{tier.duration_days} days</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Active Period</span>
            <span className="text-white text-sm">
              {formatDate(startDate)} — {formatDate(endDate)}
            </span>
          </div>
          
          <div className="border-t border-zinc-700 pt-3 flex justify-between items-center">
            <span className="text-white font-medium">Total</span>
            <span className="text-2xl font-bold text-white">
              {formatPriceGBP(tier.price_gbp)}
            </span>
          </div>
        </div>

        {/* What you get */}
        <div className="mb-6">
          <p className="text-zinc-400 text-sm mb-2">What you get:</p>
          <ul className="space-y-1">
            {tier.features.map((feature: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <svg 
                  className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-zinc-300">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-zinc-400 hover:text-white transition text-sm font-medium"
          >
            Cancel
          </button>
          
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Processing...
              </>
            ) : (
              <>
                Pay {formatPriceGBP(tier.price_gbp)}
              </>
            )}
          </button>
        </div>

        {/* Security note */}
        <p className="mt-4 text-zinc-500 text-xs text-center">
          🔒 Secure payment powered by Stripe
        </p>
      </div>
    </div>
  );
}
