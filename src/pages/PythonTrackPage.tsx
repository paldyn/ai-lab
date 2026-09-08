import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router';
import { LearnTabs } from '../components/LearnTabs';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { pythonNoteCount, pythonSections } from '../data/mirror';
import { prefetchMirrorBody } from '../lib/mirrorBody';

/**
 * 파이썬 읽는 순서.
 *
 * **여기 실린 글은 우리가 쓴 것이 아닙니다.** 원본은 `paldyn/tech-blog`이고 파이썬만
 * 265편이 있습니다. 같은 것을 다시 쓰는 대신 AI에 필요한 것만 골라 순서를 매기고,
 * 본문은 원본 마크다운을 그대로 옮겨 우리 화면으로 그립니다. 무엇을 어떤 순서로
 * 옮길지는 `src/data/pythonTrack.ts`가 정합니다.
 */
export function PythonTrackPage() {
  return (
    <>
      <Seo
        title="파이썬"
        description="AI를 하려면 파이썬의 어디까지 알아야 하는지, 그 순서를 정리했습니다. 본문은 PALDYN Tech Blog의 글입니다."
        path="/learn/python"
      />

      <PageHeader
        kicker="PALDYN LEARN"
        title="파이썬"
        description="AI 코드를 읽고 고치는 데 필요한 만큼만 골라 순서를 매겼습니다. 본문은 PALDYN Tech Blog의 글을 그대로 싣습니다."
        stats={[
          { label: '읽는 순서', value: `${pythonNoteCount}편` },
          { label: '묶음', value: String(pythonSections.length).padStart(2, '0') },
        ]}
      />

      <LearnTabs active="lang" />

      <div className="site-wrap learn-layout is-wide">

        <section className="learn-list">
          {/*
            출처를 목록 맨 위에서 한 번 밝힙니다. 글마다도 머리에 한 줄이 붙지만,
            들어오기 전에 「이건 옆 사이트 글이다」를 알고 눌러야 합니다.
          */}
          <p className="mirror-source-note">
            파이썬은 <a href="https://techblog.paldyn.com">PALDYN Tech Blog</a>가 265편으로 다룹니다.
            같은 글을 다시 쓰지 않고 그중 AI에 필요한 것만 골라 여기 순서대로 싣습니다 — 본문은
            원문 그대로이고, 고치는 자리도 그쪽입니다.
          </p>

          {pythonSections.map((section) => (
            <section key={section.id} className="mirror-section">
              <h2 className="mirror-section-title">{section.title}</h2>
              <p className="mirror-section-note">{section.note}</p>

              <ol className="mirror-list">
                {section.notes.map((note, index) => (
                  <li key={note.slug} className="mirror-item">
                    <Link
                      to={note.path}
                      className="mirror-item-link card-trigger"
                      onMouseEnter={() => prefetchMirrorBody(note.sourceSlug)}
                      onFocus={() => prefetchMirrorBody(note.sourceSlug)}
                    >
                      <span className="mirror-item-index">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="mirror-item-title">{note.title}</span>
                    </Link>
                    <p className="mirror-item-summary">{note.summary}</p>
                    <p className="mirror-item-meta">
                      <span>{note.readTime} MIN</span>
                      <span aria-hidden="true">/</span>
                      <a href={note.sourceUrl} className="mirror-item-source">
                        원문 <ArrowUpRight size={11} aria-hidden="true" />
                      </a>
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </section>
      </div>
    </>
  );
}
