import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { captureFocusOrigin, focusQuietly, restoreFocus } from '../lib/restoreFocus';

import type { ZoomedImage } from '../lib/imageZoom';

/**
 * 본문 그림을 눌러 크게 보는 화면. techblog.paldyn.com과 같은 동작입니다.
 *
 * 글의 그림은 대부분 SVG 도식이라 본문 폭(760px)에서는 글자가 작습니다. 크게 볼 길이
 * 없으면 새 탭에서 파일을 직접 여는 수밖에 없었습니다.
 *
 * **어디를 눌러도 닫힙니다.** 커서가 이미 축소 돋보기인데 그림 위에서만 아무 일도
 * 안 일어나면, 커서가 없는 동작을 가리키는 셈입니다.
 *
 * 배경을 `inert`로 만들고 스크롤을 잠그는 방식은 뉴스 모달과 같습니다 —
 * 자세한 이유는 `NewsPreviewModal`과 `lib/restoreFocus.ts`의 주석에 있습니다.
 */
export function ImageLightbox({ image, onClose }: { image: ZoomedImage | null; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isOpen = image !== null;

  useEffect(() => {
    if (!isOpen) return undefined;

    const appRoot = document.getElementById('root');
    const previousOverflow = document.body.style.overflow;
    const origin = captureFocusOrigin();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };

    appRoot?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    if (origin.keyboard) closeButtonRef.current?.focus();
    else focusQuietly(closeButtonRef.current);

    return () => {
      appRoot?.removeAttribute('inert');
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocus(origin);
    };
  }, [isOpen, onClose]);

  if (!image) return null;

  return createPortal(
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="그림 크게 보기">
      {/*
        바탕도 진짜 단추입니다. div에 클릭만 얹으면 마우스로만 닫히고, 읽는 기계에는
        누를 것이 있다는 사실조차 안 보입니다. 이름은 위 닫기 단추가 이미 말하므로
        여기서는 감추고 탭 차례에서도 뺍니다 — 같은 말을 두 번 읽히지 않습니다.
      */}
      <button
        type="button"
        className="lightbox-surface"
        onClick={onClose}
        tabIndex={-1}
        aria-hidden="true"
      >
        {/* alt는 본문의 것을 그대로 씁니다 — 같은 그림이므로 설명도 같아야 합니다. */}
        <img className="lightbox-img" src={image.src} alt={image.alt} />
      </button>
      <button ref={closeButtonRef} type="button" className="lightbox-close" aria-label="닫기" onClick={onClose}>
        <X size={20} aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
}
