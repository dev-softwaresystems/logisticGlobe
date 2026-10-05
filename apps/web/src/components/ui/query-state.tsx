export function LoadingState({
  message = 'Consultando información…',
}: {
  message?: string;
}) {
  return (
    <div className="query-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="query-state error-state" role="alert">
      <h2>No pudimos cargar la información</h2>
      <p>{message}</p>
      <button onClick={retry}>Volver a intentar</button>
    </div>
  );
}
export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function QueryState({
  isLoading,
  error,
  isEmpty,
  onRetry,
  emptyMessage,
}: {
  isLoading: boolean;
  error: unknown;
  isEmpty: boolean;
  onRetry: () => void;
  emptyMessage: string;
}) {
  if (isLoading) return <LoadingState />;
  if (error)
    return (
      <ErrorState
        message={
          error instanceof Error
            ? error.message
            : 'No se pudo consultar la información.'
        }
        retry={onRetry}
      />
    );
  if (isEmpty)
    return <EmptyState title="Sin registros" description={emptyMessage} />;
  return null;
}
