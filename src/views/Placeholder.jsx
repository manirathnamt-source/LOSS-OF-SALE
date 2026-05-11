export default function PlaceholderView({ name }) {
  return (
    <div className="card">
      <div className="card-title">{name}</div>
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>
        This view is part of the rebuild and will be ported in the next pass.
        The data layer is in place — only the rendering remains.
      </p>
    </div>
  );
}
