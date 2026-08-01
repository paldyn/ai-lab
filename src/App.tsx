import { Redirect, Route, Switch } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ArticlePage } from './pages/ArticlePage';
import { HomePage } from './pages/HomePage';
import { NewsPage } from './pages/NewsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ResearchPage } from './pages/ResearchPage';

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route exact path="/"><HomePage /></Route>
        <Route exact path="/news"><NewsPage /></Route>
        <Route exact path="/research"><ResearchPage /></Route>
        <Route exact path="/knowledge"><Redirect to="/research" /></Route>
        <Route path="/articles/:slug"><ArticlePage /></Route>
        <Route path="/category/ai-news"><Redirect to="/news" /></Route>
        <Route path="/category/:categoryId"><Redirect to="/research" /></Route>
        <Route path="/about"><Redirect to="/" /></Route>
        <Route path="/404"><NotFoundPage /></Route>
        <Route><NotFoundPage /></Route>
      </Switch>
    </Layout>
  );
}
