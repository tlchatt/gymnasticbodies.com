'use client';
import { useEffect } from 'react';

export default function SubscribeTracker() {
  useEffect(() => {
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'subscribe.page_view' }),
    }).catch(() => {});
  }, []);

  return null;
}
