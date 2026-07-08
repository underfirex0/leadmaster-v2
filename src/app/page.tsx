'use client'

import { useState, useEffect, useRef, RefObject } from 'react'
import Link from 'next/link'
import {
  Plus, Minus, Sparkles, ShieldCheck, HeartHandshake,
  Phone, Mail, User, Building2, Lock
} from 'lucide-react'

/* ═══════════════════════════════════════════════════════════
   LeadMaster — Landing (Liftoff aesthetic)
   Cream · Fraunces serif · Aurora gradients · Timeline layout
═══════════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --cream:      #F5F1E8;
  --cream-2:    #EFEADC;
  --ink:        #14120E;
  --ink-2:      #3B372F;
  --ink-3:      #6A655A;
  --ink-4:      #A09B8E;
  --line:       rgba(20,18,14,0.08);
  --line-2:     rgba(20,18,14,0.14);
  --peach:      #FFB88C;
  --coral:      #FF8B6B;
  --lavender:   #C7B8FF;
  --violet:     #8B7DFF;
  --sky:        #A8C8FF;
  --sun:        #FFD87A;
  --sage:       #B8D4B8;
  --font-serif: 'Fraunces', 'Times New Roman', serif;
  --font-sans:  'Inter', system-ui, sans-serif;
  --ease:       cubic-bezier(0.22, 1, 0.36, 1);
  --ease-soft:  cubic-bezier(0.16, 1, 0.3, 1);
}

.lm { font-family: var(--font-sans); background: var(--cream); color: var(--ink); overflow-x: clip; }
.lm *, .lm *::before, .lm *::after { box-sizing: border-box; }
.lm ::selection { background: var(--ink); color: var(--cream); }

/* ── Reveal ── */
.lm-reveal { opacity: 0; transform: translateY(24px); transition: opacity 1s var(--ease-soft), transform 1s var(--ease-soft); }
.lm-reveal.on { opacity: 1; transform: none; }
.lm-reveal[data-d="1"] { transition-delay: .08s; }
.lm-reveal[data-d="2"] { transition-delay: .16s; }
.lm-reveal[data-d="3"] { transition-delay: .24s; }
.lm-reveal[data-d="4"] { transition-delay: .32s; }
.lm-reveal[data-d="5"] { transition-delay: .40s; }

/* ── Aurora blobs (the signature) ── */
.aurora {
  position: absolute; pointer-events: none; border-radius: 50%;
  filter: blur(60px); opacity: 0.75;
  animation: aurora-drift 22s ease-in-out infinite;
}
@keyframes aurora-drift {
  0%,100% { transform: translate(0,0) scale(1); }
  33%     { transform: translate(20px,-30px) scale(1.06); }
  66%     { transform: translate(-25px,20px) scale(0.94); }
}

/* ── Nav ── */
.lm-nav {
  position: fixed; inset: 0 0 auto 0; z-index: 60;
  padding: 22px 40px 0;
  transition: padding .3s var(--ease);
}
.lm-nav.scrolled { padding: 12px 40px 0; }
.lm-nav-inner {
  max-width: 1180px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 20px 8px 8px;
  border-radius: 999px;
  background: rgba(245,241,232,0.92); backdrop-filter: blur(14px);
  border: 1px solid transparent;
  transition: border-color .3s var(--ease), box-shadow .3s var(--ease);
}
.lm-nav.scrolled .lm-nav-inner {
  border-color: var(--line);
  box-shadow: 0 8px 30px rgba(20,18,14,0.06);
}
.lm-logo {
  display: flex; align-items: center; gap: 2px;
  text-decoration: none; padding: 6px 10px;
}
.lm-logo b {
  font-family: var(--font-serif); font-weight: 500; font-size: 22px;
  letter-spacing: -0.5px; color: var(--ink); line-height: 1;
}
.lm-logo b span { font-style: italic; font-weight: 300; }
.lm-nav-links { display: flex; gap: 4px; }
.lm-nav-links a {
  font-size: 14px; font-weight: 500; color: var(--ink-2);
  padding: 8px 16px; border-radius: 999px; text-decoration: none;
  transition: background .18s;
}
.lm-nav-links a:hover { background: rgba(20,18,14,0.05); }
.lm-nav-right { display: flex; align-items: center; gap: 4px; }
.lm-nav-right .lm-login {
  font-size: 14px; font-weight: 500; color: var(--ink-2);
  padding: 8px 14px; text-decoration: none;
}
.lm-nav-right .lm-login:hover { color: var(--ink); }

