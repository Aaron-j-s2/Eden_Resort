import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

export function RouteError() {
  const error = useRouteError();
  const chunkFailed = error instanceof Error && /dynamically imported module|Loading chunk/i.test(error.message);
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-paper px-6 text-center">
      <p className="eyebrow text-laterite-deep">Eden Falls Resort</p>
      <h1 className="mt-4 text-display-md text-forest">
        {isRouteErrorResponse(error) && error.status === 404 ? 'Page not found' : 'Something went wrong'}
      </h1>
      <p className="mt-4 max-w-md text-ink-soft">
        {chunkFailed
          ? 'A newer version of the site is available. Please reload the page.'
          : 'Please try again. If the problem continues, call us on +91 95974 45838.'}
      </p>
      <div className="mt-8 flex gap-6">
        <button type="button" className="eyebrow link-line text-forest" onClick={() => window.location.reload()}>
          Reload
        </button>
        <Link to="/" className="eyebrow link-line text-forest">
          Home
        </Link>
      </div>
    </div>
  );
}
