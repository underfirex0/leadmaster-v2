'use client'

import { useState, useEffect, useRef, RefObject } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import {
  ArrowRight, Check, ChevronDown, X, Menu, Lock,
  Phone, Mail, User, Building2, Users2, DollarSign,
  Target, MapPin, ShieldCheck, Search, Filter, Download
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════
   LeadMaster — Landing 3.0
   Majorelle night → warm paper · Bricolage Grotesque · DM Mono
   Signature: the self-unlocking company card
═══════════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Mono:wght@400;500&display=swap');

:root {
  --paper:      #FBFAF6;
  --paper-2:    #F4F2EA;
  --sable:      #EDE8DC;
  --ink:        #12111F;
  --ink-2:      #45445C;
  --ink-3:      #77768C;
  --night:      #14123A;
  --night-2:    #1C1950;
  --majorelle:  #4F46E5;
  --maj-hot:    #6D64FF;
  --maj-soft:   #B9B4FF;
  --mint:       #0FA37F;
  --gold:       #D9A036;
  --line:       rgba(18,17,31,0.09);
  --line-night: rgba(255,255,255,0.10);
  --font-disp:  'Bricolage Grotesque', 'Inter', sans-serif;
  --font-body:  'Inter', system-ui, sans-serif;
  --font-mono:  'DM Mono', ui-monospace, monospace;
  --ease:       cubic-bezier(0.22, 1, 0.36, 1);
}

.lm { font-family: var(--font-body); background: var(--paper); color: var(--ink); overflow-x: clip; }
.lm *, .lm *::before, .lm *::after { box-sizing: border-box; }
.lm ::selection { background: var(--majorelle); color: #fff; }

/* ── Reveal system ── */
.lm-reveal { opacity: 0; transform: translateY(26px); transition: opacity .9s var(--ease), transform .9s var(--ease); }
.lm-reveal.on { opacity: 1; transform: none; }
.lm-reveal[data-d="1"] { transition-delay: .08s; }
.lm-reveal[data-d="2"] { transition-delay: .16s; }
.lm-reveal[data-d="3"] { transition-delay: .24s; }
.lm-reveal[data-d="4"] { transition-delay: .32s; }

/* ── Nav ── */
.lm-nav { position: fixed; inset: 0 0 auto 0; z-index: 60; padding: 14px 20px 0; }
.lm-nav-pill {
  max-width: 1140px; margin: 0 auto; height: 56px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 10px 0 18px; border-radius: 999px;
  background: rgba(251,250,246,0.86); backdrop-filter: blur(16px);
  border: 1px solid var(--line);
  box-shadow: 0 6px 30px rgba(18,17,31,0.08);
  transition: box-shadow .3s var(--ease);
}
.lm-nav-links { display: flex; gap: 2px; }
.lm-nav-links a {
  font-size: 13.5px; font-weight: 500; color: var(--ink-2);
  padding: 8px 14px; border-radius: 999px; text-decoration: none;
  transition: background .18s, color .18s;
}
.lm-nav-links a:hover { background: var(--paper-2); color: var(--ink); }
.lm-logo { display: flex; align-items: center; gap: 9px; text-decoration: none; }
.lm-logo-mark {
  width: 28px; height: 28px; border-radius: 9px; background: var(--majorelle);
  display: grid; place-items: center; color: #fff;
}
.lm-logo span { font-family: var(--font-disp); font-weight: 700; font-size: 16px; letter-spacing: -0.3px; color: var(--ink); }

/* ── Buttons ── */
.lm-btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 600; text-decoration: none;
  border-radius: 999px; padding: 12px 22px; cursor: pointer; border: 0;
  transition: transform .2s var(--ease), box-shadow .2s var(--ease), background .2s;
}
.lm-btn:active { transform: scale(0.97); }
.lm-btn-primary { background: var(--majorelle); color: #fff; box-shadow: 0 6px 22px rgba(79,70,229,0.35); }
.lm-btn-primary:hover { background: #4238d6; transform: translateY(-1px); box-shadow: 0 10px 30px rgba(79,70,229,0.42); }
.lm-btn-ghost-dark { background: rgba(255,255,255,0.07); color: #fff; border: 1px solid var(--line-night); }
.lm-btn-ghost-dark:hover { background: rgba(255,255,255,0.13); }
.lm-btn-ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
.lm-btn-ghost:hover { background: var(--paper-2); }
.lm-btn-sm { padding: 9px 16px; font-size: 13px; }

/* ── Hero ── */
.lm-hero {
  position: relative; background: var(--night); color: #fff;
  padding: 168px 24px 120px; overflow: clip;
}
.lm-hero::before {
  content: ''; position: absolute; inset: 0; opacity: .5; pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg width='84' height='84' viewBox='0 0 84 84' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M42 30l3.5 8.5L54 42l-8.5 3.5L42 54l-3.5-8.5L30 42l8.5-3.5z' fill='%236D64FF' fill-opacity='0.10'/%3E%3C/svg%3E");
}
.lm-hero::after {
  content: ''; position: absolute; inset: auto -20% -55% -20%; height: 75%;
  background: radial-gradient(ellipse at center, rgba(109,100,255,0.34), transparent 65%);
  pointer-events: none;
}
.lm-hero-inner {
  position: relative; max-width: 1140px; margin: 0 auto;
  display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 64px; align-items: center;
}
.lm-eyebrow {
  display: inline-flex; align-items: center; gap: 9px;
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 2.5px;
  text-transform: uppercase; color: var(--maj-soft);
}
.lm-hero h1 {
  font-family: var(--font-disp);
  font-size: clamp(42px, 5.6vw, 74px);
  font-weight: 700; line-height: 1.02; letter-spacing: -2.2px;
  margin: 22px 0 0;
}
.lm-hero .lm-odometer {
  font-family: var(--font-mono); font-weight: 500;
  color: var(--maj-hot); font-variant-numeric: tabular-nums;
  display: inline-block; min-width: 5.6ch;
}
.lm-hero-sub {
  margin-top: 24px; max-width: 480px;
  font-size: 16.5px; line-height: 1.7; color: rgba(255,255,255,0.68);
}
.lm-hero-ctas { display: flex; gap: 12px; margin-top: 36px; flex-wrap: wrap; }
.lm-hero-meta {
  display: flex; gap: 26px; margin-top: 44px; flex-wrap: wrap;
}
.lm-hero-meta div { display: flex; flex-direction: column; gap: 3px; }
.lm-hero-meta b { font-family: var(--font-mono); font-size: 17px; font-weight: 500; color: #fff; }
.lm-hero-meta span { font-size: 12px; color: rgba(255,255,255,0.45); }

/* ── Unlock card (signature) ── */
.lm-card {
  position: relative; background: #fff; color: var(--ink);
  border-radius: 24px; padding: 24px;
  box-shadow: 0 30px 80px rgba(8,6,40,0.55), 0 2px 0 rgba(255,255,255,0.08) inset;
  animation: lm-float 7s ease-in-out infinite;
}
@keyframes lm-float { 0%,100% { transform: translateY(0) rotate(-0.4deg); } 50% { transform: translateY(-12px) rotate(0.4deg); } }
.lm-card-head { display: flex; align-items: flex-start; gap: 13px; }
.lm-card-avatar {
  width: 44px; height: 44px; border-radius: 13px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--majorelle), var(--maj-hot));
  color: #fff; display: grid; place-items: center;
  font-family: var(--font-disp); font-weight: 700; font-size: 15px;
}
.lm-card-head h3 { margin: 0; font-size: 15.5px; font-weight: 700; letter-spacing: -0.2px; }
.lm-card-head p { margin: 3px 0 0; font-size: 12px; color: var(--ink-3); display: flex; align-items: center; gap: 5px; }
.lm-chip-verified {
  margin-left: auto; display: inline-flex; align-items: center; gap: 5px;
  font-size: 10.5px; font-weight: 700; color: var(--mint);
  background: rgba(15,163,127,0.10); border: 1px solid rgba(15,163,127,0.25);
  border-radius: 999px; padding: 4px 9px; white-space: nowrap;
}
.lm-fields { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.lm-field {
  position: relative; border: 1px solid var(--line); border-radius: 13px;
  padding: 10px 12px; min-height: 58px; overflow: hidden;
  transition: border-color .5s var(--ease), background .5s var(--ease);
}
.lm-field .lm-field-label {
  display: flex; align-items: center; gap: 5px;
  font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--ink-3);
}
.lm-field .lm-field-locked, .lm-field .lm-field-value {
  margin-top: 5px; font-size: 12.5px; transition: opacity .45s var(--ease), transform .45s var(--ease);
}
.lm-field .lm-field-locked { display: flex; align-items: center; gap: 6px; color: var(--ink-3); }
.lm-field .lm-field-locked i {
  font-style: normal; filter: blur(4.5px); user-select: none; letter-spacing: 1px;
}
.lm-field .lm-field-value {
  position: absolute; left: 12px; right: 12px; bottom: 10px;
  font-weight: 600; color: var(--ink); opacity: 0; transform: translateY(8px);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lm-field.unlocked { border-color: rgba(15,163,127,0.45); background: rgba(15,163,127,0.045); }
.lm-field.unlocked .lm-field-locked { opacity: 0; transform: translateY(-8px); }
.lm-field.unlocked .lm-field-value { opacity: 1; transform: none; }
.lm-field .lm-cost-pop {
  position: absolute; top: 8px; right: 10px;
  font-family: var(--font-mono); font-size: 10.5px; font-weight: 500; color: var(--majorelle);
  opacity: 0; transform: translateY(4px);
}
.lm-field.unlocked .lm-cost-pop { animation: lm-pop 1.6s var(--ease) forwards; }
@keyframes lm-pop { 0% {opacity:0; transform:translateY(6px);} 18% {opacity:1; transform:none;} 75% {opacity:1;} 100% {opacity:0; transform:translateY(-8px);} }
.lm-card-foot {
  margin-top: 18px; padding-top: 15px; border-top: 1px dashed var(--line);
  display: flex; align-items: center; justify-content: space-between;
}
.lm-card-credits { font-family: var(--font-mono); font-size: 12.5px; color: var(--ink-2); }
.lm-card-credits b { color: var(--majorelle); font-weight: 500; font-variant-numeric: tabular-nums; }
.lm-card-cta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 700; color: #fff; background: var(--ink);
  border-radius: 999px; padding: 8px 14px;
  opacity: 0; transform: translateY(6px); transition: opacity .5s var(--ease), transform .5s var(--ease);
}
.lm-card-cta.show { opacity: 1; transform: none; }

/* ── Ticker ── */
.lm-ticker { background: var(--night); padding: 0 0 0; overflow: hidden; border-top: 1px solid var(--line-night); }
.lm-ticker-track {
  display: flex; gap: 10px; width: max-content; padding: 18px 0;
  animation: lm-marquee 46s linear infinite;
}
.lm-ticker:hover .lm-ticker-track { animation-play-state: paused; }
@keyframes lm-marquee { to { transform: translateX(-50%); } }
.lm-tick {
  display: inline-flex; align-items: center; gap: 8px; white-space: nowrap;
  font-family: var(--font-mono); font-size: 12px; color: rgba(255,255,255,0.55);
  border: 1px solid var(--line-night); border-radius: 999px; padding: 8px 15px;
}
.lm-tick b { color: var(--maj-soft); font-weight: 500; }

/* ── Sections ── */
.lm-section { padding: 110px 24px; }
.lm-wrap { max-width: 1140px; margin: 0 auto; }
.lm-kicker {
  display: inline-flex; align-items: center; gap: 9px;
  font-family: var(--font-mono); font-size: 11.5px; letter-spacing: 2.5px;
  text-transform: uppercase; color: var(--majorelle);
}
.lm-h2 {
  font-family: var(--font-disp); font-size: clamp(32px, 4vw, 50px);
  font-weight: 700; letter-spacing: -1.6px; line-height: 1.06; margin: 16px 0 0;
}
.lm-lead { font-size: 16px; line-height: 1.7; color: var(--ink-2); max-width: 560px; margin-top: 18px; }

/* ── Steps ── */
.lm-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 64px; }
.lm-step {
  background: #fff; border: 1px solid var(--line); border-radius: 22px;
  padding: 28px 26px 26px; position: relative;
  transition: transform .35s var(--ease), box-shadow .35s var(--ease);
}
.lm-step:hover { transform: translateY(-6px); box-shadow: 0 24px 50px rgba(18,17,31,0.10); }
.lm-step-num {
  font-family: var(--font-mono); font-size: 12px; color: var(--majorelle);
  letter-spacing: 2px;
}
.lm-step h3 { font-family: var(--font-disp); font-size: 21px; font-weight: 700; letter-spacing: -0.5px; margin: 14px 0 10px; }
.lm-step p { font-size: 14px; line-height: 1.65; color: var(--ink-2); margin: 0; }
.lm-step-visual {
  margin-top: 22px; background: var(--paper); border: 1px solid var(--line);
  border-radius: 14px; padding: 14px; font-size: 12px;
}
.lm-mini-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 4px; border-bottom: 1px dashed var(--line); }
.lm-mini-row:last-child { border-bottom: 0; }
.lm-mini-row span { display: flex; align-items: center; gap: 7px; color: var(--ink-2); font-weight: 500; }
.lm-mini-row b { font-family: var(--font-mono); font-weight: 500; color: var(--ink-3); font-size: 11.5px; }
.lm-mini-count { font-family: var(--font-mono); color: var(--majorelle) !important; }
.lm-mini-status { font-size: 10px; font-weight: 700; border-radius: 999px; padding: 3px 8px; }

/* ── Data menu (tarif) ── */
.lm-menu-grid { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 64px; align-items: center; margin-top: 8px; }
.lm-menu {
  background: var(--night); color: #fff; border-radius: 26px; padding: 36px 34px;
  position: relative; overflow: hidden;
}
.lm-menu::before {
  content: ''; position: absolute; inset: -40% -40% auto auto; width: 70%; height: 120%;
  background: radial-gradient(ellipse, rgba(109,100,255,0.28), transparent 70%);
}
.lm-menu h3 {
  position: relative; font-family: var(--font-disp); font-size: 15px; font-weight: 600;
  letter-spacing: 2.5px; text-transform: uppercase; color: var(--maj-soft);
  margin: 0 0 22px; text-align: center;
}
.lm-menu-row {
  position: relative; display: flex; align-items: baseline; gap: 10px;
  padding: 11px 0; font-size: 14px;
}
.lm-menu-row .dots { flex: 1; border-bottom: 1.5px dotted rgba(255,255,255,0.22); transform: translateY(-4px); }
.lm-menu-row b { font-family: var(--font-mono); font-weight: 500; color: var(--maj-hot); white-space: nowrap; }
.lm-menu-note {
  position: relative; margin-top: 22px; padding-top: 18px;
  border-top: 1px solid var(--line-night);
  font-size: 12.5px; line-height: 1.65; color: rgba(255,255,255,0.55); text-align: center;
}
.lm-menu-note b { color: var(--mint); font-weight: 600; }

/* ── Guarantee band ── */
.lm-band {
  background: linear-gradient(120deg, var(--majorelle), var(--maj-hot));
  border-radius: 28px; padding: 56px 48px; color: #fff;
  display: flex; align-items: center; justify-content: space-between; gap: 40px;
  box-shadow: 0 30px 70px rgba(79,70,229,0.35);
}
.lm-band h2 { font-family: var(--font-disp); font-size: clamp(26px, 3.2vw, 40px); font-weight: 700; letter-spacing: -1.2px; margin: 0; line-height: 1.1; }
.lm-band p { margin: 12px 0 0; font-size: 15px; color: rgba(255,255,255,0.82); max-width: 480px; line-height: 1.65; }
.lm-band .lm-btn { background: #fff; color: var(--majorelle); flex-shrink: 0; }
.lm-band .lm-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.2); }

