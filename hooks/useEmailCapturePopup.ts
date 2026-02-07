'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface UseEmailCapturePopupProps {
  userId: string | null;
}

export function useEmailCapturePopup({ userId }: UseEmailCapturePopupProps) {
  const [showPopup, setShowPopup] = useState(false);
  const [eventClickCount, setEventClickCount] = useState(0);
  const supabase = createClientComponentClient();

  // Check if user has already seen the popup
  useEffect(() => {
    const checkPopupStatus = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('email_popup_shown')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error checking popup status:', error);
        return;
      }

      // If they've already seen it, don't track clicks
      if (data?.email_popup_shown) {
        return;
      }
    };

    checkPopupStatus();
  }, [userId, supabase]);

  // Track event clicks
  const trackEventClick = async () => {
    if (!userId) return;

    // Check if already shown
    const { data } = await supabase
      .from('profiles')
      .select('email_popup_shown')
      .eq('id', userId)
      .single();

    if (data?.email_popup_shown) return;

    const newCount = eventClickCount + 1;
    setEventClickCount(newCount);

    // Show popup after 2 clicks
    if (newCount === 2) {
      setShowPopup(true);
    }

    // Track analytics
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'event_clicked',
        properties: { 
          click_number: newCount,
          will_show_popup: newCount === 2
        }
      })
    });
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  return {
    showPopup,
    trackEventClick,
    closePopup
  };
}

