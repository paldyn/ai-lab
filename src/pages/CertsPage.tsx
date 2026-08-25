import { Link } from 'react-router';
import { Star } from 'lucide-react';
import { CertMark } from '../components/CertMark';
import { CertStars } from '../components/CertStars';
import { LearnRail } from '../components/LearnRail';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { certs, certsIn, studyCount, type Cert, type CertRating } from '../data/certs';

/**
 * 별 몇 개가 무엇인지. `certs.ts`의 `CertRating` 주석과 같은 눈금입니다.
 *
 * 두 축의 방향이 다릅니다 — 난이도는 많을수록 어렵고 취업은 많을수록 좋습니다.
 * 그래서 축 이름을 별 왼쪽에 붙여 둡니다. 이름 없이 별만 두면 「별 다섯이면
 * 좋은 자격증」으로 읽힙니다.
 */
const AXES: { name: string; steps: { stars: CertRating; text: string }[] }[] = [
  {
    name: '난이도',
    steps: [
      { stars: 1, text: '며칠이면 붙음' },
      { stars: 2, text: '입문서 한 권' },
      { stars: 3, text: '실무 경험 전제' },
      { stars: 4, text: '실기·코딩 있음' },
      { stars: 5, text: '응시자격이 걸림' },
    ],
  },
  {
    name: '취업',
    steps: [
      { stars: 1, text: '채용에서 안 쓰임' },
      { stars: 2, text: '벤더 자격·입문 등급' },
      { stars: 3, text: '국내에 흔한 스택' },
      { stars: 4, text: '국가공인 민간자격' },
      { stars: 5, text: '국가기술자격' },
    ],
  },
];

/**
 * 자격증 목록. 국내·해외로 나눠 세웁니다.
 *
 * **카드에는 넷만 둡니다** — 시행처 마크, 이름, 난이도, 취업. 예전에는 시행처·등급·
 * 주기 첫 문장·학습 경로 편수·확인 날짜까지 다섯 줄이 들어갔는데, 열넷을 훑는
 * 화면에서 그것들은 고르는 데 쓰이지 않고 줄만 늘렸습니다. 나머지는 상세에 있습니다.
 *
 * 별 두 줄은 **고를 때 실제로 다투는 두 값**입니다 — 얼마나 어려운가와 따서
 * 쓸 데가 있는가. 이 둘이 같이 보여야 「쉬운데 안 쳐주는 것」과 「어려운데
 * 제도로 인정되는 것」이 갈립니다.
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
        <dl className="cert-card-ratings">
          <div>
            <dt>난이도</dt>
            <dd>
              <CertStars value={cert.difficulty} size={12} />
            </dd>
          </div>
          <div>
            <dt>취업</dt>
            <dd>
              <CertStars value={cert.employment} size={12} />
            </dd>
          </div>
        </dl>
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
          {/*
            별이 무엇을 보고 매긴 눈금인지만 밝힙니다. 하나·셋·다섯이 각각 어떤
            시험인지까지 적어 봤는데, 기준을 알면 나머지는 별을 보면 되는 것이라
            줄만 길었습니다. 자격증마다의 근거는 상세에 있습니다.

            별은 목록의 별과 같은 금색 하나를 문장 안에 둡니다 — 옆에 견본을
            따로 세우면 그 자리가 「난이도 3」짜리 카드처럼 읽혔습니다.
          */}
          <p className="cert-legend">
            <Star className="cert-legend-star" size={13} strokeWidth={1.5} aria-hidden="true" /> 난이도는
            응시자격·시험 형식·권장 경력을, 취업은 자격의 법적 지위와 제도상 우대를 보고 매긴 값입니다.
          </p>

          {/*
            눈금은 글이 아니라 별로 보여 줍니다. 「별 하나는 며칠이면 붙는 시험」이라고
            적으면 읽고 나서 카드의 별을 다시 세어야 하는데, 별을 그대로 세워 두면
            카드에서 본 모양을 여기서 찾으면 됩니다. 빈 별은 그리지 않습니다 —
            열 줄이 50개가 되어 눈금이 아니라 격자로 보입니다.
          */}
          <dl className="cert-scale">
            {AXES.map((axis) => (
              <div key={axis.name}>
                <dt>{axis.name}</dt>
                <dd>
                  {axis.steps.map((step) => (
                    <span key={step.stars}>
                      <CertStars value={step.stars} total={step.stars} size={11} />
                      {step.text}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>

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
