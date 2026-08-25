import { Navigate, Route, Routes, useParams } from 'react-router';
import { Layout } from './components/Layout';
import { ArticlePage } from './pages/ArticlePage';
import { CertPage } from './pages/CertPage';
import { CertPrepPage } from './pages/CertPrepPage';
import { CertsPage } from './pages/CertsPage';
import { LearnPage } from './pages/LearnPage';
import { HomePage } from './pages/HomePage';
import { NewsPage } from './pages/NewsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ResearchPage } from './pages/ResearchPage';

/** /concepts/<category> 를 같은 카테고리의 /learn/<category> 로 넘깁니다. */
/** 자격증을 학습 아래로 옮기기 전 주소. 붙여 둔 링크가 있을 수 있어 살려 둡니다. */
function RedirectCert() {
  const { certId } = useParams<{ certId: string }>();
  return <Navigate to={`/learn/certs/${certId}`} replace />;
}

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
        {/*
          자격증은 학습의 한 칸입니다. 따로 세우면 메뉴가 다섯이 되고, 정작 그
          페이지가 하는 일은 「우리 글 어디부터 읽으면 되는가」라 학습과 같습니다.
        */}
        <Route path="/learn/certs" element={<CertsPage />} />
        <Route path="/learn/certs/:certId" element={<CertPage />} />
        <Route path="/learn/certs/:certId/:slug" element={<CertPrepPage />} />
        <Route path="/articles/:slug" element={<ArticlePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        {/* 지난 주소들. /concepts는 2026-08-04에 /learn으로 바꿨습니다. */}
        <Route path="/certs" element={<Navigate to="/learn/certs" replace />} />
        <Route path="/certs/:certId" element={<RedirectCert />} />
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
