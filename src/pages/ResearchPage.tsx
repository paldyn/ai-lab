import { ArticleExplorer } from '../components/ArticleExplorer';
import { Seo } from '../components/Seo';
import type { CategoryId } from '../types/article';

const researchCategories: CategoryId[] = ['ai-guide', 'math-for-ai', 'paper-notes', 'tools', 'lab-notes'];

export function ResearchPage() {
  return (
    <>
      <Seo
        title="AI 리서치"
        description="AI와 과학, 수학의 원리를 살펴보고 논문과 작은 실험으로 직접 확인한 리서치 노트를 모았습니다."
        path="/research"
      />
      <section className="site-wrap simple-page-intro">
        <p className="section-kicker">PALDYN RESEARCH</p>
        <h1>AI 리서치</h1>
        <p>AI와 과학, 수학의 원리를 살펴보고 논문과 작은 실험으로 직접 확인합니다.</p>
      </section>
      <div className="site-divider" />
      <section className="site-wrap section-space research-archive">
        <ArticleExplorer categoryIds={researchCategories} />
      </section>
    </>
  );
}
