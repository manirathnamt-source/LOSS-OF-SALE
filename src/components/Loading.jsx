export function Loading({ children = 'Loading…' }) {
  return <div className="loading">{children}</div>;
}

export function ErrorCard({ children }) {
  return <div className="err-card">{children}</div>;
}

export function Placeholder({ name }) {
  return (
    <div className="card">
      <div className="card-title">{name}</div>
      <p style={{ fontSize: 13, color: 'var(--muted)' }}>
        This view is part of the rebuild and will be ported in the next pass.
      </p>
    </div>
  );
}
