import { useEffect, useState } from 'react'
import type { UnitDetails } from '../data/types'

function formatBytes(n: number): string {
  if (n < 1024) {
    return `${n} B`
  }
  const units = ['KB', 'MB', 'GB', 'TB']
  let v = n / 1024
  let i = 0
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(1)} ${units[i]}`
}

function formatDuration(nsec: number): string {
  const s = nsec / 1e9
  if (s < 60) {
    return `${s.toFixed(1)}s`
  }
  const m = Math.floor(s / 60)
  if (m < 60) {
    return `${m}m ${Math.round(s % 60)}s`
  }
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function formatSince(usec: number): string {
  return new Date(usec / 1000).toLocaleString()
}

function DocLink({ href }: { href: string }) {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {href}
      </a>
    )
  }
  return <span>{href}</span>
}

export function LiveDetails({ scope, name }: { scope: string; name: string }) {
  const [details, setDetails] = useState<UnitDetails | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    setDetails(null)
    setError(null)
    fetch(`/api/unit/${scope}/${encodeURIComponent(name)}`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        return res.json()
      })
      .then((d: UnitDetails) => setDetails(d))
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return
        }
        setError(err instanceof Error ? err.message : String(err))
      })
    return () => ctrl.abort()
  }, [scope, name])

  if (error !== null) {
    return (
      <section className="details-extra">
        <h3>Details</h3>
        <div className="details-note">unavailable: {error}</div>
      </section>
    )
  }
  if (details === null) {
    return (
      <section className="details-extra">
        <h3>Details</h3>
        <div className="details-note">loading...</div>
      </section>
    )
  }

  return (
    <section className="details-extra">
      <h3>Details</h3>
      <dl className="details-fields">
        {details.execStart !== undefined ? (
          <>
            <dt>Exec</dt>
            <dd>
              <code>{details.execStart}</code>
            </dd>
          </>
        ) : null}
        {details.mainPID !== undefined ? (
          <>
            <dt>Main PID</dt>
            <dd>{details.mainPID}</dd>
          </>
        ) : null}
        {details.activeEnterUSec !== undefined ? (
          <>
            <dt>Since</dt>
            <dd>{formatSince(details.activeEnterUSec)}</dd>
          </>
        ) : null}
        {details.memoryCurrent !== undefined ? (
          <>
            <dt>Memory</dt>
            <dd>{formatBytes(details.memoryCurrent)}</dd>
          </>
        ) : null}
        {details.cpuUsageNSec !== undefined ? (
          <>
            <dt>CPU</dt>
            <dd>{formatDuration(details.cpuUsageNSec)}</dd>
          </>
        ) : null}
        {details.nRestarts !== undefined ? (
          <>
            <dt>Restarts</dt>
            <dd>{details.nRestarts}</dd>
          </>
        ) : null}
        {details.result !== undefined ? (
          <>
            <dt>Result</dt>
            <dd>{details.result}</dd>
          </>
        ) : null}
        {details.fragmentPath !== undefined ? (
          <>
            <dt>Unit file</dt>
            <dd>
              <code>{details.fragmentPath}</code>
            </dd>
          </>
        ) : null}
      </dl>

      {details.documentation !== undefined ? (
        <div className="details-list">
          <div className="details-list-title">Documentation</div>
          <ul>
            {details.documentation.map((doc) => (
              <li key={doc}>
                <DocLink href={doc} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {details.triggers !== undefined ? (
        <div className="details-list">
          <div className="details-list-title">Triggers</div>
          <ul>
            {details.triggers.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {details.triggeredBy !== undefined ? (
        <div className="details-list">
          <div className="details-list-title">Triggered by</div>
          <ul>
            {details.triggeredBy.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
