import { Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
// import { Redirect } from './pages/authentication/Redirect';
// import { SignIn } from './pages/authentication/SignIn';
// import { SignOut } from './pages/authentication/SignOut';
// import { SignOutRedirect } from './pages/authentication/SignOutRedirect';
// import { Authenticated, AuthenticationProvider } from './services/authentication/AuthenticationProvider';
import { BackstageProvider } from '@/services/backstage/BackstageProvider';
import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';
// import { GraphProvider } from './services/graph/GraphProvider';
// import { QueryProvider } from './services/graph/QueryProvider';
import { AppInsightsProvider } from '@/services/insights/AppInsightsProvider';
import { CriticalErrorBoundary } from '@/pages/errors/ErrorBoundary';
// import { Loading } from './components/feedback/Loading';
// import { Dashboard } from './layouts/Dashboard';
// import { Home } from './pages/Home';

const Home = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Home</CardTitle>
        <CardDescription>You have 3 unread messages.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm">
          Button
        </Button>
      </CardContent>
    </Card>
  );
};

function App() {
  return (
    <Suspense>
      <BackstageProvider>
        <AppInsightsProvider>
          {/* <AuthenticationProvider> */}
          <BrowserRouter>
            <CriticalErrorBoundary>
              {/* <QueryProvider>
                  <GraphProvider> */}
              {/* <Suspense fallback={<Loading />}> */}
              <Routes>
                <Route path="/" element={<Home />} />
                {/* <Route element={<Authenticated />}>
                          <Route element={<Dashboard />}>
                            <Route path="/" element={<Home />} />
                          </Route>
                        </Route>
                        <Route path="auth">
                          <Route path="signout" element={<SignOut />} />
                          <Route path="redirect" element={<Redirect />} />
                          <Route path="signin" element={<SignIn />} />
                          <Route path="signout/redirect" element={<SignOutRedirect />} />
                        </Route> */}
                <Route path="*" element={<p>Not found</p>} />
              </Routes>
              {/* </Suspense> */}
              {/* </GraphProvider>
                </QueryProvider> */}
            </CriticalErrorBoundary>
          </BrowserRouter>
          {/* </AuthenticationProvider> */}
        </AppInsightsProvider>
      </BackstageProvider>
    </Suspense>
  );
}

export default App;
