import React, { useState, useEffect, useRef } from 'react';
import { useSessionStore, getNextEffectName } from '@/stores/session-store';

interface NewEffectModalProps {
  open: boolean;
  onClose: () => void;
}

export const NewEffectModal: React.FC<NewEffectModalProps> = ({ open, onClose }) => {
  const { sessions, createSession } = useSessionStore();
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(getNextEffectName(sessions));
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [open, sessions]);

  if (!open) return null;

  const handleConfirm = () => {
    const trimmed = name.trim() || getNextEffectName(sessions);
    createSession(trimmed);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 360 }}>
        <h2>新建特效</h2>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>特效名称</label>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirm();
              if (e.key === 'Escape') onClose();
            }}
            placeholder="输入特效名称..."
            style={{ width: '100%' }}
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={handleConfirm}>创建</button>
        </div>
      </div>
    </div>
  );
};
