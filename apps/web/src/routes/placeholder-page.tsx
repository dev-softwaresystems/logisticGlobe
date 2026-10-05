import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/query-state';
export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">OPERACIÓN</p>
          <h1>{title}</h1>
          <p className="muted">{description}</p>
        </div>
      </div>
      <section className="panel">
        <EmptyState
          title="Módulo preparado para la siguiente iteración"
          description="La navegación está disponible. Las acciones operativas se incorporarán con su integración y validaciones."
        />
        <Link className="text-link" to="/dashboard">
          Volver al resumen
        </Link>
      </section>
    </>
  );
}
