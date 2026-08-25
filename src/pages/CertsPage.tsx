import { Link } from 'react-router';
import { LearnRail } from '../components/LearnRail';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { certs, certsIn, studyCount, type Cert } from '../data/certs';

/**
 * 자격증 목록. 국내·해외로 나눠 세웁니다.
 *
 * 카드에 **시행 주기와 확인한 날짜**를 함께 적습니다. 목록에서 회차 날짜를
 * 찾으러 온 사람에게 「여기에는 날짜가 없다」를 먼저 알려 주는 편이,
 * 상세로 들어갔다가 되돌아 나오는 것보다 낫습니다.
 */
function CertCard({ cert }: { cert: Cert }) {
  const count = studyCount(cert);

  return (
    <article className="cert-card">
      <p className="cert-card-meta">
        <span>{cert.issuer}</span>
        <span aria-hidden="true">/</span>
        <span>{cert.level}</span>
      </p>
      <h3 className="cert-card-title">
        <Link to={`/certs/${cert.id}`} className="card-trigger">
          {cert.nameKo}
        </Link>
      </h3>
      {cert.nameEn !== cert.nameKo && <p className="cert-card-en">{cert.nameEn}</p>}
      <p className="cert-card-cadence">{firstSentence(cert.cadence)}</p>
      <p className="cert-card-foot">
        {count > 0 ? `학습 경로 ${count}편` : '학습 경로 준비 중'}
        <span aria-hidden="true"> · </span>
        <span className="cert-card-verified">{cert.verifiedAt} 확인</span>
      </p>
    </article>
  );
}

/** 카드에는 주기의 첫 문장만 씁니다. 나머지는 상세에서 읽습니다. */
function firstSentence(text: string): string {
  const cut = text.replace(/\*\*/g, '').split(/(?<=[.。])\s/)[0];
  return cut.length > 74 ? `${cut.slice(0, 72)}…` : cut;
}

export function CertsPage() {
  const domestic = certsIn('국내');
  const overseas = certsIn('해외');
  const paths = certs.reduce((sum, cert) => sum + studyCount(cert), 0);

  return (
    <>
      <Seo
        title="AI 자격증"
        description="AI·데이터 자격증이 무엇을 재는 시험인지, 어떤 글부터 읽으면 되는지 정리합니다. 시험 일정은 공식 페이지로 보냅니다."
        path="/learn/certs"
      />
      <PageHeader
        kicker="PALDYN LEARN"
        title="자격증"
        description="무엇을 재는 시험인지, 과목이 어떻게 나뉘는지, 그리고 우리 글 어디부터 읽으면 되는지 정리합니다."
        statsLabel="공식 페이지에서 확인한 것만 싣습니다"
        stats={[
          { label: '자격증', value: `${certs.length}개` },
          { label: '학습 경로', value: `${paths}편` },
        ]}
      />

      {/* 글 목록과 같은 레이아웃을 씁니다 — 자격증은 학습의 한 칸이지 다른 페이지가 아닙니다. */}
      <div className="site-wrap learn-layout">
        <LearnRail active="certs" />

        <section className="learn-list">
          <p className="cert-notice">
            <strong>회차 날짜는 싣지 않습니다.</strong> 접수 기간과 시험일은 해마다 바뀌고, 틀린 날짜는 없는 것보다
            나쁩니다. 여기에는 시행처가 규칙으로 못 박은 주기만 두고 정확한 일정은 공식 페이지로 보냅니다.
          </p>

          {[
            { title: '국내', items: domestic },
            { title: '해외', items: overseas },
          ].map((group) => (
            <div key={group.title} className="cert-group">
              <h2 className="cert-group-title">
                {group.title}
                <span className="cert-group-count">{group.items.length}</span>
              </h2>
              <div className="cert-grid">
                {group.items.map((cert) => (
                  <CertCard key={cert.id} cert={cert} />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
