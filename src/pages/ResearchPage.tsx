import { ArticleExplorer } from '../components/ArticleExplorer';
import { PageHeader } from '../components/PageHeader';
import { Seo } from '../components/Seo';
import { countByCategory, sectionCategoriesInUse } from '../data/articles';
import { categoryIdsIn } from '../data/categories';

const researchCategories = categoryIdsIn('research');

export function ResearchPage() {
  const counts = countByCategory();
  const total = researchCategories.reduce((sum, id) => sum + (counts[id] ?? 0), 0);

  return (
    <>
      <Seo
        title="리서치"
        description="논문을 읽고, 도구를 비교하고, 작은 실험으로 직접 확인한 기록입니다."
        path="/research"
      />
      <PageHeader
        kicker="PALDYN RESEARCH"
        title="리서치"
        description="논문을 읽고, 도구를 비교하고, 작은 실험으로 직접 확인한 것을 남깁니다."
        stats={[
          { label: '기록', value: `${total}편` },
          { label: '갈래', value: String(sectionCategoriesInUse('research').length).padStart(2, '0') },
        ]}
      />
      <section className="site-wrap section-space research-archive">
        <ArticleExplorer categoryIds={researchCategories} />
      </section>
    </>
  );
}