/* ── Pricing ── */
.lm-plans { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 60px; }
.lm-plan {
  background: #fff; border: 1px solid var(--line); border-radius: 22px; padding: 28px 24px;
  display: flex; flex-direction: column;
  transition: transform .35s var(--ease), box-shadow .35s var(--ease), border-color .35s;
}
.lm-plan:hover { transform: translateY(-6px); box-shadow: 0 24px 50px rgba(18,17,31,0.10); }
.lm-plan.hot { border-color: var(--majorelle); box-shadow: 0 20px 50px rgba(79,70,229,0.18); position: relative; }
.lm-plan-badge {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  font-size: 10.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  background: var(--majorelle); color: #fff; border-radius: 999px; padding: 5px 13px;
}
.lm-plan h3 { font-family: var(--font-disp); font-size: 17px; font-weight: 700; margin: 0; }
.lm-plan-price { margin-top: 16px; display: flex; align-items: baseline; gap: 5px; }
.lm-plan-price b { font-family: var(--font-mono); font-size: 34px; font-weight: 500; letter-spacing: -1px; }
.lm-plan-price span { font-size: 12.5px; color: var(--ink-3); }
.lm-plan-credits {
  margin-top: 6px; font-family: var(--font-mono); font-size: 12.5px; color: var(--majorelle);
}
.lm-plan ul { margin: 20px 0 24px; padding: 0; list-style: none; display: grid; gap: 9px; flex: 1; }
.lm-plan li { display: flex; gap: 8px; font-size: 13px; color: var(--ink-2); line-height: 1.45; }
.lm-plan li svg { flex-shrink: 0; margin-top: 2px; color: var(--mint); }

