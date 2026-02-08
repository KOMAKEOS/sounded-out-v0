'use client';

// ============================================================================
// SOUNDED OUT - PROMOTION TIER CARDS
// Displays available promotion tiers with pricing and features
// ============================================================================

import { useState, useEffect } from 'react';
import type { PromotionTier, PromotionAvailability } from '@/types/revenue';
import { formatPriceGBP } from '@/types/revenue';

// ============================================================================
// INTERFACES
// ============================================================================

interface PromotionTierCardsProps {
  eventId: string;
  eventName: string;
  onSelectTier: (tier: PromotionTier) => void;
}

interface TierWithAvailability extends PromotionTier {
  availability: PromotionAvailability | null;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PromotionTierCards({ eventId, eventName, onSelectTier }: PromotionTierCardsProps) {
  const [tiers, setTiers] = useState<TierWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);

  // Fetch tiers and availability on mount
  useEffect(() => {
    async function fetchTiers(): Promise<void> {
      try {
        setLoading(true);
        
        // Fetch tiers
        const tiersResponse = await fetch('/api/promotions/tiers');
        const tiersData = await tiersResponse.json();
        
        if (!tiersData.success) {
          setError(tiersData.error || 'Failed to load tiers');
          return;
        }

        const fetchedTiers: PromotionTier[] = tiersData.tiers;
        
        // Fetch availability for each tier
        const tiersWithAvailability: TierWithAvailability[] = [];
        
        for (let i = 0; i < fetchedTiers.length; i++) {
          const tier: PromotionTier = fetchedTiers[i];
          
          const availResponse = await fetch(
            `/api/promotions/availability?event_id=${eventId}&tier_id=${tier.id}`
          );
          const availData = await availResponse.json();
          
          const tierWithAvail: TierWithAvailability = {
            ...tier,
            availability: availData.success ? availData.availability : null
          };
          
          tiersWithAvailability.push(tierWithAvail);
        }
        
        setTiers(tiersWithAvailability);
      } catch (err) {
        setError('Failed to load promotion options');
        // log stripped;
      } finally {
        setLoading(false);
      }
    }

    fetchTiers();
  }, [eventId]);

  // Handle tier selection
  function handleSelect(tier: TierWithAvailability): void {
    if (!tier.availability?.available) return;
    
    setSelectedTierId(tier.id);
    onSelectTier(tier);
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">
          Boost Your Event
        </h2>
        <p className="text-zinc-400 text-sm">
          Get more visibility for "{eventName}"
        </p>
      </div>

      {/* Tier Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier: TierWithAvailability) => {
          const isAvailable = tier.availability?.available ?? false;
          const isSelected = selectedTierId === tier.id;
          const slotsRemaining = tier.availability?.slots_remaining ?? 0;
          
          return (
            <button
              key={tier.id}
              onClick={() => handleSelect(tier)}
              disabled={!isAvailable}
              className={`
                relative p-6 rounded-xl border text-left transition-all
                ${isSelected 
                  ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/50' 
                  : isAvailable
                    ? 'border-zinc-700 bg-zinc-800/50 hover:border-purple-500/50 hover:bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-900/50 opacity-60 cursor-not-allowed'
                }
              `}
            >
              {/* Popular badge for Featured */}
              {tier.id === 'featured' && isAvailable && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-purple-500 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Tier name and price */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-1">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-white">
                    {formatPriceGBP(tier.price_gbp)}
                  </span>
                  <span className="text-zinc-400 text-sm">
                    / {tier.duration_days} days
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-zinc-400 text-sm mb-4">
                {tier.description}
              </p>

              {/* Features list */}
              <ul className="space-y-2 mb-4">
                {tier.features.map((feature: string, index: number) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <svg 
                      className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                    <span className="text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Availability indicator */}
              <div className="pt-4 border-t border-zinc-700/50">
                {isAvailable ? (
                  <p className="text-sm text-green-400">
                    {slotsRemaining} {slotsRemaining === 1 ? 'slot' : 'slots'} available
                  </p>
                ) : (
                  <p className="text-sm text-red-400">
                    Sold out for this date
                  </p>
                )}
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <svg 
                      className="w-4 h-4 text-white" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Trust message */}
      <div className="mt-6 text-center">
        <p className="text-zinc-500 text-xs">
          Promoted events are clearly labelled. SO Picks remain independent and cannot be purchased.
        </p>
      </div>
    </div>
  );
}
