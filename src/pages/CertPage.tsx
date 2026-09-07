import { type ReactNode, useMemo, useRef } from "react";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link, Navigate, useParams } from "react-router";
import { CertMark } from "../components/CertMark";
import { ArticleToc } from "../components/ArticleToc";
import { useActiveHeading } from "../lib/activeHeading";
import { ArticleTitleBar } from "../components/ArticleTitleBar";
import { CertStars } from "../components/CertStars";
import { Seo } from "../components/Seo";
import {
  certById,
  nextSession,
  sessionsByYear,
  type Cert,
  type CertExamSession,
  type CertStudyItem,
} from "../data/certs";
import {
  prepGroups,
  prepHold,
  prepProgress,
  type CertPrepRow,
} from "../data/certPrep";
import { getArticleBySlug } from "../data/articles";

const TECHBLOG = "https://techblog.paldyn.com/posts";

/**
 * 학습 경로의 글 한 줄. **두 사이트에 걸칩니다.**
 *
 * SQL·인프라는 techblog에 있어서 SQLD·SQLP는 그쪽 글로만 채워집니다. 어느
 * 사이트 글인지 배지로 갈라 두는 이유는, 누르면 다른 도메인으로 나간다는 것을
 * 누르기 전에 알려 주기 위해서입니다.
 */
