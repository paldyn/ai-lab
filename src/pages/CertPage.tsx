import { useMemo } from 'react';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router';
import { CertMark } from '../components/CertMark';
import { useActiveHeading } from '../lib/activeHeading';
import { CertStars } from '../components/CertStars';
import { Seo } from '../components/Seo';
import { certById, type Cert, type CertStudyItem } from '../data/certs';
import { prepFor } from '../data/certPrep';
import { getArticleBySlug } from '../data/articles';

const TECHBLOG = 'https://techblog.paldyn.com/posts';

/**
 * 학습 경로의 글 한 줄. **두 사이트에 걸칩니다.**
 *
 * SQL·인프라는 techblog에 있어서 SQLD·SQLP는 그쪽 글로만 채워집니다. 어느
 * 사이트 글인지 배지로 갈라 두는 이유는, 누르면 다른 도메인으로 나간다는 것을
 * 누르기 전에 알려 주기 위해서입니다.
 */
function StudyLink({ item }: { item: CertStudyItem }) {
  if (item.site === 'techblog') {
    return (
      <a className="cert-study-item" href={`${TECHBLOG}/${item.slug}/`} target="_blank" rel="noreferrer">
        <span className="cert-study-badge cert-study-badge-tech">TECH</span>
        <span className="cert-study-title">{item.label ?? item.slug}</span>
        <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    );
  }

  const article = getArticleBySlug(item.slug);
  return (
    <Link className="cert-study-item" to={`/articles/${item.slug}`}>
      <span className="cert-study-badge">AI LAB</span>
      <span className="cert-study-title">{item.label ?? article?.title ?? item.slug}</span>
    </Link>
  );
}

/** 값이 있을 때만 줄을 세웁니다. 빈 칸을 「-」로 채우면 확인한 것처럼 보입니다. */
function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="cert-fact">
      <dt>{label}</dt>
      <dd>{value.replace(/\*\*/g, '')}</dd>
    </div>
  );
}

