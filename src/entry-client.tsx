import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './styles.css';

const basename = import.meta.env.BASE_URL === '/' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '');

const container = document.getElementById('root')!;

const app = (
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>
);

// 프리렌더된 HTML이 있으면 하이드레이트하고, 개발 서버처럼 비어 있으면 새로 그립니다.
// #root 안에는 자리표시자 주석만 있을 수 있어 요소 자식 유무로 판단합니다.
if (container.firstElementChild) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
