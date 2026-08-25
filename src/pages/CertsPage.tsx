import { Link } from 'react-router';
import { CertMark } from '../components/CertMark';
import { CertStars } from '../components/CertStars';
import { LearnRail } from '../components/LearnRail';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { certs, certsIn, studyCount, type Cert } from '../data/certs';

/**
 * 자격증 목록. 국내·해외로 나눠 세웁니다.
 *
 * **카드에는 셋만 둡니다** — 시행처 마크, 이름, 난이도. 예전에는 시행처·등급·주기
 * 첫 문장·학습 경로 편수·확인 날짜까지 다섯 줄이 들어갔는데, 열넷을 훑는 화면에서
 * 그것들은 고르는 데 쓰이지 않고 줄만 늘렸습니다. 나머지는 전부 상세에 있습니다.
 */
function CertCard({ cert }: { cert: Cert }) {
  return (
    <article className="cert-card">
      <CertMark issuer={cert.issuer} />
      <div className="cert-card-body">
        <h3 className="cert-card-title">
          <Link to={`/learn/certs/${cert.id}`} className="card-trigger">
            {cert.nameKo}
          </Link>
        </h3>
        <CertStars value={cert.difficulty} size={12} />
      </div>
    </article>
  );
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
