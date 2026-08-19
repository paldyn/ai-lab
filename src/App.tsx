import { Navigate, Route, Routes, useParams } from 'react-router';
import { Layout } from './components/Layout';
import { ArticlePage } from './pages/ArticlePage';
import { LearnPage } from './pages/LearnPage';
import { HomePage } from './pages/HomePage';
import { NewsPage } from './pages/NewsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ResearchPage } from './pages/ResearchPage';

/** /concepts/<category> 를 같은 카테고리의 /learn/<category> 로 넘깁니다. */
function RedirectConceptCategory() {
  const { categoryId } = useParams<{ categoryId: string }>();
  return <Navigate to={`/learn/${categoryId ?? ''}`} replace />;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/news" element={<NewsPage />} />
        {/* 뉴스 탭은 주소를 갖습니다 — /news/companies, /news/models. 셋 다 프리렌더됩니다. */}
        <Route path="/news/:view" element={<NewsPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/learn/:categoryId" element={<LearnPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/articles/:slug" element={<ArticlePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        {/* 지난 주소들. /concepts는 2026-08-04에 /learn으로 바꿨습니다. */}
        <Route path="/concepts" element={<Navigate to="/learn" replace />} />
        <Route path="/concepts/:categoryId" element={<RedirectConceptCategory />} />
        <Route path="/knowledge" element={<Navigate to="/learn" replace />} />
        <Route path="/category/ai-news" element={<Navigate to="/news" replace />} />
        <Route path="/category/:categoryId" element={<Navigate to="/learn" replace />} />
        <Route path="/about" element={<Navigate to="/" replace />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
