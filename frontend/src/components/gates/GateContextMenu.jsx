import { useEffect, useRef } from 'react';

export default function GateContextMenu({ position, _gate, onDelete, onCopy, onViewMatrix, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const menuItems = [
    { label: 'View Matrix', action: onViewMatrix },
    { label: 'Copy Gate', action: onCopy },
    { label: 'Delete', action: onDelete, danger: true },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed border rounded shadow-lg z-50 py-1"
      style={{
        left: position.x,
        top: position.y,
        backgroundColor: 'var(--panel-bg)',
        borderColor: 'var(--border-color)'
      }}
    >
      {menuItems.map((item, idx) => (
        <button
          key={idx}
          onClick={() => {
            item.action();
            onClose();
          }}
          className={`
            w-full px-4 py-2 text-left text-sm flex items-center gap-2 font-body font-medium transition-colors
            hover:bg-white/10
            ${item.danger ? 'text-red-400' : ''}
          `}
          style={{ color: item.danger ? '#ff4444' : 'var(--text-primary)' }}
        >
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
