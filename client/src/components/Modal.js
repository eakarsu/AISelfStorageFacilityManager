import React from 'react';

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>
          {title}
          <button className="modal-close" onClick={onClose}>&times;</button>
        </h2>
        {children}
      </div>
    </div>
  );
}

export default Modal;