function StudyLink({ item }: { item: CertStudyItem }) {
  if (item.site === "techblog") {
    return (
      <a
        className="cert-study-item"
        href={`${TECHBLOG}/${item.slug}/`}
        target="_blank"
        rel="noreferrer"
      >
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
      <span className="cert-study-title">
        {item.label ?? article?.title ?? item.slug}
      </span>
    </Link>
  );
}

/**
 * 날짜를 「8. 30.(토)」로 줄여 적습니다. 연도는 표 위의 제목이 들고 있으므로
 * 칸마다 되풀이하지 않습니다 — 네 칸에 네 번 적으면 정작 읽어야 하는 월·일이 묻힙니다.
 *
 * 다만 접수가 앞 해에 시작하는 회차가 있을 수 있어, 표의 연도와 다른 값이면
 * 그때만 연도를 붙입니다.
 */
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

function dayOf(iso: string, shownYear?: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  // UTC로 만들어 시간대에 따라 하루가 밀리지 않게 합니다.
  const at = new Date(Date.UTC(year, month - 1, day));
  const label = `${month}. ${day}.(${WEEKDAY[at.getUTCDay()]})`;
  return shownYear && iso.slice(0, 4) !== shownYear
    ? `${year}. ${label}`
    : label;
}

/**
 * 회차의 지금 상태.
 *
 * 표를 여는 사람이 줄마다 묻는 것은 하나입니다 — **지금 신청할 수 있는가.**
 * 날짜만 늘어놓으면 그 답을 머릿속에서 계산해야 하고, 접수가 이미 끝났는데
 * 시험일이 남은 회차에서 특히 헷갈립니다.
 *
 * 값은 오늘 날짜에 달려 있습니다. 프리렌더된 HTML은 빌드한 날의 상태를 담고
 * 있다가 화면에서 다시 계산됩니다 — 루틴이 매일 빌드하므로 어긋나야 하루입니다.
 */
type SessionState = "done" | "open" | "before" | "closed";

const STATE_LABEL: Record<Exclude<SessionState, "done">, string> = {
  before: "접수 전",
  open: "접수 중",
  closed: "접수 마감",
};

function stateOf(
  session: CertExamSession,
  today: string,
): SessionState | undefined {
  if (session.examDate < today) return "done";
  // 접수 날짜를 모르면 상태도 모릅니다. 「접수 중」으로 단정하지 않습니다.
  if (!session.applyFrom && !session.applyTo) return undefined;
  if (session.applyFrom && today < session.applyFrom) return "before";
  if (session.applyTo && today > session.applyTo) return "closed";
  return "open";
}

/**
 * 일정 표의 칸.
 *
 * 시행처 표를 그대로 옮기면 자격증마다 칸이 다릅니다 — 빅데이터분석기사에는
 * 수험표 발급일과 서류 제출 기간이 있고 ADsP에는 없습니다. 그래서 칸을 미리
 * 박아 두지 않고 **그 자격증이 실제로 가진 값만** 세웁니다. 순서는 시행처 표와
 * 같은 시간 순입니다 — 접수 → 수험표 → 시험 → 사전점수공개 → 발표 → 서류제출.
 */
interface ScheduleColumn {
  key: string;
  label: string;
  has: (session: CertExamSession) => boolean;
  cell: (session: CertExamSession, year: string, today: string) => ReactNode;
}

const SCHEDULE_COLUMNS: ScheduleColumn[] = [
  {
    key: "apply",
    label: "접수",
    has: (session) => Boolean(session.applyFrom ?? session.applyTo),
    /*
      접수 기간 옆에 지금 상태를 답니다. 이미 치른 회차에는 붙이지 않습니다 —
      당연한 말이 됩니다.
    */
    cell: (session, year, today) => {
      const state = stateOf(session, today);

      return (
        <>
          {period(session.applyFrom, session.applyTo, year)}
          {state && state !== "done" && (
            <span className={`cert-schedule-state is-${state}`}>
              {STATE_LABEL[state]}
            </span>
          )}
        </>
      );
    },
  },
  {
    key: "ticket",
    label: "수험표",
    has: (session) => Boolean(session.ticketDate),
    cell: (session, year) =>
      session.ticketDate ? dayOf(session.ticketDate, year) : "—",
  },
  {
    key: "exam",
    label: "시험일",
    has: () => true,
    cell: (session, year) => dayOf(session.examDate, year),
  },
  {
    key: "preview",
    label: "사전점수공개",
    has: (session) => Boolean(session.previewFrom ?? session.previewTo),
    cell: (session, year) =>
      period(session.previewFrom, session.previewTo, year),
  },
  {
    key: "result",
    label: "발표",
    has: (session) => Boolean(session.resultDate),
    cell: (session, year) =>
      session.resultDate ? dayOf(session.resultDate, year) : "—",
  },
  {
    key: "document",
    label: "서류제출",
    has: (session) => Boolean(session.documentFrom ?? session.documentTo),
    cell: (session, year) =>
      period(session.documentFrom, session.documentTo, year),
  },
  {
    key: "note",
    label: "비고",
    has: (session) => Boolean(session.note),
    cell: (session) => session.note ?? "—",
  },
];

function scheduleColumns(schedule: CertExamSession[]): ScheduleColumn[] {
  return SCHEDULE_COLUMNS.filter((column) =>
    schedule.some((session) => column.has(session)),
  );
}

function period(from?: string, to?: string, shownYear?: string): string {
  if (!from && !to) return "—";
  if (from && to) return `${dayOf(from, shownYear)} ~ ${dayOf(to, shownYear)}`;
  return dayOf((from ?? to) as string, shownYear);
}

/** 값이 있을 때만 줄을 세웁니다. 빈 칸을 「-」로 채우면 확인한 것처럼 보입니다. */
/**
 * 시험 정보 한 줄.
 *
 * **값의 앞머리만 강조합니다.** 「50,000원. 공식 검정수수료 표의 …」처럼 값 하나
 * 뒤에 근거 문장이 붙는 꼴이라, 앞머리가 곧 답이고 나머지는 그 답을 어디서
 * 확인했는지입니다. 짧은 앞머리(마흔 자 이하)만 골라 강조하므로, 첫 문장이
 * 이미 설명인 항목은 손대지 않습니다 — 문장 전체가 굵어지면 강조가 아닙니다.
 */
function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  const text = value.replace(/\*\*/g, "");
  const at = text.search(/\.\s/);
  const lead = at > 0 && at + 1 <= 40 ? text.slice(0, at + 1) : "";
  /*
    **한 칸에 다섯 문장이 들어가는 자리라 줄로 폅니다.** 응시료 한 줄에 금액과 납부
    방법과 환불 기준이 이어 붙어 있어, 찾는 것이 어디 있는지 문단을 통째로 읽어야
    했습니다. 문장마다 줄을 나누면 표의 칸이 목록처럼 읽힙니다.
  */
  const rest = sentences(lead ? text.slice(at + 2) : text);

  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        {lead && <strong className="cert-fact-lead">{lead}</strong>}
        {rest.map((line) => (
          <span key={line} className="cert-fact-line">
            {line}
          </span>
        ))}
      </td>
    </tr>
  );
}

