import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Seo } from '../components/Seo';

export function NotFoundPage() {
  return (
    <section className="site-wrap flex min-h-[62vh] flex-col items-center justify-center py-24 text-center">
      <Seo
        title="페이지를 찾을 수 없습니다"
        description="요청한 주소에 해당하는 문서가 없습니다."
        path="/404"
        noindex
      />
      <p className="font-mono text-[11px] tracking-[0.18em] text-[var(--brand-text)]">ERROR / 404</p>
      <h1 className="mt-5 text-3xl font-light text-[var(--text-strong)]">페이지를 찾을 수 없습니다.</h1>
      <p className="mt-4 text-sm text-[var(--text-dim)]">주소가 바뀌었거나 아직 공개되지 않은 기록입니다.</p>
      <Link to="/" className="back-link mt-8"><ArrowLeft size={14} aria-hidden="true" /> 홈으로 돌아가기</Link>
    </section>
  );
}
