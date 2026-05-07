import React, { createContext, useState, useContext, useCallback } from 'react';
import Modal from '../components/Modal';

const ModalContext = createContext(null);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info', // 'info', 'error', 'success'
    onConfirm: null,
    confirmText: 'OK',
    cancelText: null,
  });

  const showModal = useCallback(({ title, message, type = 'info', onConfirm = null, confirmText = 'OK', cancelText = null }) => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText,
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (modalConfig.onConfirm) {
      modalConfig.onConfirm();
    }
    hideModal();
  }, [modalConfig, hideModal]);

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        onClose={hideModal}
        onConfirm={handleConfirm}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
      />
    </ModalContext.Provider>
  );
};
