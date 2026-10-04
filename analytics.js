// Springboards Web Analytics Client
// Lightweight, privacy-respecting traffic, referral, and button click tracking
(function () {
  'use strict';

  // Generate or retrieve anonymous session ID
  let sessionId = sessionStorage.getItem('sb_analytics_sid');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    try {
      sessionStorage.setItem('sb_analytics_sid', sessionId);
    } catch {
      // Storage unavailable fallback
    }
  }

  // Parse referrer category
  function getReferralSource() {
    const referrer = document.referrer || '';
    if (!referrer) return 'Direct / Bookmarks';
    try {
      const url = new URL(referrer);
      const host = url.hostname.toLowerCase();
      if (host.includes('google.')) return 'Google Search';
      if (host.includes('bing.')) return 'Bing Search';
      if (host.includes('facebook.') || host.includes('fb.me')) return 'Facebook';
      if (host.includes('instagram.')) return 'Instagram';
      if (host.includes('linkedin.')) return 'LinkedIn';
      if (host.includes('t.co') || host.includes('twitter.') || host.includes('x.com')) return 'Twitter / X';
      if (host === window.location.hostname) return 'Internal Navigation';
      return host;
    } catch {
      return 'External Web Referral';
    }
  }

  // Send event beacon
  function sendEvent(eventType, eventLabel, metadata = {}) {
    const payload = {
      eventType,
      eventLabel,
      sessionId,
      path: window.location.pathname + window.location.hash,
      referrer: document.referrer || '',
      referralSource: getReferralSource(),
      timestamp: new Date().toISOString(),
      screen: `${window.innerWidth}x${window.innerHeight}`,
      ...metadata
    };

    const url = '/api/analytics/event';
    const dataStr = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([dataStr], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: dataStr,
        keepalive: true
      }).catch(() => {});
    }
  }

  // 1. Track initial Page View
  sendEvent('page_view', 'Home Landing Page');

  // 2. Track on hash change (in-page jumps)
  window.addEventListener('hashchange', () => {
    sendEvent('page_view', 'Section Jump: ' + window.location.hash);
  });

  // 3. Track button clicks & interactive triggers
  document.addEventListener('DOMContentLoaded', () => {
    // Track clicks on all CTAs and key buttons
    document.addEventListener('click', (event) => {
      const target = event.target.closest('a, button');
      if (!target) return;

      const href = target.getAttribute('href') || '';
      const text = (target.textContent || '').trim().replace(/\s+/g, ' ');

      // Direct Contact Triggers
      if (href.startsWith('tel:')) {
        sendEvent('button_click', 'Phone Call Trigger', { targetPhone: href.replace('tel:', ''), buttonText: text });
      } else if (href.startsWith('mailto:')) {
        sendEvent('button_click', 'Email Composer Trigger', { targetEmail: href, buttonText: text });
      } else if (href.includes('google.com/maps')) {
        sendEvent('button_click', 'Google Maps Directions', { buttonText: text });
      } else if (href.includes('facebook.com')) {
        sendEvent('button_click', 'Facebook Community Group', { buttonText: text });
      } else if (target.classList.contains('btn-candidate-trigger')) {
        sendEvent('button_click', 'Candidate Application Open', { buttonText: text });
      } else if (target.classList.contains('btn-partner-trigger') || target.id === 'openPartnerModalBtn') {
        sendEvent('button_click', 'Employer Partnership Open', { buttonText: text });
      } else if (target.classList.contains('btn-donate-trigger') || target.id === 'openDonateModalBtn') {
        sendEvent('button_click', 'Donation Center Open', { buttonText: text });
      } else if (target.classList.contains('btn-doc-trigger')) {
        sendEvent('button_click', 'Document Center Open', { buttonText: text });
      } else if (target.hasAttribute('download')) {
        sendEvent('button_click', 'Document Download: ' + (target.getAttribute('download') || text), { href });
      } else if (target.classList.contains('program-inquiry-button') || target.dataset.program) {
        sendEvent('button_click', 'Program Inquiry Open', { program: target.dataset.program || text, buttonText: text });
      } else if (target.classList.contains('event-signup-button') || target.dataset.event) {
        sendEvent('button_click', 'Volunteer Interest Open', { eventName: target.dataset.event || text, buttonText: text });
      } else if (target.id === 'sharePageButton' || target.closest('#sharePageButton')) {
        sendEvent('button_click', 'Share Page Trigger', { buttonText: 'Share Page' });
      } else if (target.id === 'openPrivacyModal') {
        sendEvent('button_click', 'Privacy Policy View', { buttonText: text });
      } else if (target.classList.contains('btn-cta') || target.classList.contains('btn-secondary')) {
        sendEvent('button_click', 'CTA Click: ' + text, { buttonText: text, href });
      }
    }, true);

    // Track FAQ accordion interaction
    document.querySelectorAll('.faq-item').forEach((item) => {
      item.addEventListener('toggle', () => {
        if (item.open) {
          const questionText = (item.querySelector('.faq-question span')?.textContent || '').trim();
          sendEvent('faq_expand', 'FAQ: ' + questionText);
        }
      });
    });
  });
})();
