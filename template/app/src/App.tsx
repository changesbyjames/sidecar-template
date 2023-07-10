import { Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { BackstageProvider } from '@/services/backstage/BackstageProvider';

import { AppInsightsProvider } from '@/services/insights/AppInsightsProvider';
import { DebugProvider } from '@/services/insights/DebugProvider';
import { CriticalErrorBoundary } from '@/pages/errors/ErrorBoundary';

// import { Loading } from './components/feedback/Loading';
// import { Dashboard } from './layouts/Dashboard';
// import { Home } from './pages/Home';

// Microsoft Graph
import { GraphProvider } from '@/services/graph/GraphProvider';
import { QueryProvider } from '@/services/graph/QueryProvider';

// Azure AD
// import { AuthenticationProvider } from '@/services/authentication/ADProvider';

// Azure B2C
import { AuthenticationProvider } from '@/services/authentication/B2CProvider';

// Authentication
// import { Redirect } from '@/pages/authentication/Redirect';
// import { SignIn } from '@/pages/authentication/SignIn';
// import { SignOut } from '@/pages/authentication/SignOut';
// import { SignOutRedirect } from '@/pages/authentication/SignOutRedirect';

import { Button } from '@/components/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card';

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
        <DebugProvider>
          <AppInsightsProvider>
            <AuthenticationProvider>
              <BrowserRouter>
                <CriticalErrorBoundary>
                  <QueryProvider>
                    <GraphProvider>
                      <Suspense fallback={<p>Loading...</p>}>
                        <Routes>
                          <Route path="/" element={<Home />} />
                          {/* <Route element={<Authenticated />}>
                            <Route element={<Dashboard />}>
                              <Route path="/" element={<Home />} />
                            </Route>
                          </Route> */}
                          {/* <Route path="auth">
                            <Route path="signout" element={<SignOut />} />
                            <Route path="redirect" element={<Redirect />} />
                            <Route path="signin" element={<SignIn />} />
                            <Route path="signout/redirect" element={<SignOutRedirect />} />
                          </Route> */}
                          <Route path="*" element={<p>Not found</p>} />
                        </Routes>
                      </Suspense>
                    </GraphProvider>
                  </QueryProvider>
                </CriticalErrorBoundary>
              </BrowserRouter>
            </AuthenticationProvider>
          </AppInsightsProvider>
        </DebugProvider>
      </BackstageProvider>
    </Suspense>
  );
}

export default App;
