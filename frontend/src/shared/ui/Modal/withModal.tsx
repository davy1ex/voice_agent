import { useState, useCallback } from 'react';
import type { ComponentType } from 'react';
import { Modal } from './Modal';

interface WithModalProps {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;
}

/**
 * HOC for adding modal functionality to a component
 * 
 * @param WrappedComponent - Component to wrap
 * @param modalConfig - Modal configuration
 * @returns Component with modal props
 * 
 * @example
 * ```tsx
 * const MyComponent = ({ isModalOpen, openModal, closeModal }) => (
 *   <>
 *     <button onClick={openModal}>Открыть</button>
 *     <Modal isOpen={isModalOpen} onClose={closeModal}>
 *       Контент модалки
 *     </Modal>
 *   </>
 * );
 * 
 * export default withModal(MyComponent);
 * ```
 */
export function withModal<P extends object>(
  WrappedComponent: ComponentType<P & WithModalProps>
) {
  return function WithModalComponent(props: P) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = useCallback(() => setIsModalOpen(true), []);
    const closeModal = useCallback(() => setIsModalOpen(false), []);
    const toggleModal = useCallback(() => setIsModalOpen((prev) => !prev), []);

    return (
      <WrappedComponent
        {...props}
        isModalOpen={isModalOpen}
        openModal={openModal}
        closeModal={closeModal}
        toggleModal={toggleModal}
      />
    );
  };
}

/**
 * HOC for creating a component with an embedded modal window
 * 
 * @param WrappedComponent - Component to display in the modal
 * @param modalConfig - Modal configuration
 * @returns Component with a modal window
 * 
 * @example
 * ```tsx
 * const MyContent = () => <div>Modal content</div>;
 * 
 * const MyModal = withModalContent(MyContent, { title: 'Title' });
 * 
 * // Usage:
 * <MyModal isOpen={isOpen} onClose={onClose} />
 * ```
 */
export function withModalContent<P extends object>(
  WrappedComponent: ComponentType<P>,
  modalConfig?: {
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
  }
) {
  return function ModalContentComponent(
    props: P & { isOpen: boolean; onClose: () => void }
  ) {
    const { isOpen, onClose, ...componentProps } = props;

    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={modalConfig?.title}
        size={modalConfig?.size}
        closeOnOverlayClick={modalConfig?.closeOnOverlayClick}
        closeOnEscape={modalConfig?.closeOnEscape}
      >
        <WrappedComponent {...(componentProps as P)} />
      </Modal>
    );
  };
}

