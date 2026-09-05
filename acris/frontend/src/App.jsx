import { AuthProvider } from "./app/AuthProvider.jsx";
import { AppRouter } from "./app/router.jsx";
import ErrorBoundary from "./app/ErrorBoundary.jsx";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