function CertView({ cert }: { cert: Cert }) {
  const prep = prepFor(cert.id);

  /*
    목차에 세울 절. 있는 절만 담습니다 — 학습 경로가 아직 없는 자격증도 있고,
    없는 절을 목차에 두면 눌렀을 때 아무 데도 안 갑니다.
  */
  const sections = useMemo(
    () =>
      [
        { id: 'what', title: '무엇을 재는 시험인가' },
        { id: 'subjects', title: '과목' },
        { id: 'exam', title: '시험 정보' },
        { id: 'prep', title: '시험 노트' },
        cert.studyPath.length > 0 ? { id: 'study', title: '관련 있는 우리 글' } : null,
        cert.notes ? { id: 'notes', title: '알아 둘 것' } : null,
      ].filter((section) => section !== null),
    [cert],
  );
  const { active, goTo } = useActiveHeading(useMemo(() => sections.map((item) => item.id), [sections]));

  return (
    <article>
      <Seo
        title={`${cert.nameKo} — 무엇을 재는 시험인가`}
        description={cert.whatItMeasures.slice(0, 180)}
        path={`/learn/certs/${cert.id}`}
      />

      <header className="site-wrap article-header">
        <Link to="/learn/certs" className="back-link">
          <ArrowLeft size={14} aria-hidden="true" /> 자격증
        </Link>
        {/*
          머리말을 둘로 가릅니다. 왼쪽은 「이게 무슨 자격증인가」(종류·이름·원문
          이름), 오른쪽은 「그래서 어떤가와 어디서 접수하나」(별 두 축과 공식
          페이지)입니다. 한 줄로 쌓아 두면 별과 링크가 제목 아래로 밀려 스크롤
          없이는 안 보였습니다. 좁은 화면에서는 그대로 위아래로 쌓입니다.
        */}
        <div className="cert-head">
          <div className="cert-head-left">
            <div className="cert-head-meta">
              <CertMark issuer={cert.issuer} />
              {/*
                등급(입문·중급·고급) 대신 자격의 종류를 답니다. 난이도는 별이 더
                잘게 말해 주고, 여기서 필요한 것은 취업 별의 근거인 「국가기술자격인가
                국가공인인가」입니다. 그 종류만 색과 굵기를 올려 둡니다.
              */}
              <p className="cert-head-line">
                <span>{cert.region}</span>
                <span aria-hidden="true">/</span>
                <b className={cert.status === '국가기술자격' ? 'is-national' : undefined}>{cert.status}</b>
                <span aria-hidden="true">/</span>
                <span>{cert.issuer}</span>
              </p>
            </div>
            <h1 className="mt-5 max-w-4xl text-[2rem] font-medium leading-[1.35] text-[var(--text-strong)] sm:text-[2.6rem]">
              {cert.nameKo}
            </h1>
            {cert.nameEn !== cert.nameKo && (
              <p className="mt-3 font-mono text-[12px] text-[var(--text-muted)]">{cert.nameEn}</p>
            )}
          </div>

          <div className="cert-head-right">
            {/*
              목록에서는 별만 세우고 근거는 여기서 답니다. 시행처가 매긴 값이 아니라
              우리가 매긴 값이라, 숫자만 두고 왜 그런지 안 적으면 그냥 우기는 것이 됩니다.
              그 사실은 맨 아래 확인 문단이 한 번 더 밝힙니다.
            */}
            <dl className="cert-ratings">
              <div>
                <dt>난이도</dt>
                <dd>
                  <CertStars value={cert.difficulty} size={14} />
                  <span>{cert.difficultyBasis}</span>
                </dd>
              </div>
              <div>
                <dt>취업</dt>
                <dd>
                  <CertStars value={cert.employment} size={14} />
                  <span>{cert.employmentBasis}</span>
                </dd>
              </div>
            </dl>
            <a className="cert-official" href={cert.officialUrl} target="_blank" rel="noreferrer">
              공식 페이지에서 일정·접수 확인 <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <div className="site-divider" />

      {/*
        절이 다섯이고 「시험 정보」와 「학습 경로」는 한참 아래에 있습니다. 글과
        같은 목차를 세워 바로 뛸 수 있게 합니다 — 짚는 동작과 이동은 글에서 쓰던
        `useActiveHeading`을 그대로 씁니다.
      */}
      <div className="site-wrap grid gap-12 py-14 lg:grid-cols-[220px_minmax(0,760px)] lg:justify-center">
        <aside className="article-toc lg:sticky lg:top-[138px] lg:self-start">
          <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-muted)]">IN THIS EXAM</p>
          <ol className="mt-4 space-y-3 border-l border-[var(--border)] pl-4 text-xs leading-5 text-[var(--text-dim)]">
            {sections.map((section, index) => (
              <li
                key={section.id}
                className={`article-toc-item${section.id === active ? ' is-current' : ''}`}
              >
                <a
                  href={`#${section.id}`}
                  className="hover:text-[var(--text)]"
                  aria-current={section.id === active ? 'true' : undefined}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    goTo(section.id);
                  }}
                >
                  {String(index + 1).padStart(2, '0')} {section.title}
                </a>
              </li>
            ))}
          </ol>
        </aside>

        <div className="min-w-0 cert-body">
        <section className="cert-section">
          <h2 id="what">무엇을 재는 시험인가</h2>
          <p className="cert-prose">{cert.whatItMeasures.replace(/\*\*/g, '')}</p>
          {cert.audience && (
            <>
              <h3>누가 보는가</h3>
              <p className="cert-prose">{cert.audience.replace(/\*\*/g, '')}</p>
            </>
          )}
        </section>

        <section className="cert-section">
          <h2 id="subjects">과목</h2>
          <ol className="cert-subjects">
            {cert.subjects.map((subject) => (
              <li key={subject.name}>
                <p className="cert-subject-head">
                  <span>{subject.name}</span>
                  {subject.weight && <span className="cert-subject-weight">{subject.weight}</span>}
                </p>
                {subject.note && <p className="cert-subject-note">{subject.note}</p>}
              </li>
            ))}
          </ol>
        </section>

        <section className="cert-section">
          <h2 id="exam">시험 정보</h2>
          <dl className="cert-facts">
            <Fact label="시행 주기" value={cert.cadence} />
            <Fact label="형식" value={cert.format} />
            <Fact label="응시료" value={cert.fee} />
            <Fact label="응시자격" value={cert.prerequisite} />
            <Fact label="유효기간" value={cert.validity} />
          </dl>
        </section>

        {/*
          **시험 노트가 학습 경로의 본체입니다.** 아래 「관련 있는 우리 글」은 이미
          있던 글을 과목에 매핑한 것인데, 그 글들은 시험을 보라고 쓴 것이 아니라
          개념을 설명하려고 쓴 것이라 「무엇을 외워야 붙는가」가 빠져 있습니다.
          시험 하나를 놓고 처음부터 쓴 글은 이쪽입니다.
        */}
        <section className="cert-section">
          <h2 id="prep">시험 노트</h2>
          {prep.length > 0 ? (
            <ol className="cert-prep-list">
              {prep.map((note) => (
                <li key={note.slug}>
                  <Link to={note.path} className="cert-prep-item">
                    <span className="cert-prep-order">{String(note.order).padStart(2, '0')}</span>
                    <span className="cert-prep-name">{note.title}</span>
                    <span className={`cert-prep-kind${note.kind === '문제' ? ' is-quiz' : ''}`}>
                      {note.kind}
                    </span>
                    <span className="cert-prep-time">{note.readTime} MIN</span>
                  </Link>
                  <p className="cert-prep-summary">{note.summary}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="cert-prose">
              이 시험의 노트는 아직 없습니다. 과목별 정리와 모의고사를 순서대로 채워 나갑니다.
            </p>
          )}
        </section>

        {cert.studyPath.length > 0 && (
          <section className="cert-section">
            <h2 id="study">관련 있는 우리 글</h2>
            <p className="cert-prose cert-study-intro">
              시험을 겨냥해 쓴 글은 아니지만 같은 개념을 다룹니다. 과목이 막힐 때 곁에 두고 읽습니다.
            </p>
            {cert.studyPath.map((group) => (
              <div key={group.subject} className="cert-study-group">
                <h3>{group.subject}</h3>
                <div className="cert-study-list">
                  {group.items.map((item) => (
                    <StudyLink key={`${item.site}:${item.slug}`} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {cert.notes && (
          <section className="cert-section">
            <h2 id="notes">알아 둘 것</h2>
            {/* 데이터가 「- 」로 시작하는 줄 목록이면 목록으로 그립니다. 한 문단으로 뭉치면 안 읽힙니다. */}
            <ul className="cert-notes">
              {cert.notes
                .split('\n')
                .map((line) => line.replace(/^-\s*/, '').replace(/\*\*/g, '').trim())
                .filter(Boolean)
                .map((line) => (
                  <li key={line}>{line}</li>
                ))}
            </ul>
          </section>
        )}

        <p className="cert-verified">
          난이도와 취업 별은 시행처가 준 값이 아니라 위에 적은 근거로 매긴 값입니다. 공식 페이지는{' '}
          <strong>{cert.verifiedAt}</strong>에 확인했습니다. 시험 제도는 개편이 잦으니 접수 전에{' '}
          <a href={cert.officialUrl} target="_blank" rel="noreferrer">
            시행처 안내
          </a>
          를 한 번 더 보세요.
        </p>
        </div>
      </div>
    </article>
  );
}

export function CertPage() {
  const { certId } = useParams<{ certId: string }>();
  const cert = certId ? certById(certId) : undefined;

  if (!cert) return <Navigate to="/learn/certs" replace />;

  return <CertView cert={cert} />;
}
