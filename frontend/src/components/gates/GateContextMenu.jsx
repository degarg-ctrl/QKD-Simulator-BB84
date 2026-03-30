import { useEffect, useRef } from 'react';

export default function GateContextMenu({ position, gate, onDelete, onCopy, onViewMatrix, onClose }) {
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
    { label: 'View Matrix', icon: '🔢', action: onViewMatrix },
    { label: 'Copy Gate', icon: '📋', action: onCopy },
    { label: 'Delete', icon: '🗑️', action: onDelete, danger: true },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-900 border border-gray-700 rounded shadow-lg z-50 py-1"
      style={{ left: position.x, top: position.y }}
    >
      {menuItems.map((item, idx) => (
        <button
          key={idx}
          onClick={() => {
            item.action();
            onClose();
          }}
          className={`
            w-full px-4 py-2 text-left text-sm flex items-center gap-2
            hover:bg-gray-800
            ${item.danger ? 'text-red-400' : 'text-gray-300'}
          `}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
