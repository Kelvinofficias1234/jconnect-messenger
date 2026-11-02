import React from 'react';
import { useLocation } from 'react-router-dom';
import Landing from '@/pages/Landing';
import PageNotFound from '@/lib/PageNotFound';

/**
 * Catch-all router that detects deep-link referral paths (/@username).
 * If the path matches /@username, stores the referral and renders the Landing page.
 * Otherwise renders PageNotFound.
 */
export default function ReferralRouter() {
  const location = useLocation();
  const match = location.pathname.match(/^\/@([a-zA-Z0-9_]{3,32})$/);
  if (match) {
    localStorage.setItem('referral_username', match[1].toLowerCase());
    return <Landing />;
  }
  return <PageNotFound />;
}