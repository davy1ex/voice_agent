/**
 * Примеры использования модальных окон
 */

import { Modal, useModal, withModal, withModalContent } from './index';

// Example 1: Using useModal hook
export function ExampleWithHook() {
  const { isOpen, open, close } = useModal();

  return (
    <>
      <button onClick={open}>Открыть модалку</button>
      <Modal isOpen={isOpen} onClose={close} title="Пример модалки">
        <p>Контент модального окна</p>
      </Modal>
    </>
  );
}

// Example 2: Using withModal HOC
interface MyComponentProps {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

function MyComponent({ isModalOpen, openModal, closeModal }: MyComponentProps) {
  return (
    <>
      <button onClick={openModal}>Открыть</button>
      <Modal isOpen={isModalOpen} onClose={closeModal} title="HOC пример">
        <p>Контент через HOC</p>
      </Modal>
    </>
  );
}

export const MyComponentWithModal = withModal(MyComponent);

// Example 3: Using withModalContent
function MyContent({ message }: { message: string }) {
  return <div>{message}</div>;
}

export const MyModalContent = withModalContent(MyContent, {
  title: 'Заголовок',
  size: 'md',
});

// Usage:
// <MyModalContent isOpen={isOpen} onClose={close} message="Hello!" />

