import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router';
import { certs, certsIn, studyCount, type Cert } from '../data/certs';
import { captureFocusOrigin, focusQuietly, restoreFocus } from '../lib/restoreFocus';
import { lockScroll } from '../lib/scrollLock';

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/*
  데이터가 정적이라 모듈이 한 번만 나눕니다. 목록이 열릴 때마다 다시 거르면
  같은 결과를 14번 만드는 것뿐이고, 팝업은 누른 즉시 떠야 합니다.
*/
const GROUPS = [
  { title: '국내', items: certsIn('국내') },
  { title: '해외', items: certsIn('해외') },
];

/**
 * 자격증 한 줄. **누르면 상세 페이지로 나갑니다.**
 *
 * 팝업 안에서 내용까지 다 보여 주지 않는 이유는 상세가 검색 유입을 받는
 * 페이지이기 때문입니다 — 프리렌더된 HTML이 있어야 그 유입이 살아 있습니다.
 * 팝업은 '어느 자격증인가'를 고르는 데까지만 씁니다.
 */
function CertRow({ cert, onPick }: { cert: Cert; onPick: () => void }) {
  const count = studyCount(cert);

  return (
    <Link to={`/learn/certs/${cert.id}`} className="cert-picker-item" onClick={onPick}>
      <span className="cert-picker-item-name">{cert.nameKo}</span>
      <span className="cert-picker-item-meta">
        {cert.issuer}
        <span aria-hidden="true"> / </span>
        {cert.level}
      </span>
      <span className="cert-picker-item-foot">
        {count > 0 ? `학습 경로 ${count}편` : '학습 경로 준비 중'}
        <ArrowRight size={13} aria-hidden="true" />
      </span>
    </Link>
  );
}

/**
 * 자격증 고르기 팝업.
 *
 * **자격증은 메뉴 한 칸을 차지할 만큼 자주 가는 곳이 아닙니다.** 그렇다고
 * 학습 레일 맨 아래에만 두면 학습 목록에 들어온 사람만 봅니다. 그래서 어느
 * 화면에서나 누를 수 있는 단추 하나를 머리띠에 두고, 고르는 일만 여기서
 * 끝냅니다. 상세는 그대로 페이지입니다.
 *
 * 열고 닫는 규칙은 소식 팝업(`NewsPreviewModal`)과 같습니다 — 배경을 inert로
 * 잠그고, 문서 스크롤을 묶고, Esc로 닫고, 닫으면 누른 자리로 포커스를
 * 되돌립니다. 두 팝업이 다르게 굴면 그것 자체가 버그로 읽힙니다.
 */
export function CertPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // onClose가 호출부에서 인라인 화살표 함수로 오므로 ref로 감쌉니다. 그래야
  // 아래 effect가 열림/닫힘에만 반응합니다.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const close = useCallback(() => onCloseRef.current(), []);

  useEffect(() => {
    if (!open) return undefined;

    const appRoot = document.getElementById('root');
    const origin = captureFocusOrigin();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    appRoot?.setAttribute('inert', '');
    const unlock = lockScroll();
    document.addEventListener('keydown', handleKeyDown);

    if (origin.keyboard) closeButtonRef.current?.focus();
    else focusQuietly(closeButtonRef.current);

    return () => {
      appRoot?.removeAttribute('inert');
      unlock();
      document.removeEventListener('keydown', handleKeyDown);
      restoreFocus(origin);
    };
  }, [open, close]);

  if (!open) return null;

  /*
    나가는 길은 오른쪽 위 닫기와 Esc 둘입니다. 배경 클릭은 소식 팝업에서 이미
    걷어냈습니다 — 목록을 훑다 가장자리를 스쳐 닫히는 일이 잦고, 두 팝업이
    다르게 굴면 그 자체가 버그로 읽힙니다.
  */
  return createPortal(
    <div className="cert-picker-backdrop">
      <section
        ref={dialogRef}
        className="cert-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cert-picker-title"
      >
        <header className="cert-picker-bar">
          <div>
            <span aria-hidden="true" /> PALDYN LEARN
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="cert-picker-close"
            onClick={close}
            aria-label="자격증 고르기 닫기"
          >
            <X size={16} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </header>

        <div className="cert-picker-head">
          <h2 id="cert-picker-title">
            자격증 <b>{certs.length}</b>
          </h2>
          <p>
            무엇을 재는 시험인지, 과목이 어떻게 나뉘는지, 우리 글 어디부터 읽으면 되는지를 자격증마다 적어
            두었습니다. 회차 날짜는 싣지 않고 공식 페이지로 보냅니다.
          </p>
        </div>

        <div className="cert-picker-body">
          {GROUPS.map((group) => (
            <section key={group.title} className="cert-picker-group">
              <h3>
                {group.title}
                <span>{group.items.length}</span>
              </h3>
              <div className="cert-picker-grid">
                {group.items.map((cert) => (
                  <CertRow key={cert.id} cert={cert} onPick={close} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="cert-picker-foot">
          <Link to="/learn/certs" onClick={close}>
            자격증 목록 페이지 열기
            <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
