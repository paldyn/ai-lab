import { ArticleExplorer } from '../components/ArticleExplorer';
import { Seo } from '../components/Seo';
import { categoryIdsIn } from '../data/categories';

const researchCategories = categoryIdsIn('research');

export function ResearchPage() {
  return (
    <>
      <Seo
        title="리서치"
        description="논문을 읽고, 도구를 비교하고, 작은 실험으로 직접 확인한 기록입니다."
        path="/research"
      />
      <section className="site-wrap simple-page-intro">
        <p className="section-kicker">PALDYN RESEARCH</p>
        <h1>리서치</h1>
        <p>논문을 읽고, 도구를 비교하고, 작은 실험으로 직접 확인한 것을 남깁니다.</p>
      </section>
      <div className="site-divider" />
      <section className="site-wrap section-space research-archive">
        <ArticleExplorer categoryIds={researchCategories} />
      </section>
    </>
  );
}
