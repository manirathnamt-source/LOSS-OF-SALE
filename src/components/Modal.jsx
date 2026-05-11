import { useDashboard } from '../store/DashboardContext.jsx';

export default function Modal() {
  const { modal, setModal } = useDashboard();
  if (!modal) return null;
  const close = () => setModal(null);
  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <div className="modal-title">{modal.title}</div>
            {modal.sub && <div className="modal-sub">{modal.sub}</div>}
          </div>
          <button className="modal-close" onClick={close}>✕</button>
        </div>
        <div className="modal-body">{modal.body}</div>
      </div>
    </div>
  );
}
