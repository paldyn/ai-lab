import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { ArticlePage } from './pages/ArticlePage';
import { ConceptsPage } from './pages/ConceptsPage';
import { HomePage } from './pages/HomePage';
import { NewsPage } from './pages/NewsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ResearchPage } from './pages/ResearchPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/concepts" element={<ConceptsPage />} />
        <Route path="/concepts/:categoryId" element={<ConceptsPage />} />
        <Route path="/research" element={<ResearchPage />} />
        <Route path="/articles/:slug" element={<ArticlePage />} />
        {/* 개념 섹션이 생기기 전 주소들 */}
        <Route path="/knowledge" element={<Navigate to="/concepts" replace />} />
        <Route path="/category/ai-news" element={<Navigate to="/news" replace />} />
        <Route path="/category/:categoryId" element={<Navigate to="/concepts" replace />} />
        <Route path="/about" element={<Navigate to="/" replace />} />
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}
