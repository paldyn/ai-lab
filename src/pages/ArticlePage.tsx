import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link, Redirect, useParams } from 'react-router-dom';
import { ArticleCard } from '../components/ArticleCard';
import { ArticleVisual } from '../components/ArticleVisual';
import { articles, getArticleBySlug } from '../data/articles';
import { categoryById } from '../data/categories';

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticleBySlug(slug) : undefined;
  if (!article) return <Redirect to="/404" />;

  const category = categoryById[article.categoryId];
  const collectionPath = article.categoryId === 'ai-news' ? '/news' : '/research';
  const related = articles
    .filter((candidate) => candidate.slug !== article.slug && (candidate.categoryId === article.categoryId || candidate.tags.some((tag) => article.tags.includes(tag))))
    .slice(0, 3);

  return (
    <article>
      <header className="site-wrap article-header">
        <Link to={collectionPath} className="back-link"><ArrowLeft size={14} /> {article.categoryId === 'ai-news' ? '뉴스' : '리서치'}</Link>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <p className="font-mono text-[10px] tracking-[0.13em]" style={{ color: category.accent }}>{category.shortName} / {article.level}</p>
            <h1 className="mt-5 max-w-4xl text-[2rem] font-medium leading-[1.35] text-[var(--text-strong)] sm:text-[2.8rem]">{article.title}</h1>
            <p className="mt-6 max-w-2xl text-[16px] font-light leading-8 text-[var(--text-dim)]">{article.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] tracking-[0.06em] text-[var(--text-muted)]">
              <span>{article.author}</span><span>/</span><time dateTime={article.publishedAt}>{article.publishedAt.replaceAll('-', '.')}</time><span>/</span><span>{article.readTime} MIN READ</span>
            </div>
          </div>
          <ArticleVisual article={article} />
        </div>
      </header>

      <div className="site-divider" />

      <div className="site-wrap grid gap-12 py-14 lg:grid-cols-[220px_minmax(0,760px)] lg:justify-center">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--text-muted)]">IN THIS NOTE</p>
          <ol className="mt-4 space-y-3 border-l border-[var(--border)] pl-4 text-xs leading-5 text-[var(--text-dim)]">
            {article.sections.map((section, index) => <li key={section.heading}><a href={`#section-${index + 1}`} className="hover:text-[var(--text)]">{String(index + 1).padStart(2, '0')} {section.heading}</a></li>)}
          </ol>
          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((tag) => <span key={tag} className="tag-static">#{tag}</span>)}
          </div>
        </aside>

        <div className="min-w-0">
          <section className="takeaway-box">
            <p className="font-mono text-[10px] tracking-[0.14em] text-[var(--brand)]">KEY TAKEAWAYS</p>
            <ul className="mt-5 space-y-3">
              {article.takeaways.map((takeaway, index) => (
                <li key={takeaway} className="grid grid-cols-[24px_1fr] gap-3 text-sm leading-7 text-[var(--text)]">
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">0{index + 1}</span><span>{takeaway}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="article-prose">
            {article.sections.map((section, index) => (
              <section key={section.heading} id={`section-${index + 1}`} className="scroll-mt-24">
                <p className="article-section-number">SECTION {String(index + 1).padStart(2, '0')}</p>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
              </section>
            ))}
          </div>

          <div className="mt-16 flex items-center justify-between border-y border-[var(--border)] py-5">
            <Link to={collectionPath} className="back-link"><ArrowLeft size={14} /> 목록으로</Link>
            <Link to="/research" className="back-link">전체 글 <ArrowRight size={14} /></Link>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section-band">
          <div className="site-wrap section-space">
            <div className="section-heading"><div><p className="section-kicker">KEEP READING</p><h2>이어 읽기</h2></div></div>
            <div className="grid gap-8 md:grid-cols-3">{related.map((item) => <ArticleCard key={item.slug} article={item} />)}</div>
          </div>
        </section>
      )}
    </article>
  );
}
