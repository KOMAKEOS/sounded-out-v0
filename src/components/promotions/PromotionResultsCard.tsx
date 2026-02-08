'use client';

// ============================================================================
// SOUNDED OUT - PROMOTION RESULTS CARD
// Shows promoters the value of their boost (the proof loop)
// Critical for repeat purchases
// ============================================================================

import { useState, useEffect } from 'react';
import type { EventPromotion, PromotionTier } from '@/types/revenue';
import { formatPriceGBP } from '@/types/revenue';

// ============================================================================
// INTERFACES
// ============================================================================

interface PromotionResultsCardProps {
  promotionId: string;
}

interface PromotionWithDetails extends EventPromotion {
  tier: PromotionTier;
  event: {
    id: string;
    name: string;
    start_time: string;
  };
}

interface MetricCardProps {
  label: string;
  before: number;
  after: number;
  icon: React.ReactNode;
}

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

function MetricCard({ label, before, after, icon }: MetricCardProps) {
  const gained = after - before;
  const percentageIncrease = before > 0 ? Math.round((gained / before) * 100) : gained > 0 ? 100 : 0;
  const isPositive = gained > 0;

  return (
    <div className="bg-zinc-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="text-purple-400">
          {icon}
        </div>
        <span className="text-zinc-400 text-sm">{label}</span>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{after}</p>
          <p className="text-xs text-zinc-500">was {before}</p>
        </div>
        
        {isPositive && (
          <div className="text-right">
            <p className="text-lg font-semibold text-green-400">+{gained}</p>
            <p className="text-xs text-green-400/70">+{percentageIncrease}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PromotionResultsCard({ promotionId }: PromotionResultsCardProps) {
  const [promotion, setPromotion] = useState<PromotionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPromotion(): Promise<void> {
      try {
        setLoading(true);
        
        const response = await fetch(`/api/promotions/${promotionId}`);
        const data = await response.json();
        
        if (!data.success) {
          setError(data.error || 'Failed to load promotion');
          return;
        }
        
        setPromotion(data.promotion);
      } catch (err) {
        setError('Failed to load promotion results');
        // log stripped;
      } finally {
        setLoading(false);
      }
    }

    fetchPromotion();
  }, [promotionId]);

  if (loading) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !promotion) {
    return (
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
        <p className="text-red-400 text-sm">{error || 'Promotion not found'}</p>
      </div>
    );
  }

  // Calculate metrics
  const viewsBefore = promotion.views_at_start || 0;
  const viewsAfter = promotion.views_at_end || viewsBefore;
  const savesBefore = promotion.saves_at_start || 0;
  const savesAfter = promotion.saves_at_end || savesBefore;
  const clicksBefore = promotion.clicks_at_start || 0;
  const clicksAfter = promotion.clicks_at_end || clicksBefore;

  const totalGained = (viewsAfter - viewsBefore) + (savesAfter - savesBefore) + (clicksAfter - clicksBefore);
  const isActive = promotion.status === 'active';
  const isCompleted = promotion.status === 'completed';

  // Format dates
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate days remaining
  const now = new Date();
  const endDate = new Date(promotion.ends_at);
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-purple-600/20 p-4 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {promotion.tier.name} Promotion
            </h3>
            <p className="text-zinc-400 text-sm">
              {promotion.event.name}
            </p>
          </div>
          
          {/* Status badge */}
          <div className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${isActive ? 'bg-green-500/20 text-green-400' : ''}
            ${isCompleted ? 'bg-zinc-700 text-zinc-300' : ''}
            ${promotion.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : ''}
          `}>
            {isActive && `${daysRemaining} days left`}
            {isCompleted && 'Completed'}
            {promotion.status === 'pending' && 'Pending'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Summary message */}
        {totalGained > 0 && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
            <p className="text-purple-300 text-sm">
              🚀 Your event received <strong className="text-white">{totalGained} more engagements</strong> compared to before the boost!
            </p>
          </div>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard 
            label="Views"
            before={viewsBefore}
            after={viewsAfter}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
          />
          
          <MetricCard 
            label="Saves"
            before={savesBefore}
            after={savesAfter}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            }
          />
          
          <MetricCard 
            label="Clicks"
            before={clicksBefore}
            after={clicksAfter}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            }
          />
        </div>

        {/* Timeline */}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-zinc-800">
          <div className="text-zinc-400">
            Started: {formatDate(promotion.starts_at)}
          </div>
          <div className="text-zinc-400">
            {isActive ? 'Ends' : 'Ended'}: {formatDate(promotion.ends_at)}
          </div>
        </div>

        {/* Investment info */}
        <div className="flex items-center justify-between text-sm bg-zinc-800/30 rounded-lg p-3">
          <span className="text-zinc-400">Your investment</span>
          <span className="text-white font-medium">{formatPriceGBP(promotion.amount_paid_gbp)}</span>
        </div>

        {/* CTA for rebooking */}
        {isCompleted && (
          <button className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition">
            Boost Another Event
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PROMOTIONS LIST COMPONENT
// Shows all promotions for a user
// ============================================================================

interface PromotionListItemProps {
  promotion: PromotionWithDetails;
  onClick: (id: string) => void;
}

function PromotionListItem({ promotion, onClick }: PromotionListItemProps) {
  const viewsGained = (promotion.views_at_end || 0) - (promotion.views_at_start || 0);
  const isActive = promotion.status === 'active';
  
  return (
    <button
      onClick={() => onClick(promotion.id)}
      className="w-full text-left p-4 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">{promotion.event.name}</span>
        <span className={`
          text-xs px-2 py-0.5 rounded-full
          ${isActive ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}
        `}>
          {isActive ? 'Active' : promotion.status}
        </span>
      </div>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{promotion.tier.name}</span>
        {viewsGained > 0 && (
          <span className="text-green-400">+{viewsGained} views</span>
        )}
      </div>
    </button>
  );
}

export function PromotionsList() {
  const [promotions, setPromotions] = useState<PromotionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPromotions(): Promise<void> {
      try {
        const response = await fetch('/api/promotions/my');
        const data = await response.json();
        
        if (data.success) {
          setPromotions(data.promotions);
        }
      } catch (err) {
        // log stripped;
      } finally {
        setLoading(false);
      }
    }

    fetchPromotions();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
      </div>
    );
  }

  if (promotions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-400">You haven't boosted any events yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedId ? (
        <>
          <button 
            onClick={() => setSelectedId(null)}
            className="text-zinc-400 hover:text-white text-sm flex items-center gap-1"
          >
            ← Back to list
          </button>
          <PromotionResultsCard promotionId={selectedId} />
        </>
      ) : (
        <div className="space-y-2">
          {promotions.map((promotion: PromotionWithDetails) => (
            <PromotionListItem 
              key={promotion.id}
              promotion={promotion}
              onClick={setSelectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