/* ── FAQ ── */
.lm-faq { max-width: 720px; margin: 56px auto 0; display: grid; gap: 10px; }
.lm-faq-item { background: #fff; border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
.lm-faq-q {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  background: none; border: 0; cursor: pointer; text-align: left;
  padding: 19px 22px; font-size: 15px; font-weight: 600; color: var(--ink);
  font-family: var(--font-body);
}
.lm-faq-q svg { flex-shrink: 0; transition: transform .3s var(--ease); color: var(--ink-3); }
.lm-faq-item.open .lm-faq-q svg { transform: rotate(180deg); }
.lm-faq-a {
  max-height: 0; overflow: hidden; transition: max-height .45s var(--ease);
}
.lm-faq-a p { margin: 0; padding: 0 22px 20px; font-size: 14px; line-height: 1.7; color: var(--ink-2); }
.lm-faq-item.open .lm-faq-a { max-height: 220px; }

/* ── Final CTA ── */
.lm-final {
  background: var(--night); color: #fff; border-radius: 32px;
  padding: 90px 48px; text-align: center; position: relative; overflow: hidden;
}
.lm-final::before {
  content: ''; position: absolute; inset: 0; opacity: .45;
  background-image: url("data:image/svg+xml,%3Csvg width='84' height='84' viewBox='0 0 84 84' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M42 30l3.5 8.5L54 42l-8.5 3.5L42 54l-3.5-8.5L30 42l8.5-3.5z' fill='%236D64FF' fill-opacity='0.12'/%3E%3C/svg%3E");
}
.lm-final::after {
  content: ''; position: absolute; inset: auto -30% -70% -30%; height: 100%;
  background: radial-gradient(ellipse, rgba(109,100,255,0.4), transparent 65%);
}
.lm-final > * { position: relative; z-index: 1; }
.lm-final h2 { font-family: var(--font-disp); font-size: clamp(34px, 4.6vw, 58px); font-weight: 700; letter-spacing: -1.8px; margin: 0; line-height: 1.05; }
.lm-final p { margin: 18px auto 0; font-size: 16px; color: rgba(255,255,255,0.65); max-width: 460px; line-height: 1.7; }

/* ── Footer ── */
.lm-footer { padding: 56px 24px 40px; border-top: 1px solid var(--line); }
.lm-footer-inner { max-width: 1140px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.lm-footer-links { display: flex; gap: 24px; flex-wrap: wrap; }
.lm-footer-links a { font-size: 13px; color: var(--ink-3); text-decoration: none; }
.lm-footer-links a:hover { color: var(--ink); }
.lm-footer small { font-size: 12px; color: var(--ink-4, #9a9a9a); font-family: var(--font-mono); }

/* ── Mobile ── */
.lm-mobile-menu {
  margin: 8px auto 0; max-width: 1140px; background: #fff; border: 1px solid var(--line);
  border-radius: 20px; padding: 12px; box-shadow: 0 16px 50px rgba(18,17,31,0.14);
  display: grid; gap: 2px;
}
.lm-mobile-menu a {
  padding: 13px 16px; border-radius: 12px; font-size: 14.5px; font-weight: 500;
  color: var(--ink); text-decoration: none;
}
.lm-mobile-menu a:hover { background: var(--paper-2); }

@media (max-width: 1000px) {
  .lm-hero-inner { grid-template-columns: 1fr; gap: 56px; }
  .lm-hero { padding: 140px 20px 90px; }
  .lm-steps { grid-template-columns: 1fr; }
  .lm-menu-grid { grid-template-columns: 1fr; gap: 40px; }
  .lm-plans { grid-template-columns: repeat(2, 1fr); }
  .lm-band { flex-direction: column; align-items: flex-start; padding: 44px 32px; }
}
@media (max-width: 620px) {
  .lm-plans { grid-template-columns: 1fr; }
  .lm-fields { grid-template-columns: 1fr; }
  .lm-section { padding: 80px 20px; }
  .lm-final { padding: 70px 24px; border-radius: 24px; }
  .lm-nav-links { display: none; }
  .lm-nav-cta-desktop { display: none !important; }
}
@media (min-width: 621px) {
  .lm-nav-burger { display: none !important; }
}

@media (prefers-reduced-motion: reduce) {
  .lm *, .lm *::before, .lm *::after { animation: none !important; transition-duration: .01ms !important; }
  .lm-reveal { opacity: 1; transform: none; }
}
`

/* ─── Zellige 8-point star ornament ──────────────────────── */
function Star8({ size = 12, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill={color} />
    </svg>
  )
}

/* ─── Scroll reveal ──────────────────────────────────────── */
function useReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>('.lm-reveal'))
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach(el => el.classList.add('on')); return
    }
    const io = new IntersectionObserver(
      es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target) } }),
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    items.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [ref])
}

/* ─── Navigation ─────────────────────────────────────────── */
function Nav() {
  const [open, setOpen] = useState(false)
  const links = [
    { label: 'Fonctionnalités', href: '#fonctionnement' },
    { label: 'Données',         href: '#donnees' },
    { label: 'Tarifs',          href: '#tarifs' },
    { label: 'FAQ',             href: '#faq' },
  ]
  return (
    <nav className="lm-nav">
      <div className="lm-nav-pill">
        <Link href="/" className="lm-logo" aria-label="LeadMaster">
          <span className="lm-logo-mark"><Target size={14} /></span>
          <span>LeadMaster</span>
        </Link>
        <div className="lm-nav-links">
          {links.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/login" className="lm-nav-cta-desktop" style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-2)', textDecoration: 'none', padding: '8px 12px' }}>
            Se connecter
          </Link>
          <Link href="/register" className="lm-btn lm-btn-primary lm-btn-sm">
            Commencer <ArrowRight size={14} />
          </Link>
          <button
            className="lm-nav-burger"
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            style={{ background: 'none', border: 0, padding: 8, cursor: 'pointer', color: 'var(--ink)' }}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lm-mobile-menu">
          {links.map(l => <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>)}
          <a href="/login" onClick={() => setOpen(false)}>Se connecter</a>
        </div>
      )}
    </nav>
  )
}

/* ─── The signature: self-unlocking company card ─────────── */
const CARD_FIELDS = [
  { key: 'phone',    label: 'Téléphone',  icon: Phone,     blur: '05 •• •• •• ••',      value: '05 22 46 18 30',          cost: 1 },
  { key: 'email',    label: 'E-mail',     icon: Mail,      blur: '•••••@••••••••.ma',    value: 'contact@atlasplast.ma',   cost: 1 },
  { key: 'director', label: 'Dirigeant',  icon: User,      blur: 'M. •••••• ••••••',     value: 'M. Benali Karim',         cost: 2 },
  { key: 'ice',      label: 'ICE',        icon: Building2, blur: '00••••••••••••',       value: '002481937000042',         cost: 2 },
  { key: 'effectif', label: 'Effectif',   icon: Users2,    blur: 'De •• à •• salariés',  value: 'De 50 à 99 salariés',     cost: 2 },
  { key: 'capital',  label: 'Capital',    icon: DollarSign,blur: '• ••• ••• MAD',        value: '2 400 000 MAD',           cost: 5 },
]
const CARD_TOTAL = CARD_FIELDS.reduce((s, f) => s + f.cost, 0)

function UnlockCard() {
  const [step, setStep] = useState(0) // 0 = all locked … 6 = all unlocked
  const [credits, setCredits] = useState(250)

  useEffect(() => {
    const reduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { setStep(CARD_FIELDS.length); setCredits(250 - CARD_TOTAL); return }

    let i = 0
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      if (i < CARD_FIELDS.length) {
        const cost = CARD_FIELDS[i].cost
        i += 1
        setStep(i)
        setCredits(c => c - cost)
        timer = setTimeout(tick, 1250)
      } else {
        // hold complete state, then reset
        timer = setTimeout(() => {
          i = 0
          setStep(0)
          setCredits(250)
          timer = setTimeout(tick, 1100)
        }, 3600)
      }
    }
    timer = setTimeout(tick, 1600)
    return () => clearTimeout(timer)
  }, [])

  const done = step >= CARD_FIELDS.length

  return (
    <div className="lm-card" aria-hidden="true">
      <div className="lm-card-head">
        <div className="lm-card-avatar">AP</div>
        <div>
          <h3>Atlas Plast S.a.r.l.</h3>
          <p><MapPin size={11} /> Casablanca · Industrie &amp; production</p>
        </div>
        <span className="lm-chip-verified"><ShieldCheck size={11} /> Vérifiée</span>
      </div>

      <div className="lm-fields">
        {CARD_FIELDS.map((f, i) => {
          const Icon = f.icon
          return (
            <div key={f.key} className={`lm-field${i < step ? ' unlocked' : ''}`}>
              <span className="lm-field-label"><Icon size={10} /> {f.label}</span>
              <span className="lm-field-locked"><Lock size={11} /> <i>{f.blur}</i></span>
              <span className="lm-field-value">{f.value}</span>
              <span className="lm-cost-pop">−{f.cost} cr</span>
            </div>
          )
        })}
      </div>

      <div className="lm-card-foot">
        <span className="lm-card-credits">Solde · <b>{credits.toLocaleString('fr-FR')} cr</b></span>
        <span className={`lm-card-cta${done ? ' show' : ''}`}>
          <Users2 size={12} /> Injecter → CRM
        </span>
      </div>
    </div>
  )
}

/* ─── Hero ───────────────────────────────────────────────── */
function Hero() {
  const numRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = numRef.current
    if (!el) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { el.textContent = (53586).toLocaleString('fr-FR'); return }

    const counter = { v: 0 }
    const tween = gsap.to(counter, {
      v: 53586,
      duration: 2.4,
      ease: 'power4.out',
      delay: 0.35,
      onUpdate: () => { el.textContent = Math.round(counter.v).toLocaleString('fr-FR') },
    })
    return () => { tween.kill() }
  }, [])

  return (
    <header className="lm-hero">
      <div className="lm-hero-inner">
        <div>
          <span className="lm-eyebrow lm-reveal on">
            <Star8 size={11} color="var(--maj-hot)" /> Données B2B · Maroc
          </span>
          <h1>
            <span className="lm-odometer" ref={numRef}>0</span> entreprises marocaines.<br />
            Débloquées.
          </h1>
          <p className="lm-hero-sub">
            Ciblez par secteur, ville, effectif et capital. Débloquez uniquement
            les données dont vous avez besoin — téléphone, e-mail, dirigeant, ICE —
            et payez au champ près.
          </p>
          <div className="lm-hero-ctas">
            <Link href="/register" className="lm-btn lm-btn-primary">
              Commencer — 100 entreprises offertes <ArrowRight size={15} />
            </Link>
            <a href="#tarifs" className="lm-btn lm-btn-ghost-dark">Voir les tarifs</a>
          </div>
          <div className="lm-hero-meta">
            <div><b>1 100+</b><span>secteurs d’activité</span></div>
            <div><b>250+</b><span>villes couvertes</span></div>
            <div><b>0 cr</b><span>si la donnée n’existe pas</span></div>
          </div>
        </div>
        <UnlockCard />
      </div>
    </header>
  )
}

/* ─── Live data ticker ───────────────────────────────────── */
const TICKS = [
  ['Commerce & distribution', '10 054'],
  ['Industrie & production',  '5 445'],
  ['BTP & Matériaux',         '5 212'],
  ['Automobile & transports', '4 574'],
  ['Hôtellerie & Loisirs',    '2 942'],
  ['Artisanat & Production',  '2 731'],
  ['Santé & bien-être',       '2 624'],
  ['Marketing & Médias',      '2 437'],
  ['Immobilier & Habitat',    '1 851'],
  ['Agriculture & Agro',      '1 690'],
  ['Juridique & Conseil',     '1 400'],
  ['Culture & divertissement','1 021'],
]

function Ticker() {
  const row = (k: string) => (
    <div style={{ display: 'flex', gap: 10 }} key={k}>
      {TICKS.map(([label, n]) => (
        <span className="lm-tick" key={`${k}-${label}`}>
          <Star8 size={8} color="var(--maj-hot)" /> {label} — <b>{n}</b>
        </span>
      ))}
    </div>
  )
  return (
    <div className="lm-ticker" aria-hidden="true">
      <div className="lm-ticker-track">{row('a')}{row('b')}</div>
    </div>
  )
}

/* ─── Comment ça marche (real sequence → numbers justified) ─ */
function Steps() {
  return (
    <section className="lm-section" id="fonctionnement" style={{ background: 'var(--paper)' }}>
      <div className="lm-wrap">
        <span className="lm-kicker lm-reveal"><Star8 size={10} /> Comment ça marche</span>
        <h2 className="lm-h2 lm-reveal" data-d="1">Du ciblage au client,<br />en trois gestes.</h2>

        <div className="lm-steps">
          {/* 01 — Ciblez */}
          <article className="lm-step lm-reveal" data-d="1">
            <span className="lm-step-num">01</span>
            <h3>Ciblez</h3>
            <p>
              Parcourez l’arborescence complète des secteurs marocains.
              Filtrez par ville, effectif, capital — le compteur se met à jour en direct.
            </p>
            <div className="lm-step-visual">
              <div className="lm-mini-row">
                <span><Search size={12} /> Hôtellerie &amp; Loisirs</span>
                <b className="lm-mini-count">2 942</b>
              </div>
              <div className="lm-mini-row">
                <span><Filter size={12} /> Ville · Marrakech</span>
                <b className="lm-mini-count">418</b>
              </div>
              <div className="lm-mini-row">
                <span><Users2 size={12} /> De 20 à 49 salariés</span>
                <b className="lm-mini-count">96</b>
              </div>
            </div>
          </article>

          {/* 02 — Débloquez */}
          <article className="lm-step lm-reveal" data-d="2">
            <span className="lm-step-num">02</span>
            <h3>Débloquez</h3>
            <p>
              Choisissez vos champs — téléphone, e-mail, dirigeant, ICE, capital.
              Le coût est intelligent : une donnée absente ne coûte rien.
            </p>
            <div className="lm-step-visual">
              <div className="lm-mini-row">
                <span><Phone size={12} /> Téléphone · 96/96</span>
                <b>96 cr</b>
              </div>
              <div className="lm-mini-row">
                <span><Mail size={12} /> E-mail · 71/96</span>
                <b>71 cr</b>
              </div>
              <div className="lm-mini-row">
                <span><User size={12} /> Dirigeant · 88/96</span>
                <b>176 cr</b>
              </div>
            </div>
          </article>

          {/* 03 — Convertissez */}
          <article className="lm-step lm-reveal" data-d="3">
            <span className="lm-step-num">03</span>
            <h3>Convertissez</h3>
            <p>
              Injectez vos entreprises dans le CRM intégré : statuts, notes,
              rappels, appel en un clic. Exportez en CSV quand vous voulez.
            </p>
            <div className="lm-step-visual">
              <div className="lm-mini-row">
                <span>Riad Zaytoun</span>
                <b className="lm-mini-status" style={{ color: '#1d4ed8', background: '#dbeafe' }}>À appeler</b>
              </div>
              <div className="lm-mini-row">
                <span>Palmeraie Events</span>
                <b className="lm-mini-status" style={{ color: '#b45309', background: '#fef3c7' }}>À rappeler</b>
              </div>
              <div className="lm-mini-row">
                <span>Dar Kasbah Hotels</span>
                <b className="lm-mini-status" style={{ color: '#047857', background: '#d1fae5' }}>Converti ✓</b>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

/* ─── Le menu des données (tarif au champ) ───────────────── */
const MENU = [
  ['Profil de base', '1 cr'],
  ['Téléphone',      '+1 cr'],
  ['E-mail',         '+1 cr'],
  ['Adresse + GPS',  '+1 cr'],
  ['Site web',       '+1 cr'],
  ['ICE + RC',       '+2 cr'],
  ['Année de création', '+2 cr'],
  ['Nom du dirigeant',  '+2 cr'],
  ['Effectif',          '+2 cr'],
  ['Capital social',    '+5 cr'],
]

function DataMenu() {
  return (
    <section className="lm-section" id="donnees" style={{ background: 'var(--sable)' }}>
      <div className="lm-wrap">
        <div className="lm-menu-grid">
          <div>
            <span className="lm-kicker lm-reveal"><Star8 size={10} /> Tarification au champ</span>
            <h2 className="lm-h2 lm-reveal" data-d="1">Payez la donnée.<br />Pas la promesse.</h2>
            <p className="lm-lead lm-reveal" data-d="2">
              Chaque champ a un prix, affiché avant de débloquer. Le coût réel est
              calculé entreprise par entreprise : si le téléphone n’existe pas
              dans notre base, il ne vous est jamais facturé. Et si une donnée
              s’avère fausse, vous la signalez depuis le CRM — elle est remboursée.
            </p>
            <div className="lm-hero-ctas lm-reveal" data-d="3" style={{ marginTop: 30 }}>
              <Link href="/register" className="lm-btn lm-btn-primary">
                Essayer sur 100 entreprises <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="lm-menu lm-reveal" data-d="2">
            <h3>— Menu des données —</h3>
            {MENU.map(([label, price]) => (
              <div className="lm-menu-row" key={label}>
                <span>{label}</span>
                <span className="dots" />
                <b>{price}</b>
              </div>
            ))}
            <p className="lm-menu-note">
              Donnée absente = <b>0 crédit</b>. Donnée fausse = <b>remboursée</b>.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─── Garantie ───────────────────────────────────────────── */
function Guarantee() {
  return (
    <section className="lm-section" style={{ paddingTop: 90, paddingBottom: 90 }}>
      <div className="lm-wrap">
        <div className="lm-band lm-reveal">
          <div>
            <h2>Donnée fausse ?<br />Remboursée.</h2>
            <p>
              Numéro qui ne répond plus, entreprise fermée, dirigeant parti —
              signalez-le en un clic depuis votre CRM. Nous vérifions,
              nous remboursons vos crédits, et la base devient plus propre
              pour tout le monde.
            </p>
          </div>
          <Link href="/register" className="lm-btn">
            Prospecter sans risque <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─── Tarifs ─────────────────────────────────────────────── */
const PLANS = [
  {
    name: 'Découverte', price: '0', credits: '100 crédits offerts', hot: false,
    features: ['100 premières entreprises gratuites', 'Recherche multicritères complète', 'Export CSV', 'CRM intégré'],
    cta: 'Commencer gratuitement',
  },
  {
    name: 'Solo', price: '149', credits: '400 crédits / mois', hot: false,
    features: ['Tout Découverte', 'Déblocage champ par champ', 'Filtres effectif & capital', 'Signalement + remboursement'],
    cta: 'Choisir Solo',
  },
  {
    name: 'Équipe', price: '390', credits: '1 500 crédits / mois', hot: true,
    features: ['Tout Solo', 'Jusqu’à 3 utilisateurs', 'Recherches sauvegardées illimitées', 'Support prioritaire'],
    cta: 'Choisir Équipe',
  },
  {
    name: 'Business', price: '990', credits: '5 000 crédits / mois', hot: false,
    features: ['Tout Équipe', 'Jusqu’à 10 utilisateurs', 'Volumes de déblocage majorés', 'Accompagnement dédié'],
    cta: 'Choisir Business',
  },
]

function Pricing() {
  return (
    <section className="lm-section" id="tarifs" style={{ background: 'var(--paper)', paddingTop: 40 }}>
      <div className="lm-wrap">
        <div style={{ textAlign: 'center' }}>
          <span className="lm-kicker lm-reveal" style={{ justifyContent: 'center' }}>
            <Star8 size={10} /> Tarifs
          </span>
          <h2 className="lm-h2 lm-reveal" data-d="1">Des crédits, pas d’engagement.</h2>
          <p className="lm-lead lm-reveal" data-d="2" style={{ margin: '18px auto 0' }}>
            Commencez gratuitement sur 100 entreprises. Passez à un plan
            quand votre prospection décolle.
          </p>
        </div>

        <div className="lm-plans">
          {PLANS.map((p, i) => (
            <div className={`lm-plan lm-reveal${p.hot ? ' hot' : ''}`} data-d={String(i % 4)} key={p.name}>
              {p.hot && <span className="lm-plan-badge">Populaire</span>}
              <h3>{p.name}</h3>
              <div className="lm-plan-price">
                <b>{p.price}</b><span>MAD / mois</span>
              </div>
              <span className="lm-plan-credits">{p.credits}</span>
              <ul>
                {p.features.map(f => (
                  <li key={f}><Check size={13} /> {f}</li>
                ))}
              </ul>
              <Link href="/register" className={`lm-btn ${p.hot ? 'lm-btn-primary' : 'lm-btn-ghost'}`} style={{ justifyContent: 'center' }}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── FAQ ────────────────────────────────────────────────── */
const FAQS = [
  {
    q: 'D’où viennent les données ?',
    a: 'Notre base regroupe 53 586 entreprises marocaines actives, structurées par secteur, domaine et activité, avec plus de 25 champs par fiche : coordonnées, dirigeant, ICE, forme juridique, effectif, capital social et plus.',
  },
  {
    q: 'Comment fonctionne le coût « intelligent » ?',
    a: 'Avant chaque recherche, nous affichons le taux de couverture réel de chaque champ. Vous n’êtes facturé que pour les données qui existent : si l’e-mail d’une entreprise est absent de la base, il ne vous coûte rien.',
  },
  {
    q: 'Que se passe-t-il si une donnée est fausse ?',
    a: 'Vous la signalez en un clic depuis votre CRM (entreprise fermée, numéro incorrect, dirigeant parti…). Après vérification, l’intégralité des crédits dépensés sur cette entreprise vous est remboursée.',
  },
  {
    q: 'Les 100 entreprises offertes, c’est vraiment gratuit ?',
    a: 'Oui. À l’inscription, vos 100 premières entreprises en profil de base sont offertes, sans carte bancaire. C’est la meilleure façon de juger la qualité de la donnée avant d’investir.',
  },
  {
    q: 'Puis-je exporter mes données ?',
    a: 'Chaque recherche est exportable en CSV avec tous les champs débloqués. Vous pouvez aussi injecter les entreprises directement dans le CRM intégré pour piloter votre prospection.',
  },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="lm-section" id="faq" style={{ background: 'var(--paper)', paddingTop: 40 }}>
      <div className="lm-wrap">
        <div style={{ textAlign: 'center' }}>
          <span className="lm-kicker lm-reveal" style={{ justifyContent: 'center' }}>
            <Star8 size={10} /> FAQ
          </span>
          <h2 className="lm-h2 lm-reveal" data-d="1">Les questions qu’on nous pose.</h2>
        </div>
        <div className="lm-faq">
          {FAQS.map((f, i) => (
            <div className={`lm-faq-item lm-reveal${open === i ? ' open' : ''}`} key={f.q}>
              <button className="lm-faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {f.q} <ChevronDown size={16} />
              </button>
              <div className="lm-faq-a"><p>{f.a}</p></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─── Final CTA + Footer ─────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="lm-section" style={{ paddingTop: 20 }}>
      <div className="lm-wrap">
        <div className="lm-final lm-reveal">
          <span className="lm-eyebrow" style={{ justifyContent: 'center' }}>
            <Star8 size={11} color="var(--maj-hot)" /> Prêt en 2 minutes
          </span>
          <h2 style={{ marginTop: 18 }}>Votre prochain client<br />est déjà dans la base.</h2>
          <p>
            100 entreprises offertes à l’inscription. Sans carte bancaire,
            sans engagement — juste de la donnée marocaine, vérifiée.
          </p>
          <div style={{ marginTop: 34, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="lm-btn lm-btn-primary">
              Créer mon compte <ArrowRight size={15} />
            </Link>
            <a href="#donnees" className="lm-btn lm-btn-ghost-dark">
              <Download size={14} /> Voir le menu des données
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="lm-footer">
      <div className="lm-footer-inner">
        <Link href="/" className="lm-logo" aria-label="LeadMaster">
          <span className="lm-logo-mark"><Target size={14} /></span>
          <span>LeadMaster</span>
        </Link>
        <div className="lm-footer-links">
          <a href="#fonctionnement">Fonctionnalités</a>
          <a href="#donnees">Données</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#faq">FAQ</a>
          <Link href="/login">Se connecter</Link>
        </div>
        <small>© {new Date().getFullYear()} LeadMaster · Casablanca 🇲🇦</small>
      </div>
    </footer>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef)
  return (
    <div className="lm" ref={rootRef}>
      <style>{CSS}</style>
      <Nav />
      <Hero />
      <Ticker />
      <Steps />
      <DataMenu />
      <Guarantee />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
