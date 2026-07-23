import React, { useEffect, useRef } from 'react';

interface RenameModalProps {
  open: boolean;
  initialName: string;
  title?: string;
  onConfirm: (name: string) => void;
  onClose: () => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({ open, initialName, title = '重命名', onConfirm, onClose }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = React.useState(initialName);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [open, initialName]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 360 }}>
        <h2>{title}</h2>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && name.trim()) { onConfirm(name.trim()); onClose(); }
            if (e.key === 'Escape') onClose();
          }}
          style={{ width: '100%', marginBottom: 16 }}
          autoFocus
        />
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" disabled={!name.trim()} onClick={() => { onConfirm(name.trim()); onClose(); }}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
};
