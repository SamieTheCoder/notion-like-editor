'use client'

import type { EmailShellConfig } from '@/lib/email-shell'

/**
 * Renders the stored email shell around the editor so the author sees the real
 * email context while writing the body.
 *
 * Built from the shell's `config`, not from its `head_html` — that fragment
 * starts with `<!doctype html>` and opens `<html>`/`<head>`, which cannot be
 * injected into a live page. Driving both from the same config is what keeps
 * this preview honest without duplicating markup.
 *
 * Everything here is chrome, not document content: it is inert, excluded from
 * the accessibility tree where decorative, and never written into the JSON.
 */

interface EmailShellFrameProps {
  config: EmailShellConfig
  /** The editor. */
  children: React.ReactNode
}

function versioned(url: string, version: string): string {
  if (!version) return url
  return url.includes('?') ? `${url}&v=${version}` : `${url}?v=${version}`
}

export function EmailShellFrame({ config, children }: EmailShellFrameProps) {
  const c = config.colors

  return (
    <div
      className="mx-auto w-full overflow-hidden rounded-xl shadow-sm"
      style={{ maxWidth: 600, backgroundColor: c.card }}
    >
      {/* Header banner — matches the email's full-bleed 600px image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={versioned(config.headerImageUrl, config.assetVersion)}
        alt=""
        aria-hidden
        className="block w-full select-none"
        style={{ maxWidth: 600, height: 'auto' }}
        draggable={false}
      />

      {/* Body: the editor. Padding mirrors the email's body cell so line
          lengths in the editor match the delivered email. */}
      <div style={{ padding: '22px 32px 8px', color: c.bodyText }}>{children}</div>

      {/* Footer wave */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={versioned(config.footerImageUrl, config.assetVersion)}
        alt=""
        aria-hidden
        className="block w-full select-none"
        style={{ maxWidth: 600, height: 'auto' }}
        draggable={false}
      />

      {/* Blue footer block */}
      <div style={{ backgroundColor: c.footer, color: c.footerText }}>
        {/* Social row */}
        <div
          className="flex flex-wrap items-center justify-center"
          style={{ padding: '14px 12px 6px', gap: 16 }}
        >
          {config.social.map((icon) => {
            const size = icon.size ?? 22
            return (
              <span
                key={icon.href}
                className="inline-flex items-center"
                style={{ gap: 4, fontSize: 15, fontFamily: config.fontStack }}
                title={icon.href}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={versioned(icon.iconUrl, config.assetVersion)}
                  alt={icon.showLabel ? '' : icon.label}
                  style={{ width: size, height: size }}
                  draggable={false}
                />
                {icon.showLabel && <span>{icon.label}</span>}
              </span>
            )
          })}
        </div>

        {/* Address */}
        <div
          className="flex items-center justify-center text-center"
          style={{
            padding: '0 25px 10px',
            fontSize: 15,
            lineHeight: '22px',
            fontFamily: config.fontStack,
            gap: 5,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={versioned(config.addressIconUrl, config.assetVersion)}
            alt=""
            aria-hidden
            style={{ width: 12, height: 12 }}
            draggable={false}
          />
          <span>{config.addressLines.join(' ')}</span>
        </div>

        {/* Hairline divider */}
        <div style={{ padding: '0 15px' }}>
          <div style={{ height: 1, backgroundColor: c.footerDivider }} />
        </div>

        {/* Disclaimer */}
        <div className="flex" style={{ padding: '8px 20px 14px', gap: 8 }}>
          <span
            style={{
              width: 75,
              flexShrink: 0,
              fontWeight: 700,
              fontSize: 12,
              lineHeight: '20px',
              fontFamily: config.fontStack,
            }}
          >
            {config.disclaimerLabel}
          </span>
          <span
            style={{ fontSize: 10, lineHeight: '16px', fontFamily: config.fontStack }}
          >
            {config.disclaimerText}
          </span>
        </div>
      </div>
    </div>
  )
}
