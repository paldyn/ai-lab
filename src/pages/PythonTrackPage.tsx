import { Navigate, useParams } from 'react-router';
import { LearnRail } from '../components/LearnRail';
import { LearnTabs } from '../components/LearnTabs';
import { MirrorCard } from '../components/MirrorCard';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { pythonNoteCount, pythonSectionById, pythonSections } from '../data/mirror';

/**
 * 파이썬 읽는 순서.
 *
 * **여기 실린 글은 우리가 쓴 것이 아닙니다.** 원본은 `paldyn/tech-blog`이고 파이썬만
 * 265편이 있습니다. 같은 것을 다시 쓰는 대신 AI에 필요한 것만 골라 순서를 매기고,
 * 본문은 빌드 직전에 원본 마크다운을 받아 우리 화면으로 그립니다. 무엇을 어떤 순서로
 * 실을지는 `src/data/pythonTrack.ts`가 정합니다.
 *
 * **화면은 다른 갈래와 같습니다** — 왼쪽에 묶음 레일, 오른쪽에 글 줄입니다. 옮겨 온
 * 글이라고 다른 모양으로 세우면 목록이 두 벌이 되고, 읽는 사람에게는 어차피 같은
 * 「읽을 것」입니다.
 */
export function PythonTrackPage() {
  const { section: sectionId } = useParams<{ section?: string }>();
  const section = sectionId ? pythonSectionById(sectionId) : undefined;

  if (sectionId && !section) return <Navigate to="/learn/python" replace />;

  const shown = section ? [section] : pythonSections;
  const count = shown.reduce((sum, item) => sum + item.notes.length, 0);
  const title = section ? `파이썬 · ${section.title}` : '파이썬';

  return (
    <>
      <Seo
        title={title}
        description={
          section
            ? `${section.note} PALDYN Tech Blog의 글 ${count}편입니다.`
            : 'AI를 하려면 파이썬의 어디까지 알아야 하는지, 그 순서를 정리했습니다. 본문은 PALDYN Tech Blog의 글입니다.'
        }
        path={section ? `/learn/python/${section.id}` : '/learn/python'}
      />

      <PageHeader
        kicker="PALDYN LEARN"
        title={title}
        description={
          section
            ? section.note
            : 'AI 코드를 읽고 고치는 데 필요한 만큼만 골라 순서를 매겼습니다. 본문은 PALDYN Tech Blog의 글을 그대로 싣습니다.'
        }
        stats={[
          { label: section ? section.title : '읽는 순서', value: `${count}편` },
          { label: '파이썬 전체', value: `${pythonNoteCount}편` },
        ]}
      />

      <LearnTabs active="lang" />

      <div className="site-wrap learn-layout">
        <LearnRail tab="lang" active={section?.id ?? 'python'} />

        <section className="learn-list">
          {/*
            출처를 목록 맨 위에서 한 번 밝힙니다. 글마다도 머리에 한 줄이 붙지만,
            들어오기 전에 「이건 옆 사이트 글이다」를 알고 눌러야 합니다.
          */}
          <p className="mirror-source-note">
            파이썬은 <a href="https://techblog.paldyn.com">PALDYN Tech Blog</a>가 265편으로
            다룹니다. 같은 글을 두 곳에서 관리하지 않으려고, 원본은 그대로 두고 그중 AI에
            필요한 것만 골라 여기 순서대로 싣습니다 — 본문은 빌드할 때마다 원문에서 받아
            오므로 고치는 자리도 그쪽입니다.
          </p>

          {shown.map((item) => (
            <section key={item.id} className="mirror-section">
              {/* 한 묶음만 볼 때는 머리말이 위에 이미 있으므로 제목을 다시 세우지 않습니다. */}
              {!section && (
                <>
                  <h2 className="mirror-section-title">{item.title}</h2>
                  <p className="mirror-section-note">{item.note}</p>
                </>
              )}

              <div className="mt-5">
                {item.notes.map((note, index) => (
                  <MirrorCard key={note.slug} note={note} index={index + 1} section={item.title} />
                ))}
              </div>
            </section>
          ))}
        </section>
      </div>
    </>
  );
}
