import { Link } from 'react-router';
import { Star } from 'lucide-react';
import { CertMark } from '../components/CertMark';
import { CertStars } from '../components/CertStars';
import { LearnRail } from '../components/LearnRail';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { certs, certsIn, type Cert } from '../data/certs';
import { certPrepNotes } from '../data/certPrep';

/**
 * 자격증 한 줄. **카드 격자가 아니라 행입니다.**
 *
 * 격자로 두면 이름과 별이 칸마다 다른 자리에서 시작해 열넷을 세로로 훑을 수가
 * 없습니다. 행으로 세우면 별이 오른쪽 한 줄에 모여, 「어느 것이 더 센가」가
 * 눈으로 바로 비교됩니다 — 목록에서 하는 일이 그것뿐입니다.
 *
 * 한 줄에 넷을 답니다 — 시행처 마크, 이름, 자격의 종류, 별 두 축. 주기·응시료·
 * 학습 경로 편수는 고르는 데 쓰이지 않아 상세로 보냈습니다.
 */
function CertRow({ cert }: { cert: Cert }) {
  return (
    <article className="cert-row">
      <CertMark issuer={cert.issuer} />
      <div className="cert-row-main">
        <h3 className="cert-row-title">
          <Link to={`/learn/certs/${cert.id}`} className="card-trigger">
            {cert.nameKo}
          </Link>
        </h3>
        {/*
          자격의 종류. 국가기술자격인지 국가공인 민간자격인지가 취업 별을 정한
          1차 근거라, 별만 보이고 이 값이 안 보이면 별이 어디서 왔는지 알 수
          없습니다. 국가기술자격만 색을 넣어 나머지와 갈라 둡니다.
        */}
        <p className={`cert-status cert-status-${cert.status === '국가기술자격' ? 'national' : 'other'}`}>
          {cert.status}
        </p>
      </div>
      <dl className="cert-row-ratings">
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
    </article>
  );
}

export function CertsPage() {
  const domestic = certsIn('국내');
  const overseas = certsIn('해외');
  // 머리말 숫자는 대비 글을 셉니다 — 학습 경로의 본체가 그쪽이고 매핑은 곁다리입니다.
  const prepCount = certPrepNotes.length;

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
          { label: '대비 글', value: `${prepCount}편` },
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

          {[
            { title: '국내', items: domestic },
            { title: '해외', items: overseas },
          ].map((group) => (
            <div key={group.title} className="cert-group">
              <h2 className="cert-group-title">
                {group.title}
                <span className="cert-group-count">{group.items.length}</span>
              </h2>
              <div className="cert-rows">
                {group.items.map((cert) => (
                  <CertRow key={cert.id} cert={cert} />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