/**
 * 문장 단위로 끊습니다. 마침표 뒤에 공백이 오는 자리만 자르므로 `schedule.do)에서`
 * 같은 주소 한가운데는 안 끊깁니다.
 */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * 과목이 다루는 것.
 *
 * 시행처 출제범위는 「세부항목: 주요항목(세부, 세부), 주요항목(세부)」 꼴이라 한 칸에
 * 그대로 넣으면 서너 줄짜리 문단이 됩니다. 주요항목마다 줄을 나누면 그 과목이 몇
 * 덩어리인지가 먼저 보입니다.
 *
 * **꼴이 다르면 손대지 않습니다.** 괄호 짝이 안 맞거나 「세부항목:」이 없는 자격증도
 * 있어서, 갈라지지 않으면 원문을 그대로 씁니다 — 반쯤 자른 문장을 내보내는 것보다 낫습니다.
 */
function SubjectTopics({ note }: { note?: string }) {
  if (!note) return null;

  const labeled = note.startsWith("세부항목:");
  const parts = splitTopLevel(note.replace(/^세부항목:\s*/, ""));
  if (parts.length < 2) return <>{note}</>;

  return (
    <ul className="cert-subject-topics">
      {parts.map((part) => {
        const matched = labeled ? /^([^(]+)(?:\(([^)]*)\))?$/.exec(part) : null;
        return (
          <li key={part}>
            {matched ? (
              <>
                <b>{matched[1].trim()}</b>
                {matched[2] && <span> {matched[2].trim()}</span>}
              </>
            ) : (
              part
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** 괄호 밖의 쉼표에서만 자릅니다 — 괄호 안의 세부항목 목록은 한 덩어리로 둡니다. */
function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let at = 0; at < text.length; at += 1) {
    const letter = text[at];
    if (letter === "(") depth += 1;
    else if (letter === ")") depth -= 1;
    else if (letter === "," && depth === 0) {
      parts.push(text.slice(start, at).trim());
      start = at + 1;
    }
  }
  parts.push(text.slice(start).trim());

  return parts.filter(Boolean);
}

/**
 * 환불 비율의 색. 전액은 되찾는 자리, 불가는 못 찾는 자리라 일정 표의 상태 색을
 * 그대로 씁니다 — 같은 화면에서 초록은 열려 있음, 붉은색은 닫혔음입니다.
 */
function rateClass(rate: string): string {
  if (rate.startsWith("전액")) return "is-full";
  if (rate.startsWith("불가")) return "is-none";
  return "is-partial";
}

/** 시험 정보 한 묶음. 값이 하나도 없으면 표 자체를 세우지 않습니다. */
function FactTable({ children }: { children: ReactNode }) {
  return (
    <table className="cert-table cert-fact-table">
      <tbody>{children}</tbody>
    </table>
  );
}

function CertView({ cert }: { cert: Cert }) {
  const groups = prepGroups(cert.id);
  const progress = prepProgress(cert.id);
  const hold = prepHold(cert.id);
  /*
    지난 회차는 여기서 이미 걸러집니다. 남은 것이 없으면 절 자체를 세우지
    않습니다 — 빈 표는 「일정이 없는 시험」으로 읽히는데 실제로는 「아직 공고가
    안 났거나 상시 시행」입니다. 그 구분은 「시험 정보」의 주기 문장이 합니다.
  */
  const today = new Date().toISOString().slice(0, 10);
  const years = sessionsByYear(cert);
  const next = nextSession(cert, today);
  const columns = useMemo(() => scheduleColumns(cert.schedule ?? []), [cert]);
  /* 띠가 언제 서는지(제목)와 진행 막대가 재는 것(본문)입니다. 글에서 쓰던 그대로입니다. */
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  /*
    목차에 세울 절. 있는 절만 담습니다 — 학습 경로가 아직 없는 자격증도 있고,
    없는 절을 목차에 두면 눌렀을 때 아무 데도 안 갑니다.

    **소절은 담지 않습니다.** 글 쪽 목차가 절만 세우는데 여기만 두 층이면 같은 화면에서
    규칙이 둘이 됩니다. 소절(치르는 방식·모의고사 같은 것)은 절 안에서 바로 보입니다.
  */
  const sections = [
    { id: "what", title: "개요" },
    { id: "subjects", title: "과목" },
    { id: "exam", title: "시험 정보" },
    years.length > 0 ? { id: "schedule", title: "시험 일정" } : null,
    { id: "prep", title: "시험 노트" },
    cert.studyPath.length > 0
      ? { id: "study", title: "관련 있는 우리 글" }
      : null,
    cert.notes ? { id: "notes", title: "알아 둘 것" } : null,
  ].filter((section) => section !== null);
  /*
    훑는 대상은 id 목록뿐이라 문자열 하나로 묶어 넘깁니다 — 배열을 그대로 넘기면
    렌더마다 새 배열이라 훑기가 매번 다시 걸립니다.
  */
  const ids = sections.map((item) => item.id).join(",");
  const { active, goTo } = useActiveHeading(
    useMemo(() => ids.split(","), [ids]),
  );

  return (
    <article>
      <Seo
        title={`${cert.nameKo} — 무엇을 재는 시험인가`}
        description={cert.whatItMeasures.slice(0, 180)}
        path={`/learn/certs/${cert.id}`}
      />

      {/*
        글과 같은 띠를 세웁니다. 자격증 상세는 절이 일곱이고 시험 일정 표와 노트
        목록이 화면 몇 개를 차지해서, 내려가다 보면 어느 자격증을 보고 있었는지와
        얼마나 남았는지가 둘 다 사라집니다.
      */}
      {/* 라벨은 자격의 종류만 적습니다 — 되돌아가기가 이미 「자격증」이라 나란히 두면 같은 말이 두 번입니다. */}
      <ArticleTitleBar
        watch={titleRef}
        progressOf={bodyRef}
        label={cert.status}
        accent="var(--brand-text)"
        title={cert.nameKo}
        section={sections.find((item) => item.id === active)?.title}
        back={{ to: "/learn/certs", label: "자격증" }}
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
                <b
                  className={
                    cert.status === "국가기술자격" ? "is-national" : undefined
                  }
                >
                  {cert.status}
                </b>
                <span aria-hidden="true">/</span>
                <span>{cert.issuer}</span>
              </p>
            </div>
            <h1
              ref={titleRef}
              className="mt-5 max-w-4xl text-[2rem] font-medium leading-[1.35] text-[var(--text-strong)] sm:text-[2.6rem]"
            >
              {cert.nameKo}
            </h1>
            {cert.nameEn !== cert.nameKo && (
              <p className="mt-3 font-mono text-[12px] text-[var(--text-muted)]">
                {cert.nameEn}
              </p>
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
            <a
              className="cert-official"
              href={cert.officialUrl}
              target="_blank"
              rel="noreferrer"
            >
              공식 페이지에서 일정·접수 확인{" "}
              <ArrowUpRight size={13} aria-hidden="true" />
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
        <ArticleToc
          label="IN THIS EXAM"
          headings={sections.map((section) => ({ id: section.id, text: section.title, depth: 2 }))}
          active={active}
          goTo={goTo}
        />

        <div ref={bodyRef} className="min-w-0 cert-body">
          <section className="cert-section">
            <h2 id="what">개요</h2>
            <p className="cert-prose">
              {cert.whatItMeasures.replace(/\*\*/g, "")}
            </p>
            {/* 소제목 없이 이어 붙입니다 — 두 문단짜리 절에 제목을 달면 그 자체가 눈길을 끊습니다. */}
            {cert.audience && (
              <p className="cert-prose">{cert.audience.replace(/\*\*/g, "")}</p>
            )}
          </section>

          <section className="cert-section">
            <h2 id="subjects">과목</h2>
            {/*
              **비중은 견줘 보는 값이라 표가 맞습니다.** 목록으로 두면 「3과목이 60%」
              같은 사실이 문장 끝에 흩어져, 어느 과목에 시간을 더 쓸지 한눈에 안 잡혔습니다.
              값이 아예 없는 자격증도 있어 그 열은 있는 자격증에만 세웁니다.
            */}
            <table className="cert-table cert-subject-table">
              <thead>
                {/*
                  칸 너비는 **머리 줄이 정합니다** — `table-layout: fixed`가 첫 줄만
                  보기 때문입니다. 몸통에만 폭을 주었더니 세 칸이 똑같이 3분의 1로 섰습니다.
                */}
                <tr>
                  <th scope="col" className="is-name">
                    과목
                  </th>
                  {cert.subjects.some((subject) => subject.weight) && (
                    <th scope="col" className="is-weight">
                      비중
                    </th>
                  )}
                  {cert.subjects.some((subject) => subject.note) && (
                    <th scope="col">다루는 것</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {cert.subjects.map((subject) => (
                  <tr key={subject.name}>
                    <th scope="row" className="is-name">
                      {subject.name}
                    </th>
                    {cert.subjects.some((item) => item.weight) && (
                      <td className="is-weight">{subject.weight ?? "—"}</td>
                    )}
                    {cert.subjects.some((item) => item.note) && (
                      <td>
                        <SubjectTopics note={subject.note} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="cert-section">
            <h2 id="exam">시험 정보</h2>
            {/*
              **한 덩어리로 두면 찾는 값이 안 보입니다.** 다섯 줄이지만 값마다
              근거 문장이 붙어 절이 길고, 「얼마인가」와 「어떻게 치르나」는 다른
              물음입니다. 셋으로 갈라 목차에서 바로 뛰게 합니다.
            */}
            <h3 id="exam-format">치르는 방식</h3>
            <FactTable>
              <Fact label="시행 주기" value={cert.cadence} />
              <Fact label="형식" value={cert.format} />
            </FactTable>

            <h3 id="exam-entry">응시 조건</h3>
            <FactTable>
              <Fact label="응시자격" value={cert.prerequisite} />
              <Fact label="응시료" value={cert.fee} />
            </FactTable>
            {/*
              **환불은 「언제까지면 얼마」의 되풀이라 표가 맞습니다.** 문장으로 적으면
              한 문단에 시점 셋과 비율 셋이 뒤엉키는데, 정작 묻는 것은 「지금 취소하면
              얼마 돌려받나」 하나입니다.
            */}
            {cert.refund && cert.refund.length > 0 && (
              <table className="cert-table cert-refund-table">
                <caption>환불 규정</caption>
                <thead>
                  <tr>
                    <th scope="col">시점</th>
                    <th scope="col" className="is-rate">
                      환불
                    </th>
                    {cert.refund.some((row) => row.note) && (
                      <th scope="col">단서</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {cert.refund.map((row) => (
                    <tr key={row.when}>
                      <th scope="row">{row.when}</th>
                      <td className={`is-rate ${rateClass(row.rate)}`}>{row.rate}</td>
                      {cert.refund?.some((item) => item.note) && (
                        <td>{row.note}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {cert.refundNote && (
              <p className="cert-prose cert-refund-note">{cert.refundNote}</p>
            )}

            {cert.validity && (
              <>
                <h3 id="exam-validity">자격 유지</h3>
                <FactTable>
                  <Fact label="유효기간" value={cert.validity} />
                </FactTable>
              </>
            )}
          </section>

          {years.length > 0 && (
            <section className="cert-section">
              <h2 id="schedule">시험 일정</h2>
              {/*
              **연도 전체를 보여 줍니다.** 지난 회차를 접어 두면 「올해 몇 번
              있었는가」가 안 보이는데, 회차가 정해진 시험은 그 리듬이 곧 계획의
              근거입니다. 지난 줄은 흐리게 두고 다음 회차 한 줄만 짚습니다.

              **칸은 자격증마다 다릅니다.** 시행처 표에 수험표 발급일이 있는
              자격증이 있고 없는 자격증이 있는데, 없는 칸을 「—」로 채우면 표가
              빈칸으로 뒤덮입니다. 그 자격증의 회차 중 하나라도 값을 가진 칸만
              세웁니다.
            */}
              {years.map((group) => (
                <div key={group.year} className="cert-schedule-year">
                  <h3 id={`schedule-${group.year}`}>{group.year}</h3>
                  <div className="cert-schedule-scroll">
                    <table className="cert-schedule">
                      <thead>
                        <tr>
                          <th scope="col">회차</th>
                          {columns.map((column) => (
                            <th
                              key={column.key}
                              scope="col"
                              className={`is-${column.key}`}
                            >
                              {column.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.sessions.map((session) => {
                          const isNext = session === next;
                          const done = session.examDate < today;

                          return (
                            <tr
                              key={`${session.round}-${session.examDate}`}
                              className={[
                                isNext ? "is-next" : "",
                                done ? "is-done" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              <th scope="row">{session.round}</th>
                              {columns.map((column) => (
                                <td
                                  key={column.key}
                                  className={`is-${column.key}`}
                                >
                                  {column.cell(session, group.year, today)}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              {/*
              두 줄로 나눕니다. 앞은 이 표가 언제 것인지, 뒤는 그래도 원문을 보라는
              말이라 하는 일이 다릅니다 — 한 문단에 붙여 두었더니 확인 날짜가
              뒷문장에 묻혀 안 읽혔습니다.
            */}
              <div className="cert-schedule-foot">
                <p>
                  {cert.verifiedAt} 확인. 접수 시각과 환불 규정은 「시험
                  정보」의 주기 항목에 있습니다.
                </p>
                <p>
                  회차는 시행처 공고를 그대로 옮긴 것이고, 바뀔 수 있으니 접수
                  전에{" "}
                  <a
                    href={cert.scheduleUrl ?? cert.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    시행처 일정
                  </a>
                  을 한 번 더 보세요.
                </p>
              </div>
            </section>
          )}

          {/*
          **시험 노트가 학습 경로의 본체입니다.** 아래 「관련 있는 우리 글」은 이미
          있던 글을 과목에 매핑한 것인데, 그 글들은 시험을 보라고 쓴 것이 아니라
          개념을 설명하려고 쓴 것이라 「무엇을 외워야 붙는가」가 빠져 있습니다.
          시험 하나를 놓고 처음부터 쓴 글은 이쪽입니다.
        */}
          <section className="cert-section">
            <h2 id="prep">시험 노트</h2>
            {/*
            **계획 대비 진도를 함께 보여 줍니다.** 쓴 편수만 세면 ADsP 5편이 다 찬
            것처럼 읽혔습니다. 아래 「예정」 줄은 시행처 출제범위를 쪼갠 계획이고
            루틴이 위에서부터 순서대로 채웁니다.
          */}
            {progress && (
              <div className="cert-prep-progress">
                <p className="cert-prep-progress-line">
                  <strong>{progress.written}</strong>
                  <span className="cert-prep-progress-total">
                    {" "}
                    / {progress.planned}편
                  </span>
                  <span className="cert-prep-progress-split">
                    {`개념 ${progress.concepts}/${progress.plannedConcepts} · 모의고사 ${progress.mocks}/${progress.plannedMocks}`}
                    {groups && groups.extras.length > 0
                      ? ` · 총정리 ${groups.extras.length}`
                      : ""}
                  </span>
                </p>
                <div className="cert-prep-bar">
                  <span
                    style={{
                      width: `${Math.min(100, (progress.written / progress.planned) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            {hold && <p className="cert-prose cert-prep-hold">{hold}</p>}
            {groups && (
              <>
                {/*
                **묶음마다 번호를 새로 셉니다.** 파일 번호를 그대로 보이면 총정리가
                85·86·87로, 모의고사가 90·91로 서서 계획이 서른넷인 시험에 여든다섯
                번째 노트가 있는 것처럼 읽혔습니다. 그리고 파일 번호대로 한 줄에
                늘어놓으면 아직 안 쓴 개념 01 위에 총정리와 모의고사가 서서 읽는
                차례가 뒤집힙니다.
              */}
                <PrepGroup
                  id="prep-concepts"
                  title="개념 정리"
                  count={`${progress?.concepts ?? 0} / ${groups.concepts.length}`}
                  rows={
                    hold
                      ? groups.concepts.filter((row) => row.note)
                      : groups.concepts
                  }
                />
                <PrepGroup
                  id="prep-mocks"
                  title="모의고사"
                  count={`${progress?.mocks ?? 0} / ${groups.mocks.length}`}
                  rows={
                    hold ? groups.mocks.filter((row) => row.note) : groups.mocks
                  }
                  note={hold ? undefined : "개념을 다 쓴 뒤에 차례로 붙습니다."}
                />
                {groups.extras.length > 0 && (
                  <PrepGroup
                    id="prep-reviews"
                    title="과목 총정리"
                    count={`${groups.extras.length}편`}
                    rows={groups.extras.map((note) => ({
                      title: note.title,
                      note,
                    }))}
                    note="과목 하나를 통째로 훑는 복습 노트입니다. 위 개념 노트들이 채워질수록 시험 직전에 되짚는 자리가 됩니다."
                  />
                )}
              </>
            )}
          </section>

          {cert.studyPath.length > 0 && (
            <section className="cert-section">
              <h2 id="study">관련 있는 우리 글</h2>
              <p className="cert-prose cert-study-intro">
                시험을 겨냥해 쓴 글은 아니지만 같은 개념을 다룹니다. 과목이 막힐
                때 곁에 두고 읽습니다.
              </p>
              {cert.studyPath.map((group, index) => (
                <div key={group.subject} className="cert-study-group">
                  {/* 목차가 이 자리로 뜁니다. 과목 이름에는 공백·괄호가 섞이므로 차례로 셉니다. */}
                  <h3 id={`study-${index + 1}`}>{group.subject}</h3>
                  <div className="cert-study-list">
                    {group.items.map((item) => (
                      <StudyLink
                        key={`${item.site}:${item.slug}`}
                        item={item}
                      />
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
                  .split("\n")
                  .map((line) =>
                    line.replace(/^-\s*/, "").replace(/\*\*/g, "").trim(),
                  )
                  .filter(Boolean)
                  .map((line) => (
                    <li key={line}>{line}</li>
                  ))}
              </ul>
            </section>
          )}

          <p className="cert-verified">
            난이도와 취업 별은 시행처가 준 값이 아니라 위에 적은 근거로 매긴
            값입니다. 공식 페이지는 <strong>{cert.verifiedAt}</strong>에
            확인했습니다. 시험 제도는 개편이 잦으니 접수 전에{" "}
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

/**
 * 시험 노트 한 묶음. 쓴 줄은 링크, 안 쓴 줄은 「예정」으로 섭니다.
 *
 * 번호는 묶음 안의 차례입니다 — 파일 번호가 아닙니다. 총정리처럼 계획 밖이라
 * 차례가 없는 묶음은 번호 칸을 비워 둡니다.
 */
function PrepGroup({
  id,
  title,
  count,
  rows,
  note,
}: {
  id: string;
  title: string;
  count: string;
  rows: CertPrepRow[];
  note?: string;
}) {
  if (rows.length === 0) return null;

  /*
    묶음 머리는 **진짜 헤딩**입니다. 목차가 「시험 노트」 아래에 이 셋을 그대로
    세우고 눌러 뛰기 때문입니다 — 문단으로 두면 목차가 걸 자리가 없습니다.
  */
  return (
    <div className="cert-prep-group">
      <h3 id={id} className="cert-prep-group-head">
        <span className="cert-prep-group-name">{title}</span>
        <span className="cert-prep-group-count">{count}</span>
      </h3>
      {note && <p className="cert-prep-group-note">{note}</p>}
      <ol className="cert-prep-list">
        {rows.map((row, index) => {
          const number =
            row.order === undefined ? "" : String(row.order).padStart(2, "0");
          const body = (
            <>
              <span className="cert-prep-order">{number}</span>
              <span className="cert-prep-name">{row.title}</span>
              {row.note ? (
                <>
                  <span
                    className={`cert-prep-kind${row.note.kind === "문제" ? " is-quiz" : ""}`}
                  >
                    {row.note.kind}
                  </span>
                  <span className="cert-prep-time">
                    {row.note.readTime} MIN
                  </span>
                </>
              ) : (
                <>
                  <span className="cert-prep-kind">예정</span>
                  <span className="cert-prep-time">{row.subject ?? ""}</span>
                </>
              )}
            </>
          );

          return (
            <li key={row.note?.slug ?? `${title}-${row.order ?? index}`}>
              {row.note ? (
                <Link to={row.note.path} className="cert-prep-item">
                  {body}
                </Link>
              ) : (
                <span className="cert-prep-item is-planned">{body}</span>
              )}
              {row.note && (
                <p className="cert-prep-summary">{row.note.summary}</p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function CertPage() {
  const { certId } = useParams<{ certId: string }>();
  const cert = certId ? certById(certId) : undefined;

  if (!cert) return <Navigate to="/learn/certs" replace />;

  return <CertView cert={cert} />;
}
