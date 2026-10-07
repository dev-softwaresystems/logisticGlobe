import { ServiceHealthPanel } from '../components/service-health-panel';
import { OperationalHealthPanel } from '../components/operational-health-panel';
export function SystemPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONTINUIDAD OPERATIVA</p>
          <h1>Estado del sistema</h1>
          <p className="muted">
            Disponibilidad actual y latencia medida de los servicios locales.
          </p>
        </div>
      </div>
      <ServiceHealthPanel />
      <OperationalHealthPanel />
      <p className="page-note">
        Las comprobaciones reflejan el estado actual. Los objetivos de
        disponibilidad y rendimiento se validarán mediante pruebas de carga y
        observabilidad.
      </p>
    </>
  );
}