/* ── Buttons ── */
.lm-btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-sans); font-size: 14.5px; font-weight: 500;
  text-decoration: none; border-radius: 999px; cursor: pointer; border: 0;
  transition: transform .2s var(--ease), background .2s;
}
.lm-btn:active { transform: scale(0.97); }
.lm-btn-dark { background: var(--ink); color: var(--cream); padding: 12px 22px; }
.lm-btn-dark:hover { background: #000; }
.lm-btn-dark-sm { padding: 9px 16px; font-size: 13.5px; }
.lm-btn-ghost { background: transparent; color: var(--ink); border: 1px solid var(--line-2); padding: 11px 21px; }
.lm-btn-ghost:hover { background: rgba(20,18,14,0.05); }
.lm-btn-cream { background: var(--cream); color: var(--ink); padding: 12px 22px; }
.lm-btn-cream:hover { background: #fff; }

/* ── Hero ── */
.lm-hero {
  position: relative; padding: 140px 24px 80px; text-align: center; overflow: hidden;
}
.lm-hero-inner { position: relative; max-width: 780px; margin: 0 auto; z-index: 2; }
.lm-hero h1 {
  font-family: var(--font-serif); font-weight: 400;
  font-size: clamp(38px, 5.4vw, 68px); line-height: 1.08; letter-spacing: -1.8px;
  margin: 0; color: var(--ink);
}
.lm-hero h1 em { font-style: italic; font-weight: 300; }
.lm-hero-sub {
  margin: 22px auto 0; max-width: 540px;
  font-size: 16px; line-height: 1.6; color: var(--ink-3);
}
.lm-hero-cta { margin-top: 32px; display: inline-flex; }

/* ── Floating card cluster (signature) ── */
.lm-cluster {
  position: relative; margin: 60px auto 0;
  height: 320px; max-width: 900px;
}
.lm-cluster-aurora {
  position: absolute; inset: 0;
  pointer-events: none;
}
.lm-cluster-aurora .aurora { animation-duration: 18s; }
.lm-cluster-aurora .a1 { top: 30%; left: 5%;  width: 220px; height: 220px; background: var(--peach); }
.lm-cluster-aurora .a2 { top: 10%; left: 30%; width: 260px; height: 260px; background: var(--coral); animation-delay: -3s; }
.lm-cluster-aurora .a3 { top: 20%; left: 50%; width: 240px; height: 240px; background: var(--sun); animation-delay: -6s; }
.lm-cluster-aurora .a4 { top: 10%; left: 65%; width: 260px; height: 260px; background: var(--lavender); animation-delay: -9s; }
.lm-cluster-aurora .a5 { top: 35%; left: 82%; width: 220px; height: 220px; background: var(--sky); animation-delay: -12s; }
.lm-pill {
  position: absolute; background: #fff; border-radius: 18px;
  padding: 12px 16px; display: flex; align-items: center; gap: 10px;
  box-shadow: 0 8px 30px rgba(20,18,14,0.10), 0 1px 3px rgba(20,18,14,0.04);
  border: 1px solid rgba(255,255,255,0.9);
  animation: pill-float 6s ease-in-out infinite;
  z-index: 3;
}
@keyframes pill-float {
  0%,100% { transform: translateY(0); }
  50%     { transform: translateY(-8px); }
}
.lm-pill-avatar {
  width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  display: grid; place-items: center; color: #fff;
  font-family: var(--font-serif); font-size: 13px; font-weight: 500;
}
.lm-pill-avatar.p1 { background: linear-gradient(135deg, #FF8B6B, #FFB88C); }
.lm-pill-avatar.p2 { background: linear-gradient(135deg, #8B7DFF, #C7B8FF); }
.lm-pill-avatar.p3 { background: linear-gradient(135deg, #FFD87A, #FF8B6B); }
.lm-pill-avatar.p4 { background: linear-gradient(135deg, #A8C8FF, #8B7DFF); }
.lm-pill-text { line-height: 1.3; }
.lm-pill-text b { font-size: 13px; font-weight: 600; display: block; color: var(--ink); }
.lm-pill-text span {
  font-size: 11.5px; color: var(--ink-3);
  display: flex; align-items: center; gap: 4px;
}
.lm-pill-text span em { font-style: normal; color: var(--ink); font-weight: 500; }
.lm-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.lm-dot.g { background: #2AA96D; }
.lm-dot.v { background: #8B7DFF; }
.lm-dot.o { background: #FF8B6B; }

/* Cluster positions */
.lm-pill-1 { top: 40px;  left: 8%;  animation-delay: 0s; }
.lm-pill-2 { top: 20px;  left: 32%; animation-delay: -1.5s; }
.lm-pill-3 { top: 110px; left: 24%; animation-delay: -3s; }
.lm-pill-4 { top: 70px;  left: 48%; animation-delay: -4.5s; }
.lm-pill-5 { top: 30px;  left: 62%; animation-delay: -1s; }
.lm-pill-6 { top: 150px; left: 68%; animation-delay: -2.5s; }

/* ── Section ── */
.lm-section { padding: 100px 24px; position: relative; }
.lm-wrap { max-width: 1100px; margin: 0 auto; position: relative; }
.lm-wrap-narrow { max-width: 780px; margin: 0 auto; text-align: center; }
.lm-h2 {
  font-family: var(--font-serif); font-weight: 400;
  font-size: clamp(30px, 3.8vw, 46px); line-height: 1.12; letter-spacing: -1.2px;
  color: var(--ink); margin: 0;
}
.lm-h2 em { font-style: italic; font-weight: 300; }
.lm-lead {
  margin: 18px auto 0; max-width: 560px;
  font-size: 15.5px; line-height: 1.65; color: var(--ink-3);
}

/* ── Logo strip ── */
.lm-logos {
  display: flex; flex-wrap: wrap; justify-content: center; align-items: center;
  gap: 40px 56px; margin-top: 40px;
  opacity: 0.65;
}
.lm-logos span {
  font-family: var(--font-serif); font-weight: 500; font-size: 20px;
  color: var(--ink-2); letter-spacing: -0.3px;
  filter: grayscale(1);
}

/* ── Values (3 icons) ── */
.lm-values {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px;
  max-width: 900px; margin: 64px auto 0;
}
.lm-value { text-align: center; }
.lm-value-icon {
  width: 56px; height: 56px; margin: 0 auto 20px;
  border-radius: 16px; display: grid; place-items: center;
  color: var(--ink); position: relative;
}
.lm-value-icon::before {
  content: ''; position: absolute; inset: 0; border-radius: 16px;
  opacity: 0.35;
}
.lm-value-icon.v1::before { background: radial-gradient(circle at 30% 30%, var(--sun), var(--coral)); }
.lm-value-icon.v2::before { background: radial-gradient(circle at 30% 30%, var(--lavender), var(--violet)); }
.lm-value-icon.v3::before { background: radial-gradient(circle at 30% 30%, var(--peach), var(--sky)); }
.lm-value-icon svg { position: relative; z-index: 1; }
.lm-value h3 {
  font-family: var(--font-serif); font-weight: 500; font-size: 18px;
  margin: 0 0 8px; letter-spacing: -0.3px;
}
.lm-value p { margin: 0; font-size: 14px; line-height: 1.55; color: var(--ink-3); }

/* ── Timeline ── */
.lm-timeline { position: relative; margin-top: 80px; }
.lm-timeline-svg {
  position: absolute; left: 50%; top: 0; height: 100%; width: 200px;
  transform: translateX(-50%); pointer-events: none; z-index: 0;
}
.lm-step-row {
  display: grid; grid-template-columns: 1fr 1fr; gap: 80px;
  align-items: center; margin-bottom: 120px; position: relative; z-index: 1;
}
.lm-step-row:last-child { margin-bottom: 0; }
.lm-step-row.reverse .lm-step-text { order: 2; }
.lm-step-row.reverse .lm-step-visual { order: 1; }
.lm-step-num {
  display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: 50%;
  border: 1px solid var(--line-2); font-size: 12px; font-weight: 500;
  color: var(--ink-2); margin-bottom: 18px;
}
.lm-step-text h3 {
  font-family: var(--font-serif); font-weight: 400;
  font-size: 26px; letter-spacing: -0.8px; line-height: 1.2;
  margin: 0 0 12px; color: var(--ink);
}
.lm-step-text h3 em { font-style: italic; font-weight: 300; }
.lm-step-text p {
  margin: 0 0 22px; font-size: 15px; line-height: 1.6; color: var(--ink-3);
  max-width: 400px;
}

/* Product mockup card */
.lm-mock {
  position: relative; border-radius: 22px; padding: 20px;
  background: #fff; border: 1px solid var(--line);
  box-shadow: 0 20px 60px rgba(20,18,14,0.08);
  overflow: hidden;
}
.lm-mock-aurora {
  position: absolute; inset: 0; opacity: 0.55; pointer-events: none;
}
.lm-mock-aurora .aurora { animation-duration: 14s; }
.lm-mock-1 .aurora {
  width: 320px; height: 320px; top: -40%; right: -30%;
  background: radial-gradient(circle, var(--peach), transparent 70%);
}
.lm-mock-2 .aurora {
  width: 320px; height: 320px; top: -20%; left: -20%;
  background: radial-gradient(circle, var(--lavender), transparent 70%);
}
.lm-mock-3 .aurora {
  width: 320px; height: 320px; top: -30%; left: 20%;
  background: radial-gradient(circle, var(--sun), transparent 70%);
}
.lm-mock-body { position: relative; z-index: 1; }

/* Filter mock (step 1) */
.lm-filter-title { font-size: 12px; color: var(--ink-3); margin-bottom: 10px; font-weight: 500; }
.lm-filter-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 18px; }
.lm-filter-chips span {
  background: #F4EDE2; border-radius: 999px; padding: 5px 11px;
  font-size: 12px; color: var(--ink-2); font-weight: 500;
}
.lm-filter-chips span.on {
  background: var(--ink); color: var(--cream);
}
.lm-filter-count {
  background: var(--cream); border: 1px solid var(--line);
  border-radius: 14px; padding: 14px; display: flex; align-items: center; justify-content: space-between;
}
.lm-filter-count span { font-size: 13px; color: var(--ink-3); }
.lm-filter-count b {
  font-family: var(--font-serif); font-weight: 500; font-size: 26px;
  color: var(--ink); letter-spacing: -0.5px;
}

/* Unlock mock (step 2) */
.lm-unlock-head {
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 12px; border-bottom: 1px solid var(--line); margin-bottom: 14px;
}
.lm-unlock-head .av {
  width: 32px; height: 32px; border-radius: 9px;
  background: linear-gradient(135deg, var(--violet), var(--lavender));
  color: #fff; display: grid; place-items: center;
  font-family: var(--font-serif); font-size: 12px; font-weight: 500;
}
.lm-unlock-head b { font-size: 13.5px; font-weight: 600; display: block; }
.lm-unlock-head span { font-size: 11.5px; color: var(--ink-3); }
.lm-unlock-fields { display: grid; gap: 8px; }
.lm-unlock-field {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 12px; background: #FAF7F0; border-radius: 11px;
  font-size: 12.5px;
}
.lm-unlock-field.done { background: rgba(42,169,109,0.08); }
.lm-unlock-field .k { display: flex; align-items: center; gap: 7px; color: var(--ink-2); font-weight: 500; }
.lm-unlock-field .v { font-family: 'Inter'; color: var(--ink); font-weight: 500; font-size: 12px; }
.lm-unlock-field .v.locked {
  color: var(--ink-4); display: flex; align-items: center; gap: 5px;
  font-size: 11px;
}

/* CRM mock (step 3) */
.lm-crm-lead {
  background: #fff; border: 1px solid var(--line); border-radius: 12px;
  padding: 12px 14px; margin-bottom: 8px;
  display: flex; align-items: center; gap: 10px;
}
.lm-crm-lead:last-child { margin-bottom: 0; }
.lm-crm-lead .av {
  width: 30px; height: 30px; border-radius: 8px;
  display: grid; place-items: center; color: #fff;
  font-family: var(--font-serif); font-size: 11px; font-weight: 500;
  flex-shrink: 0;
}
.lm-crm-lead b { display: block; font-size: 13px; font-weight: 600; }
.lm-crm-lead span { font-size: 11.5px; color: var(--ink-3); }
.lm-crm-status {
  margin-left: auto; font-size: 10.5px; font-weight: 600;
  padding: 4px 10px; border-radius: 999px; white-space: nowrap;
}
.lm-crm-status.blue { background: #DBEAFE; color: #1D4ED8; }
.lm-crm-status.amber { background: #FEF3C7; color: #B45309; }
.lm-crm-status.green { background: #D1FAE5; color: #047857; }

/* ── Aurora CTA band ── */
.lm-band {
  border-radius: 32px; padding: 90px 48px; text-align: center;
  position: relative; overflow: hidden;
  background: linear-gradient(135deg, #1C1729 0%, #2A1F3D 45%, #4A2E5C 100%);
  color: var(--cream);
}
.lm-band::before {
  content: ''; position: absolute; inset: -20% -10% auto -10%; height: 60%;
  background:
    radial-gradient(ellipse at 15% 40%, rgba(255,139,107,0.5), transparent 55%),
    radial-gradient(ellipse at 50% 30%, rgba(255,216,122,0.35), transparent 55%),
    radial-gradient(ellipse at 85% 50%, rgba(139,125,255,0.55), transparent 55%);
  filter: blur(30px);
  pointer-events: none;
}
.lm-band-inner { position: relative; z-index: 1; max-width: 620px; margin: 0 auto; }
.lm-band h2 {
  font-family: var(--font-serif); font-weight: 400;
  font-size: clamp(30px, 3.6vw, 44px); line-height: 1.1; letter-spacing: -1.2px;
  margin: 0;
}
.lm-band h2 em { font-style: italic; font-weight: 300; }
.lm-band p { margin: 20px auto 0; font-size: 15px; line-height: 1.6; color: rgba(245,241,232,0.75); max-width: 460px; }
.lm-band-trust {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  margin: 24px 0 30px; font-size: 12.5px; color: rgba(245,241,232,0.7);
}
.lm-band-trust b { font-family: var(--font-serif); font-weight: 500; color: var(--cream); }

/* ── FAQ ── */
.lm-faq-wrap {
  display: grid; grid-template-columns: 0.9fr 2fr; gap: 60px; margin-top: 60px;
}
.lm-faq-title {
  font-family: var(--font-serif); font-weight: 400;
  font-size: 30px; letter-spacing: -0.8px; line-height: 1.15;
}
.lm-faq-title em { font-style: italic; font-weight: 300; }
.lm-faq-list { display: grid; gap: 0; }
.lm-faq-item {
  border-bottom: 1px solid var(--line);
}
.lm-faq-q {
  width: 100%; background: none; border: 0; cursor: pointer;
  text-align: left; padding: 22px 0;
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  font-family: var(--font-sans); font-size: 15.5px; font-weight: 500; color: var(--ink);
}
.lm-faq-q svg { flex-shrink: 0; color: var(--ink-3); transition: transform .3s var(--ease); }
.lm-faq-item.open .lm-faq-q svg.plus { transform: rotate(45deg); }
.lm-faq-a {
  max-height: 0; overflow: hidden; transition: max-height .5s var(--ease-soft);
}
.lm-faq-a-inner { padding: 0 0 22px; font-size: 14.5px; line-height: 1.7; color: var(--ink-3); max-width: 560px; }
.lm-faq-item.open .lm-faq-a { max-height: 260px; }

/* ── Footer ── */
.lm-outro {
  padding: 120px 24px 60px; position: relative; text-align: center;
  overflow: hidden;
}
.lm-outro-aurora {
  position: absolute; inset: auto 0 0 0; height: 500px; pointer-events: none;
  background:
    radial-gradient(ellipse at 20% 90%, rgba(255,139,107,0.35), transparent 50%),
    radial-gradient(ellipse at 80% 100%, rgba(139,125,255,0.4), transparent 50%),
    radial-gradient(ellipse at 50% 100%, rgba(255,216,122,0.25), transparent 50%);
  filter: blur(30px);
}
.lm-outro-inner { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; }
.lm-outro h2 {
  font-family: var(--font-serif); font-weight: 400;
  font-size: clamp(50px, 7vw, 90px); letter-spacing: -2.5px; line-height: 1.02;
  margin: 0;
}
.lm-outro h2 em { font-style: italic; font-weight: 300; }
.lm-outro-cta { margin-top: 44px; display: inline-flex; }

.lm-footer {
  position: relative; z-index: 1; padding: 80px 24px 40px;
}
.lm-footer-inner {
  max-width: 1100px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr 2fr; gap: 60px; align-items: start;
}
.lm-footer-brand b {
  font-family: var(--font-serif); font-weight: 500; font-size: 22px;
  letter-spacing: -0.5px; color: var(--ink);
}
.lm-footer-brand b span { font-style: italic; font-weight: 300; }
.lm-footer-brand p { margin: 12px 0 0; font-size: 13px; color: var(--ink-3); }
.lm-newsletter {
  background: #fff; border: 1px solid var(--line); border-radius: 20px;
  padding: 24px 28px; display: flex; align-items: center; justify-content: space-between; gap: 20px;
}
.lm-newsletter b { font-family: var(--font-serif); font-weight: 500; font-size: 17px; letter-spacing: -0.3px; }
.lm-newsletter p { margin: 6px 0 0; font-size: 13px; color: var(--ink-3); line-height: 1.5; }
.lm-newsletter form { display: flex; gap: 8px; flex-shrink: 0; }
.lm-newsletter input {
  padding: 11px 16px; border-radius: 999px; border: 1px solid var(--line);
  background: var(--cream); font-size: 13px; font-family: var(--font-sans); color: var(--ink);
  outline: none; min-width: 200px;
}
.lm-newsletter input:focus { border-color: var(--ink); }

.lm-footer-bottom {
  max-width: 1100px; margin: 60px auto 0; padding-top: 30px;
  border-top: 1px solid var(--line);
  display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
  font-size: 12.5px; color: var(--ink-3);
}
.lm-footer-bottom a { color: var(--ink-3); text-decoration: none; margin-left: 20px; }
.lm-footer-bottom a:hover { color: var(--ink); }

/* ── Mobile ── */
@media (max-width: 900px) {
  .lm-nav, .lm-nav.scrolled { padding: 14px 16px 0; }
  .lm-nav-links { display: none; }
  .lm-hero { padding: 120px 20px 60px; }
  .lm-cluster { height: 400px; }
  .lm-pill { padding: 10px 12px; }
  .lm-pill-text b { font-size: 12px; }
  .lm-pill-text span { font-size: 11px; }
  .lm-values { grid-template-columns: 1fr; gap: 40px; }
  .lm-step-row, .lm-step-row.reverse {
    grid-template-columns: 1fr; gap: 30px; margin-bottom: 80px;
  }
  .lm-step-row.reverse .lm-step-text { order: 1; }
  .lm-step-row.reverse .lm-step-visual { order: 2; }
  .lm-timeline-svg { display: none; }
  .lm-faq-wrap { grid-template-columns: 1fr; gap: 30px; }
  .lm-band { padding: 60px 28px; border-radius: 24px; }
  .lm-footer-inner { grid-template-columns: 1fr; gap: 30px; }
  .lm-newsletter { flex-direction: column; align-items: flex-start; }
  .lm-newsletter form { width: 100%; }
  .lm-newsletter input { flex: 1; min-width: 0; }
  .lm-section { padding: 80px 20px; }
}
@media (max-width: 620px) {
  /* Reposition pills on very small screens */
  .lm-pill { transform-origin: center; }
  .lm-pill-1 { top: 0;   left: 2%;  }
  .lm-pill-2 { top: 60px;  left: 40%; }
  .lm-pill-3 { top: 130px; left: 10%; }
  .lm-pill-4 { top: 200px; left: 45%; }
  .lm-pill-5 { top: 260px; left: 15%; }
  .lm-pill-6 { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .lm *, .lm *::before, .lm *::after { animation: none !important; transition-duration: .01ms !important; }
  .lm-reveal { opacity: 1; transform: none; }
}
`

/* ─────────────────────────────────────────────────────────
   Scroll reveal
───────────────────────────────────────────────────────── */
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
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )
    items.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [ref])
}

/* ─────────────────────────────────────────────────────────
   Navigation
───────────────────────────────────────────────────────── */
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', h, { passive: true }); h()
    return () => window.removeEventListener('scroll', h)
  }, [])
  return (
    <nav className={`lm-nav${scrolled ? ' scrolled' : ''}`}>
      <div className="lm-nav-inner">
        <Link href="/" className="lm-logo">
          <b>Lead<span>Master</span></b>
        </Link>
        <div className="lm-nav-links">
          <a href="#fonctionnement">Fonctionnement</a>
          <a href="#donnees">Données</a>
          <a href="#tarifs">Tarifs</a>
          <a href="#faq">FAQ</a>
        </div>
        <div className="lm-nav-right">
          <Link href="/login" className="lm-login">Connexion</Link>
          <Link href="/register" className="lm-btn lm-btn-dark lm-btn-dark-sm">
            Commencer
          </Link>
        </div>
      </div>
    </nav>
  )
}

/* ─────────────────────────────────────────────────────────
   Hero + floating pill cluster
───────────────────────────────────────────────────────── */
function Hero() {
  return (
    <header className="lm-hero">
      <div className="lm-hero-inner">
        <h1 className="lm-reveal on">
          Trouvez vos prochains clients<br />
          <em>parmi 53 586 entreprises</em> marocaines.
        </h1>
        <p className="lm-hero-sub lm-reveal on" data-d="1">
          LeadMaster vous donne accès à la donnée B2B marocaine la plus complète —
          téléphone, e-mail, dirigeant, ICE, capital. Vous ne payez que ce que vous débloquez.
        </p>
        <div className="lm-hero-cta lm-reveal on" data-d="2">
          <Link href="/register" className="lm-btn lm-btn-dark">
            Commencer gratuitement
          </Link>
        </div>
      </div>

      <div className="lm-cluster">
        <div className="lm-cluster-aurora">
          <div className="aurora a1" />
          <div className="aurora a2" />
          <div className="aurora a3" />
          <div className="aurora a4" />
          <div className="aurora a5" />
        </div>

        <div className="lm-pill lm-pill-1">
          <div className="lm-pill-avatar p1">AP</div>
          <div className="lm-pill-text">
            <b>Atlas Plast</b>
            <span><span className="lm-dot g" /> Débloquée · <em>Casablanca</em></span>
          </div>
        </div>

        <div className="lm-pill lm-pill-2">
          <div className="lm-pill-avatar p2">MB</div>
          <div className="lm-pill-text">
            <b>M. Benali · Dirigeant</b>
            <span>Contact vérifié</span>
          </div>
        </div>

        <div className="lm-pill lm-pill-3">
          <div className="lm-pill-avatar p3">RZ</div>
          <div className="lm-pill-text">
            <b>Riad Zaytoun</b>
            <span><span className="lm-dot o" /> À rappeler · <em>Marrakech</em></span>
          </div>
        </div>

        <div className="lm-pill lm-pill-4">
          <div className="lm-pill-avatar p4">GT</div>
          <div className="lm-pill-text">
            <b>Groupe Tiziyane</b>
            <span>De 50 à 99 salariés</span>
          </div>
        </div>

        <div className="lm-pill lm-pill-5">
          <div className="lm-pill-avatar p1">CH</div>
          <div className="lm-pill-text">
            <b>Charaf Corp.</b>
            <span><span className="lm-dot v" /> Injectée au CRM</span>
          </div>
        </div>

        <div className="lm-pill lm-pill-6">
          <div className="lm-pill-avatar p2">DK</div>
          <div className="lm-pill-text">
            <b>Dar Kasbah Hotels</b>
            <span><span className="lm-dot g" /> Convertie ✓</span>
          </div>
        </div>
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────────────────────
   Logo strip
───────────────────────────────────────────────────────── */
const CLIENT_LOGOS = ['Attijariwafa', 'OCP', 'Inwi', 'Maroc Telecom', 'BMCE', 'Renault Maroc', 'Cosumar', 'Managem']

function LogosSection() {
  return (
    <section className="lm-section" style={{ paddingTop: 40, paddingBottom: 60 }}>
      <div className="lm-wrap-narrow">
        <p className="lm-reveal" style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          Utilisé par des équipes commerciales dans toute la région
        </p>
        <div className="lm-logos lm-reveal" data-d="1">
          {CLIENT_LOGOS.map(l => <span key={l}>{l}</span>)}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────
   Values — 3 icon trio
───────────────────────────────────────────────────────── */
function ValuesSection() {
  return (
    <section className="lm-section">
      <div className="lm-wrap-narrow">
        <h2 className="lm-h2 lm-reveal">
          De la donnée qui <em>tient ses promesses.</em>
        </h2>
        <p className="lm-lead lm-reveal" data-d="1">
          Nous croisons plusieurs sources publiques et privées pour vous livrer
          une base marocaine actuelle, précise et exploitable dès la première recherche.
        </p>
      </div>

      <div className="lm-values">
        <div className="lm-value lm-reveal" data-d="1">
          <div className="lm-value-icon v1"><Sparkles size={22} strokeWidth={1.5} /></div>
          <h3>Donnée fraîche</h3>
          <p>53 586 entreprises marocaines. Mise à jour continue, doublons éliminés.</p>
        </div>
        <div className="lm-value lm-reveal" data-d="2">
          <div className="lm-value-icon v2"><HeartHandshake size={22} strokeWidth={1.5} /></div>
          <h3>Coût intelligent</h3>
          <p>Vous ne payez que les champs qui contiennent une vraie donnée. Jamais de crédits perdus.</p>
        </div>
        <div className="lm-value lm-reveal" data-d="3">
          <div className="lm-value-icon v3"><ShieldCheck size={22} strokeWidth={1.5} /></div>
          <h3>Donnée garantie</h3>
          <p>Un numéro qui ne répond plus ? Signalez-le, on rembourse les crédits.</p>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────
   Timeline — how it works
───────────────────────────────────────────────────────── */
function TimelinePath() {
  return (
    <svg className="lm-timeline-svg" viewBox="0 0 200 1200" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="tlg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#FFB88C" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#C7B8FF" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#A8C8FF" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <path
        d="M100,20 C 60,180 140,320 100,480 C 60,640 140,780 100,940 C 60,1080 100,1180 100,1200"
        stroke="url(#tlg)" strokeWidth="2" fill="none" strokeDasharray="6 6"
      />
    </svg>
  )
}

function HowItWorks() {
  return (
    <section className="lm-section" id="fonctionnement" style={{ background: 'var(--cream-2)' }}>
      <div className="lm-wrap-narrow">
        <h2 className="lm-h2 lm-reveal">
          Trois gestes, <em>zéro friction.</em>
        </h2>
        <p className="lm-lead lm-reveal" data-d="1">
          De la recherche à l&apos;appel, LeadMaster compresse ce qui vous prenait
          des heures en quelques secondes.
        </p>
      </div>

      <div className="lm-wrap lm-timeline">
        <TimelinePath />

        {/* Step 1 — Cibler */}
        <div className="lm-step-row">
          <div className="lm-step-text lm-reveal">
            <span className="lm-step-num">1</span>
            <h3>Ciblez <em>précisément.</em></h3>
            <p>
              Filtrez parmi 12 secteurs, 250 villes, 9 tranches d&apos;effectif
              et 5 tranches de capital. Le compteur d&apos;entreprises se met à jour
              en direct pendant que vous affinez.
            </p>
          </div>
          <div className="lm-step-visual lm-reveal" data-d="1">
            <div className="lm-mock lm-mock-1">
              <div className="lm-mock-aurora"><div className="aurora" /></div>
              <div className="lm-mock-body">
                <div className="lm-filter-title">Filtres actifs</div>
                <div className="lm-filter-chips">
                  <span className="on">Hôtellerie</span>
                  <span className="on">Marrakech</span>
                  <span>Casablanca</span>
                  <span className="on">De 20 à 49 salariés</span>
                </div>
                <div className="lm-filter-count">
                  <span>Entreprises correspondantes</span>
                  <b>1 851</b>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 — Débloquer */}
        <div className="lm-step-row reverse">
          <div className="lm-step-text lm-reveal">
            <span className="lm-step-num">2</span>
            <h3>Débloquez <em>au champ près.</em></h3>
            <p>
              Choisissez uniquement les données dont vous avez besoin — téléphone,
              e-mail, dirigeant, ICE, capital. Si un champ est absent, il est gratuit.
            </p>
          </div>
          <div className="lm-step-visual lm-reveal" data-d="1">
            <div className="lm-mock lm-mock-2">
              <div className="lm-mock-aurora"><div className="aurora" /></div>
              <div className="lm-mock-body">
                <div className="lm-unlock-head">
                  <div className="av">AP</div>
                  <div>
                    <b>Atlas Plast S.a.r.l.</b>
                    <span>Casablanca · Industrie</span>
                  </div>
                </div>
                <div className="lm-unlock-fields">
                  <div className="lm-unlock-field done">
                    <span className="k"><Phone size={11} /> Téléphone</span>
                    <span className="v">05 22 46 18 30</span>
                  </div>
                  <div className="lm-unlock-field done">
                    <span className="k"><Mail size={11} /> E-mail</span>
                    <span className="v">contact@atlasplast.ma</span>
                  </div>
                  <div className="lm-unlock-field done">
                    <span className="k"><User size={11} /> Dirigeant</span>
                    <span className="v">M. Benali Karim</span>
                  </div>
                  <div className="lm-unlock-field">
                    <span className="k"><Building2 size={11} /> Capital</span>
                    <span className="v locked"><Lock size={10} /> +5 cr</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 — Convertir */}
        <div className="lm-step-row">
          <div className="lm-step-text lm-reveal">
            <span className="lm-step-num">3</span>
            <h3>Convertissez <em>sans quitter LeadMaster.</em></h3>
            <p>
              Injectez vos entreprises dans le CRM intégré. Statuts, notes,
              rappels, appel en un clic — et l&apos;export CSV quand vous voulez
              partir ailleurs.
            </p>
          </div>
          <div className="lm-step-visual lm-reveal" data-d="1">
            <div className="lm-mock lm-mock-3">
              <div className="lm-mock-aurora"><div className="aurora" /></div>
              <div className="lm-mock-body">
                <div className="lm-crm-lead">
                  <div className="av" style={{ background: 'linear-gradient(135deg,#FF8B6B,#FFB88C)' }}>RZ</div>
                  <div>
                    <b>Riad Zaytoun</b>
                    <span>Marrakech · Hôtellerie</span>
                  </div>
                  <span className="lm-crm-status blue">À appeler</span>
                </div>
                <div className="lm-crm-lead">
                  <div className="av" style={{ background: 'linear-gradient(135deg,#8B7DFF,#C7B8FF)' }}>PE</div>
                  <div>
                    <b>Palmeraie Events</b>
                    <span>Marrakech · Événementiel</span>
                  </div>
                  <span className="lm-crm-status amber">À rappeler</span>
                </div>
                <div className="lm-crm-lead">
                  <div className="av" style={{ background: 'linear-gradient(135deg,#FFD87A,#FF8B6B)' }}>DK</div>
                  <div>
                    <b>Dar Kasbah</b>
                    <span>Marrakech · Hôtellerie</span>
                  </div>
                  <span className="lm-crm-status green">Converti ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────
   Data menu
───────────────────────────────────────────────────────── */
const MENU = [
  ['Profil de base',    '1 cr'],
  ['Téléphone',         '+1 cr'],
  ['E-mail',            '+1 cr'],
  ['Adresse + GPS',     '+1 cr'],
  ['Site web',          '+1 cr'],
  ['ICE + RC',          '+2 cr'],
  ['Année de création', '+2 cr'],
  ['Nom du dirigeant',  '+2 cr'],
  ['Effectif',          '+2 cr'],
  ['Capital social',    '+5 cr'],
]

function DataMenu() {
  return (
    <section className="lm-section" id="donnees">
      <div className="lm-wrap-narrow">
        <h2 className="lm-h2 lm-reveal">
          Le menu <em>de la donnée.</em>
        </h2>
        <p className="lm-lead lm-reveal" data-d="1">
          Chaque champ a un prix affiché à l&apos;avance. Vous savez exactement ce
          que vous dépensez avant de débloquer.
        </p>
      </div>

      <div className="lm-reveal" data-d="2" style={{
        maxWidth: 620, margin: '60px auto 0',
        background: '#fff', border: '1px solid var(--line)',
        borderRadius: 20, padding: '32px 40px',
        boxShadow: '0 12px 40px rgba(20,18,14,0.06)',
      }}>
        {MENU.map(([label, price]) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'baseline', gap: 12,
            padding: '12px 0', borderBottom: '1px dashed var(--line)',
          }}>
            <span style={{ fontSize: 14.5, color: 'var(--ink-2)' }}>{label}</span>
            <span style={{ flex: 1, borderBottom: '1.5px dotted var(--line-2)', transform: 'translateY(-4px)' }} />
            <b style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 15, color: 'var(--ink)' }}>{price}</b>
          </div>
        ))}
        <p style={{
          margin: '24px 0 0', fontSize: 13.5, color: 'var(--ink-3)',
          textAlign: 'center', lineHeight: 1.6,
        }}>
          Donnée absente = <b style={{ color: 'var(--ink)', fontFamily: 'var(--font-serif)', fontWeight: 500 }}>0 crédit</b>.
          Donnée fausse = <b style={{ color: 'var(--ink)', fontFamily: 'var(--font-serif)', fontWeight: 500 }}>remboursée</b>.
        </p>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────
   Aurora band CTA
───────────────────────────────────────────────────────── */
function BandCTA() {
  return (
    <section className="lm-section" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div className="lm-wrap">
        <div className="lm-band lm-reveal">
          <div className="lm-band-inner">
            <h2>
              Accédez à la donnée B2B <em>la plus complète</em> du Maroc.
            </h2>
            <p>
              Rejoignez les équipes qui prospectent avec précision.
              100 entreprises offertes à l&apos;inscription.
            </p>
            <div className="lm-band-trust">
              <span>Utilisé par</span>
              <b>OCP</b> · <b>Attijariwafa</b> · <b>Inwi</b>
            </div>
            <Link href="/register" className="lm-btn lm-btn-cream" style={{ marginTop: 8 }}>
              Créer mon compte
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────
   FAQ
───────────────────────────────────────────────────────── */
const FAQS = [
  {
    q: 'Comment fonctionne LeadMaster ?',
    a: 'LeadMaster est une plateforme B2B qui vous donne accès à 53 586 entreprises marocaines. Vous ciblez par secteur, ville, effectif ou capital, puis vous débloquez uniquement les champs dont vous avez besoin — téléphone, e-mail, dirigeant, ICE. Vous ne payez que ce que vous consommez, au champ près.',
  },
  {
    q: 'D&apos;où viennent vos données ?',
    a: 'Nous croisons plusieurs sources publiques marocaines (registres, annuaires professionnels, données ouvertes) et privées, avec une vérification manuelle sur les champs sensibles. La base est mise à jour en continu.',
  },
  {
    q: 'Que se passe-t-il si une donnée est fausse ?',
    a: 'Un numéro qui ne répond plus, une entreprise fermée, un dirigeant parti ? Vous le signalez en un clic depuis votre CRM. Après vérification, l&apos;intégralité des crédits dépensés sur cette entreprise vous est remboursée automatiquement.',
  },
  {
    q: 'Puis-je essayer avant de payer ?',
    a: 'Oui. À l&apos;inscription, vos 100 premières entreprises en profil de base sont offertes, sans carte bancaire. C&apos;est la meilleure façon de juger la qualité de la donnée avant d&apos;investir.',
  },
  {
    q: 'Puis-je exporter mes données ?',
    a: 'Chaque recherche est exportable en CSV avec tous les champs débloqués. Vous pouvez aussi injecter directement les entreprises dans le CRM intégré pour piloter votre prospection.',
  },
]

function FAQ() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section className="lm-section" id="faq">
      <div className="lm-wrap">
        <div className="lm-faq-wrap">
          <div>
            <h2 className="lm-faq-title lm-reveal">
              Questions <em>fréquentes.</em>
            </h2>
          </div>
          <div className="lm-faq-list lm-reveal" data-d="1">
            {FAQS.map((f, i) => (
              <div key={f.q} className={`lm-faq-item${open === i ? ' open' : ''}`}>
                <button className="lm-faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                  <span dangerouslySetInnerHTML={{ __html: f.q }} />
                  {open === i ? <Minus size={18} /> : <Plus size={18} className="plus" />}
                </button>
                <div className="lm-faq-a">
                  <div className="lm-faq-a-inner" dangerouslySetInnerHTML={{ __html: f.a }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────
   Outro + Footer
───────────────────────────────────────────────────────── */
function Outro() {
  return (
    <section className="lm-outro">
      <div className="lm-outro-aurora" />
      <div className="lm-outro-inner">
        <h2 className="lm-reveal">
          Prospectez <em>sans le bruit.</em>
        </h2>
        <div className="lm-outro-cta lm-reveal" data-d="1">
          <Link href="/register" className="lm-btn lm-btn-dark">
            Commencer gratuitement
          </Link>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="lm-footer">
      <div className="lm-footer-inner">
        <div className="lm-footer-brand">
          <b>Lead<span>Master</span></b>
          <p>
            Contact<br />
            support@leadmaster.ma
          </p>
        </div>
        <div className="lm-newsletter">
          <div>
            <b>Recevez les meilleures pratiques de prospection.</b>
            <p>
              Une newsletter mensuelle avec des conseils concrets pour prospecter au Maroc.
            </p>
          </div>
          <form onSubmit={e => { e.preventDefault() }}>
            <input type="email" placeholder="Votre e-mail" aria-label="E-mail" />
            <button type="submit" className="lm-btn lm-btn-dark lm-btn-dark-sm">
              S&apos;abonner
            </button>
          </form>
        </div>
      </div>

      <div className="lm-footer-bottom">
        <span>© {new Date().getFullYear()} LeadMaster · Casablanca 🇲🇦</span>
        <div>
          <a href="#">Confidentialité</a>
          <a href="#">Conditions</a>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────────────────────────────────────────
   Page
───────────────────────────────────────────────────────── */
export default function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef)
  return (
    <div className="lm" ref={rootRef}>
      <style>{CSS}</style>
      <Nav />
      <Hero />
      <LogosSection />
      <ValuesSection />
      <HowItWorks />
      <DataMenu />
      <BandCTA />
      <FAQ />
      <Outro />
      <Footer />
    </div>
  )
}
